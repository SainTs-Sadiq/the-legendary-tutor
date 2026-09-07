const crypto = require('crypto');
const WINDOW_MS = 15 * 60 * 1000;
const MAX_REQUESTS = 20;
const buckets = new Map();
function json(res, status, data) { res.status(status).setHeader('Content-Type','application/json; charset=utf-8'); res.setHeader('Cache-Control','no-store'); res.end(JSON.stringify(data)); }
function ip(req) { return String(req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'unknown').split(',')[0].trim(); }
function originOK(req) { const allowed=(process.env.ALLOWED_ORIGINS||'').split(',').map(x=>x.trim()).filter(Boolean); return !allowed.length || !req.headers.origin || allowed.includes(req.headers.origin); }
function limited(key) { const now=Date.now(), x=buckets.get(key); if(!x||now-x.started>WINDOW_MS){buckets.set(key,{started:now,count:1});return false;} x.count++; return x.count>MAX_REQUESTS; }
async function body(req){let n=0,a=[];for await(const c of req){n+=c.length;if(n>65536)throw Object.assign(new Error('Request too large'),{status:413});a.push(c)}try{return JSON.parse(Buffer.concat(a).toString()||'{}')}catch{throw Object.assign(new Error('Invalid JSON'),{status:400})}}
const clean=(v,n=5000)=>typeof v==='string'?v.trim().slice(0,n):'';
function validate(p){if(!['requestTutor','becomeTutor','contact'].includes(clean(p.type,30)))return'Invalid submission type';if(clean(p.website))return'Spam detected';if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clean(p.email)))return'Valid email is required';if(!clean(p.fullName,150))return'Full name is required';if(p.type==='contact'&&!clean(p.message,10000))return'Message is required';if(p.type==='requestTutor'&&!clean(p.learningGoals,10000))return'Learning goals are required';return null;}
async function supabase(path, opts={}){const base=process.env.SUPABASE_URL,key=process.env.SUPABASE_SERVICE_ROLE_KEY;if(!base||!key)return null;const r=await fetch(`${base.replace(/\/$/,'')}/rest/v1/${path}`,{...opts,headers:{apikey:key,Authorization:`Bearer ${key}`,'Content-Type':'application/json',Prefer:'return=representation',...(opts.headers||{})}});if(!r.ok)throw new Error(`Database request failed: ${r.status}`);return r.status===204?null:r.json()}
module.exports=async function handler(req,res){
 if(req.method==='GET'){if(!process.env.ADMIN_API_KEY||req.headers.authorization!==`Bearer ${process.env.ADMIN_API_KEY}`)return json(res,401,{error:'Unauthorized'});try{return json(res,200,await supabase('submissions?select=*&order=created_at.desc')||[])}catch(e){console.error(e);return json(res,500,{error:'Unable to load submissions'})}}
 if(req.method!=='POST')return json(res,405,{error:'Method not allowed'}); if(!originOK(req))return json(res,403,{error:'Origin not allowed'}); if(limited(ip(req)))return json(res,429,{error:'Too many submissions. Please try again later.'});
 try{const p=await body(req),error=validate(p);if(error)return json(res,400,{error});const data=p.data&&typeof p.data==='object'?p.data:{};const row={id:crypto.randomUUID(),type:p.type,full_name:clean(p.fullName,150),email:clean(p.email,320),phone:clean(data['Phone Number'],60),payload:data};const saved=await supabase('submissions',{method:'POST',body:JSON.stringify(row)});if(!saved)return json(res,503,{error:'Database is not configured yet'});return json(res,201,{ok:true,id:row.id})}catch(e){console.error(e);return json(res,e.status||500,{error:'Unable to process submission'})}
};
