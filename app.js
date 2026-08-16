const PEOPLE=["Anouk","Leon","Daniela","Marc"],OVERVIEW="Übersicht",TARGET=510,WEEK=2550,$=s=>document.querySelector(s);
let person=localStorage.getItem("zg_person"), data={}, db=null, unsub=null; let currentView=localStorage.getItem("zg_view")||"mine";
const pad=n=>String(n).padStart(2,"0"), iso=d=>`${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`, fmt=m=>`${Math.floor(Math.max(0,m)/60)}:${pad(Math.round(Math.max(0,m))%60)}`;
const delta=m=>(m>0?"+ ":m<0?"− ":"± ")+fmt(Math.abs(m)), mon=d=>{let x=new Date(d);x.setHours(0,0,0,0);x.setDate(x.getDate()-((x.getDay()+6)%7));return x}, add=(d,n)=>{let x=new Date(d);x.setDate(x.getDate()+n);return x};
function ensure(ds){data[ds]??={entries:[],running:null};return data[ds]}
function mins(ds,now=new Date()){let d=data[ds],t=0;if(!d)return 0;for(const e of d.entries||[])t+=(new Date(e.end)-new Date(e.start))/60000;if(d.running)t+=(now-new Date(d.running))/60000;return t}
function target(d){return [0,6].includes(d.getDay())?0:TARGET}
async function initFB(){const cfg=window.TIMEAPP_FIREBASE_CONFIG;if(!cfg)return;const {initializeApp}=await import("https://www.gstatic.com/firebasejs/12.2.1/firebase-app.js");const {getFirestore,doc,setDoc,onSnapshot}=await import("https://www.gstatic.com/firebasejs/12.2.1/firebase-firestore.js");db=getFirestore(initializeApp(cfg));window.F={doc,setDoc,onSnapshot}}
function subscribe(){
if(unsub){ if(Array.isArray(unsub))unsub.forEach(u=>u()); else unsub(); }
if(!person)return;
if(person===OVERVIEW){
  window.allData={}; let us=[];
  PEOPLE.forEach(p=>{
    let ref=F.doc(db,"timeappUsers",p);
    us.push(F.onSnapshot(ref,snap=>{window.allData[p]=snap.exists()?(snap.data().days||{}):{};renderOverview()}));
  });
  unsub=us; renderOverview(); return;
}
const ref=F.doc(db,"timeappUsers",person);
unsub=F.onSnapshot(ref,s=>{data=s.exists()?(s.data().days||{}):{};render()});
}
async function save(){await F.setDoc(F.doc(db,"timeappUsers",person),{days:data,updatedAt:new Date().toISOString()},{merge:true})}
function calcMins(dataset,ds,now=new Date()){let d=dataset?.[ds],t=0;if(!d)return 0;for(const e of d.entries||[])t+=(new Date(e.end)-new Date(e.start))/60000;if(d.running)t+=(now-new Date(d.running))/60000;return t}
function renderOverview(){
 if(currentView!=="overview")return;
 $("#tabMine").classList.remove("active");$("#tabOverview").classList.add("active");
 $("#personBtn").textContent=OVERVIEW;
 document.querySelector(".hero").classList.add("hidden");
 document.querySelector(".stats").classList.add("hidden");
 document.querySelector(".week").classList.add("hidden");
 $("#overviewCard").classList.remove("hidden");
 let now=new Date(),ds=iso(now),mo=mon(now),todayMid=new Date(now.getFullYear(),now.getMonth(),now.getDate()),box=$("#overview"); box.innerHTML="";
 PEOPLE.forEach(p=>{
   let dset=(window.allData||{})[p]||{}, today=calcMins(dset,ds,now), todayTar=target(now), td=today-todayTar, wt=0, ws=0, workdays=0;
   for(let i=0;i<7;i++){let d=add(mo,i),x=calcMins(dset,iso(d),now),t=target(d);wt+=x;if(t && d<=todayMid){ws+=t;workdays++;}}
   let wd=wt-ws, av=workdays?wt/workdays:0;
   let div=document.createElement("div");div.className="overview-person";
   div.innerHTML=`<div class="overview-name">${p}</div><div class="overview-grid">
   <div class="overview-box"><span>HEUTE</span><strong>${fmt(today)}</strong><div class="${todayTar?(td>=0?"good":"bad"):(today?"good":"")}">${todayTar?delta(td):(today?"+ "+fmt(today):"± 0:00")}</div></div>
   <div class="overview-box"><span>WOCHE</span><strong>${fmt(wt)}</strong><div class="${wd>=0?"good":"bad"}">${delta(wd)}</div></div>
   <div class="overview-box"><span>WOCHENSOLL</span><strong>${fmt(ws)}</strong></div>
   <div class="overview-box"><span>Ø PRO TAG</span><strong>${fmt(av)}</strong></div></div>`;
   box.appendChild(div);
 });
}
function render(){
if(currentView==="overview"){renderOverview();return}
$("#tabOverview").classList.remove("active");$("#tabMine").classList.add("active");
document.querySelector(".hero").classList.remove("hidden");document.querySelector(".stats").classList.remove("hidden");document.querySelector(".week").classList.remove("hidden");$("#overviewCard").classList.add("hidden");
if(!person){$("#sheet").classList.remove("hidden");return}
$("#personBtn").textContent=person;
let now=new Date(),ds=iso(now),m=mins(ds,now),tar=target(now),dd=m-tar;
$("#date").textContent=now.toLocaleDateString("de-CH",{weekday:"long",day:"numeric",month:"long"});
$("#today").textContent=fmt(m);
$("#delta").textContent=delta(dd);
$("#delta").className=tar?(dd>=0?"good":"bad"):(m>0?"good":"");
$("#target").textContent=tar?`Soll ${fmt(tar)}`:"Kein Soll";
$("#fill").style.width=tar?Math.min(100,m/tar*100)+"%":(m?"100%":"0%");
let run=!!data[ds]?.running;
$("#status").textContent=run?"Arbeitszeit läuft …":"Nicht am Arbeiten";
$("#toggle").textContent=run?"■ Stopp":"▶ Start";

let mo=mon(now), we=0, box=$("#days"); box.innerHTML="";
let todayMid=new Date(now.getFullYear(),now.getMonth(),now.getDate());
let sun=add(mo,6);
let isCurrentWeek=todayMid>=mo && todayMid<=sun;
let weekSoll=0, relevantWorkdays=0;

for(let i=0;i<7;i++){
  let d=add(mo,i), s=iso(d), x=mins(s,now), t=target(d), z=x-t;
  we+=x;

  // In der laufenden Woche nur Soll bis einschliesslich heute.
  // In abgeschlossenen Wochen gilt das volle Mo-Fr-Soll.
  let dMid=new Date(d.getFullYear(),d.getMonth(),d.getDate());
  if(t){
    if(!isCurrentWeek || dMid<=todayMid){
      weekSoll+=t;
      relevantWorkdays++;
    }
  }

  let r=document.createElement("div"); r.className="day";
  r.innerHTML=`<div><b>${d.toLocaleDateString("de-CH",{weekday:"short"})}</b><div>${d.toLocaleDateString("de-CH",{day:"2-digit",month:"2-digit"})}</div></div><div>${t?`Soll ${fmt(t)}`:"ohne Soll"}</div><div><strong>${fmt(x)}</strong><div class="${t?(z>=0?"good":"bad"):(x?"good":"")}">${t?delta(z):(x?"+ "+fmt(x):"± 0:00")}</div></div>`;
  box.appendChild(r);
}

$("#week").textContent=fmt(we);
let wd=we-weekSoll;
$("#weekDelta").textContent=`Soll ${fmt(weekSoll)} · ${delta(wd)}`;
$("#weekDelta").className=wd>=0?"good":"bad";

// Laufende Woche: Durchschnitt der bisher relevanten Arbeitstage.
// Am Wochenende bleibt der Nenner bei den 5 Arbeitstagen.
// Falls noch kein Arbeitstag relevant ist: 0:00.
$("#avg").textContent=relevantWorkdays?fmt(we/relevantWorkdays):"0:00";

$("#range").textContent=`${mo.toLocaleDateString("de-CH",{day:"2-digit",month:"2-digit"})} – ${sun.toLocaleDateString("de-CH",{day:"2-digit",month:"2-digit",year:"numeric"})}`;
}
$("#toggle").onclick=async()=>{let now=new Date(),ds=iso(now),d=ensure(ds);if(d.running){d.entries.push({start:d.running,end:now.toISOString()});d.running=null}else d.running=now.toISOString();await save();render()}
$("#personBtn").onclick=()=>$("#sheet").classList.remove("hidden");PEOPLE.forEach(p=>{let b=document.createElement("button");b.className="person";b.textContent=p;b.onclick=()=>{person=p;localStorage.setItem("zg_person",p);$("#sheet").classList.add("hidden");subscribe()};$("#people").appendChild(b)});
$("#manual").onclick=()=>{$("#mDate").value=iso(new Date());$("#mStart").value="08:00";$("#mEnd").value="17:00";$("#manualSheet").classList.remove("hidden")};$("#cancel").onclick=()=>$("#manualSheet").classList.add("hidden");$("#saveManual").onclick=async()=>{let ds=$("#mDate").value,s=$("#mStart").value,e=$("#mEnd").value,a=new Date(`${ds}T${s}`),b=new Date(`${ds}T${e}`);if(b<=a)return alert("Endzeit muss nach Startzeit liegen.");ensure(ds).entries.push({start:a.toISOString(),end:b.toISOString()});await save();$("#manualSheet").classList.add("hidden");render()};

$("#tabMine").onclick=()=>{
  currentView="mine";localStorage.setItem("zg_view","mine");
  if(!person||person===OVERVIEW){person=PEOPLE[0];localStorage.setItem("zg_person",person);subscribe();}
  render();
};
$("#tabOverview").onclick=()=>{
  currentView="overview";localStorage.setItem("zg_view","overview");
  if(unsub){if(Array.isArray(unsub))unsub.forEach(u=>u());else unsub();}
  window.allData={};let us=[];
  PEOPLE.forEach(p=>{
    let ref=F.doc(db,"timeappUsers",p);
    us.push(F.onSnapshot(ref,snap=>{window.allData[p]=snap.exists()?(snap.data().days||{}):{};renderOverview()}));
  });
  unsub=us;renderOverview();
};

await initFB();
if(currentView==="overview"){$("#tabOverview").click();}
else{
  if(person&&person!==OVERVIEW)subscribe();
  else{person=PEOPLE[0];localStorage.setItem("zg_person",person);subscribe();}
}
setInterval(()=>{if(currentView==="overview")renderOverview();else render();},1000);
if("serviceWorker"in navigator)navigator.serviceWorker.register("./sw.js");