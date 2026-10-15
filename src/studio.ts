import {list,json,parseObject,type Env} from './core';

export async function studioApi(req:Request,env:Env,url:URL):Promise<Response|null>{
 if(url.pathname!=='/api/studio/flow-map')return null;
 if(req.method!=='GET')return Response.json({error:'Method not allowed'},{status:405});
 const [workflows,runs,approvals]=await Promise.all([
  list<{id:string;name:string;description:string;definition:string;updated_at:string}>(env,'SELECT id,name,description,definition,updated_at FROM workflows ORDER BY updated_at DESC LIMIT 60'),
  list<{id:string;workflow_id:string;status:string;cursor:number;updated_at:string;definition_snapshot:string|null}>(env,'SELECT id,workflow_id,status,cursor,updated_at,definition_snapshot FROM runs ORDER BY updated_at DESC LIMIT 180'),
  list<{run_id:string;step_index:number;status:string}>(env,'SELECT run_id,step_index,status FROM approvals ORDER BY created_at DESC LIMIT 250')
 ]);
 return json({workflows:workflows.map(w=>({id:w.id,name:w.name,description:w.description,updated_at:w.updated_at,steps:parseObject<{steps:unknown[]}>(w.definition,{steps:[]}).steps.slice(0,25)})),runs:runs.map(r=>({id:r.id,workflow_id:r.workflow_id,status:r.status,cursor:r.cursor,updated_at:r.updated_at,steps:r.definition_snapshot?parseObject<{steps:unknown[]}>(r.definition_snapshot,{steps:[]}).steps.slice(0,25):null})),approvals,limits:{workflows:60,runs:180,approvals:250},note:'Execution rows use immutable run snapshots where present. Historical collections are bounded.'});
}
