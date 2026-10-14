import {body,first,list,execute,uid,now,json,required,fail,parseObject,type Env} from './core';
type Row={id:string;workflow_id:string;status:string;cursor:number;updated_at:string;definition:string;description:string};
export async function advancedApi(req:Request,env:Env,url:URL):Promise<Response|null>{
 const p=url.pathname,m=req.method;
 if(p==='/api/operational-events'&&m==='GET')return json({items:await list(env,'SELECT e.*,w.name workflow FROM events e JOIN runs r ON r.id=e.run_id JOIN workflows w ON w.id=r.workflow_id ORDER BY e.created_at DESC LIMIT 100')});
 const cancel=p.match(/^\/api\/runs\/([^/]+)\/cancel$/);
 if(cancel&&m==='POST'){
  const r=await first<Row>(env,'SELECT * FROM runs WHERE id=?',cancel[1]);if(!r)fail(404,'Run not found');
  const result=await env.DB.prepare("UPDATE runs SET status='cancelled',updated_at=? WHERE id=? AND status IN ('running','waiting_approval')").bind(now(),r.id).run();
  if(!result.meta?.changes)fail(409,'Only running or approval-waiting runs can be cancelled');
  await execute(env,"UPDATE approvals SET status='cancelled',decided_at=? WHERE run_id=? AND status='pending'",now(),r.id);
  await execute(env,'INSERT INTO events VALUES(?,?,?,?,?,?,?)',uid(),r.id,r.cursor,'warning','Run cancelled by operator','{}',now());
  return json({id:r.id,status:'cancelled'});
 }
 const revision=p.match(/^\/api\/workflows\/([^/]+)\/revisions$/);
 if(revision&&m==='GET')return json({items:await list(env,'SELECT id,workflow_id,version,description,created_at FROM workflow_revisions WHERE workflow_id=? ORDER BY version DESC',revision[1])});
 if(revision&&m==='POST'){
  const w=await first<Row>(env,'SELECT * FROM workflows WHERE id=?',revision[1]);if(!w)fail(404,'Workflow not found');
  const b=await body(req); const definition=typeof b.definition==='string'?parseObject<any>(b.definition,null):b.definition;
  if(!definition||!Array.isArray(definition.steps)||definition.steps.length===0||definition.steps.length>25)fail(400,'Definition must have 1-25 steps');
  for(const step of definition.steps)if(!step||typeof step.name!=='string'||!step.name.trim()||!['simulate','ai','approval'].includes(step.kind))fail(400,'Every step needs a name and recognized kind');
  const definitionText=JSON.stringify({steps:definition.steps.map((s:any)=>({name:required(s.name,'step name',100),kind:s.kind,instruction:String(s.instruction||'').slice(0,2000),simulated_result:String(s.simulated_result||'').slice(0,2000)}))});
  const previous=await first<{version:number}>(env,'SELECT COALESCE(MAX(version),0) version FROM workflow_revisions WHERE workflow_id=?',w.id);
  const version=Number(previous?.version||0)+1;const timestamp=now();
  const updated=await env.DB.prepare('UPDATE workflows SET definition=?,description=?,updated_at=? WHERE id=? AND updated_at=?').bind(definitionText,String(b.description||w.description).slice(0,2000),timestamp,w.id,w.updated_at).run();
  if(!updated.meta?.changes)fail(409,'Workflow changed concurrently; retry with fresh state');
  await execute(env,'INSERT INTO workflow_revisions VALUES(?,?,?,?,?,?)',uid(),w.id,version,definitionText,String(b.description||'').slice(0,2000),timestamp);
  return json({workflow_id:w.id,version,immutable_running_snapshots:true},201);
 }
 return null;
}
