/* Calendario compartido (index.html y admin.html). Supabase vía REST, sin librerías. */
const SB="https://cldphjzjcqglbrjyhcbw.supabase.co";
const KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNsZHBoanpqY3FnbGJyanloY2J3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTMyMTA4MzgsImV4cCI6MjEwODc4NjgzOH0.3nEGjHyJ8ktwymwYOPPoLzn50gsX8z8wFqSj6M8Tnkk";

async function sb(path,{method="GET",body,token,prefer}={}){
  const r=await fetch(SB+path,{method,body:body&&JSON.stringify(body),headers:{
    apikey:KEY,Authorization:"Bearer "+(token||KEY),"Content-Type":"application/json",...(prefer&&{Prefer:prefer})}});
  if(!r.ok)throw new Error(await r.text());
  return r.status===204?null:r.json();
}

const pad=n=>String(n).padStart(2,"0");
const ymd=(y,m,d)=>`${y}-${pad(m+1)}-${pad(d)}`;
// "hoy" en Ocala (America/New_York), no en la zona del visitante
const today=()=>new Date().toLocaleDateString("en-CA",{timeZone:"America/New_York"});

async function loadCal(){
  const [rows,set]=await Promise.all([
    sb("/rest/v1/availability?select=day,status&day=gte."+today()),
    sb("/rest/v1/settings?select=open_weekdays&id=eq.1")]);
  return{map:Object.fromEntries(rows.map(r=>[r.day,r.status])),open:set[0]?.open_weekdays||[1,2,3,4,5,6]};
}

// estado efectivo: free | busy | am | pm | closed
function dayState(data,key,wd){
  const s=data.map[key];
  if(s==="open")return"free";
  if(s)return s;
  return data.open.includes(wd)?"free":"closed";
}

const L=(es,en)=>`<span lang="es">${es}</span><span lang="en">${en}</span>`;

/* opts: {data, onPick(key,state), selected, admin} */
function renderCal(el,opts){
  const t=today().split("-").map(Number);
  const now=new Date(t[0],t[1]-1,1);
  let off=opts.offset||0;
  el._opts=opts;
  const d0=new Date(now.getFullYear(),now.getMonth()+off,1);
  const y=d0.getFullYear(),m=d0.getMonth();
  const fmt=(lc,o)=>{const s=new Intl.DateTimeFormat(lc,o).format(d0);return s[0].toUpperCase()+s.slice(1)};
  const head=[0,1,2,3,4,5,6].map(i=>{const x=new Date(2024,0,7+i);
    return`<i>${L(x.toLocaleDateString("es",{weekday:"narrow"}),x.toLocaleDateString("en",{weekday:"narrow"}))}</i>`}).join("");
  let cells="".padStart(d0.getDay(),"-").split("").map(()=>"<u></u>").join("");
  const days=new Date(y,m+1,0).getDate();
  for(let d=1;d<=days;d++){
    const key=ymd(y,m,d),wd=new Date(y,m,d).getDay();
    const past=key<today();
    const st=past?"past":dayState(opts.data,key,wd);
    const dis=past||(!opts.admin&&(st==="busy"||st==="closed"));
    const tag=st==="am"?"<small>AM</small>":st==="pm"?"<small>PM</small>":"";
    cells+=`<button type="button" class="d ${st}${key===opts.selected?" sel":""}" data-k="${key}" data-w="${wd}"${dis?" disabled":""}>${d}${tag}</button>`;
  }
  const maxOff=3;
  el.innerHTML=`<div class="cal-h">
    <button type="button" class="nav" data-o="-1" aria-label="Prev"${off<=0?" disabled":""}>‹</button>
    <b>${L(fmt("es",{month:"long",year:"numeric"}),fmt("en",{month:"long",year:"numeric"}))}</b>
    <button type="button" class="nav" data-o="1" aria-label="Next"${off>=maxOff?" disabled":""}>›</button></div>
    <div class="cal-g">${head}${cells}</div>
    <div class="cal-leg"><span class="free">${L("Libre","Open")}</span><span class="am">${L("Solo mañana","Morning only")}</span><span class="pm">${L("Solo tarde","Afternoon only")}</span><span class="busy">${L("Ocupado","Booked")}</span></div>`;
  el.querySelectorAll(".nav").forEach(b=>b.onclick=()=>renderCal(el,{...opts,offset:off+ +b.dataset.o}));
  el.querySelectorAll(".d").forEach(b=>b.onclick=()=>opts.onPick(b.dataset.k,b.className,+b.dataset.w));
}

document.head.insertAdjacentHTML("beforeend",`<style>
.cal{max-width:460px;margin:28px auto 0;background:#fff;border-radius:var(--radius-lg,28px);padding:20px;box-shadow:0 20px 50px -28px rgba(10,27,77,.35)}
.cal-h{display:flex;align-items:center;justify-content:space-between;margin-bottom:14px}
.cal-h b{font:500 22px var(--f-display)}
.cal .nav{width:40px;height:40px;border-radius:50%;border:1px solid var(--sage-200);background:none;font-size:22px;cursor:pointer;color:var(--ink)}
.cal .nav:disabled{opacity:.3;cursor:default}
.cal-g{display:grid;grid-template-columns:repeat(7,1fr);gap:6px}
.cal-g i{font:600 11px var(--f-body);text-align:center;color:var(--ink-soft);text-transform:uppercase;padding-bottom:4px}
.cal .d{aspect-ratio:1;border:1px solid transparent;border-radius:12px;font:600 14px var(--f-body);cursor:pointer;display:flex;flex-direction:column;align-items:center;justify-content:center;line-height:1.1;color:var(--ink);background:var(--sage-100)}
.cal .d small{font-size:9px;letter-spacing:.06em}
.cal .d.free:hover{border-color:var(--pine-500)}
.cal .d.am{background:linear-gradient(135deg,#FBEBC2 50%,var(--sage-100) 50%)}
.cal .d.pm{background:linear-gradient(135deg,var(--sage-100) 50%,#FBEBC2 50%)}
.cal .d.busy{background:#E4C3C3;color:#6B2323;text-decoration:line-through}
.cal .d.closed,.cal .d.past{background:none;color:#9AA3B8}
.cal .d.sel{background:var(--pine-700);color:#fff;border-color:var(--gold)}
.cal .d:disabled{cursor:default}
.cal-leg{display:flex;flex-wrap:wrap;gap:6px 14px;margin-top:16px;font-size:12px;color:var(--ink-soft)}
.cal-leg>span::before{content:"";display:inline-block;width:12px;height:12px;border-radius:4px;margin-right:6px;vertical-align:-1px;background:var(--sage-100);border:1px solid var(--sage-200)}
.cal-leg .am::before{background:#FBEBC2}.cal-leg .pm::before{background:#FBEBC2}.cal-leg .busy::before{background:#E4C3C3}
</style>`);
