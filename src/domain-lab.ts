import {body,first,fail,json,parseObject,required,type Env} from './core';
type Step={name:string;kind:string;instruction?:string;simulated_result?:string};
type Finding={step:number;severity:'blocker'|'review'|'info';code:string;message:string};
export function preflight(definition:unknown){
 const input=definition as {steps?:Step[]};
 if(!input||!Array.isArray(input.steps)||input.steps.length<1||input.steps.length>25)fail(400,'A runbook requires 1–25 steps');
 const findings:Finding[]=[];
 const names=new Set<string>();let ai=0,approvals=0,simulated=0;
 const timeline=input.steps.map((raw,i)=>{
  const step=raw as Step;
  if(!step||typeof step.name!=='string'||!step.name.trim()||step.name.length>100)fail(400,`Step ${i+1} requires a name up to 100 characters`);
  if(!['simulate','ai','approval'].includes(step.kind))fail(400,`Unsupported step kind at ${i+1}`);
  const key=step.name.trim().toLowerCase();
  if(names.has(key))findings.push({step:i+1,severity:'review',code:'duplicate_step',message:'Step names must be distinguishable in run history'});
  names.add(key);
  if(step.kind==='ai'){
   ai++;
   if(!step.instruction?.trim())findings.push({step:i+1,severity:'blocker',code:'missing_instruction',message:'AI step has no task instruction'});
   if(!(input.steps as Step[]).slice(i+1).some((s:any)=>s?.kind==='approval'))findings.push({step:i+1,severity:'review',code:'unreviewed_ai',message:'AI output has no downstream human approval gate'});
  }
  if(step.kind==='approval')approvals++;
  if(step.kind==='simulate')simulated++;
  return {ordinal:i+1,name:step.name.trim(),kind:step.kind,approval_gate:step.kind==='approval',requires_ai:step.kind==='ai'};
 });
 if(approvals===0&&ai>0)findings.push({step:0,severity:'review',code:'no_approval',message:'Runbook contains AI steps but no approval gate'});
 if(timeline.at(-1)?.kind==='approval')findings.push({step:timeline.length,severity:'info',code:'terminal_approval',message:'Approval is the terminal action; the run will close immediately when approved'});
 return {ready:findings.every(f=>f.severity!=='blocker'),steps:timeline,findings,summary:{total:timeline.length,ai,approvals,simulated,blockers:findings.filter(f=>f.severity==='blocker').length,reviews:findings.filter(f=>f.severity==='review').length},mode:'static analysis; no run was started or external action executed'};
}
export async function domainLabApi(req:Request,env:Env,url:URL):Promise<Response|null>{
 if(url.pathname!=='/api/lab/preflight')return null;
 if(req.method==='POST')return json(preflight((await body(req)).definition));
 if(req.method==='GET'){
  const id=required(url.searchParams.get('workflow_id'),'workflow_id',100);
  const row=await first<{definition:string;name:string}>(env,'SELECT definition,name FROM workflows WHERE id=?',id);
  if(!row)fail(404,'Workflow not found');
  return json({workflow:row.name,...preflight(parseObject(row.definition,{}))});
 }
 return null;
}
