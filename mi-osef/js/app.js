/* ==========================================================================
   מי אוסף — הפעולות והאתחול
   ========================================================================== */
(function(){
"use strict";

var App = window.App = {};
var esc = M.esc;
var D   = function(){ return Store.db; };
var el  = function(id){ return document.getElementById(id); };
var val = function(id){ var n = el(id); return n ? String(n.value).trim() : ''; };
var me  = function(){ return D().meId; };

function commit(reason){ Store.commit(reason); UI.render(true); }
function today(){
  var wk = M.weekDays(new Date());
  return wk.filter(function(d){ return d.today; })[0] || wk[0];
}
function myStationsToday(){
  var t = today();
  return UI.stationsFor(t.iso, t.i).filter(function(s){ return s.who === me(); });
}

/* ==================== מגירות ==================== */

function sheetAssign(kidId, dayIdx, iso){
  var cur = Store.pickOf(kidId, dayIdx, iso);
  var kid = Store.kid(kidId);
  /* הרשאה ״מוגבל״ או ״לפי שיבוץ״ משבצת רק את עצמה — לא בוחרים עבור מישהו
     אחר. רק ״מלא״ (בדרך כלל המנהל/ת שממלא/ת את הלוז) רואה את כל הבית. */
  var myRole = Store.me() ? Store.me().role : 'full';
  var restricted = myRole === 'lim' || myRole === 'task';
  var people = restricted ? [Store.me()] : D().members.concat(D().links);
  UI.openSheet('מי אוסף את ' + esc(kid.name) + '?',
    esc(M.dayName(dayIdx)) + ' · ' + esc(iso.split('-').reverse().slice(0,2).join('/')),
    (restricted ? '<p class="sheetnote" style="margin-bottom:8px">ההרשאה שלך מאפשרת לשבץ רק את עצמך. '+
      'למנהל/ת הלוז יש אפשרות לשבץ את כל בני הבית.</p>' : '') +
    people.map(function(p){
      return '<button class="pickrow" style="--c:'+p.color+'" data-act="setwho" data-kid="'+kidId+
        '" data-day="'+dayIdx+'" data-iso="'+iso+'" data-who="'+p.id+'" aria-current="'+
        (cur.who===p.id)+'">'+
        '<span class="av l" style="--c:'+p.color+'">'+esc(String(p.name).charAt(0))+'</span>'+
        '<span class="txt"><b>'+esc(p.name)+'</b><span>'+esc(p.relation || p.via || '')+'</span></span>'+
        (cur.who===p.id ? '<span class="mark">✓</span>' : '')+'</button>';
    }).join('')+
    '<div class="field" style="margin-top:4px"><label for="asgT">שעת איסוף</label>'+
    '<input class="inp" id="asgT" type="time" value="'+esc(cur.t || '13:20')+'"></div>'+
    '<div class="chipset"><button class="tog" data-act="tog" aria-pressed="false" id="asgRepeat">'+
    'חל על כל השבועות</button></div>'+
    '<div class="btnrow"><button class="btn danger wide" data-act="clearwho" data-kid="'+kidId+
    '" data-day="'+dayIdx+'" data-iso="'+iso+'">אין אחראי — פרסם בקשה</button></div>'+
    '<p class="sheetnote">מי שנבחר מקבל התראה. השינוי חל על השבוע הזה בלבד, אלא אם סימנתם '+
    '״כל השבועות״.</p>');
}

function remindPicker(){
  return '<div class="field"><label>מתי להזכיר לך ' + UI.hlp('duty') + '</label><div class="chipset">'+
    M.REMIND_OPTIONS.map(function(o){
      return '<button class="tog" data-act="setremind" data-m="'+o[0]+'" aria-pressed="'+
        (D().prefs.remind===o[0])+'" style="--c:'+Store.me().color+'">'+o[1]+'</button>';
    }).join('')+'</div></div>';
}

function sheetDuty(){
  var mine = myStationsToday();

  /* אין לך תורנות היום — עדיין אפשר לקבוע מתי להזכיר */
  if(!mine.length){
    return UI.openSheet('תזכורות', 'היום אין עליך תחנות',
      remindPicker() +
      (Push.state() === 'granted' ? '' :
        '<button class="btn pri" data-act="enablepush" style="padding:11px">הפעלת התראות</button>')+
      '<p class="sheetnote">ההגדרה חלה על כל התחנות שלך: התזכורת נשלחת ' +
      esc(M.remindLabel(D().prefs.remind)) + ' לכל איסוף שאתה אחראי עליו.</p>'+
      '<button class="btn" data-act="closesheet" style="padding:11px">סגירה</button>');
  }

  var kids = [];
  mine.forEach(function(s){ s.kids.forEach(function(k){
    var n = Store.kidName(k); if(kids.indexOf(n) < 0) kids.push(n); }); });

  UI.openSheet('היום התורנות שלך', esc(M.dayName(today().i)) + ' · ' + mine.length +
    (mine.length > 1 ? ' תחנות עליך' : ' תחנה עליך'),
    '<div class="duty"><span>אתה אוסף היום את</span><b>'+esc(M.andList(kids))+'</b>'+
    '<div class="dutykids">'+mine.reduce(function(a,s){ return a.concat(s.kids); },[])
      .filter(function(v,i,arr){ return arr.indexOf(v) === i; })
      .map(function(k){
        var kk = Store.kid(k);
        return '<span class="kid" style="--c:'+(kk?kk.color:'var(--p-none)')+'"><i></i>'+
          esc(kk?kk.name:k)+'</span>';
      }).join('')+'</div></div>'+
    mine.map(function(s){
      return '<div class="pickrow" style="--c:'+Store.me().color+'">'+
        '<span class="av l" style="--c:'+Store.me().color+'">'+esc(s.t.split(':')[0])+'</span>'+
        '<span class="txt"><b>'+esc(s.t)+' · '+esc(s.what)+'</b>'+
        '<span class="who-kid">אתה אוסף את <b>'+esc(M.andList(s.kids.map(Store.kidName)))+'</b></span>'+
        (s.where ? '<span>'+esc(s.where)+'</span>' : '')+'</span></div>';
    }).join('')+
    remindPicker()+
    (Push.state() === 'granted' ? '' :
      '<button class="btn pri" data-act="enablepush" style="padding:11px">הפעלת התראות</button>')+
    '<p class="sheetnote">התזכורת הראשונה שלך היום ב־<b>'+esc(M.minus(mine[0].t, D().prefs.remind))+
    '</b>. ההודעה הזאת קופצת פעם אחת ביום, ורק בימים שאתה בתורנות.</p>'+
    '<button class="btn" data-act="closesheet" style="padding:11px">הבנתי, אני על זה</button>');
}

function sheetAdd(){
  UI.openSheet('מה מוסיפים? ' + UI.hlp('fab'), 'ארבעה סוגים — לכל אחד התנהגות אחרת',
    '<button class="pickrow" data-act="newreq" style="--c:var(--p-yossi)">'+
    '<span class="av l" style="--c:var(--p-yossi)">✋</span><span class="txt"><b>בקשת איסוף</b>'+
    '<span>צריך שמישהו יאסוף — לבית או להורים המחוברים</span></span></button>'+
    '<button class="pickrow" data-act="addev" style="--c:var(--p-vered)">'+
    '<span class="av l" style="--c:var(--p-vered)">🦷</span><span class="txt"><b>תור או אירוע</b>'+
    '<span>רופא שיניים, יום הולדת, אספת הורים</span></span></button>'+
    '<button class="pickrow" data-act="pact" style="--c:var(--p-dad)">'+
    '<span class="av l" style="--c:var(--p-dad)">🤝</span><span class="txt"><b>הסדר עם הורה אחר</b>'+
    '<span>איסוף הדדי קבוע — נכנס ללוז אחרי אישור הצד השני</span></span></button>'+
    '<button class="pickrow" data-act="addkid" style="--c:var(--p-gma)">'+
    '<span class="av l" style="--c:var(--p-gma)">🧒</span><span class="txt"><b>ילד</b>'+
    '<span>עוד ילד ללוז המשפחתי</span></span></button>');
}

function daySelect(id, sel){
  return '<select class="inp" id="'+id+'">'+M.DAYNAMES.map(function(n,i){
    return '<option value="'+i+'"'+(i===sel?' selected':'')+'>יום '+esc(n)+'</option>';
  }).join('')+'</select>';
}
function kidSelect(id){
  return '<select class="inp" id="'+id+'">'+D().kids.map(function(k){
    return '<option value="'+k.id+'">'+esc(k.name)+(k.school?' · '+esc(k.school):'')+'</option>';
  }).join('')+'</select>';
}
function whoSelect(id, sel, allowNone){
  return '<select class="inp" id="'+id+'">'+
    D().members.concat(D().links).map(function(p){
      return '<option value="'+p.id+'"'+(p.id===sel?' selected':'')+'>'+esc(p.name)+
        (p.relation?' · '+esc(p.relation):'')+'</option>';
    }).join('')+
    (allowNone ? '<option value="">עוד לא יודע — פרסם בקשה</option>' : '')+'</select>';
}

function sheetRequest(){
  UI.openSheet('בקשת איסוף', 'הראשון שנרשם סוגר את הבקשה',
    (D().kids.length ? '<div class="field"><label>את מי צריך לאסוף?</label><div class="chipset">'+
      D().kids.map(function(k){
        return '<button class="tog" data-act="tog" data-kid="'+k.id+'" aria-pressed="true" style="--c:'+
          (k.color||'var(--ink)')+'">'+esc(k.name)+'</button>'; }).join('')+'</div></div>' : '')+
    '<div class="field"><label for="rqDay">יום</label>'+daySelect('rqDay', today().i)+'</div>'+
    '<div class="field"><label for="rqT">שעה</label><input class="inp" id="rqT" type="time" value="16:00"></div>'+
    '<div class="field"><label for="rqPl">מאיפה</label><input class="inp" id="rqPl" placeholder="שער, כתובת"></div>'+
    '<div class="field"><label>למי לשלוח</label><div class="chipset">'+
      '<button class="tog" data-act="tog" id="rqHouse" aria-pressed="true" style="--c:var(--p-dad)">הבית</button>'+
      '<button class="tog" data-act="tog" id="rqLinks" aria-pressed="'+(D().links.length?'true':'false')+
      '" style="--c:var(--p-yossi)">ההורים המחוברים</button></div></div>'+
    '<button class="btn pri" data-act="sendreq" style="padding:12px">שליחת הבקשה</button>');
}

function sheetEvent(){
  if(!D().kids.length) return ACT.addkid();
  UI.openSheet('תור או אירוע', 'נכנס ללוז ולתזכורות של מי שלוקח',
    '<div class="field"><label for="evWhat">מה זה</label>'+
    '<input class="inp" id="evWhat" placeholder="למשל: תור לרופא שיניים"></div>'+
    '<div class="field"><label for="evKid">של מי</label>'+kidSelect('evKid')+'</div>'+
    '<div class="field"><label for="evDate">תאריך</label>'+
    '<input class="inp" id="evDate" type="date" value="'+M.iso(new Date())+'"></div>'+
    '<div class="field"><label for="evT">שעה</label><input class="inp" id="evT" type="time" value="15:00"></div>'+
    '<div class="field"><label for="evPl">כתובת</label><input class="inp" id="evPl" placeholder="איפה"></div>'+
    '<div class="field"><label for="evWho">מי לוקח</label>'+whoSelect('evWho', me(), true)+'</div>'+
    '<button class="btn pri" data-act="saveev" style="padding:12px">שמירה</button>'+
    '<p class="sheetnote">תור רפואי מסומן אוטומטית כרגיש: בני בית בהרשאה ״מוגבל״ יראו אותו '+
    'כ״אירוע״ בלי פירוט.</p>');
}

function sheetPact(withWho){
  if(!D().links.length){
    return UI.openSheet('הסדר עם הורה אחר', 'קודם צריך חיבור',
      '<p class="sheetnote">הסדר נוצר מול הורה שמחובר אליך. שלחו לו קישור הזמנה — הוא מזין את '+
      'הילדים שלו בעצמו, ואז אפשר לסכם.</p>'+
      '<button class="btn pri" data-act="invite" style="padding:12px">שליחת קישור הזמנה</button>');
  }
  UI.openSheet('הסדר איסוף עם הורה', 'צד אחד מקליד — הצד השני מאשר',
    '<div class="field"><label for="pcWho">עם מי</label><select class="inp" id="pcWho">'+
      D().links.map(function(l){
        return '<option value="'+l.id+'"'+(l.id===withWho?' selected':'')+'>'+esc(l.name)+'</option>';
      }).join('')+'</select></div>'+
    '<div class="field"><label for="pcDir">מי אוסף</label><select class="inp" id="pcDir">'+
      '<option value="me">אני אוסף את הילדים שלו</option>'+
      '<option value="them">הוא אוסף את הילדים שלי</option></select></div>'+
    '<div class="field"><label for="pcKids">את מי אוספים</label>'+
    '<input class="inp" id="pcKids" placeholder="שמות, מופרדים בפסיק"></div>'+
    '<div class="field"><label for="pcDay">יום קבוע</label>'+daySelect('pcDay', 0)+'</div>'+
    '<div class="field"><label for="pcT">שעה</label><input class="inp" id="pcT" type="time" value="13:20"></div>'+
    '<div class="field"><label for="pcPl">מאיפה</label><input class="inp" id="pcPl" placeholder="שער, כתובת"></div>'+
    '<div class="field"><label for="pcC1">איש קשר זמין · שם</label>'+
    '<input class="inp" id="pcC1" placeholder="מי לחייג אם משהו משתבש"></div>'+
    '<div class="field"><label for="pcP1">טלפון</label>'+
    '<input class="inp" id="pcP1" type="tel" inputmode="tel" placeholder="050-000-0000"></div>'+
    '<div class="field"><label for="pcC2">גיבוי · שם וטלפון</label>'+
    '<input class="inp" id="pcC2" placeholder="למשל: רינה · 03-6412200"></div>'+
    '<button class="btn pri" data-act="savepact" style="padding:12px">שליחה לאישור</button>'+
    '<p class="sheetnote">מספיק שצד אחד מקליד. אצל הצד השני זה מופיע כבקשת אישור, ורק אחרי שהוא '+
    'מאשר זה נכנס ללוז ולתזכורות של שניכם.</p>');
}

function sheetPrivacy(){
  UI.openSheet('מי רואה מה', 'שלושה מעגלים. ברירת המחדל היא הצר ביותר',
    '<div class="circles">'+
    '<div class="circ" style="--c:var(--p-dad)"><b>🏠 הבית שלכם<em>הכול</em></b>'+
    '<p>'+esc(M.andList(D().members.map(function(m){ return m.name; })))+'. רואים את כל הלוז וכל '+
    'שינוי — בכפוף לדרגה שנתתם לכל אחד.</p></div>'+
    '<div class="circ" style="--c:var(--p-yossi)"><b>🤝 הסדר עם משפחה אחרת<em>פריט בודד</em></b>'+
    '<p>הורה מחובר לא רואה את הלוז שלכם אלא שורה אחת שסיכמתם עליה: שם, מקום ושעה. הוא לא יודע '+
    'מה עוד קורה בשבוע, ולא מקבל על זה התראות.</p></div>'+
    '<div class="circ" style="--c:var(--p-vered)"><b>📢 בקשה שפרסמתם<em>עד שהיא נסגרת</em></b>'+
    '<p>בקשת איסוף נראית למי ששלחתם אליה, ומכילה את המינימום. ברגע שמישהו נרשם — היא יורדת.</p></div>'+
    '</div>'+
    '<div class="eyebrow" style="margin-top:6px">בדיקה בעיניים שלהם</div>'+
    D().members.concat(D().links).filter(function(p){ return p.id !== me(); }).map(function(p){
      return '<button class="pickrow" style="--c:'+p.color+'" data-act="asother" data-who="'+p.id+'">'+
        '<span class="av l" style="--c:'+p.color+'">'+esc(String(p.name).charAt(0))+'</span>'+
        '<span class="txt"><b>מה '+esc(p.name)+' רואה מהלוז שלי</b>'+
        '<span>פותח את הלוז בדיוק כפי שהוא נראה אצלו</span></span></button>';
    }).join('')+
    '<p class="sheetnote">שיתוף הוא מול <b>בית</b>, לא מול אדם: אם הורה אחר אוסף את הילד שלכם, '+
    'גם בן/בת הזוג שלו רואה את זה — והם צריכים, כי הם עלולים לצאת במקומו.</p>');
}

function sheetRoles(){
  UI.openSheet('דרגות בתוך הבית', 'גם במשפחה לא כולם צריכים לראות הכול',
    D().members.map(function(m){
      return '<div class="pickrow" style="--c:'+m.color+';flex-wrap:wrap">'+
        '<span class="av l" style="--c:'+m.color+'">'+esc(String(m.name).charAt(0))+'</span>'+
        '<span class="txt"><b>'+esc(m.name)+(m.id===me()?' (אני)':'')+'</b>'+
        '<span>'+esc(m.relation||'')+' · '+esc(M.ROLES[m.role].d)+'</span></span>'+
        '<button class="hlp" data-act="asother" data-who="'+m.id+'" aria-label="מה הוא רואה">👁</button>'+
        '<div class="chipset" style="flex-basis:100%;margin-top:8px">'+
        Object.keys(M.ROLES).map(function(r){
          return '<button class="tog" data-act="setrole" data-who="'+m.id+'" data-r="'+r+
            '" aria-pressed="'+(m.role===r)+'" style="--c:'+m.color+'">'+esc(M.ROLES[r].n)+'</button>';
        }).join('')+'</div></div>';
    }).join('')+
    '<p class="sheetnote">״מוגבל״ שימושי לסבים: רואים את כל הלוז ומקבלים את התזכורות שלהם, אבל '+
    'תור לרופא מוצג כ״אירוע״ בלי פירוט. ״לפי שיבוץ״ מתאים למי שאוסף מדי פעם.</p>');
}

function sheetFeed(){
  UI.openSheet('עדכונים', 'כל שינוי שמישהו עשה, לפי הסדר שבו הגיע',
    (D().feed.length ? '<div>'+D().feed.map(function(f){
      return '<div class="feedrow'+(f.unread?' unread':'')+'">'+
        '<span class="av l" style="--c:'+(Store.person(f.who)?Store.person(f.who).color:'var(--p-none)')+
        '">'+esc(String(Store.person(f.who)?Store.person(f.who).name:'?').charAt(0))+'</span>'+
        '<div class="txt"><p>'+f.txt+'</p><span>'+esc(f.ago)+'</span></div></div>';
    }).join('')+'</div>' : '<p class="sheetnote">עוד לא קרה כלום. כל שינוי בלוז יופיע כאן.</p>')+
    '<div class="hlprow" style="margin-top:8px"><span class="eyebrow">מה יגיע לנעילת המסך גם '+
    'כשהאפליקציה סגורה</span>'+UI.hlp('bell')+'</div>'+
    pushSettings()+
    '<p class="sheetnote">מה שכבוי עדיין מופיע כאן ובפעמון — הוא פשוט לא מצלצל. '+
    '״לא אצליח להגיע״ מצלצל תמיד.</p>');
  Store.markRead(); Store.commit('read'); UI.renderBell();
}
function pushSettings(){
  var st = Push.state();
  var head = '';
  if(st !== 'granted'){
    head = '<div class="testbar" style="margin-bottom:9px"><span class="av l" style="--c:var(--p-dad)">🔔</span>'+
      '<div class="txt"><b>ההתראות כבויות</b><span>'+
      (Push.blockedByIOS()
        ? 'באייפון צריך קודם להתקין את האפליקציה למסך הבית'
        : 'בלי זה לא תגיע תזכורת כשהאפליקציה סגורה')+'</span></div>'+
      (Push.blockedByIOS() ? '' :
        '<button class="btn pri" data-act="enablepush" style="padding:6px 10px;font-size:11px">הפעלה</button>')+
      '</div>';
  }
  return head + '<div class="pushset">'+M.PUSH_TYPES.map(function(t){
    var on = t.locked ? true : (D().prefs.push[t.k] !== false);
    return '<div class="pushrow"><div class="txt"><b>'+esc(t.n)+'</b><span>'+esc(t.d)+'</span></div>'+
      '<button class="sw" '+(t.locked?'disabled ':'data-act="push" data-k="'+t.k+'" ')+
      'aria-pressed="'+on+'" aria-label="'+esc(t.n)+'"></button></div>';
  }).join('')+'</div>';
}

function sheetSettings(){
  UI.openSheet('הגדרות ובדיקות', '',
    '<div class="pushset">'+
      '<div class="pushrow"><div class="txt"><b>🧪 מצב טסט</b>'+
      '<span>עותק נפרד לניסויים — הלוז האמיתי לא נוגע</span></div>'+
      '<button class="sw" data-act="test" aria-pressed="'+Store.test+'" aria-label="מצב טסט"></button></div>'+
      (Store.test ? '<div class="pushrow"><div class="txt"><b>איפוס נתוני הטסט</b>'+
        '<span>חזרה למצב ההתחלתי של הבדיקה</span></div>'+
        '<button class="btn" data-act="resettest">איפוס</button></div>' : '')+
      '<div class="pushrow"><div class="txt"><b>הוספה ליומן</b>'+
      '<span>כפתור ליד כל תחנה משובצת, לפתיחה ב־Google Calendar</span></div>'+
      '<button class="sw" data-act="cal" aria-pressed="'+(!!D().prefs.calendar)+'" aria-label="יומן"></button></div>'+
    '</div>'+
    '<button class="pickrow" data-act="roles" style="--c:var(--p-gma)">'+
      '<span class="av l" style="--c:var(--p-gma)">🏠</span><span class="txt"><b>דרגות בתוך הבית</b>'+
      '<span>מי מבני המשפחה רואה מה</span></span></button>'+
    '<button class="pickrow" data-act="privacy" style="--c:var(--p-yossi)">'+
      '<span class="av l" style="--c:var(--p-yossi)">👁</span><span class="txt"><b>מי רואה מה</b>'+
      '<span>שלושת המעגלים, ובדיקה בעיניים של הצד השני</span></span></button>'+
    '<button class="pickrow" data-act="feed" style="--c:var(--p-dad)">'+
      '<span class="av l" style="--c:var(--p-dad)">🔔</span><span class="txt"><b>התראות</b>'+
      '<span>מה מצלצל כשהאפליקציה סגורה</span></span></button>'+
    '<div class="eyebrow" style="margin-top:6px">מדריך — כל חלק באפליקציה</div>'+
    '<div class="pushset">'+Object.keys(M.HELP).map(function(k){
      return '<div class="pushrow"><div class="txt"><b>'+esc(M.HELP[k].t)+'</b></div>'+UI.hlp(k)+'</div>';
    }).join('')+'</div>'+
    '<p class="sheetnote">מנוע הנתונים: <b>'+(Store.driver === 'local' ? 'מקומי (מצב הדגמה)' : 'שרת מסונכרן')+
    '</b> · גרסה '+esc(CONFIG.VERSION)+'</p>'+
    '<button class="btn ghost" data-act="signout" style="padding:11px">יציאה ואיפוס המכשיר</button>');
}

function sheetKid(kidId){
  var k = kidId ? Store.kid(kidId) : null;
  UI.openSheet(k ? 'עריכת ' + esc(k.name) : 'הוספת ילד', 'אתה מזין — אין מאגר מרכזי',
    '<div class="field"><label for="kdN">שם</label><input class="inp" id="kdN" value="'+
    esc(k?k.name:'')+'"></div>'+
    '<div class="field"><label for="kdS">גן / בית ספר</label><input class="inp" id="kdS" value="'+
    esc(k?(k.school||''):'')+'" placeholder="למשל: כיתה ג׳2, בי״ס רמון"></div>'+
    '<button class="btn pri" data-act="savekid" data-id="'+(kidId||'')+'" style="padding:12px">שמירה</button>'+
    (k ? '<button class="btn danger" data-act="delkid" data-id="'+kidId+'" style="padding:11px">מחיקה</button>' : ''));
}
function sheetMember(){
  UI.openSheet('הוספת בן בית', 'בן זוג, סבא, סבתא, מטפלת',
    '<div class="field"><label for="mbN">שם</label><input class="inp" id="mbN"></div>'+
    '<div class="field"><label for="mbR">מי הוא בבית</label><select class="inp" id="mbR">'+
      M.RELATIONS.map(function(r){ return '<option>'+esc(r)+'</option>'; }).join('')+'</select></div>'+
    '<div class="field"><label for="mbP">טלפון</label>'+
    '<input class="inp" id="mbP" type="tel" inputmode="tel" placeholder="050-000-0000"></div>'+
    '<div class="field"><label>דרגה</label><div class="chipset">'+
      Object.keys(M.ROLES).map(function(r){
        return '<button class="tog" data-act="tog" data-role="'+r+'" aria-pressed="'+(r==='full')+
          '">'+esc(M.ROLES[r].n)+'</button>'; }).join('')+'</div></div>'+
    '<button class="btn pri" data-act="savemember" style="padding:12px">הוספה</button>'+
    '<p class="sheetnote">בני הבית נכנסים עם מספר הטלפון שלהם — בלי סיסמה. מי שמוסיפים כאן יקבל '+
    'קישור כניסה.</p>');
}

/* ==================== פעולות ==================== */
var ACT = {
  /* --- ניווט --- */
  tab:function(d){ UI.tab = d.tab; UI.asOther = null; UI.closeSheet(); UI.render(); },
  wk:function(d){ UI.offset = (d.d === '0') ? 0 : UI.offset + (+d.d); UI.render(); },
  asother:function(d){
    UI.asOther = d.who; UI.tab = 'week'; UI.closeSheet(); UI.render();
    UI.toast('<b>תצוגה בעיניים של '+esc(Store.person(d.who).name)+'.</b> כל מה שנעול לא קיים '+
      'אצלו — לא בלוז ולא בהתראות.');
  },
  asme:function(){ UI.asOther = null; UI.render(); },
  help:function(d){
    var x = M.HELP[d.k]; if(!x) return;
    UI.openSheet(esc(x.t), 'מה זה עושה',
      '<p style="font-size:13.5px;line-height:1.65;color:var(--ink-2)">'+x.p+'</p>'+
      '<button class="btn pri" data-act="closesheet" style="padding:11px">הבנתי</button>');
  },
  closesheet:function(){ UI.closeSheet(); },
  tog:function(d, btn){
    btn.setAttribute('aria-pressed', btn.getAttribute('aria-pressed') === 'true' ? 'false' : 'true');
  },

  /* --- שיבוץ --- */
  assign:function(d){ sheetAssign(d.kid, +d.day, d.iso); },
  setwho:function(d){
    var t = val('asgT') || '13:20';
    var rep = el('asgRepeat') && el('asgRepeat').getAttribute('aria-pressed') === 'true';
    Store.setPick(d.kid, +d.day, d.iso, d.who, t, rep);
    var p = Store.person(d.who);
    Store.log(me(), '<b>' + esc(Store.me().name) + '</b> שיבץ את ' + esc(p.name) + ' לאיסוף ' +
      esc(Store.kidName(d.kid)) + ' ב' + esc(M.dayName(+d.day)));
    UI.closeSheet(); commit('assign');
    UI.toast('<b>' + esc(p.name) + ' ' + esc(M.verb(p.relation,'אוסף')) + ' את ' +
      esc(Store.kidName(d.kid)) + '</b> ב' + esc(M.dayName(+d.day)) + ' ב־' + esc(t) +
      (rep ? ' — ובכל שבוע מעכשיו.' : '. השבוע הזה בלבד.'));
  },
  clearwho:function(d){
    Store.setPick(d.kid, +d.day, d.iso, null, Store.pickOf(d.kid,+d.day,d.iso).t, false);
    D().reqs.unshift({
      id:'r'+Date.now(), from:me(), txt:'מי יכול לאסוף את ' + Store.kidName(d.kid) + '?',
      day:+d.day, t:Store.pickOf(d.kid,+d.day,d.iso).t, place:'', st:'sent', seen:[], seenN:0
    });
    UI.closeSheet(); commit('gap');
    UI.toast('<b>התא סומן כריק</b> ובקשה נשלחה. תמצאו אותה בלשונית ״בקשות״.');
  },
  claim:function(d){
    var t = today(), st = UI.stationsFor(t.iso, t.i)[+d.i];
    if(!st) return;
    if(st.kind === 'event'){
      D().events.forEach(function(e){ if(e.id === st.id) e.who = me(); });
    } else {
      Store.setPick(st.kid, t.i, t.iso, me(), st.t, false);
    }
    Store.log(me(), '<b>' + esc(Store.me().name) + '</b> נרשם ל' + esc(st.what) + ' ב־' + esc(st.t));
    UI.flash = { kind:'leg', i:+d.i };
    commit('claim');
    UI.toast('<b>נרשמת.</b> ' + esc(st.what) + ' ב־' + esc(st.t) + ' — תזכורת ב־' +
      esc(M.minus(st.t, D().prefs.remind)) + '.');
  },
  askhouse:function(d){
    var t = today(), st = UI.stationsFor(t.iso, t.i)[+d.i];
    if(!st) return;
    D().reqs.unshift({
      id:'r'+Date.now(), from:me(), txt:'מי יכול לאסוף את ' +
        M.andList(st.kids.map(Store.kidName)) + ' מ' + st.what + '?',
      day:t.i, t:st.t, place:st.where, st:'sent', to:'house',
      seen:D().members.map(function(m){ return m.id; }), seenN:D().members.length - 1
    });
    commit('ask');
    UI.toast('<b>נשלח לבני הבית.</b> ' + esc(M.andList(D().members.filter(function(m){
      return m.id !== me(); }).map(function(m){ return m.name; }))) + ' מקבלים את הבקשה עכשיו.');
  },
  askout:function(d){
    var t = today(), st = UI.stationsFor(t.iso, t.i)[+d.i];
    if(!st) return;
    D().reqs.unshift({
      id:'r'+Date.now(), from:me(), txt:'מי יכול לאסוף את ' +
        M.andList(st.kids.map(Store.kidName)) + ' מ' + st.what + '?',
      day:t.i, t:st.t, place:st.where, st:'sent', to:'links',
      seen:D().links.map(function(l){ return l.id; }), seenN:D().links.length
    });
    UI.tab = 'reqs'; commit('ask');
    UI.toast(D().links.length
      ? '<b>פורסם ל' + D().links.length + ' הורים מחוברים.</b> הראשון שנרשם סוגר את התחנה.'
      : '<b>הבקשה נשמרה.</b> עדיין אין הורים מחוברים — שלחו קישור הזמנה כדי שמישהו יראה אותה.');
  },

  /* --- תזכורות --- */
  remindset:function(){ sheetDuty(); },
  setremind:function(d, btn){
    D().prefs.remind = +d.m;
    [].slice.call(document.querySelectorAll('[data-act="setremind"]')).forEach(function(b){
      b.setAttribute('aria-pressed', b === btn ? 'true' : 'false'); });
    commit('remind');
    var mine = myStationsToday();
    UI.toast('<b>התזכורת עודכנה.</b> ' + esc(M.remindLabel(D().prefs.remind)) +
      (mine.length ? ' — היום ב־' + esc(M.minus(mine[0].t, D().prefs.remind)) + '.' : '.'));
  },
  enablepush:function(){
    Push.ask().then(function(p){
      UI.render(true);
      UI.toast(p === 'granted'
        ? '<b>ההתראות פועלות.</b> תזכורת תגיע גם כשהאפליקציה סגורה.'
        : Push.blockedByIOS()
          ? '<b>באייפון</b> צריך קודם להתקין את האפליקציה למסך הבית: שיתוף ← ״הוספה למסך הבית״.'
          : 'ההתראות נשארו כבויות. אפשר להפעיל אותן בהגדרות הדפדפן.');
    });
  },
  push:function(d, btn){
    var on = btn.getAttribute('aria-pressed') !== 'true';
    D().prefs.push[d.k] = on;
    btn.setAttribute('aria-pressed', on ? 'true' : 'false');
    Store.commit('push');
  },
  cal:function(d, btn){
    var on = btn.getAttribute('aria-pressed') !== 'true';
    D().prefs.calendar = on;
    btn.setAttribute('aria-pressed', on ? 'true' : 'false');
    commit('cal');
    UI.toast(on ? '<b>הוספה ליומן הופעלה.</b> ליד כל תחנה משובצת יופיע כפתור להוספה ל־Google Calendar.'
                : 'כפתורי ההוספה ליומן הוסתרו.');
  },

  /* --- בקשות --- */
  newreq:function(){ sheetRequest(); },
  sendreq:function(){
    var day = +val('rqDay'), t = val('rqT') || '16:00', pl = val('rqPl');
    var kids = [].slice.call(document.querySelectorAll('[data-kid][aria-pressed="true"]'))
      .map(function(b){ return Store.kidName(b.getAttribute('data-kid')); });
    if(!kids.length && D().kids.length) kids = [D().kids[0].name];
    D().reqs.unshift({
      id:'r'+Date.now(), from:me(),
      txt:'מי יכול לאסוף את ' + M.andList(kids) + '?',
      day:day, t:t, place:pl, st:'sent',
      seen:D().members.map(function(m){ return m.id; }), seenN:D().members.length - 1 + D().links.length
    });
    Store.log(me(), '<b>' + esc(Store.me().name) + '</b> פרסם בקשת איסוף ל' + esc(M.dayName(day)));
    UI.tab = 'reqs'; UI.closeSheet(); commit('req');
    UI.toast('<b>הבקשה פורסמה.</b> ' + esc(M.andList(kids)) + ' · ' + esc(M.dayName(day)) + ' ' + esc(t));
  },
  take:function(d){
    var r = D().reqs.filter(function(x){ return x.id === d.id; })[0];
    if(!r){ UI.toast('הבקשה כבר לא פעילה.'); return; }
    r.st = 'taken'; r.by = me();
    Store.log(me(), '<b>' + esc(Store.me().name) + '</b> נרשם לבקשה של ' + esc(Store.person(r.from).name));
    commit('take');
    UI.toast('<b>נרשמת לאיסוף.</b> ' + esc(Store.person(r.from).name) + ' קיבל אישור, וזה נכנס ללוז שלך.');
  },
  dropreq:function(d){
    D().reqs = D().reqs.filter(function(x){ return x.id !== d.id; });
    commit('req'); UI.toast('הבקשה הוסרה.');
  },

  /* --- הסדרים --- */
  pact:function(d){ sheetPact(d && d.who); },
  savepact:function(){
    var who = val('pcWho'), dir = val('pcDir'), day = +val('pcDay');
    var t = val('pcT') || '13:20', pl = val('pcPl');
    var kids = (val('pcKids')||'').split(',').map(function(s){ return s.trim(); }).filter(Boolean);
    if(!kids.length){ UI.toast('צריך לכתוב את מי אוספים.'); return; }
    var c2 = (val('pcC2')||'').split('·');
    D().pacts.unshift({
      id:'p'+Date.now(), by:me(), other:who,
      driver: dir === 'me' ? me() : who,
      owner:  dir === 'me' ? who : me(),
      kids:kids, day:day, t:t, place:pl, st:'pending-them',
      contacts:[{ n:val('pcC1') || Store.person(who).name, r:'איש קשר זמין', ph:val('pcP1') }]
        .concat(c2[1] ? [{ n:c2[0].trim(), r:'גיבוי', ph:c2[1].trim() }] : [])
    });
    Store.log(me(), '<b>' + esc(Store.me().name) + '</b> רשם הסדר עם ' + esc(Store.person(who).name));
    UI.tab = 'reqs'; UI.closeSheet(); commit('pact');
    UI.toast('<b>נשלח ל' + esc(Store.person(who).name) + '.</b> ההסדר ייכנס ללוז אחרי שיאשר.');
  },
  pactok:function(d){
    var p = D().pacts.filter(function(x){ return x.id === d.id; })[0];
    if(!p){ UI.toast('ההסדר כבר לא פעיל.'); return; }
    p.st = 'active';
    Store.log(me(), '<b>' + esc(Store.me().name) + '</b> אישר את ההסדר עם ' + esc(Store.person(p.by).name));
    commit('pact');
    UI.toast('<b>ההסדר אושר.</b> הוא נכנס ללוז של שניכם, עם תזכורת בכל ' + esc(M.dayName(p.day)) + '.');
  },
  pactno:function(d){
    D().pacts = D().pacts.filter(function(x){ return x.id !== d.id; });
    commit('pact'); UI.toast('ההסדר ירד.');
  },
  cantmake:function(d){
    var p = D().pacts.filter(function(x){ return x.id === d.id; })[0];
    var t = today();
    if(p){
      D().kids.forEach(function(k){
        if(p.kids.indexOf(k.name) > -1) Store.setPick(k.id, t.i, t.iso, null, p.t, false);
      });
      if(p.driver === me()) p.sos = true;
    }
    Store.log(me(), '<b>' + esc(Store.me().name) + '</b> הודיע שלא יצליח להגיע לאיסוף',
      'עכשיו · התראה דחופה', false);
    UI.tab = 'today'; commit('sos');
    UI.toast('<b>התראה דחופה נשלחה.</b> ' +
      (p ? esc(M.andList(p.contacts.map(function(c){ return c.n; }))) : 'אנשי הקשר') +
      ' קיבלו הודעה מיידית, והתחנה סומנה כפתוחה.');
  },

  /* --- אירועים וילדים --- */
  addev:function(){ sheetEvent(); },
  saveev:function(){
    var what = val('evWhat') || 'אירוע', kid = val('evKid'), iso = val('evDate') || M.iso(new Date());
    var t = val('evT') || '15:00', pl = val('evPl'), who = val('evWho');
    D().events.push({
      id:'e'+Date.now(), kid:kid, iso:iso, t:t, title:what, place:pl,
      who:who || null, sensitive:M.isSensitive(what)
    });
    Store.log(me(), '<b>' + esc(Store.me().name) + '</b> הוסיף ' + esc(what) + ' ל' + esc(Store.kidName(kid)));
    UI.tab = (iso === M.iso(new Date())) ? 'today' : 'week';
    UI.closeSheet(); commit('event');
    UI.toast('<b>' + esc(what) + ' נשמר.</b> ' + esc(Store.kidName(kid)) + ' · ' + esc(t) +
      (who ? ' · ' + esc(Store.person(who).name) + ' לוקח.' : ' · אף אחד לא שובץ — סומן אדום.'));
  },
  addkid:function(){ sheetKid(null); },
  editkid:function(d){ sheetKid(d.id); },
  savekid:function(d){
    var name = val('kdN'), school = val('kdS');
    if(!name){ UI.toast('צריך שם.'); return; }
    if(d.id){
      var k = Store.kid(d.id); k.name = name; k.school = school;
    } else {
      D().kids.push({
        id:'k'+Date.now(), name:name, school:school,
        color:M.colorOf(D().kids.length + 1)
      });
    }
    UI.closeSheet(); commit('kid');
    UI.toast('<b>' + esc(name) + ' נשמר.</b> אפשר לשבץ אותו בלוז השבועי.');
  },
  delkid:function(d){
    D().kids = D().kids.filter(function(k){ return k.id !== d.id; });
    delete D().pick[d.id];
    UI.closeSheet(); commit('kid'); UI.toast('הילד הוסר מהלוז.');
  },
  addmember:function(){ sheetMember(); },
  savemember:function(){
    var name = val('mbN');
    if(!name){ UI.toast('צריך שם.'); return; }
    var role = 'full';
    var sel = document.querySelector('[data-role][aria-pressed="true"]');
    if(sel) role = sel.getAttribute('data-role');
    D().members.push({
      id:'m'+Date.now(), name:name, relation:val('mbR'), phone:M.normPhone(val('mbP')),
      color:M.colorOf(D().members.length), role:role
    });
    UI.closeSheet(); commit('member');
    UI.toast('<b>' + esc(name) + ' נוסף לבית</b> בהרשאה ' + esc(M.ROLES[role].n) + '.');
  },
  member:function(d){
    var m = Store.member(d.id); if(!m) return;
    UI.openSheet(esc(m.name), esc(m.relation || ''),
      '<p class="sheetnote">הרשאה: <b>' + esc(M.ROLES[m.role].n) + '</b> · ' + esc(M.ROLES[m.role].d) + '</p>'+
      '<button class="pickrow" data-act="asother" data-who="'+m.id+'" style="--c:'+m.color+'">'+
      '<span class="av l" style="--c:'+m.color+'">👁</span><span class="txt"><b>מה '+esc(m.name)+
      ' רואה</b><span>הלוז בעיניים שלו</span></span></button>'+
      '<button class="btn" data-act="roles" style="padding:11px">שינוי דרגות</button>');
  },
  roles:function(){ sheetRoles(); },
  setrole:function(d){
    var m = Store.member(d.who); if(!m) return;
    m.role = d.r; sheetRoles(); commit('role');
    UI.toast('<b>' + esc(m.name) + ' — הרשאה ' + esc(M.ROLES[d.r].n) + '.</b> ' + esc(M.ROLES[d.r].d));
  },

  /* --- כללי --- */
  privacy:function(){ sheetPrivacy(); },
  feed:function(){ sheetFeed(); },
  settings:function(){ sheetSettings(); },
  test:function(){
    Store.setTest(!Store.test); UI.closeSheet(); UI.render();
    UI.toast(Store.test
      ? '<b>מצב טסט פעיל.</b> שברו כאן מה שתרצו — הלוז האמיתי שמור ויחזור ביציאה.'
      : '<b>חזרתם ללוז האמיתי.</b> מה שנעשה במצב טסט נמחק.');
  },
  resettest:function(){ Store.resetTest(); UI.closeSheet(); UI.render(); UI.toast('נתוני הטסט אופסו.'); },
  invite:function(){
    var link = location.origin + location.pathname + '#join=' + D().house.id;
    var done = function(){
      UI.toast('<b>קישור ההזמנה הועתק.</b> שלחו אותו בוואטסאפ — מי שנכנס מזין את הילדים שלו ' +
        'בעצמו ובוחר מה לשתף.');
    };
    if(navigator.share){ navigator.share({ title:'מי אוסף', url:link }).then(done, done); }
    else if(navigator.clipboard){ navigator.clipboard.writeText(link).then(done, done); }
    else done();
  },
  signout:function(){
    UI.openSheet('יציאה ואיפוס', 'זה מוחק את הנתונים מהמכשיר הזה',
      '<p class="sheetnote">' + (Store.driver === 'local'
        ? 'במצב הדגמה הנתונים קיימים רק כאן — אחרי איפוס אין דרך לשחזר אותם.'
        : 'הנתונים נשארים בשרת. כניסה חוזרת עם אותו מספר טלפון תחזיר הכול.') + '</p>'+
      '<button class="btn danger" data-act="signout2" style="padding:12px">כן, לאפס את המכשיר</button>'+
      '<button class="btn" data-act="closesheet" style="padding:11px">ביטול</button>');
  },
  signout2:function(){ Auth.signOut(); }
};

/* ==================== חיווט ==================== */
document.addEventListener('click', function(e){
  var t = e.target.closest('[data-act]');
  if(t && !t.disabled){
    var fn = ACT[t.getAttribute('data-act')];
    if(fn){
      fn({ i:t.getAttribute('data-i'), k:t.getAttribute('data-k'), kid:t.getAttribute('data-kid'),
           day:t.getAttribute('data-day'), iso:t.getAttribute('data-iso'),
           who:t.getAttribute('data-who'), id:t.getAttribute('data-id'),
           m:t.getAttribute('data-m'), r:t.getAttribute('data-r'),
           d:t.getAttribute('data-d'), tab:t.getAttribute('data-tab') }, t);
      return;
    }
  }
  var tb = e.target.closest('[data-tab]');
  if(tb){ ACT.tab({ tab:tb.getAttribute('data-tab') }); return; }
  if(e.target.id === 'fab'){ sheetAdd(); return; }
  if(e.target.id === 'scrim'){ UI.closeSheet(); }
});
document.addEventListener('keydown', function(e){ if(e.key === 'Escape') UI.closeSheet(); });

/* ---------- התקנה למסך הבית (PWA) ---------- */
var deferredInstall = null;
window.addEventListener('beforeinstallprompt', function(e){
  e.preventDefault();
  deferredInstall = e;
  el('installBar').hidden = false;
});
el('installBtn').addEventListener('click', function(){
  if(!deferredInstall) return;
  deferredInstall.prompt();
  deferredInstall.userChoice.then(function(r){
    if(r.outcome === 'accepted') el('installBar').hidden = true;
    deferredInstall = null;
  });
});
el('installClose').addEventListener('click', function(){ el('installBar').hidden = true; });
window.addEventListener('appinstalled', function(){ el('installBar').hidden = true; });

/* ==================== אתחול ==================== */
var dutyShown = false;
App.start = function(){
  UI.render();
  Store.onChange(function(){ UI.render(true); });

  var mine = myStationsToday();
  /* תזכורות הן תוספת, לא תנאי: כשל כאן לא יעצור את פתיחת האפליקציה */
  try{
    Push.scheduleToday(mine.map(function(s){
      return { mine:true, t:s.t, what:s.what, where:s.where, kids:M.andList(s.kids.map(Store.kidName)) };
    }), D().prefs.remind);
  }catch(e){ console.warn('תזכורות מקומיות לא הופעלו', e); }

  if(!dutyShown && mine.length){ dutyShown = true; setTimeout(sheetDuty, 700); }
};

function boot(){
  /* קישור הזמנה (#join=<houseId>) — ראו ACT.invite. שומרים גם ב-localStorage
     ולא רק בזיכרון: לקוח Supabase מנקה בעצמו את ה-hash של הדף אחרי קליק על
     קישור כניסה במייל (כדי לפנות מקום לטוקן שלו), כך שה-hash לבדו לא היה
     שורד את הניתוב חזרה — localStorage כן. */
  var joinMatch = /(?:^|#)join=([^&]+)/.exec(location.hash);
  var joinId = joinMatch ? decodeURIComponent(joinMatch[1]) : null;
  try{
    if(joinId) localStorage.setItem('miosef.join', joinId);
    else joinId = localStorage.getItem('miosef.join');
  }catch(e){}
  if(joinId) Auth.setJoin(joinId);

  /* בתצוגות מקדימות שרצות בתוך חלון מוגן (iframe עם מקור לא־מאובטח),
     הקריאה הזאת יכולה לזרוק מיידית ולא רק לדחות הבטחה — try/catch כאן
     מונע ממנה לעצור את כל שאר האתחול (שהיה קורה כי אין .then אחריה). */
  if('serviceWorker' in navigator){
    try{ navigator.serviceWorker.register('sw.js').catch(function(){}); }
    catch(e){ console.warn('רישום Service Worker נכשל (סביבה מוגבלת)', e); }
  }
  Store.init().then(function(res){
    if(res && res.ready){ Auth.hide(); App.start(); }
    else if(res && res.needsSetup){ Auth.show('profile'); }
    else { Auth.show(); }
  }).catch(function(e){
    console.error(e);
    Auth.show();
  });
}
if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
else boot();

})();
