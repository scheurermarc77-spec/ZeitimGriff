const PEOPLE=["Anouk","Leon","Daniela","Marc"],OVERVIEW="Übersicht",TARGET=510,WEEK=2550,$=s=>document.querySelector(s);
let person=localStorage.getItem("zg_person"), data={}, db=null, unsub=null; let expandedDays=new Set(); let currentView=localStorage.getItem("zg_view")||"mine";
const pad=n=>String(n).padStart(2,"0"), clock=d=>`${pad(d.getHours())}:${pad(d.getMinutes())}`, iso=d=>`${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`, fmt=m=>`${Math.floor(Math.max(0,m)/60)}:${pad(Math.round(Math.max(0,m))%60)}`;
const delta=m=>(m>0?"+ ":m<0?"− ":"± ")+fmt(Math.abs(m)), mon=d=>{let x=new Date(d);x.setHours(0,0,0,0);x.setDate(x.getDate()-((x.getDay()+6)%7));return x}, add=(d,n)=>{let x=new Date(d);x.setDate(x.getDate()+n);return x};
function ensure(ds){data[ds]??={entries:[],running:null};return data[ds]}
function mins(ds,now=new Date()){let d=data[ds],t=0;if(!d)return 0;for(const e of d.entries||[])t+=(new Date(e.end)-new Date(e.start))/60000;if(d.running&&ds===iso(now))t+=(now-new Date(d.running))/60000;return t}
function target(d){return [0,6].includes(d.getDay())?0:TARGET}
function dayType(dataset,ds){return dataset?.[ds]?.dayType||"normal"}
function effectiveTarget(dataset,ds,d){return dayType(dataset,ds)==="normal"?target(d):0}
function dayTypeLabel(type){return type==="vacation"?"Ferien":type==="holiday"?"Feiertag":""}
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
   let dset=(window.allData||{})[p]||{}, today=calcMins(dset,ds,now), todayTar=effectiveTarget(dset,ds,now), td=today-todayTar, wt=0, ws=0, workdays=0;
   for(let i=0;i<7;i++){let d=add(mo,i),dsi=iso(d),x=calcMins(dset,dsi,now),t=effectiveTarget(dset,dsi,d);wt+=x;if(t && d<=todayMid){ws+=t;workdays++;}}
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

function renderStampDetails(ds, container){
  const d=data[ds];
  const list=document.createElement("div");
  list.className="stamp-list";

  if(!d || ((!d.entries || !d.entries.length) && !d.running)){
    const empty=document.createElement("div");
    empty.className="stamp-empty";
    empty.textContent="Keine Stempelungen";
    list.appendChild(empty);
    container.appendChild(list);
    return;
  }

  (d.entries||[]).forEach((e,idx)=>{
    const a=new Date(e.start), b=new Date(e.end);
    const item=document.createElement("div");
    item.className="stamp-item";
    item.innerHTML=`<div><div class="stamp-main">${clock(a)} – ${clock(b)}</div><div class="stamp-sub">${fmt((b-a)/60000)} Arbeitszeit</div></div><button class="stamp-delete">Löschen</button>`;
    item.querySelector(".stamp-delete").onclick=async(ev)=>{
      ev.stopPropagation();
      if(!confirm(`Stempelung ${clock(a)} – ${clock(b)} wirklich löschen?`)) return;
      data[ds].entries.splice(idx,1);
      await save();
      render();
    };
    list.appendChild(item);
  });

  if(d.running){
    const a=new Date(d.running);
    const item=document.createElement("div");
    item.className="stamp-item stamp-running";
    item.innerHTML=`<div><div class="stamp-main">${clock(a)} – läuft</div><div class="stamp-sub">Aktuell eingestempelt</div></div>`;
    list.appendChild(item);
  }

  container.appendChild(list);

  const type=dayType(data,ds);
  const controls=document.createElement("div");
  controls.className="daytype-box";
  controls.innerHTML=`<div class="daytype-label">Tag deklarieren</div>
  <div class="daytype-actions">
    <button class="daytype-btn ${type==="normal"?"active":""}" data-type="normal">Arbeitstag</button>
    <button class="daytype-btn vacation ${type==="vacation"?"active":""}" data-type="vacation">Ferien</button>
    <button class="daytype-btn holiday ${type==="holiday"?"active":""}" data-type="holiday">Feiertag</button>
  </div>`;
  controls.querySelectorAll(".daytype-btn").forEach(btn=>{
    btn.onclick=async(ev)=>{
      ev.stopPropagation();
      const next=btn.dataset.type;
      ensure(ds).dayType=next;
      await save();
      expandedDays.add(ds);
      render();
    };
  });
  container.appendChild(controls);
}

function render(){
if(currentView==="overview"){renderOverview();return}
$("#tabOverview").classList.remove("active");$("#tabMine").classList.add("active");
document.querySelector(".hero").classList.remove("hidden");document.querySelector(".stats").classList.remove("hidden");document.querySelector(".week").classList.remove("hidden");$("#overviewCard").classList.add("hidden");
if(!person){$("#sheet").classList.remove("hidden");return}
$("#personBtn").textContent=person;
let now=new Date(),ds=iso(now),m=mins(ds,now),tar=effectiveTarget(data,ds,now),dd=m-tar;
$("#date").textContent=now.toLocaleDateString("de-CH",{weekday:"long",day:"numeric",month:"long"});
$("#today").textContent=fmt(m);
$("#delta").textContent=delta(dd);
$("#delta").className=tar?(dd>=0?"good":"bad"):(m>0?"good":"");
const currentType=dayType(data,ds);
$("#target").textContent=tar?`Soll ${fmt(tar)}`:(currentType!=="normal"?`${dayTypeLabel(currentType)} · Soll 0:00`:"Kein Soll");
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
  let d=add(mo,i), s=iso(d), x=mins(s,now), t=effectiveTarget(data,s,d), z=x-t, dtype=dayType(data,s);
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

  let wrap=document.createElement("div"); wrap.className="day-wrap";
  let r=document.createElement("div"); r.className="day";
  const stampCount=(data[s]?.entries||[]).length + (data[s]?.running?1:0);
  r.innerHTML=`<div><b>${d.toLocaleDateString("de-CH",{weekday:"short"})}</b><div>${d.toLocaleDateString("de-CH",{day:"2-digit",month:"2-digit"})}</div>${dtype!=="normal"?`<span class="daytype-badge ${dtype}">${dayTypeLabel(dtype)}</span>`:""}</div><div>${t?`Soll ${fmt(t)}`:(dtype!=="normal"?"Soll 0:00":"ohne Soll")}<div>${stampCount} Stempelung${stampCount===1?"":"en"} <span class="day-chevron">${expandedDays.has(s)?"▲":"▼"}</span></div></div><div><strong>${fmt(x)}</strong><div class="${t?(z>=0?"good":"bad"):(x?"good":"")}">${t?delta(z):(x?"+ "+fmt(x):"± 0:00")}</div></div>`;
  let det=document.createElement("div"); det.className="day-details"+(expandedDays.has(s)?"":" hidden");
  renderStampDetails(s,det);
  r.onclick=()=>{if(expandedDays.has(s))expandedDays.delete(s);else expandedDays.add(s);render();};
  wrap.appendChild(r); wrap.appendChild(det); box.appendChild(wrap);
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
$("#manual").onclick=()=>{const n=new Date(),ds=iso(n),tm=clock(n);$("#pDate").value=ds;$("#pTime").value=tm;$("#mDate").value=ds;$("#mStart").value="08:00";$("#mEnd").value="17:00";$("#modePunch").classList.add("active");$("#modeRange").classList.remove("active");$("#punchPanel").classList.remove("hidden");$("#rangePanel").classList.add("hidden");$("#manualSheet").classList.remove("hidden")};$("#cancel").onclick=()=>$("#manualSheet").classList.add("hidden");
$("#modePunch").onclick=()=>{$("#modePunch").classList.add("active");$("#modeRange").classList.remove("active");$("#punchPanel").classList.remove("hidden");$("#rangePanel").classList.add("hidden")};
$("#modeRange").onclick=()=>{$("#modeRange").classList.add("active");$("#modePunch").classList.remove("active");$("#rangePanel").classList.remove("hidden");$("#punchPanel").classList.add("hidden")};
$("#manualIn").onclick=async()=>{const ds=$("#pDate").value,tm=$("#pTime").value;if(!ds||!tm)return alert("Bitte Datum und Zeit eingeben.");const d=ensure(ds);if(d.running)return alert(`Für diesen Tag gibt es bereits eine offene Einstempelung um ${clock(new Date(d.running))}.`);d.running=new Date(`${ds}T${tm}:00`).toISOString();await save();$("#manualSheet").classList.add("hidden");expandedDays.add(ds);render()};
$("#manualOut").onclick=async()=>{const ds=$("#pDate").value,tm=$("#pTime").value;if(!ds||!tm)return alert("Bitte Datum und Zeit eingeben.");const d=ensure(ds);if(!d.running)return alert("Für diesen Tag gibt es keine offene Einstempelung. Bitte zuerst eine Einstempelzeit erfassen.");const a=new Date(d.running),b=new Date(`${ds}T${tm}:00`);if(b<=a)return alert(`Die Ausstempelzeit muss nach ${clock(a)} liegen.`);d.entries.push({start:d.running,end:b.toISOString()});d.entries.sort((x,y)=>new Date(x.start)-new Date(y.start));d.running=null;await save();$("#manualSheet").classList.add("hidden");expandedDays.add(ds);render()};
$("#saveManual").onclick=async()=>{let ds=$("#mDate").value,st=$("#mStart").value,en=$("#mEnd").value,a=new Date(`${ds}T${st}:00`),b=new Date(`${ds}T${en}:00`);if(b<=a)return alert("Endzeit muss nach Startzeit liegen.");ensure(ds).entries.push({start:a.toISOString(),end:b.toISOString()});ensure(ds).entries.sort((x,y)=>new Date(x.start)-new Date(y.start));await save();$("#manualSheet").classList.add("hidden");expandedDays.add(ds);render()};

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