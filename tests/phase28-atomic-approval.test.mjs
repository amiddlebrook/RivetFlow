import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {DatabaseSync} from 'node:sqlite';
import {readFileSync,readdirSync} from 'node:fs';
const worker=createRequire(import.meta.url)('./.compiled/index.js').default;
const token='fixture-atomic-root';
function fixture(){
 const db=new DatabaseSync(':memory:');
 db.exec('PRAGMA foreign_keys=ON');
 for(const migration of readdirSync('migrations').filter(x=>x.endsWith('.sql')).sort())db.exec(readFileSync('migrations/'+migration,'utf8'));
 const env={ADMIN_TOKEN:token,FREE_AI_ENABLED:'false',DB:{prepare(sql){let params=[];return {bind(...v){params=v;return this},async first(){return db.prepare(sql).get(...params)??null},async all(){return {results:db.prepare(sql).all(...params)}},async run(){const r=db.prepare(sql).run(...params);return {meta:{changes:r.changes}}}}}}};
 return {db,env};
}
async function call(env,path,payload){const req=new Request('https://test.local'+path,{method:'POST',headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},body:JSON.stringify(payload)});const res=await worker.fetch(req,env);return {status:res.status,data:await res.json()};}
async function pending(env,decision='approved',steps=[{name:'Operator decision',kind:'approval'}]){
 const workflow=await call(env,'/api/workflows',{name:'Atomic decision test',definition:{steps}});assert.equal(workflow.status,201);
 const started=await call(env,`/api/workflows/${workflow.data.id}/start`,{});assert.equal(started.status,201);
 const stepped=await call(env,`/api/runs/${started.data.id}/advance`,{});assert.equal(stepped.status,200);
 return {run:started.data.id,approval:stepped.data.approvals[0].id};
}
test('approval, run advancement, and audit event are one transaction',async()=>{
 const f=fixture();try{
  const {run,approval}=await pending(f.env);
  const decided=await call(f.env,`/api/approvals/${approval}/resolve`,{decision:'approved',note:'Human verified'});
  assert.equal(decided.status,200);assert.equal(decided.data.status,'completed');assert.equal(decided.data.cursor,1);
  assert.equal(f.db.prepare('SELECT status FROM approvals WHERE id=?').get(approval).status,'approved');
  assert.equal(f.db.prepare("SELECT count(*) n FROM events WHERE run_id=? AND message='Approval approved'").get(run).n,1);
  const repeat=await call(f.env,`/api/approvals/${approval}/resolve`,{decision:'approved'});
  assert.equal(repeat.status,409);
  assert.equal(f.db.prepare("SELECT count(*) n FROM events WHERE run_id=? AND message='Approval approved'").get(run).n,1);
 }finally{f.db.close()}
});
test('rejecting an approval never advances the cursor',async()=>{
 const f=fixture();try{
  const {run,approval}=await pending(f.env);
  const res=await call(f.env,`/api/approvals/${approval}/resolve`,{decision:'rejected',note:'Unsafe'});
  assert.equal(res.status,200);assert.equal(res.data.status,'rejected');assert.equal(res.data.cursor,0);
  assert.equal(f.db.prepare("SELECT json_extract(detail,'$.note') note FROM events WHERE run_id=? AND message='Approval rejected'").get(run).note,'Unsafe');
 }finally{f.db.close()}
});
test('an audit-write failure rolls back both the approval and execution advancement',async()=>{
 const f=fixture();try{
  const {run,approval}=await pending(f.env);
  f.db.exec(`CREATE TRIGGER fail_approval_event BEFORE INSERT ON events
   WHEN NEW.message LIKE 'Approval %' BEGIN SELECT RAISE(ABORT,'simulated audit-storage failure'); END;`);
  const attempted=await call(f.env,`/api/approvals/${approval}/resolve`,{decision:'approved'});
  assert.equal(attempted.status,500);
  assert.equal(f.db.prepare('SELECT status FROM approvals WHERE id=?').get(approval).status,'pending');
  const state=f.db.prepare('SELECT status,cursor FROM runs WHERE id=?').get(run);
  assert.equal(state.status,'waiting_approval');assert.equal(state.cursor,0);
  assert.equal(f.db.prepare("SELECT count(*) n FROM events WHERE run_id=? AND message='Approval approved'").get(run).n,0);
 }finally{f.db.close()}
});
test('outdated run cursor rejects decisions without side effects',async()=>{
 const f=fixture();try{
  const {run,approval}=await pending(f.env);
  f.db.prepare("UPDATE runs SET cursor=3 WHERE id=?").run(run);
  const attempted=await call(f.env,`/api/approvals/${approval}/resolve`,{decision:'approved'});
  assert.equal(attempted.status,409);
  assert.equal(f.db.prepare('SELECT status FROM approvals WHERE id=?').get(approval).status,'pending');
 }finally{f.db.close()}
});
