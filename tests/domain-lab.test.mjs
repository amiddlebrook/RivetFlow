import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {DatabaseSync} from 'node:sqlite';
import {readdirSync,readFileSync} from 'node:fs';
const require=createRequire(import.meta.url);
const worker=require('./.compiled/index.js').default;
const domain=require('./.compiled/domain-lab.js');
const rootToken='phase22-test-root-secret';
function fixture(){
 const db=new DatabaseSync(':memory:');
 for(const file of readdirSync('migrations').filter(f=>f.endsWith('.sql')).sort())db.exec(readFileSync('migrations/'+file,'utf8'));
 const env={ADMIN_TOKEN:rootToken,DB:{prepare(sql){let x=[];return{bind(...args){x=args;return this},async first(){return db.prepare(sql).get(...x)??null},async all(){return{results:db.prepare(sql).all(...x)}},async run(){const result=db.prepare(sql).run(...x);return{meta:{changes:result.changes}}}}}}};
 return{db,env};
}
async function call(env,path,method='GET',data,token=rootToken){
 const req=new Request('https://tests.workers.dev'+path,{method,headers:{Authorization:'Bearer '+token,...(data===undefined?{}:{'Content-Type':'application/json'})},body:data===undefined?undefined:JSON.stringify(data)});
 const result=await worker.fetch(req,env);
 return{status:result.status,body:await result.json()};
}

test('preflight distinguishes AI hazards, gates and stage order',()=>{
 const unsafe=domain.preflight({steps:[{name:'Assess',kind:'ai',instruction:''},{name:'Assess',kind:'simulate',simulated_result:'none'}]});
 assert.equal(unsafe.ready,false);assert.equal(unsafe.summary.blockers,1);assert.equal(unsafe.summary.ai,1);assert.ok(unsafe.findings.some(x=>x.code==='duplicate_step'));assert.ok(unsafe.findings.some(x=>x.code==='unreviewed_ai'));
 const safe=domain.preflight({steps:[{name:'Draft',kind:'ai',instruction:'Classify request'},{name:'Manager gate',kind:'approval'},{name:'Finish',kind:'simulate'}]});
 assert.equal(safe.ready,true);assert.equal(safe.summary.approvals,1);assert.equal(safe.steps[1].approval_gate,true);
 assert.throws(()=>domain.preflight({steps:[{name:'Unknown',kind:'remote_command'}]}),/Unsupported step kind/);
});
test('authenticated preflight reads a stored workflow, rejects unknown records',async()=>{
 const{db,env}=fixture();try{
 const denied=await call(env,'/api/lab/preflight?workflow_id=missing','GET',undefined,'wrong');assert.equal(denied.status,401);
 db.prepare('INSERT INTO workflows VALUES(?,?,?,?,?,?)').run('flow-1','Back office','',JSON.stringify({steps:[{name:'Review',kind:'approval'}]}),'2026-01-01','2026-01-01');
 const ok=await call(env,'/api/lab/preflight?workflow_id=flow-1');assert.equal(ok.status,200);assert.equal(ok.body.workflow,'Back office');assert.equal(ok.body.steps.length,1);
 assert.equal(db.prepare('SELECT count(*) n FROM runs').get().n,0,'analysis cannot start runs');
 assert.equal((await call(env,'/api/lab/preflight?workflow_id=notfound')).status,404);
 }finally{db.close()}
});
