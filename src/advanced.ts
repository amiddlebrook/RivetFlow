import {body,first,list,execute,uid,now,json,required,fail,parseObject,type Env} from './core';
type RecoveryRow={id:string;workflow_id:string;cursor:number;updated_at:string;definition_snapshot:string};
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

 // Recovery is intentionally operator-initiated: no background replay of external AI requests.
 if(p==='/api/recovery'&&m==='GET'){
  const minutes=Math.max(1,Math.min(1440,Number(url.searchParams.get('stale_minutes'))||5));
  const cutoff=new Date(Date.now()-minutes*60000).toISOString();
  const items=await list<RecoveryRow>(env,"SELECT r.id,r.workflow_id,w.name workflow,r.cursor,r.updated_at,r.definition_snapshot FROM runs r JOIN workflows w ON w.id=r.workflow_id WHERE r.status='processing' AND r.updated_at<=? ORDER BY r.updated_at LIMIT 100",cutoff);
  return json({stale_minutes:minutes,items:items.map(x=>({...x,definition_snapshot:undefined,step_kind:parseObject<{steps:{kind:string}[]}>(x.definition_snapshot,{steps:[]}).steps[x.cursor]?.kind||'unknown'}))});
 }
 const recovery=p.match(/^\/api\/runs\/([^/]+)\/recover$/);
 if(recovery&&m==='POST'){
  const r=await first<RecoveryRow&{status:string}>(env,'SELECT * FROM runs WHERE id=?',recovery[1]);if(!r)fail(404,'Run not found');
  if(r.status!=='processing')fail(409,'Only stalled processing runs can be recovered');
  const cutoff=new Date(Date.now()-5*60000).toISOString();
  if(r.updated_at>cutoff)fail(409,'Processing lease has not expired (five minutes)');
  const kind=parseObject<{steps:{kind:string}[]}>(r.definition_snapshot,{steps:[]}).steps[r.cursor]?.kind;
  const replaySafe=kind==='simulate'||kind==='approval';
  const next=replaySafe?'running':'failed';
  const changed=await env.DB.prepare('UPDATE runs SET status=?,updated_at=? WHERE id=? AND status=? AND updated_at=?').bind(next,now(),r.id,'processing',r.updated_at).run();
  if(!changed.meta?.changes)fail(409,'Run was changed concurrently; recovery not applied');
  await execute(env,'INSERT INTO events VALUES(?,?,?,?,?,?,?)',uid(),r.id,r.cursor,'warning',replaySafe?'Stalled deterministic step released for retry':'Stalled AI step failed closed to prevent duplicate inference',JSON.stringify({step_kind:kind||'unknown',mode:replaySafe?'safe_resume':'manual_review_required'}),now());
  return json({id:r.id,status:next,step_kind:kind||'unknown',replay_safe:replaySafe,reason:replaySafe?'Deterministic or approval step can be manually resumed':'AI side effects cannot be assumed idempotent; start a new reviewed run'});
 }
 return null;
}
