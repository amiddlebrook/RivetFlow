import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {DatabaseSync} from 'node:sqlite';
import {readdirSync,readFileSync} from 'node:fs';
const require=createRequire(import.meta.url);
const app=require('./.compiled/index.js');
const advanced=require('./.compiled/advanced.js');
function env(){
 const sql=new DatabaseSync(':memory:');
 for(const f of readdirSync('migrations').filter(f=>f.endsWith('.sql')).sort())sql.exec(readFileSync('migrations/'+f,'utf8'));
 return { sql,DB:{prepare(query){let args=[];return {bind(...x){args=x;return this},async all(){return {results:sql.prepare(query).all(...args)}},async first(){return sql.prepare(query).get(...args)??null},async run(){const r=sql.prepare(query).run(...args);return {meta:{changes:r.changes}}}}}},AI:{async run(){return {response:'Fixture test response'}}},stop(){sql.close()}};
}
async function call(e,path,data,method){const request=new Request('http://localhost:8787'+path,{method:method||(data===undefined?'GET':'POST'),headers:data===undefined?{}:{'Content-Type':'application/json'},body:data===undefined?undefined:JSON.stringify(data)});const response=await app.api(request,e,new URL(request.url));assert.ok(response.ok,`${path}: HTTP ${response.status}`);return response.json()}
async function rejection(e,path,data,status=400){const request=new Request('http://localhost:8787'+path,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data)});await assert.rejects(()=>app.api(request,e,new URL(request.url)),err=>err.status===status)}
test('idempotent starts and immutable run snapshots',async()=>{
 const e=env();try{const seed=await call(e,'/api/seed',{});const path=`/api/workflows/${seed.workflow_id}/start`;
 const first=await call(e,path,{idempotency_key:'req-321',context:{reason:'a'}});
 const duplicate=await call(e,path,{idempotency_key:'req-321',context:{reason:'a'}});
 assert.equal(first.id,duplicate.id);assert.equal(duplicate.replayed,true);
 await rejection(e,path,{idempotency_key:'req-321',context:{reason:'b'}},409);
 const revision=await call(e,`/api/workflows/${seed.workflow_id}/revisions`,{definition:{steps:[{name:'A new version',kind:'simulate',simulated_result:'Done'}]},description:'Version two'});
 assert.equal(revision.version,1);
 const old=e.sql.prepare('SELECT definition_snapshot FROM runs WHERE id=?').get(first.id);
 assert.equal(JSON.parse(old.definition_snapshot).steps.length,4);
 const cancelled=await call(e,`/api/runs/${first.id}/cancel`,{});assert.equal(cancelled.status,'cancelled');
 await rejection(e,`/api/runs/${first.id}/cancel`,{},409);
 assert.equal(e.sql.prepare('SELECT count(*) n FROM events WHERE run_id=?').get(first.id).n,2);
 }finally{e.stop()}
});
