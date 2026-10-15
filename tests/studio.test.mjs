import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {createRequire} from 'node:module';
import {readFileSync,readdirSync} from 'node:fs';
const require=createRequire(import.meta.url);
const {studioApi}=require('./.compiled/studio.js');
import {renderStudio} from '../public/studio.js';
function environment(){const db=new DatabaseSync(':memory:');for(const name of readdirSync('migrations').filter(x=>x.endsWith('.sql')).sort())db.exec(readFileSync('migrations/'+name,'utf8'));return {db,env:{DB:{prepare(q){let args=[];return {bind(...a){args=a;return this},async all(){return {results:db.prepare(q).all(...args)}},async first(){return db.prepare(q).get(...args)||null},async run(){const x=db.prepare(q).run(...args);return {meta:{changes:x.changes}}}}}}}}}
async function call(env,route,method='GET'){const req=new Request('http://localhost:8787'+route,{method});return studioApi(req,env,new URL(req.url))}

test('specialized RivetFlow studio reads actual SQLite state',async()=>{
 const {db,env}=environment();try{db.exec(`INSERT INTO workflows VALUES('wf','Intake','Description','{"steps":[{"name":"Approval","kind":"approval"}]}','2026-01-01','2026-01-01'); INSERT INTO runs(id,workflow_id,status,cursor,context,created_at,updated_at,definition_snapshot) VALUES('run','wf','waiting_approval',0,'{}','2026-01-01','2026-01-01','{"steps":[{"name":"Approval","kind":"approval"}]}'); INSERT INTO approvals(id,run_id,step_index,status,note,created_at) VALUES('ap','run',0,'pending','','2026-01-01');`);
 const response=await call(env,'/api/studio/flow-map');assert.equal(response.status,200);const body=await response.json();assert.equal(body.workflows[0].steps[0].kind,'approval');assert.equal(body.runs[0].status,'waiting_approval');assert.equal(body.approvals.length,1);
 const denied=await call(env,'/api/studio/flow-map','POST');assert.equal(denied.status,405);
 }finally{db.close()}
});
test('studio endpoints require a dedicated protected route and a working JS module',async()=>{const {db,env}=environment();try{assert.equal(await call(env,'/api/studio/missing'),null);assert.equal(typeof renderStudio,'function');}finally{db.close()}});
import {flowState} from '../public/studio.js';
test('run-blueprint stage respects approval wait and immutable cursor',()=>{assert.equal(flowState(0,{id:'r',cursor:0,status:'waiting_approval'},[{run_id:'r',step_index:0,status:'pending'}]),'awaiting-human');assert.equal(flowState(1,{id:'r',cursor:0,status:'running'}),'upcoming')});
