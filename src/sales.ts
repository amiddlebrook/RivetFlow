/** Public, same-origin consultation intake with bounded D1 writes.
 * Not a CRM or a substitute for Cloudflare abuse protection.
 */
import { body, required, fail, HttpError, uid, now, type Env } from './core';

const headers = {
  'Content-Type':'application/json; charset=utf-8',
  'Cache-Control':'no-store',
  'X-Content-Type-Options':'nosniff',
  'X-Frame-Options':'DENY',
  'Referrer-Policy':'no-referrer',
  'Content-Security-Policy':"default-src 'none'; frame-ancestors 'none'; base-uri 'none'",
};
const result=(obj:unknown,status=200)=>new Response(JSON.stringify(obj),{status,headers});
const enc=new TextEncoder();
async function hash(s:string):Promise<string>{
  const digest=await crypto.subtle.digest('SHA-256',enc.encode(s));
  return Array.from(new Uint8Array(digest)).map(b=>b.toString(16).padStart(2,'0')).join('');
}
async function quota(env:Env,bucket:string,identity:string,max:number):Promise<boolean>{
  const updated=await env.DB.prepare(`INSERT INTO sales_inquiry_limits(bucket,identity,used) VALUES(?,?,1)
    ON CONFLICT(bucket,identity) DO UPDATE SET used=used+1 WHERE used < ?
    RETURNING used`).bind(bucket,identity,max).first<{used:number}>();
  return Boolean(updated);
}
export async function publicSalesInquiry(req:Request,env:Env):Promise<Response>{
  try{
    if(req.method!=='POST')return result({error:'Method not allowed'},405);
    if(!env.ADMIN_TOKEN)return result({error:'Contact form is temporarily unavailable'},503);
    const origin=req.headers.get('Origin');
    if(origin!==new URL(req.url).origin)return result({error:'Same-origin requests only'},403);
    const data=await body(req,3600);
    // Honeypot is never shown to humans. Silent acceptance prevents easy probing.
    if(data.website)return result({received:true},202);
    if(data.consent!==true)fail(400,'Please agree to the contact-data notice');
    const name=required(data.name,'Name',90);
    const email=required(data.email,'Email',180);
    const organization=required(data.organization,'Organization',120);
    const workflow_summary=required(data.workflow_summary,'Workflow summary',1500);
    if(!/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(email))fail(400,'Please enter a valid email address');
    const ip=req.headers.get('CF-Connecting-IP')||'not-supplied';
    const bucket=new Date().toISOString().slice(0,10);
    const identifier=await hash(env.ADMIN_TOKEN+':'+bucket+':'+ip);
    if(!await quota(env,bucket,'global',25))return result({error:'Daily inquiry capacity reached. Please try again tomorrow.'},429);
    if(!await quota(env,bucket,'ip:'+identifier,3))return result({error:'Daily inquiry limit reached for this connection.'},429);
    await env.DB.prepare('INSERT INTO sales_inquiries(id,name,email,organization,workflow_summary,created_at) VALUES(?,?,?,?,?,?)')
      .bind(uid(),name,email,organization,workflow_summary,now()).run();
    return result({received:true,message:'Your inquiry was received. No purchase was made.'},201);
  }catch(error){
    if(error instanceof HttpError)return result({error:error.message},error.status);
    console.error('Sales intake failed',String(error instanceof Error?error.name:'unknown'));
    return result({error:'Unable to submit inquiry right now'},500);
  }
}
