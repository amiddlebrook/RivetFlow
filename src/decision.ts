import {body,first,list,execute,json,required,fail,now,type Env} from './core';
type Policy={workflow_id:string;name:string;target_minutes:number;severity:string;updated_at:string};
type Run={id:string;workflow_id:string;status:string;created_at:string;updated_at:string};
export function classifyRun(run:Run,target:number,at=Date.now()){
 const elapsed=Math.max(0,Math.floor((at-Date.parse(run.created_at))/60000));
 const pending=['running','processing','waiting_approval'].includes(run.status);
 return {elapsed_minutes:elapsed,breached:pending&&elapsed>target,status:pending?(elapsed>target?'breached':'within_target'):'finished'};
}
export async function decisionApi(req:Request,env:Env,url:URL):Promise<Response|null>{
 const p=url.pathname;
 if(p==='/api/decision/slas'&&req.method==='GET'){
  const [policies,workflows,runs]=await Promise.all([list<Policy>(env,'SELECT p.*,w.name FROM workflow_slas p JOIN workflows w ON w.id=p.workflow_id ORDER BY w.name LIMIT 100'),list<{id:string;name:string}>(env,'SELECT id,name FROM workflows ORDER BY name LIMIT 100'),list<Run>(env,"SELECT id,workflow_id,status,created_at,updated_at FROM runs WHERE status IN ('running','processing','waiting_approval') ORDER BY created_at DESC LIMIT 300")]);
  const targets=new Map(policies.map(x=>[x.workflow_id,x.target_minutes]));
  const monitored=runs.filter(x=>targets.has(x.workflow_id)).map(x=>({...x,...classifyRun(x,targets.get(x.workflow_id)!)}));
  return json({policies,workflows,runs:monitored,summary:{monitored:monitored.length,breached:monitored.filter(x=>x.breached).length},limits:{runs:300},note:'SLA age is measured from workflow start; this is a monitoring policy, not scheduled job execution.'});
 }
 if(p==='/api/decision/slas'&&req.method==='POST'){
  const b=await body(req,6000);const id=required(b.workflow_id,'workflow_id',100);const w=await first(env,'SELECT id FROM workflows WHERE id=?',id);if(!w)fail(404,'Workflow not found');
  const minutes=Number(b.target_minutes);if(!Number.isInteger(minutes)||minutes<1||minutes>10080)fail(400,'target_minutes must be an integer from 1 to 10080');
  const severity=b.severity??'warning';if(!['warning','critical'].includes(severity))fail(400,'severity must be warning or critical');
  await execute(env,'INSERT INTO workflow_slas(workflow_id,target_minutes,severity,updated_at) VALUES(?,?,?,?) ON CONFLICT(workflow_id) DO UPDATE SET target_minutes=excluded.target_minutes,severity=excluded.severity,updated_at=excluded.updated_at',id,minutes,severity,now());return json({saved:true,workflow_id:id,target_minutes:minutes},200);
 }
 if(p.startsWith('/api/decision/'))fail(404,'Unknown SLA endpoint');return null;
}
