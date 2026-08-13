/* ==========================================================================
   מי אוסף — תצוגה
   ========================================================================== */
(function(){
"use strict";

var UI  = window.UI = {};
var esc = M.esc;
var D   = function(){ return Store.db; };

UI.tab     = 'today';
UI.asOther = null;        /* צפייה בלוז בעיניים של מישהו אחר */
UI.offset  = 0;           /* היסט שבועות */
UI.flash   = null;

/* ---------- עזרים ---------- */
function el(id){ return document.getElementById(id); }
UI.week = function(){
  var a = new Date(); a.setDate(a.getDate() + UI.offset*7);
  return M.weekDays(a);
};
UI.todayIso = function(){ return M.iso(new Date()); };

function person(id){ return Store.person(id); }
function pcolor(id){ var p = person(id); return p ? p.color : 'var(--p-none)'; }
function pname(id){ var p = person(id); return p ? p.name : '—'; }
function initial(s){ return String(s||'?').trim().charAt(0); }

function av(id, cls){
  var p = person(id);
  return '<span class="av '+(cls||'')+'" style="--c:'+(p?p.color:'var(--p-none)')+'" aria-hidden="true">'+
         esc(initial(p?p.name:'?'))+'</span>';
}
function whotag(id, note){
  var p = person(id); if(!p) return '';
  return '<span class="whotag" style="--c:'+p.color+'">'+av(id,'s')+'<b>'+esc(p.name)+'</b>'+
    '<em>'+esc(note || p.relation || '')+'</em></span>';
}
function kidtag(kidId){
  var k = Store.kid(kidId);
  if(!k) return '<span class="kid" style="--c:var(--p-none)"><i></i>'+esc(kidId)+
    ' <em style="font-style:normal;color:var(--ink-3)">· לא שלי</em></span>';
  return '<span class="kid" style="--c:'+(k.color||'var(--p-none)')+'"><i></i>'+esc(k.name)+'</span>';
}
function hlp(k){ return '<button class="hlp" data-act="help" data-k="'+k+'" aria-label="הסבר">?</button>'; }
UI.hlp = hlp;

var toastT;
UI.toast = function(html){
  var t = el('toast'); t.innerHTML = html; t.classList.add('on');
  clearTimeout(toastT); toastT = setTimeout(function(){ t.classList.remove('on'); }, 4200);
};

UI.openSheet = function(title, sub, inner){
  el('sheet').innerHTML =
    '<div class="sheethead"><div><h3 id="sheetTitle">'+title+'</h3>'+
    (sub ? '<p>'+sub+'</p>' : '')+'</div>'+
    '<button data-act="closesheet" aria-label="סגור">✕</button></div>'+
    '<div class="sheetbody">'+inner+'</div>';
  el('sheet').classList.add('on'); el('scrim').classList.add('on');
};
UI.closeSheet = function(){
  el('sheet').classList.remove('on'); el('scrim').classList.remove('on');
};

/* ---------- תחנות היום ---------- */
/* מאחדות שיבוצי איסוף, אירועים חד־פעמיים והסדרים עם הורים אחרים */
UI.stationsFor = function(iso, dayIdx){
  var out = [], me = D().meId;

  D().kids.forEach(function(k){
    var c = Store.pickOf(k.id, dayIdx, iso);
    if(!c || (!c.who && !c.t)) return;
    out.push({
      kind:'pick', kid:k.id, kids:[k.id], t:c.t || '13:20', who:c.who || null,
      what:'איסוף ' + k.name, where:k.school || '', day:dayIdx, iso:iso
    });
  });

  Store.eventsOn(iso).forEach(function(e){
    out.push({
      kind:'event', id:e.id, kid:e.kid, kids:[e.kid], t:e.t, who:e.who || null,
      what:e.title, where:e.place || '', sensitive:M.isSensitive(e.title), day:dayIdx, iso:iso
    });
  });

  D().pacts.forEach(function(p){
    if(p.st !== 'active' || p.day !== dayIdx || p.driver !== me) return;
    out.push({
      kind:'pact', id:p.id, kids:p.kids.slice(), t:p.t, who:me,
      what:'איסוף לפי הסדר עם ' + pname(p.by === me ? p.other : p.by),
      where:p.place || '', pact:p, day:dayIdx, iso:iso
    });
  });

  out.sort(function(a,b){ return a.t < b.t ? -1 : a.t > b.t ? 1 : 0; });
  return out;
};

/* היקף החשיפה של תחנה */
function scopeOf(st){
  var who = null;
  D().pacts.forEach(function(p){
    if(p.st !== 'active' && p.st !== 'pending-me') return;
    var names = st.kids.map(Store.kidName);
    if(p.kids.some(function(n){ return names.indexOf(n) > -1; }))
      who = p.driver === D().meId ? p.owner : p.driver;
  });
  return who ? '<span class="scope shared">גם '+esc(pname(who))+' רואה</span>'
             : '<span class="scope">הבית בלבד</span>';
}

/* ---------- ראייה של אדם אחר ---------- */
function houseSees(pid, kidId, dayIdx, iso){
  var m = Store.member(pid); if(!m) return false;
  if(m.role === 'full' || m.role === 'lim') return true;
  var c = Store.pickOf(kidId, dayIdx, iso);
  return !!c && c.who === pid;
}
function sharedWith(pid, kidId, dayIdx, iso){
  if(Store.member(pid)) return houseSees(pid, kidId, dayIdx, iso);
  var nm = Store.kidName(kidId), hit = false;
  D().pacts.forEach(function(p){
    if(p.st !== 'active' || p.day !== dayIdx) return;
    if(p.driver !== pid && p.owner !== pid) return;
    if(p.kids.indexOf(nm) > -1) hit = true;
  });
  return hit;
}
UI.sharedWith = sharedWith;

/* ---------- כותרת ---------- */
UI.chrome = function(){
  el('brandSub').innerHTML = Store.test
    ? '<span class="testbadge">🧪 מצב טסט</span>'
    : esc(D().house.name);

  el('famrow').innerHTML = D().members.map(function(m){
    return '<button class="fam" data-act="member" data-id="'+m.id+'">'+av(m.id,'s')+
      '<b>'+esc(m.name)+(m.id === D().meId ? ' (אני)' : '')+'</b>'+
      '<span>'+esc(m.relation||'')+'</span></button>';
  }).join('') +
  '<button class="fam" data-act="addmember"><span class="av s" style="--c:var(--p-none)">+</span>'+
  '<b>הוספה</b><span>בן בית</span></button>';

  el('linestrip').innerHTML = D().members.map(function(m){
    return '<i style="background:'+m.color+'"></i>'; }).join('') || '<i style="background:var(--line-2)"></i>';

  el('syncChip').hidden = !D().prefs.calendar;
  el('demoBar').hidden  = (Store.driver !== 'local');
  el('offBar').hidden   = Store.online;
  renderBell();
};
function renderBell(){
  var n = Store.unread();
  el('bell').innerHTML = '🔔' + (n ? '<span class="bdg">'+n+'</span>' : '');
}
UI.renderBell = renderBell;

/* ---------- באנר מצב טסט ---------- */
function testBar(){
  return '<div class="testbar"><span class="av l" style="--c:var(--p-yossi)">🧪</span>'+
    '<div class="txt"><b>מצב טסט</b><span>העותק הזה נועד לניסויים. הלוז האמיתי שמור ויחזור ביציאה.</span></div>'+
    hlp('test')+
    '<button class="btn" data-act="resettest" style="padding:6px 10px;font-size:11px">איפוס</button>'+
    '<button class="btn pri" data-act="test" style="padding:6px 10px;font-size:11px">יציאה</button></div>';
}

/* ---------- מסך: היום ---------- */
function viewToday(){
  var wk = M.weekDays(new Date());
  var td = wk.filter(function(d){ return d.today; })[0] || wk[0];
  var st = UI.stationsFor(td.iso, td.i);
  var open = st.filter(function(s){ return !s.who; }).length;
  var me   = D().meId;
  var h = '';

  if(Store.test) h += testBar();

  h += '<div class="viewhead"><div><h2>'+esc(M.dayName(td.i))+'</h2>'+
    '<p>'+esc(td.d)+' · '+st.length+' תחנות'+
    (st.length === 0 ? '' : open
      ? ' · <span style="color:var(--open);font-weight:700">'+open+' בלי אחראי</span>'
      : ' · הכול מכוסה')+'</p></div>'+
    (st.length ? '<span class="pill '+(open?'open':'ok')+'">'+(open?'דרושה עזרה':'לוז סגור')+'</span>' : '')+
    '</div>';

  if(!st.length){
    return h + '<div class="center"><span>אין תחנות היום.</span>'+
      '<button class="btn pri" data-act="tab" data-tab="week">בניית הלוז השבועי</button></div>';
  }

  h += '<div class="hlprow"><span class="eyebrow">מסלול היום</span>'+hlp('route')+
       '<span class="eyebrow">תזכורות</span>'+hlp('remind')+
       '<span class="eyebrow" style="margin-inline-start:auto">מי רואה</span>'+hlp('scope')+'</div>';

  h += '<div class="route">' + st.map(function(l, i){
    var seg  = l.who ? pcolor(l.who) : 'var(--open)';
    var body = '<div class="what">'+esc(l.what)+'</div>'+
      (l.where ? '<div class="where">'+esc(l.where)+'</div>' : '')+
      '<div class="who">'+ l.kids.map(kidtag).join('') +
      (l.who ? whotag(l.who) + '<span class="pill ok">משובץ</span>'
             : '<span class="pill open">אין מי שאוסף</span>') + scopeOf(l) + '</div>';

    if(!l.who){
      body += '<div class="gapbox"><p><strong>מי אוסף?</strong> '+hlp('gap')+
        ' התחנה הזאת פתוחה. אפשר לקחת אותה, לבקש מבני הבית, או לפרסם להורים המחוברים.</p>'+
        '<div class="btnrow">'+
        '<button class="btn pri" data-act="claim" data-i="'+i+'">אני אוסף</button>'+
        '<button class="btn" data-act="askhouse" data-i="'+i+'">שאל את הבית</button>'+
        '<button class="btn ghost" data-act="askout" data-i="'+i+'">פרסם להורים</button></div></div>';
    }
    if(l.who === me){
      body += '<div class="remind"><span>🔔</span><div>תזכורת אליך ב־<b>'+
        esc(M.minus(l.t, D().prefs.remind))+'</b> · '+esc(M.remindLabel(D().prefs.remind))+
        '<em>'+(Push.state()==='granted' ? 'גם כשהאפליקציה סגורה' : 'ההתראות עדיין כבויות — הפעלה בהגדרות')+
        '</em></div>'+
        '<button class="btn ghost" data-act="remindset" style="padding:5px 9px;font-size:11px">שינוי</button></div>';
      if(l.pact) body += contactsBlock(l.pact.contacts, l.pact.id);
    }
    return '<div class="leg'+(l.who?'':' gap')+'" style="--seg:'+seg+'">'+
      '<div class="time">'+esc(l.t)+'</div>'+
      '<div class="rail"><span class="dot"></span></div>'+
      '<div class="body">'+body+'</div></div>';
  }).join('') + '</div>';

  return h;
}

/* ---------- אנשי קשר ---------- */
function contactsBlock(list, pactId){
  if(!list || !list.length) return '';
  return '<div class="contacts"><b>☎ אם משהו משתבש '+hlp('contacts')+'</b>'+
    list.map(function(c){
      return '<div class="crow"><span class="av" style="--c:var(--p-none)">'+esc(initial(c.n))+'</span>'+
        '<span class="txt"><b>'+esc(c.n)+'</b><span>'+esc(c.r||'')+'</span></span>'+
        '<span class="ph">'+esc(M.prettyPhone(c.ph))+'</span>'+
        '<a class="callbtn" href="tel:'+esc(String(c.ph).replace(/[^\d+]/g,''))+'" '+
        'aria-label="התקשר ל'+esc(c.n)+'">☎</a></div>';
    }).join('')+
    '<div class="btnrow"><button class="btn danger wide" data-act="cantmake" data-id="'+esc(pactId||'')+
    '">לא אצליח להגיע — הודע עכשיו</button></div></div>';
}

/* ---------- מסך: השבוע ---------- */
function viewWeek(){
  var wk = UI.week(), as = UI.asOther, kids = D().kids;
  var missing = 0;
  kids.forEach(function(k){ wk.forEach(function(d){
    if(!Store.pickOf(k.id, d.i, d.iso).who) missing++; }); });

  var h = '';
  if(Store.test && !as) h += testBar();

  h += '<div class="viewhead"><div><h2>לוז שבועי</h2>'+
    '<p>'+esc(wk[0].d)+' – '+esc(wk[5].d)+' · '+
    (as ? 'כך זה נראה אצל '+esc(pname(as)) : 'לחיצה על תא מחליפה אחראי')+'</p></div>'+
    (as ? '' : '<span class="pill '+(missing?'open':'ok')+'">'+
      (missing ? missing+' תאים ריקים' : 'הכול משובץ')+'</span>')+'</div>';

  if(!kids.length){
    return h + '<div class="center"><span>עוד לא הוספת ילדים.</span>'+
      '<button class="btn pri" data-act="addkid">הוספת ילד</button></div>';
  }

  if(as){
    var vis = 0, tot = 0;
    kids.forEach(function(k){ wk.forEach(function(d){
      tot++; if(sharedWith(as, k.id, d.i, d.iso)) vis++; }); });
    var fam = !!Store.member(as);
    h += '<div class="asbar">'+av(as,'l')+'<div class="txt"><b>אתה רואה את הלוז שלך בעיניים של '+
      esc(pname(as))+'</b><span>'+vis+' מתוך '+tot+' השיבוצים גלויים'+
      (fam ? ' · הרשאה: '+esc(M.ROLES[Store.member(as).role].n) : ' · רק מה שיש עליו הסדר משותף')+
      '</span></div><button data-act="asme">חזרה</button></div>';
  } else {
    h += '<div class="btnrow" style="justify-content:space-between">'+
      '<button class="btn" data-act="wk" data-d="-1">← שבוע קודם</button>'+
      (UI.offset ? '<button class="btn ghost" data-act="wk" data-d="0">השבוע</button>' : '')+
      '<button class="btn" data-act="wk" data-d="1">שבוע הבא →</button></div>';
  }

  h += '<div class="hlprow"><span class="eyebrow">הטבלה</span>'+hlp('grid')+
       '<span class="eyebrow" style="margin-inline-start:auto">מעגלי חשיפה</span>'+hlp('circles')+'</div>';

  var cols = 'grid-template-columns:58px repeat('+kids.length+',minmax(0,1fr))';
  h += '<div class="grid"><div class="grow head" style="'+cols+'"><div>יום</div>'+
    kids.map(function(k){
      return '<div>'+esc(k.name)+'<span>'+esc(k.school||'')+'</span></div>'; }).join('')+'</div>';

  wk.forEach(function(d){
    h += '<div class="grow'+(d.today?' now':'')+'" style="'+cols+'">'+
      '<div class="daycell"><b>'+esc(d.n)+'</b><span>'+esc(d.d)+'</span>'+
      (d.today ? '<span style="color:var(--p-dad);font-weight:700">היום</span>' : '')+'</div>';
    kids.forEach(function(k){
      var c = Store.pickOf(k.id, d.i, d.iso);
      var hidden = as && !sharedWith(as, k.id, d.i, d.iso);
      var chip = hidden
        ? '<span class="cellchip masked"><span class="nm">🔒 פרטי</span></span>'
        : c.who
          ? '<span class="cellchip" style="--c:'+pcolor(c.who)+'">'+av(c.who,'s')+
            '<span class="nm">'+esc(pname(c.who))+'</span><span class="tm">'+esc(c.t)+'</span></span>'
          : '<span class="cellchip empty"><span class="nm">מי אוסף?</span></span>';
      var extras = hidden ? '' : Store.eventsOn(d.iso, k.id).map(function(e){
        var lim = as && Store.member(as) && Store.member(as).role === 'lim' && M.isSensitive(e.title);
        return '<span class="extra"><i></i>'+esc(e.t)+' '+esc(lim ? 'אירוע 🔒' : e.title)+'</span>';
      }).join('');
      h += '<button class="cell" '+(as ? 'disabled ' : 'data-act="assign" ')+
        'data-kid="'+k.id+'" data-day="'+d.i+'" data-iso="'+d.iso+'" '+
        'aria-label="שיבוץ '+esc(k.name)+' ב'+esc(M.dayName(d.i))+'">'+chip+extras+'</button>';
    });
    h += '</div>';
  });
  h += '</div>';

  if(as){
    var m = Store.member(as);
    return h + '<div class="card" style="padding:12px 13px"><b style="font-size:13px">למה רוב הלוז נעול</b>'+
      '<p style="font-size:12px;color:var(--ink-2);margin-top:4px;line-height:1.55">'+
      (m ? esc(m.name)+' בבית שלכם, בהרשאה ״'+esc(M.ROLES[m.role].n)+'״. '+esc(M.ROLES[m.role].d)
         : esc(pname(as))+' לא מחובר ללוז שלך אלא לפריט אחד שסיכמתם עליו. כל השאר לא קיים אצלו '+
           'בכלל, וגם לא מייצר לו התראות.')+'</p></div>';
  }

  h += '<div class="hlprow"><span class="eyebrow">מקרא</span>'+hlp('legend')+'</div>';
  h += '<div class="legend">'+D().members.concat(D().links).map(function(p){
    return '<span style="--c:'+p.color+'"><i></i>'+esc(p.name)+'</span>'; }).join('')+
    '<span style="--c:var(--open)"><i></i>אין אחראי</span></div>';

  h += '<button class="btn" data-act="privacy" style="padding:11px">מי רואה מה — מעגלי החשיפה</button>';
  return h;
}

/* ---------- מסך: בקשות והסדרים ---------- */
function seenStack(list, n){
  return '<span class="seen"><i>'+(list||[]).slice(0,4).map(function(k){
    return '<b style="--c:'+pcolor(k)+'"></b>'; }).join('')+'</i>'+(n || (list||[]).length)+' ראו</span>';
}
function reqCard(r){
  var mine = r.from === D().meId;
  var h = '<div class="card req" style="--c:'+pcolor(r.from)+'"><div class="reqtop">'+av(r.from,'l')+
    '<div class="txt"><h4>'+esc(pname(r.from))+(mine?' (אני)':'')+'</h4>'+
    '<p>'+esc(r.txt)+'</p></div>'+
    (r.st==='open'  ? '<span class="pill open">פתוח</span>' : '')+
    (r.st==='sent'  ? '<span class="pill wait">ממתין לתגובה</span>' : '')+
    (r.st==='taken' ? '<span class="pill ok">'+esc(pname(r.by))+' אוסף</span>' : '')+
    '</div>'+
    '<div class="meta"><b>'+esc(M.dayName(r.day))+'</b><span>·</span><b>'+esc(r.t)+'</b>'+
    (r.place ? '<span>·</span><span>'+esc(r.place)+'</span>' : '')+'</div>';

  if(r.st === 'open' && !mine){
    h += '<div class="btnrow"><button class="btn pri wide" data-act="take" data-id="'+r.id+'">אני יכול לאסוף</button>'+
         '<button class="btn" data-act="dropreq" data-id="'+r.id+'">לא הפעם</button></div>';
  } else if(r.st === 'sent' || (r.st === 'open' && mine)){
    h += '<div class="btnrow" style="align-items:center">'+seenStack(r.seen, r.seenN)+
         '<button class="btn ghost" data-act="dropreq" data-id="'+r.id+
         '" style="margin-inline-start:auto">בטל בקשה</button></div>';
  } else if(r.st === 'taken'){
    h += '<div class="btnrow" style="align-items:center">'+whotag(r.by,'נכנס ללוז')+'</div>';
  }
  return h + '</div>';
}
function pactCard(p){
  var me = D().meId;
  var other = p.driver === me ? p.owner : p.driver;
  var txt = p.driver === me
    ? '<b>אתה</b> אוסף את ' + esc(M.andList(p.kids)) + ' — הילדים של ' + esc(pname(p.owner))
    : '<b>' + esc(pname(p.driver)) + '</b> אוסף את ' + esc(M.andList(p.kids));
  var h = '<div class="card req" style="--c:'+pcolor(other)+'"><div class="reqtop">'+av(other,'l')+
    '<div class="txt"><h4>'+(p.by === me ? 'רשמת אתה' : esc(pname(p.by))+' רשם')+' את ההסדר</h4>'+
    '<p>'+txt+'</p></div>'+
    (p.st==='pending-me'   ? '<span class="pill wait">דרוש אישורך</span>' : '')+
    (p.st==='pending-them' ? '<span class="pill wait">ממתין לאישור</span>' : '')+
    (p.st==='active'       ? '<span class="pill ok">פעיל</span>' : '')+'</div>'+
    '<div class="meta"><b>כל '+esc(M.dayName(p.day))+'</b><span>·</span><b>'+esc(p.t)+'</b>'+
    (p.place ? '<span>·</span><span>'+esc(p.place)+'</span>' : '')+'</div>';

  if(p.st === 'pending-me'){
    h += '<p style="font-size:11.5px;color:var(--ink-3);line-height:1.5">'+esc(pname(p.by))+
      ' הקליד את זה אצלו. עד שתאשר, זה לא נכנס ללוז שלך ולא נשלחת עליו תזכורת.</p>'+
      '<div class="btnrow"><button class="btn pri wide" data-act="pactok" data-id="'+p.id+'">מאשר את ההסדר</button>'+
      '<button class="btn" data-act="pactno" data-id="'+p.id+'">לא מתאים</button></div>';
  } else if(p.st === 'pending-them'){
    h += '<div class="btnrow" style="align-items:center">'+seenStack([p.driver],1)+
      '<button class="btn ghost" data-act="pactno" data-id="'+p.id+
      '" style="margin-inline-start:auto">בטל</button></div>';
  } else {
    h += '<div class="btnrow" style="align-items:center">'+whotag(p.driver,'שני הצדדים אישרו')+'</div>';
    if(p.driver === me) h += contactsBlock(p.contacts, p.id);
  }
  return h + '</div>';
}
function viewReqs(){
  var openN = D().reqs.filter(function(r){ return r.st === 'open' && r.from !== D().meId; }).length;
  var h = '';
  if(Store.test) h += testBar();
  h += '<div class="viewhead"><div><h2>בקשות והסדרים</h2>'+
    '<p>מה שדורש תגובה — שלך או שלהם</p></div>'+
    '<span class="pill '+(openN?'open':'ok')+'">'+(openN? openN+' ממתינות לך':'אין חדשות')+'</span></div>';

  h += '<div class="hlprow"><span class="eyebrow">בקשות איסוף</span>'+hlp('reqs')+'</div>';
  h += D().reqs.length
    ? D().reqs.map(reqCard).join('')
    : '<p class="sheetnote">אין בקשות פתוחות. כשתחסר לך יד — פרסמו בקשה והראשון שנרשם סוגר אותה.</p>';
  h += '<button class="btn pri" data-act="newreq" style="padding:12px">פרסום בקשת איסוף</button>';

  h += '<div class="hlprow" style="margin-top:6px"><span class="eyebrow">הסדרים הדדיים · צד אחד '+
       'מקליד, השני מאשר</span>'+hlp('pacts')+'</div>';
  h += D().pacts.length
    ? D().pacts.map(pactCard).join('')
    : '<p class="sheetnote">הסדר הוא סיכום קבוע עם הורה אחר. הוא נכנס ללוז רק אחרי ששני הצדדים אישרו.</p>';
  h += '<button class="btn" data-act="pact" style="padding:12px">הסדר חדש עם הורה</button>';
  return h;
}

/* ---------- מסך: מי מחובר ---------- */
function viewPeople(){
  var h = '';
  if(Store.test) h += testBar();
  h += '<div class="viewhead"><div><h2>מי מחובר אליך</h2>'+
    '<p>אין מאגר מרכזי — כל הורה מזין את הילדים שלו</p></div>'+
    '<button class="btn" data-act="privacy" style="padding:7px 11px;font-size:11.5px">מי רואה מה</button></div>';

  h += '<div class="card" style="padding:12px 13px">'+
    '<b style="font-size:13px;display:flex;align-items:center;gap:7px">הילדים שלי '+hlp('mykids')+'</b>'+
    (D().kids.length ? '' : '<p style="font-size:11.5px;color:var(--ink-3);margin-top:4px">עוד לא הוספת ילדים.</p>')+
    D().kids.map(function(k){
      return '<div class="prow" style="padding:9px 0 0"><span class="av l" style="--c:'+
        (k.color||'var(--p-none)')+'">'+esc(initial(k.name))+'</span>'+
        '<div class="txt"><b>'+esc(k.name)+'</b><span>'+esc(k.school||'ללא מסגרת')+'</span></div>'+
        '<div class="acts"><button class="iconbtn" data-act="editkid" data-id="'+k.id+
        '" aria-label="עריכת '+esc(k.name)+'">✎</button></div></div>';
    }).join('')+
    '<button class="btn" data-act="addkid" style="width:100%;margin-top:10px">הוספת ילד</button></div>';

  h += '<div class="hlprow"><span class="eyebrow">הבית שלי</span>'+hlp('roles')+
    '<button class="btn ghost" data-act="roles" style="margin-inline-start:auto;padding:5px 10px;'+
    'font-size:11px">שינוי דרגות</button></div><div class="ntable">'+
    D().members.map(function(m){
      return '<div class="prow">'+av(m.id,'l')+
        '<div class="txt"><b>'+esc(m.name)+(m.id===D().meId?' (אני)':'')+
        ' <span class="rolechip '+m.role+'">'+esc(M.ROLES[m.role].n)+'</span></b>'+
        '<span>'+esc(m.relation||'')+(m.phone ? ' · '+esc(M.prettyPhone(m.phone)) : '')+'</span></div>'+
        '<div class="acts">'+
        '<button class="iconbtn" data-act="asother" data-who="'+m.id+'" aria-label="מה '+esc(m.name)+
        ' רואה">👁</button></div></div>';
    }).join('')+
    '<div class="prow"><span class="av l" style="--c:var(--p-none)">+</span>'+
    '<div class="txt"><b>הוספת בן בית</b><span>בן זוג, סבא, סבתא, מטפלת</span></div>'+
    '<div class="acts"><button class="btn" data-act="addmember">הוספה</button></div></div></div>';

  h += '<div class="hlprow" style="margin-top:4px"><span class="eyebrow">הורים שהתחברת אליהם</span>'+
       hlp('invite')+'</div><div class="ntable">'+
    D().links.map(function(l){
      return '<div class="prow">'+av(l.id,'l')+'<div class="txt"><b>'+esc(l.name)+'</b>'+
        '<span>'+esc(l.via||'')+'</span>'+
        (l.kids && l.kids.length ? '<span>שיתף איתך: '+esc(l.kids.map(function(c){
          return c.n + (c.cls ? ' · '+c.cls : ''); }).join(', '))+'</span>' : '')+
        '</div><div class="acts">'+
        '<button class="iconbtn" data-act="pact" data-who="'+l.id+'" aria-label="הסדר">🤝</button>'+
        '<button class="iconbtn" data-act="asother" data-who="'+l.id+'" aria-label="מה הוא רואה">👁</button>'+
        '</div></div>';
    }).join('')+
    '<div class="prow"><span class="av l" style="--c:var(--p-none)">+</span>'+
    '<div class="txt"><b>הזמנת הורה</b><span>שולחים קישור — הוא מזין את הילדים שלו ובוחר מה לשתף</span></div>'+
    '<div class="acts"><button class="btn" data-act="invite">קישור</button></div></div></div>';
  return h;
}

/* ---------- ניווט ---------- */
var TABS = [
  { k:'today',  ic:'📍', lb:'היום' },
  { k:'week',   ic:'🗓', lb:'השבוע' },
  { k:'reqs',   ic:'✋', lb:'בקשות' },
  { k:'people', ic:'👪', lb:'מחוברים' }
];
function renderTabs(){
  var n = D().reqs.filter(function(r){ return r.st === 'open' && r.from !== D().meId; }).length +
          D().pacts.filter(function(p){ return p.st === 'pending-me'; }).length;
  el('tabbar').innerHTML = TABS.map(function(t){
    return '<button class="tab" role="tab" data-tab="'+t.k+'" aria-selected="'+(UI.tab===t.k)+'">'+
      '<span class="ic" aria-hidden="true">'+t.ic+'</span><span class="lb">'+t.lb+'</span>'+
      (t.k==='reqs' && n ? '<span class="badge">'+n+'</span>' : '')+'</button>';
  }).join('');
}

UI.render = function(keepScroll){
  if(!Store.db) return;
  var v = el('view'), y = v.scrollTop;
  UI.chrome();
  v.innerHTML = UI.tab === 'today' ? viewToday()
              : UI.tab === 'week'  ? viewWeek()
              : UI.tab === 'reqs'  ? viewReqs()
              : viewPeople();
  v.scrollTop = keepScroll ? y : 0;
  renderTabs();
  if(UI.flash){
    var sel = UI.flash.kind === 'leg'
      ? '.leg:nth-of-type('+(UI.flash.i+1)+')'
      : '.cell[data-kid="'+UI.flash.kid+'"][data-day="'+UI.flash.day+'"]';
    var n2 = v.querySelector(sel); if(n2) n2.classList.add('flash');
    UI.flash = null;
  }
};

})();
