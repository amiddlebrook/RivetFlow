// RivetFlow: domain-specific record exploration over the authenticated page of records.
export const presets=[{"id": "all", "label": "All operations"}, {"id": "attention", "label": "Attention required"}, {"id": "active", "label": "In progress"}, {"id": "complete", "label": "Completed"}];
export function filtersMarkup(total){
 return `<section class="enterprise-explorer rf-explorer" aria-label="Operations register"><div class="enterprise-explorer-copy"><span class="enterprise-explorer-overline">EXECUTION OBSERVABILITY</span><strong class="enterprise-explorer-label">Operations register</strong><small id="enterprise-record-count" aria-live="polite">${total} loaded records</small></div><div class="enterprise-explorer-controls"><label>Search records<input id="filter" class="search" type="search" placeholder="Search workflow, run, approval, or event…" autocomplete="off" /></label><label>View<select id="enterprise-preset">${presets.map(p=>`<option value="${p.id}">${p.label}</option>`).join('')}</select></label><label>Order<select id="enterprise-order"><option value="newest">Most recent</option><option value="oldest">Oldest first</option><option value="az">Title A → Z</option></select></label><button id="enterprise-export" type="button" class="btn secondary">Export visible JSON</button></div></section>`;
}
export function refineRecords(rows,{query='',preset='all',order='newest'}={}){
 const q=String(query).trim().toLocaleLowerCase();
 const matched=rows.filter(r=>{if(q&&!JSON.stringify(r).toLocaleLowerCase().includes(q))return false;
 const s=String(r.status||r.state||r.severity||'').toLowerCase();return preset==='attention'?/fail|reject|pend|approv|error|alert/.test(s):preset==='active'?/run|progress|wait|process/.test(s):preset==='complete'?/complet|approv|success/.test(s):true;
 });
 const title=r=>String(r.name||r.title||r.workflow||r.model||r.experiment||r.id||'');
 const date=r=>Date.parse(r.created_at||r.updated_at||'')||0;
 return matched.sort((a,b)=>order==='az'?title(a).localeCompare(title(b)):order==='oldest'?date(a)-date(b):date(b)-date(a));
}
