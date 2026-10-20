/* RivetFlow implementation offer: self-hosted only, CSP-compatible. */
(()=>{
  const ids=['people','hours','cost','recover'];
  const fields=ids.map(x=>document.getElementById(x));
  const output=document.getElementById('result');
  if(fields.every(Boolean)&&output){
    const update=()=>{
      const [people,hours,cost,recovery]=fields.map(el=>Math.max(0,Number(el.value)||0));
      const value=Math.min(1e9,people*hours*cost*52*Math.min(100,recovery)/100);
      output.textContent=new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',maximumFractionDigits:0}).format(value);
    };
    fields.forEach(field=>field.addEventListener('input',update));
    update();
  }
  const form=document.getElementById('inquiry-form');
  if(!form)return;
  const status=document.getElementById('inquiry-status');
  const button=document.getElementById('submit-inquiry');
  form.addEventListener('submit',async(event)=>{
    event.preventDefault();
    if(!form.reportValidity())return;
    button.disabled=true;
    status.textContent='Submitting securely…';
    const data=Object.fromEntries(new FormData(form));
    data.consent=Boolean(document.getElementById('inq-consent').checked);
    try{
      const response=await fetch('/api/sales/inquiries',{
        method:'POST',
        headers:{'Content-Type':'application/json'},
        credentials:'same-origin',
        body:JSON.stringify(data),
      });
      const answer=await response.json();
      if(!response.ok)throw new Error(answer.error||'Could not submit');
      status.textContent='Inquiry received. No payment was taken.';
      form.reset();
    }catch(error){
      status.textContent=error instanceof Error?error.message:'Submission failed. Please try again.';
    }finally{button.disabled=false}
  });
})();
