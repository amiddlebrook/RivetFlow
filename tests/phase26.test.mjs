import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {DatabaseSync} from 'node:sqlite';
import {readdirSync,readFileSync} from 'node:fs';
const require=createRequire(import.meta.url);
const app=require('./.compiled/index.js');
function fixture(){
 const db=new DatabaseSync(':memory:');
 for(const name of readdirSync('migrations').filter(s=>s.endsWith('.sql')).sort())db.exec(readFileSync('migrations/'+name,'utf8'));
 let aiCalls=0;
 const env={ADMIN_TOKEN:'phase26-fixture-root-secret',FREE_AI_ENABLED:'false',DB:{prepare(sql){let args=[];return{bind(...v){args=v;return this},async first(){return db.prepare(sql).get(...args)??null},async all(){return{results:db.prepare(sql).all(...args)}},async run(){const x=db.prepare(sql).run(...args);return{meta:{changes:x.changes}}}}}},AI:{async run(){aiCalls++;return{response:'AI should not be invoked'}}}};
 return {db,env,get aiCalls(){return aiCalls},close(){db.close()}};
}
async function call(f,path,payload,method){const url=new URL('http://localhost:8787'+path);const req=new Request(url,{method:method||(payload===undefined?'GET':'POST'),headers:payload===undefined?{}:{'Content-Type':'application/json'},body:payload===undefined?undefined:JSON.stringify(payload)});return app.api(req,f.env,url).then(async res=>({status:res.status,data:await res.json()}));}
async function rejects(f,path,payload,status,method){await assert.rejects(()=>call(f,path,payload,method),e=>e.status===status)}
test('bounded deterministic drive stops before approval without remote inference',async()=>{
 const f=fixture();try{
 const w=await call(f,'/api/workflows',{name:'Refund approval',definition:{steps:[{kind:'simulate',name:'Validate',simulated_result:'ok'},{kind:'simulate',name:'Enrich',simulated_result:'ok'},{kind:'approval',name:'Manager review'},{kind:'ai',name:'Manual AI',instruction:'classify'}]}});
 const run=await call(f,`/api/workflows/${w.data.id}/start`,{});
 const driven=await call(f,`/api/runs/${run.data.id}/drive`,{max_steps:25});
 assert.equal(driven.data.advanced,2);assert.equal(driven.data.cursor,2);
 assert.equal(driven.data.halted_on,'human_approval_required');assert.equal(f.aiCalls,0);
 const pending=await call(f,`/api/runs/${run.data.id}/advance`,{});assert.equal(pending.data.status,'waiting_approval');
 const noop=await call(f,`/api/runs/${run.data.id}/drive`,{max_steps:25});assert.equal(noop.data.advanced,0);
 await rejects(f,`/api/runs/${run.data.id}/drive`,{max_steps:1000},400);
 }finally{f.close()}
});
test('drive stops before AI and enforces operator batch limit',async()=>{
 const f=fixture();try{
 const w=await call(f,'/api/workflows',{name:'Constrained',definition:{steps:[{kind:'simulate',name:'First'},{kind:'ai',name:'AI review',instruction:'classify'}]}});
 const run=await call(f,`/api/workflows/${w.data.id}/start`,{});
 const one=await call(f,`/api/runs/${run.data.id}/drive`,{max_steps:1});assert.equal(one.data.advanced,1);
 const two=await call(f,`/api/runs/${run.data.id}/drive`,{});assert.equal(two.data.halted_on,'AI_step_requires_explicit_operator_action');assert.equal(f.aiCalls,0);
 }finally{f.close()}
});
