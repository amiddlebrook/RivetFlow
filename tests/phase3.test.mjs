import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {DatabaseSync} from 'node:sqlite';
import {readdirSync,readFileSync} from 'node:fs';
const require=createRequire(import.meta.url);
const app=require('./.compiled/index.js');
const advanced=require('./.compiled/advanced.js');
function env(){const sql=new DatabaseSync(':memory:');for(const f of readdirSync('migrations').filter(f=>f.endsWith('.sql')).sort())sql.exec(readFileSync('migrations/'+f,'utf8'));return {sql,DB:{prepare(q){let args=[];return {bind(...v){args=v;return this},async all(){return {results:sql.prepare(q).all(...args)}},async first(){return sql.prepare(q).get(...args)??null},async run(){const x=sql.prepare(q).run(...args);return {meta:{changes:x.changes}}}}}},AI:{async run(){return {response:'Fixture response'}}},stop(){sql.close()}}}
async function call(e,path,data,method){const req=new Request('http://localhost:8787'+path,{method:method||(data===undefined?'GET':'POST'),headers:data===undefined?{}:{'Content-Type':'application/json'},body:data===undefined?undefined:JSON.stringify(data)});const res=await app.api(req,e,new URL(req.url));if(!res.ok)throw new Error(`${path} ${res.status} ${await res.text()}`);return res.json()}
async function rejected(e,path,data,status){const req=new Request('http://localhost:8787'+path,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data)});await assert.rejects(()=>app.api(req,e,new URL(req.url)),ex=>ex.status===status)}
test('stale workflow recovery is compare-and-set and fails AI replay closed',async()=>{const e=env();try{
const seed=await call(e,'/api/seed',{});const old='2020-01-01T00:00:00.000Z';const def=JSON.stringify({steps:[{name:'safe',kind:'simulate'},{name:'reason',kind:'ai'}]});
const id1=crypto.randomUUID(),id2=crypto.randomUUID();
for(const [id,cursor] of [[id1,0],[id2,1]])e.sql.prepare('INSERT INTO runs(id,workflow_id,status,cursor,context,created_at,updated_at,definition_snapshot) VALUES(?,?,?,?,?,?,?,?)').run(id,seed.workflow_id,'processing',cursor,'{}',old,old,def);
const queue=await call(e,'/api/recovery');assert.equal(queue.items.length,2);assert.deepEqual(new Set(queue.items.map(x=>x.step_kind)),new Set(['simulate','ai']));
const deterministic=await call(e,`/api/runs/${id1}/recover`,{});assert.equal(deterministic.status,'running');assert.equal(deterministic.replay_safe,true);
await rejected(e,`/api/runs/${id1}/recover`,{},409);
const ai=await call(e,`/api/runs/${id2}/recover`,{});assert.equal(ai.status,'failed');assert.equal(ai.replay_safe,false);
const audit=await call(e,'/api/operational-events');assert.ok(audit.items.some(x=>String(x.message).includes('failed closed')));
}finally{e.stop()}});
