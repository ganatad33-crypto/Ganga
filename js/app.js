/* אפליקציית ניהול מלאי — הלוגיקה הועברה אחד-לאחד מהאב-טיפוס (mlay3.html),
 * בתוספת: אחסון עמיד (window.storage מ-js/db.js), PWA, גיבוי/שחזור JSON.
 * מבנה הנתונים ומפתחות השמירה זהים לאב-טיפוס — נתונים קיימים נשמרים.
 */
let MODE="work";
const KEYS={work:"inventory-app-v1",test:"inventory-app-test-v1"};
const KEY=()=>KEYS[MODE];
const store = (window.storage && window.storage.get) ? window.storage : {
  async get(k){ const v = localStorage.getItem(k); return v===null ? null : {key:k, value:v}; },
  async set(k,v){ localStorage.setItem(k,v); return {key:k, value:v}; }
};
let state=null, filter="all", query="", cur=null, mode="pull";
const $=id=>document.getElementById(id);
const fmt=n=>n.toLocaleString("he-IL");
const today=()=>new Date().toLocaleDateString("he-IL");

async function load(){
  try{const m=await store.get("inv-meta");if(m&&m.value)MODE=(JSON.parse(m.value).mode)||"work";}catch(e){}
  state=null;
  try{
    const r=await store.get(KEY());
    if(r&&r.value){state=JSON.parse(r.value);}
  }catch(e){/* first run */}
  if(!state){
    state={boxes:{},shelf:{},mov:[]};
    CATALOG.forEach(x=>{state.boxes[x.id]=x.b0;state.shelf[x.id]=0;});
    await save();
  }
  if(!state.shelf)state.shelf={};
  CATALOG.forEach(x=>{if(state.boxes[x.id]===undefined)state.boxes[x.id]=x.b0;if(state.shelf[x.id]===undefined)state.shelf[x.id]=0;});
  updModeUI();render();
}
function updModeUI(){
  $("modeBadge").style.display=MODE==="test"?"inline":"none";
  const t=$("modeToggle");if(t)t.textContent=MODE==="test"?"חזרה למצב עבודה ✅":"מעבר למצב טסט 🧪";
}
async function switchMode(){
  MODE=MODE==="test"?"work":"test";
  try{await store.set("inv-meta",JSON.stringify({mode:MODE}));}catch(e){}
  await load();
  toast(MODE==="test"?"עברת למצב טסט 🧪":"חזרת למצב עבודה ✅");
}
async function resetData(){
  const label=MODE==="test"?"הטסט":"העבודה";
  if(!confirm("לאפס את כל נתוני מצב "+label+"? כל התנועות יימחקו והמלאי יחזור לספירה המקורית."))return;
  state={boxes:{},shelf:{},mov:[]};
  CATALOG.forEach(x=>{state.boxes[x.id]=x.b0;state.shelf[x.id]=0;});
  await save();render();toast("הנתונים אופסו 🗑️");
}
async function save(){
  $("saveState").textContent="שומר…";
  try{
    await store.set(KEY(),JSON.stringify(state));
    $("saveState").textContent="נשמר";
  }catch(e){
    $("saveState").textContent="שגיאת שמירה";
  }
}
// --- Android back button support ---
let openPanels=[],suppressPop=0;
function panelOpen(name){
  openPanels.push(name);
  history.pushState({p:name},"");
}
function panelClosedByUI(){
  // הממשק כבר סגר את החלון — צורכים את רשומת ההיסטוריה ובולעים את ה-popstate שבדרך
  if(openPanels.length){openPanels.pop();suppressPop++;history.back();}
}
window.addEventListener("popstate",()=>{
  if(suppressPop>0){suppressPop--;return;}
  // hardware back pressed
  const name=openPanels.pop();
  if(name==="sheet"){$("overlay").classList.remove("show");$("sheet").classList.remove("show");cur=null;}
  else if(name==="help")$("helpSheet").classList.remove("show");
  else if(name==="batch")$("batchSheet").classList.remove("show");
});
function paceInfo(x){
  // learn real usage pace from pull movements
  const pulls=state.mov.filter(m=>m.id===x.id&&m.kind==="pull");
  if(pulls.length<2)return null;
  const first=pulls[0].ts,last=pulls[pulls.length-1].ts;
  const days=Math.max(1,(last-first)/86400000);
  const totalBoxes=pulls.reduce((s,m)=>s+m.boxes,0);
  const perDay=totalBoxes/days; // boxes per day pulled to shelf
  if(perDay<=0)return null;
  const left=state.boxes[x.id];
  const daysLeft=left/perDay;
  return{perDay,daysLeft,pulls:pulls.length};
}
function total(x){return state.boxes[x.id]+(state.shelf[x.id]||0);}
function status(x){
  const u=total(x)*x.pb;
  if(u===0)return{cls:"s-bad",b:"b-bad",txt:"אזל"};
  if(u<x.c)return{cls:"s-bad",b:"b-bad",txt:"חוסר"};
  if(u<x.c*1.2)return{cls:"s-warn",b:"b-warn",txt:"גבולי"};
  return{cls:"s-ok",b:"b-ok",txt:"תקין"};
}
function usagePace(x){
  const evs=state.mov.filter(m=>m.id===x.id&&(m.kind==="pull"||m.kind==="shelf")).sort((a,b)=>a.ts-b.ts);
  const shelfRecs=evs.filter(m=>m.kind==="shelf");
  if(shelfRecs.length>=2){
    let usage=0,level=null,t0=null,tN=null,pulls=0;
    evs.forEach(m=>{
      if(m.kind==="shelf"){
        if(level===null){level=m.boxes;t0=m.ts;}
        else{usage+=Math.max(0,level+pulls-m.boxes);level=m.boxes;pulls=0;tN=m.ts;}
      }else if(level!==null){pulls+=m.boxes;}
    });
    if(tN&&usage>0){
      const days=Math.max(1,(tN-t0)/86400000);
      return{perDay:usage/days,src:"שימוש בפועל"};
    }
  }
  const p=paceInfo(x);
  if(p)return{perDay:p.perDay,src:"קצב משיכה"};
  return null;
}
function paceHtml(x){
  const p=usagePace(x);
  if(!p)return"";
  const d=total(x)/p.perDay;
  const cls=d<7?"p-bad":d<14?"p-warn":"";
  const dTxt=d<1?"פחות מיום":d<2?"כיום אחד":`כ-${Math.round(d)} ימים`;
  const rate=p.perDay>=1?`${p.perDay.toFixed(1)} ארגזים ביום`:`ארגז כל ${Math.round(1/p.perDay)} ימים`;
  return `<div class="pace ${cls}"><span>⏱️ ${p.src}: <b>${rate}</b></span><span>יספיק ל: <b>${dTxt}</b></span></div>`;
}
function render(){
  $("hdrDate").textContent=today();
  const low=CATALOG.filter(x=>total(x)*x.pb<x.c).length;
  $("stItems").textContent=CATALOG.length;
  $("stLow").textContent=low;
  const td=new Date().toDateString();
  $("stToday").textContent=state.mov.filter(m=>new Date(m.ts).toDateString()===td).length;

  const list=$("list");list.innerHTML="";
  let items=CATALOG.filter(x=>{
    if(filter==="env"&&x.t!=="env")return false;
    if(filter==="page"&&x.t!=="page")return false;
    if(filter==="low"){if(total(x)*x.pb>=x.c)return false;}
    if(query&&!(x.n.includes(query)||x.id.includes(query)))return false;
    return true;
  });
  // shortages first
  items.sort((a,b)=>{
    const ga=total(a)*a.pb-a.c, gb=total(b)*b.pb-b.c;
    return ga-gb;
  });
  if(!items.length){list.innerHTML='<div class="empty">לא נמצאו פריטים לחיפוש הזה</div>';return;}
  items.forEach(x=>{
    const st=status(x), bx=state.boxes[x.id], sh=state.shelf[x.id]||0, tot=bx+sh, u=tot*x.pb;
    const pct=Math.min(100,Math.round(u/(x.c*1.2||1)*100));
    const d=document.createElement("div");
    d.className="item "+st.cls;
    d.innerHTML=`<div class="top"><div class="name">${x.n} <span class="badge ${st.b}">${st.txt}</span></div>
      <div class="boxes">${fmt(tot)} <small>ארגזים</small></div></div>
      <div class="sub"><span>🏭 תא העמסה: <b>${fmt(bx)}</b> · 🗄️ מדף שוטף: <b>${fmt(sh)}</b></span><span>${fmt(u)} יח׳</span></div>
      <div class="sub"><span>${x.t==="env"?"מעטפות חלון":"דפי נושא"} · מק״ט ${x.id}</span><span>צריכה ${fmt(x.c)}</span></div>
      <div class="bar"><i style="width:${pct}%"></i></div>${paceHtml(x)}
      <button class="qshelf" data-qs="${x.id}">🗄️ ספירת מדף מהירה</button>`;
    d.onclick=e=>{
      if(e.target.dataset&&e.target.dataset.qs){openSheet(x);setMode("shelf");}
      else openSheet(x);
    };
    list.appendChild(d);
  });
  renderLog();
}
function renderLog(){
  const log=$("log");log.innerHTML="";
  if(!state.mov.length){log.innerHTML='<div class="empty">עוד אין תנועות.<br>כל משיכה או קליטה שתרשום תופיע כאן.</div>';return;}
  const byDay={};
  [...state.mov].reverse().forEach(m=>{
    const d=new Date(m.ts).toLocaleDateString("he-IL");
    (byDay[d]=byDay[d]||[]).push(m);
  });
  Object.entries(byDay).forEach(([d,ms])=>{
    const h=document.createElement("div");h.className="logday";h.textContent=d;log.appendChild(h);
    ms.forEach(m=>{
      const r=document.createElement("div");r.className="logrow";
      const kinds={pull:["משיכה לשוטף","k-pull","−"],recv:["קליטת הזמנה","k-recv","+"],shelf:["ספירת מדף","k-adj","="],adj:["תיקון תא העמסה","k-adj","="]};
      const[k,kc,sign]=kinds[m.kind];
      r.innerHTML=`<div><div class="what">${m.name}</div><div class="kind ${kc}">${k}</div></div>
        <div class="amt">${sign}${fmt(m.boxes)} <small style="font-size:11px;font-weight:400">ארגזים (${fmt(m.units)} יח׳)</small></div>`;
      log.appendChild(r);
    });
  });
}
function openSheet(x){
  cur=x;setMode("pull");$("qty").value=1;
  $("shName").textContent=x.n;
  updSheet();
  $("overlay").classList.add("show");$("sheet").classList.add("show");
  panelOpen("sheet");
}
function closeSheet(){
  const wasOpen=$("sheet").classList.contains("show");
  $("overlay").classList.remove("show");$("sheet").classList.remove("show");cur=null;
  if(wasOpen&&openPanels[openPanels.length-1]==="sheet")panelClosedByUI();
}
function setMode(m){
  mode=m;
  $("mPull").className="mode"+(m==="pull"?" on-pull":"");
  $("mRecv").className="mode"+(m==="recv"?" on-recv":"");
  $("mShelf").className="mode"+(m==="shelf"?" on-shelf":"");
  $("mAdj").className="mode"+(m==="adj"?" on-adj":"");
  $("confirm").textContent=m==="pull"?"אישור משיכה":m==="recv"?"אישור קליטה":m==="shelf"?"עדכון מדף":"עדכון ספירה";
  if(m==="adj")$("qty").value=state.boxes[cur.id];
  else if(m==="shelf")$("qty").value=state.shelf[cur.id]||0;
  else $("qty").value=1;
  updSheet();
}
function updSheet(){
  if(!cur)return;
  const bx=state.boxes[cur.id], sh=state.shelf[cur.id]||0;
  $("shCur").textContent=`🏭 תא העמסה: ${fmt(bx)} · 🗄️ מדף שוטף: ${fmt(sh)} · ${cur.pb} יח׳ בארגז`;
  const q=Math.max(0,parseInt($("qty").value)||0);
  let bad=false,msg="";
  if(mode==="pull"){
    bad=q>bx;
    msg=bad?`<b style="color:var(--bad)">אין מספיק בתא העמסה — יש רק ${fmt(bx)} ארגזים</b>`
      :`אחרי המשיכה — תא העמסה: <b>${fmt(bx-q)}</b> · מדף שוטף: <b>${fmt(sh+q)}</b>`;
  }else if(mode==="recv"){
    msg=`אחרי הקליטה — תא העמסה: <b>${fmt(bx+q)}</b> ארגזים`;
  }else if(mode==="shelf"){
    msg=`ספירת מדף חדשה: <b>${fmt(q)} ארגזים</b>`+(q<sh?` · יירשם שימוש של <b>${fmt(sh-q)}</b> ארגזים`:"");
  }else{
    msg=`תיקון תא העמסה ל: <b>${fmt(q)} ארגזים</b>`;
  }
  $("shPrev").innerHTML=msg;
  $("confirm").disabled=bad||((mode==="pull"||mode==="recv")&&q===0);
}
async function confirmAction(){
  const q=Math.max(0,parseInt($("qty").value)||0);
  const bx=state.boxes[cur.id], sh=state.shelf[cur.id]||0;
  const label=cur.n+(cur.t==="env"?" (מעטפות)":" (דפים)");
  let msg="";
  if(mode==="pull"){
    if(q>bx||q===0)return;
    state.boxes[cur.id]=bx-q;
    state.shelf[cur.id]=sh+q;
    state.mov.push({ts:Date.now(),id:cur.id,name:label,kind:"pull",boxes:q,units:q*cur.pb});
    msg=`נמשכו ${q} ארגזים למדף · ${cur.n}`;
  }else if(mode==="recv"){
    if(q===0)return;
    state.boxes[cur.id]=bx+q;
    state.mov.push({ts:Date.now(),id:cur.id,name:label,kind:"recv",boxes:q,units:q*cur.pb});
    msg=`נקלטו ${q} ארגזים · ${cur.n}`;
  }else if(mode==="shelf"){
    state.shelf[cur.id]=q;
    state.mov.push({ts:Date.now(),id:cur.id,name:label,kind:"shelf",boxes:q,units:q*cur.pb});
    msg=`ספירת מדף עודכנה ל-${q} · ${cur.n}`;
  }else{
    state.boxes[cur.id]=q;
    state.mov.push({ts:Date.now(),id:cur.id,name:label,kind:"adj",boxes:q,units:q*cur.pb});
    msg=`תא העמסה עודכן ל-${q} · ${cur.n}`;
  }
  closeSheet();render();await save();toast(msg);
}
function toast(m){const t=$("toast");t.textContent=m;t.classList.add("show");setTimeout(()=>t.classList.remove("show"),2200);}

// wiring
$("q").oninput=e=>{query=e.target.value.trim();render();};
document.querySelectorAll(".chip").forEach(ch=>ch.onclick=()=>{
  document.querySelectorAll(".chip").forEach(c=>c.classList.remove("on"));
  ch.classList.add("on");filter=ch.dataset.f;render();
});
$("tabStock").onclick=()=>{$("viewStock").style.display="";$("viewLog").style.display="none";$("tabStock").classList.add("on");$("tabLog").classList.remove("on");};
$("tabLog").onclick=()=>{$("viewStock").style.display="none";$("viewLog").style.display="";$("tabLog").classList.add("on");$("tabStock").classList.remove("on");};
$("tabExport").onclick=exportXlsx;
function exportXlsx(){
  try{
    const rows=[["מועדון","מק\"ט","קטגוריה","יחידות בארגז","תא העמסה (ארגזים)","מדף שוטף (ארגזים)","סה\"כ ארגזים","סה\"כ יחידות","צריכה ממוצעת","פער מול צריכה","סטטוס"]];
    const sorted=[...CATALOG].sort((a,b)=>(total(a)*a.pb-a.c)-(total(b)*b.pb-b.c));
    sorted.forEach(x=>{
      const bx=state.boxes[x.id],sh=state.shelf[x.id]||0,tot=bx+sh,u=tot*x.pb;
      rows.push([x.n,x.id,x.t==="env"?"מעטפת חלון":"דף נושא",x.pb,bx,sh,tot,u,x.c,u-x.c,status(x).txt]);
    });
    const ws1=XLSX.utils.aoa_to_sheet(rows);
    ws1["!cols"]=[{wch:28},{wch:13},{wch:12},{wch:11},{wch:14},{wch:14},{wch:11},{wch:12},{wch:12},{wch:12},{wch:8}];
    const mrows=[["תאריך","שעה","מועדון","סוג תנועה","ארגזים","יחידות"]];
    [...state.mov].reverse().forEach(m=>{
      const d=new Date(m.ts);
      const kinds={pull:"משיכה לשוטף",recv:"קליטת הזמנה",shelf:"ספירת מדף",adj:"תיקון תא העמסה"};
      mrows.push([d.toLocaleDateString("he-IL"),d.toLocaleTimeString("he-IL",{hour:"2-digit",minute:"2-digit"}),m.name,kinds[m.kind],m.boxes,m.units]);
    });
    const ws2=XLSX.utils.aoa_to_sheet(mrows);
    ws2["!cols"]=[{wch:11},{wch:7},{wch:30},{wch:13},{wch:8},{wch:10}];
    const wb=XLSX.utils.book_new();
    wb.Workbook={Views:[{RTL:true}]};
    XLSX.utils.book_append_sheet(wb,ws1,"מלאי נוכחי");
    XLSX.utils.book_append_sheet(wb,ws2,"יומן תנועות");
    const dstr=new Date().toLocaleDateString("he-IL").replaceAll(".","-");
    XLSX.writeFile(wb,`דוח_מלאי_${dstr}.xlsx`);
    toast("הדוח ירד למכשיר 📊");
  }catch(e){toast("שגיאה ביצירת הדוח");}
}
$("mPull").onclick=()=>setMode("pull");
$("mRecv").onclick=()=>setMode("recv");
$("mShelf").onclick=()=>setMode("shelf");
$("mAdj").onclick=()=>setMode("adj");
$("minus").onclick=()=>{$("qty").value=Math.max(0,(parseInt($("qty").value)||0)-1);updSheet();};
$("plus").onclick=()=>{$("qty").value=(parseInt($("qty").value)||0)+1;updSheet();};
$("qty").oninput=updSheet;
$("confirm").onclick=confirmAction;
$("cancel").onclick=closeSheet;
$("overlay").onclick=closeSheet;
$("helpBtn").onclick=()=>{updModeUI();$("helpSheet").classList.add("show");panelOpen("help");};
$("helpClose").onclick=()=>{$("helpSheet").classList.remove("show");if(openPanels[openPanels.length-1]==="help")panelClosedByUI();};
$("modeToggle").onclick=()=>{$("helpSheet").classList.remove("show");if(openPanels[openPanels.length-1]==="help")panelClosedByUI();switchMode();};
$("resetBtn").onclick=()=>{$("helpSheet").classList.remove("show");if(openPanels[openPanels.length-1]==="help")panelClosedByUI();resetData();};
// --- delivery note batch receive ---
let bsel={};
$("batchBtn").onclick=()=>{bsel={};$("bq").value="";renderBatch();$("batchSheet").classList.add("show");panelOpen("batch");};
$("batchClose").onclick=()=>{$("batchSheet").classList.remove("show");if(openPanels[openPanels.length-1]==="batch")panelClosedByUI();};
$("bq").oninput=renderBatch;
function renderBatch(){
  const q=$("bq").value.trim();
  const res=$("bres");res.innerHTML="";
  if(q){
    CATALOG.filter(x=>(x.n.includes(q)||x.id.includes(q))&&!bsel[x.id]).slice(0,6).forEach(x=>{
      const b=document.createElement("button");b.className="bres-item";
      b.textContent=`＋ ${x.n} · ${x.t==="env"?"מעטפות":"דפים"} · מק"ט ${x.id}`;
      b.onclick=()=>{bsel[x.id]=1;$("bq").value="";renderBatch();};
      res.appendChild(b);
    });
  }
  const sel=$("bsel");sel.innerHTML="";
  Object.keys(bsel).forEach(id=>{
    const x=CATALOG.find(c=>c.id===id);
    const r=document.createElement("div");r.className="bsel-row";
    r.innerHTML=`<button class="rm">✕</button><span class="nm">${x.n} <small style="font-weight:400;color:var(--mut)">(${x.t==="env"?"מעטפות":"דפים"})</small></span>
      <button class="mn">−</button><input type="number" inputmode="numeric" min="1" value="${bsel[id]}"><button class="pl">+</button>`;
    r.querySelector(".rm").onclick=()=>{delete bsel[id];renderBatch();};
    r.querySelector(".mn").onclick=()=>{bsel[id]=Math.max(1,bsel[id]-1);renderBatch();};
    r.querySelector(".pl").onclick=()=>{bsel[id]++;renderBatch();};
    r.querySelector("input").oninput=e=>{bsel[id]=Math.max(1,parseInt(e.target.value)||1);};
    sel.appendChild(r);
  });
  $("batchConfirm").disabled=!Object.keys(bsel).length;
}
$("batchConfirm").onclick=async()=>{
  let n=0;
  Object.entries(bsel).forEach(([id,q])=>{
    const x=CATALOG.find(c=>c.id===id);
    state.boxes[id]+=q;
    state.mov.push({ts:Date.now(),id,name:x.n+(x.t==="env"?" (מעטפות)":" (דפים)"),kind:"recv",boxes:q,units:q*x.pb});
    n++;
  });
  $("batchSheet").classList.remove("show");
  if(openPanels[openPanels.length-1]==="batch")panelClosedByUI();
  render();await save();
  toast(`נקלטו ${n} פריטים מהתעודה 📥`);
};

// --- גיבוי ושחזור JSON ---
$("bkExport").onclick=async()=>{
  try{
    const w=await store.get(KEYS.work), t=await store.get(KEYS.test);
    const backup={
      app:"inventory-app", version:1,
      exportedAt:new Date().toISOString(),
      mode:MODE,
      work:w&&w.value?JSON.parse(w.value):null,
      test:t&&t.value?JSON.parse(t.value):null
    };
    const blob=new Blob([JSON.stringify(backup,null,1)],{type:"application/json"});
    const a=document.createElement("a");
    a.href=URL.createObjectURL(blob);
    const d=new Date();
    a.download=`גיבוי_מלאי_${d.getDate()}-${d.getMonth()+1}-${d.getFullYear()}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
    toast("קובץ הגיבוי נשמר 💾");
  }catch(e){toast("שגיאה ביצירת הגיבוי");}
};
$("bkImport").onclick=()=>$("bkFile").click();
$("bkFile").onchange=async e=>{
  const f=e.target.files[0];e.target.value="";
  if(!f)return;
  try{
    const data=JSON.parse(await f.text());
    const okShape=v=>v&&typeof v==="object"&&v.boxes&&Array.isArray(v.mov);
    if(data.app!=="inventory-app"||(!okShape(data.work)&&!okShape(data.test))){
      toast("זה לא קובץ גיבוי של האפליקציה");return;
    }
    if(!confirm("לשחזר מהגיבוי? הנתונים הנוכחיים (עבודה + טסט) יוחלפו במה שבקובץ."))return;
    if(okShape(data.work))await store.set(KEYS.work,JSON.stringify(data.work));
    if(okShape(data.test))await store.set(KEYS.test,JSON.stringify(data.test));
    await load();
    toast("הנתונים שוחזרו מהגיבוי ✅");
  }catch(err){toast("שגיאה בקריאת קובץ הגיבוי");}
};

// --- התקנה למסך הבית (PWA) ---
let deferredInstall=null;
window.addEventListener("beforeinstallprompt",e=>{
  e.preventDefault();
  deferredInstall=e;
  $("instBanner").style.display="";
  $("instBtn").style.display="";
});
async function doInstall(){
  if(!deferredInstall)return;
  deferredInstall.prompt();
  const r=await deferredInstall.userChoice;
  if(r.outcome==="accepted"){
    $("instBanner").style.display="none";
    $("instBtn").style.display="none";
    toast("האפליקציה הותקנה 📲");
  }
  deferredInstall=null;
}
$("instBanner").onclick=doInstall;
$("instBtn").onclick=doInstall;
window.addEventListener("appinstalled",()=>{
  $("instBanner").style.display="none";
  $("instBtn").style.display="none";
});
// אם אין תמיכה בהתקנה אוטומטית — מציגים רמז ידני בעזרה
setTimeout(()=>{if(!deferredInstall&&$("instBtn").style.display==="none")$("instHint").style.display="";},3000);

// --- Service Worker: עבודה אופליין ---
if("serviceWorker" in navigator&&location.protocol!=="file:"){
  navigator.serviceWorker.register("sw.js").catch(()=>{});
}

load();
