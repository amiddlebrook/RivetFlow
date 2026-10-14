import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {resolve} from 'node:path';
import {readFileSync} from 'node:fs';
import {DatabaseSync} from 'node:sqlite';
const require=createRequire(import.meta.url);
const app=name=>require(resolve(`tests/.compiled/index.js`));
function environment(name){
  const sql=new DatabaseSync(':memory:');sql.exec(readFileSync(`migrations/0001_init.sql`,'utf8'));
  return {DB:{prepare(query){let args=[];return {bind(...v){args=v;return this}, async all(){return {results:sql.prepare(query).all(...args)}},async first(){return sql.prepare(query).get(...args)??null},async run(){const out=sql.prepare(query).run(...args);return {meta:{changes:out.changes}}}}}},
    AI:{async run(){return {response:'Synthetic test adapter answer. No live AI requests.'}}},stop(){sql.close()}};
}
function req(path,body){return new Request('http://localhost:8787'+path,body===undefined?{}:{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)})}
async function call(name,env,path,data,method){const request=new Request('http://localhost:8787'+path,{method:method||((data===undefined)?'GET':'POST'),headers:data===undefined?{}:{'Content-Type':'application/json'},body:data===undefined?undefined:JSON.stringify(data)});const response=await app(name).api(request,env,new URL(request.url));if(response.status<200||response.status>=300)throw new Error(`${name} ${path} HTTP ${response.status}: ${await response.text()}`);return response.json()}

test('RivetFlow: create, start, advance, approve and finish with event history',async()=>{
  const env=environment('rivetflow');try{
   const seed=await call('rivetflow',env,'/api/seed',{});
   const run=await call('rivetflow',env,`/api/workflows/${seed.workflow_id}/start`,{context:{case:'123'}});
   let details=await call('rivetflow',env,`/api/runs/${run.id}/advance`,{});assert.equal(details.cursor,1);
   details=await call('rivetflow',env,`/api/runs/${run.id}/advance`,{});assert.equal(details.cursor,2);
   details=await call('rivetflow',env,`/api/runs/${run.id}/advance`,{});assert.equal(details.status,'waiting_approval');
   details=await call('rivetflow',env,`/api/approvals/${details.approvals[0].id}/resolve`,{decision:'approved'});assert.equal(details.cursor,3);
   details=await call('rivetflow',env,`/api/runs/${run.id}/advance`,{});assert.equal(details.status,'completed');assert.ok(details.events.length>=5);
  }finally{env.stop()}
});
