export function preflightHandoff(report){
 const lines=[`RIVETFLOW PREFLIGHT · ${report.ready?'NO BLOCKERS':'REQUIRES REVIEW'}`,`Stages: ${report.summary.total}; AI tasks: ${report.summary.ai}; human approvals: ${report.summary.approvals}`,`Mode: ${report.mode}`,'STAGES',...report.steps.map((step,i)=>`${i+1}. ${step.name} [${step.kind}]`),'FINDINGS',...(report.findings.length?report.findings.map(f=>`[${f.severity}] ${f.message}`):['None'])];
 return lines.join('\n');
}
export async function renderDomainLab({root,api,esc,success,error}){
 const workflows=(await api('/api/workflows')).items||[];
 root.innerHTML=`<section class="lab-hero"><p class="lab-kicker">RIVETFLOW · OPERATIONS ASSURANCE</p><h2>Runbook preflight</h2><p>Review stage order, AI instructions and approval coverage before dispatch. Preflight is read-only and never launches a run.</p></section><div class="lab-layout"><form id="lab-form" class="lab-panel"><h3>Runbook inspection</h3><label for="lab-workflow">Stored workflow</label><select id="lab-workflow" required>${workflows.map(w=>`<option value="${esc(w.id)}">${esc(w.name)}</option>`).join('')}</select><p class="lab-caption">A point-in-time assessment of the stored runbook definition.</p><button type="submit" ${workflows.length?'':'disabled'}>Inspect runbook</button></form><section class="lab-panel"><h3>Dispatch safety review</h3><div id="lab-results" aria-live="polite"><p>${workflows.length?'Select a runbook to inspect its stage gates.':'Create a workflow before running preflight.'}</p></div></section></div>`;
 let handoff='';
 root.querySelector('#lab-form').onsubmit=async e=>{e.preventDefault();try{
 const id=root.querySelector('#lab-workflow').value;
 const r=await api('/api/lab/preflight?workflow_id='+encodeURIComponent(id));handoff=preflightHandoff(r);
 const steps=r.steps.map((s,i)=>`<li><strong>${i+1}. ${esc(s.name)}</strong><span class="${s.kind==='approval'?'lab-step-approval':s.kind==='ai'?'lab-step-ai':''}">${esc(s.kind)}</span></li>`).join('');
 const findings=r.findings.length?`<ul class="lab-findings">${r.findings.map(f=>`<li><strong>${esc(f.severity)}</strong> ${esc(f.message)}</li>`).join('')}</ul>`:'<p>No advisory findings.</p>';
 root.querySelector('#lab-results').innerHTML=`<p class="lab-status ${r.ready?'good':'bad'}">${r.ready?'No blocking issues':'Review blocking issues before dispatch'}</p><div class="lab-stats"><span>${r.summary.total} stages</span><span>${r.summary.ai} AI stages</span><span>${r.summary.approvals} approvals</span></div><h4>Sequence and gates</h4><ol class="lab-steps">${steps}</ol><h4>Preflight findings</h4>${findings}<div class="lab-toolbar"><p class="lab-caption">${esc(r.mode)} · Report is not an authorization to run</p><button type="button" id="lab-copy">Copy handoff</button></div>`;
 root.querySelector('#lab-copy').onclick=async()=>{try{await navigator.clipboard.writeText(handoff);success('Operator handoff copied')}catch(e){error(e)}};
 success('Read-only runbook preflight complete');
 }catch(ex){error(ex)}};
}
