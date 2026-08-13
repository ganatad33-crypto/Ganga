/* ==========================================================================
   מי אוסף — שכבת הנתונים
   --------------------------------------------------------------------------
   שני מנועים מאחורי אותו ממשק:
     local     — הכול נשמר במכשיר. עובד בלי חשבון ובלי רשת.
     supabase  — הכול נשמר בשרת, מסתנכרן חי לכל בני הבית.
   שאר האפליקציה לא יודעת באיזה מנוע היא משתמשת.
   ========================================================================== */
(function(){
"use strict";

var KEY   = 'miosef.v1';
var Store = window.Store = {};
var subs  = [];
var sb    = null;          /* לקוח Supabase */
var chan  = null;          /* ערוץ הסנכרון החי */

Store.driver = 'local';
Store.online = navigator.onLine;
Store.db     = null;

/* ---------- מבנה ריק ---------- */
function blank(){
  return {
    house:   { id:'local-house', name:'המשפחה שלי' },
    meId:    'm1',
    members: [],
    kids:    [],
    pick:    {},            /* pick[kidId][0..5] = {who, t} — התבנית הקבועה */
    over:    {},            /* over[iso][kidId]  = {who, t} — שינוי לשבוע מסוים */
    events:  [],
    links:   [],
    pacts:   [],
    reqs:    [],
    feed:    [],
    prefs:   { remind:120, push:{}, calendar:false }
  };
}

/* ---------- זרע להתחלה: בית עם שני הורים ---------- */
Store.seed = function(profile){
  var db = blank();
  db.house.name = profile.house || 'המשפחה שלי';
  db.members = [{
    id:'m1', name:profile.name || 'אני', relation:profile.relation || 'אבא',
    phone:profile.phone || '', color:M.colorOf(0), role:'full', me:true
  }];
  db.prefs.push = {};
  M.PUSH_TYPES.forEach(function(t){ db.prefs.push[t.k] = t.on; });
  return db;
};

/* ---------- שינויים ---------- */
Store.onChange = function(fn){ subs.push(fn); };
function emit(){ subs.forEach(function(fn){ try{ fn(); }catch(e){ console.error(e); } }); }

Store.commit = function(reason){
  if(Store.driver === 'local'){ persistLocal(); }
  else { pushRemote(reason); }
  emit();
};

/* ---------- מנוע מקומי ---------- */
function persistLocal(){
  try{ localStorage.setItem(KEY, JSON.stringify(Store.db)); }
  catch(e){ console.warn('לא ניתן לשמור מקומית', e); }
}
function readLocal(){
  try{
    var raw = localStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : null;
  }catch(e){ return null; }
}
Store.hasLocal = function(){ return !!readLocal(); };
Store.wipeLocal = function(){ localStorage.removeItem(KEY); };

/* ---------- מנוע Supabase ---------- */
/* כל הבית יושב בשורה אחת של JSON. זה מכוון: הלוז של משפחה הוא מסמך קטן
   שנקרא ונכתב תמיד כמכלול, וכך הסנכרון החי הוא אירוע אחד ולא עשרה.
   ההרשאות (מי רואה מה) נאכפות ב־RLS על השורה הזאת — ראו supabase/schema.sql */
function client(){
  if(!sb && window.CONFIG.isConfigured && window.supabase){
    sb = window.supabase.createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_ANON_KEY, {
      auth:{ persistSession:true, autoRefreshToken:true }
    });
  }
  return sb;
}
Store.client = client;

var pending = null, pendingT = null;
function pushRemote(reason){
  persistLocal();                                  /* גיבוי מקומי תמיד */
  pending = reason || 'update';
  clearTimeout(pendingT);
  pendingT = setTimeout(flush, 350);               /* איגוד כתיבות רצופות */
}
function flush(){
  var c = client(); if(!c || !Store.db) return;
  var reason = pending; pending = null;
  c.from('houses').update({
    doc: Store.db, updated_at: new Date().toISOString(), last_change: reason
  }).eq('id', Store.db.house.id).then(function(r){
    if(r.error){ console.warn('שמירה נכשלה', r.error.message); Store.online = false; emit(); }
    else { Store.online = true; }
  });
}

/* עדכון חי מגיע כעדכון-מסמך שלם, בלי אירוע ״נלקחה בקשה״ נפרד — אז
   מזהים את זה בעצמנו: השוואה בין הבקשות שלי לפני ואחרי, וכל בקשה
   שעברה ל'taken' מציגה הודעה, גם אם האפליקציה כבר פתוחה. */
function notifyTakenRequests(before, after){
  if(!before || !window.UI || !UI.toast) return;
  var myId = after.meId, oldReqs = before.reqs || [], newReqs = after.reqs || [];
  newReqs.forEach(function(r){
    if(r.from !== myId || r.st !== 'taken') return;
    var old = oldReqs.filter(function(o){ return o.id === r.id; })[0];
    if(old && old.st === 'taken') return;
    var who = (after.members.concat(after.links).filter(function(p){ return p.id === r.by; })[0] || {}).name || 'מישהו';
    UI.toast('<b>' + M.esc(who) + ' אישר/ה את הבקשה שלך!</b> ' + M.esc(r.txt) + ' — זה כבר בלוז.');
  });
}

function subscribe(){
  var c = client(); if(!c || !Store.db) return;
  if(chan) c.removeChannel(chan);
  chan = c.channel('house-' + Store.db.house.id)
    .on('postgres_changes',
        { event:'UPDATE', schema:'public', table:'houses', filter:'id=eq.'+Store.db.house.id },
        function(payload){
          var row = payload['new'];
          if(!row || !row.doc) return;
          /* לא לדרוס שינוי מקומי שעוד לא נשלח */
          if(pending) return;
          var before = Store.db;
          Store.db = row.doc;
          persistLocal();
          emit();
          notifyTakenRequests(before, row.doc);
        })
    .subscribe();
}

/* ---------- טעינה ---------- */
Store.init = function(){
  var local = readLocal();
  if(window.CONFIG.isConfigured && client()){
    Store.driver = 'supabase';
    return client().auth.getSession().then(function(res){
      var session = res.data && res.data.session;
      if(!session) return { needsAuth:true };
      return Store.loadRemote(session.user);
    });
  }
  Store.driver = 'local';
  if(local){ Store.db = local; return Promise.resolve({ ready:true }); }
  return Promise.resolve({ needsSetup:true });
};

Store.loadRemote = function(user, houseId){
  var c = client();
  var q = c.from('houses').select('id,doc');
  if(houseId) q = q.eq('id', houseId);
  return q.limit(1).then(function(r){
    if(r.error) throw r.error;
    if(!r.data || !r.data.length) return { needsSetup:true, user:user };
    Store.db = r.data[0].doc;
    Store.db.house.id = r.data[0].id;
    persistLocal();
    subscribe();
    return { ready:true };
  });
};

/* הצטרפות לבית קיים דרך קישור הזמנה: קודם נרשמים כחברי הבית (טבלת
   house_members — ה־RLS מאפשר לכל משתמש מחובר להוסיף את עצמו), ורק אז
   מותר לקרוא את מסמך הבית (houses_select תלוי בחברות). בלי הצעד הזה
   הבקשה לטעון את המסמך הייתה נכשלת בגלל ההרשאות. */
Store.joinHouse = function(houseId, user, profile){
  var c = client();
  return c.from('house_members').insert({ house:houseId, user_id:user.id, role:'full' })
    .then(function(r){
      if(r && r.error) throw r.error;
      return Store.loadRemote(user, houseId);
    })
    .then(function(res){
      if(!res.ready) return res;
      var already = Store.db.members.some(function(m){ return m.id === user.id; });
      if(!already){
        Store.db.members.push({
          id:user.id, name:(profile && profile.name) || '',
          relation:(profile && profile.relation) || 'אחר',
          phone:'', color:M.colorOf(Store.db.members.length), role:'full'
        });
        Store.commit('join');
      }
      return res;
    });
};

/* מזהה הבית נקבע כאן ולא בשרת. הדרך ההפוכה — להוסיף שורה ולבקש בחזרה
   את המזהה שנוצר — נשענת על קריאה לשורה שנוצרה באותו רגע, וההרשאה לקרוא
   אותה תלויה בשורת חברות שנוצרת בטריגר; המצב הזה עלול להחזיר "אין שורה"
   ולהכשיל את ההקמה. כשאנחנו קובעים את המזהה מראש, אין קריאה ואין תלות. */
function newId(){
  if(window.crypto && crypto.randomUUID) return crypto.randomUUID();
  var s = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx';
  return s.replace(/[xy]/g, function(ch){
    var r = Math.random()*16|0, v = ch === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

Store.createRemoteHouse = function(profile, user){
  var c  = client();
  var db = Store.seed(profile);
  db.members[0].id = user.id;
  db.meId = user.id;
  db.house.id = newId();
  return c.from('houses').insert({ id:db.house.id, owner:user.id, doc:db })
    .then(function(r){
      if(r && r.error) throw r.error;
      Store.db = db;
      persistLocal();
      subscribe();
      return { ready:true };
    });
};

Store.createLocalHouse = function(profile){
  Store.db = Store.seed(profile);
  persistLocal();
  return Promise.resolve({ ready:true });
};

/* ---------- מצב טסט ---------- */
var testReal = null, testSeed = null;
Store.test = false;
Store.setTest = function(on){
  if(on === Store.test) return;
  if(on){
    testReal = JSON.stringify(Store.db);
    Store.test = true;
    testSeed = testReal;
    document.documentElement.setAttribute('data-test','on');
  } else {
    Store.db = JSON.parse(testReal);
    Store.test = false;
    document.documentElement.removeAttribute('data-test');
    persistLocal();
  }
  emit();
};
Store.resetTest = function(){
  if(!Store.test) return;
  Store.db = JSON.parse(testSeed);
  emit();
};

/* ---------- קריאות נוחות ---------- */
var D = function(){ return Store.db; };

Store.me      = function(){ return Store.member(D().meId); };
Store.member  = function(id){
  var f = D().members.filter(function(m){ return m.id === id; })[0];
  return f || null;
};
Store.person  = function(id){                       /* בן בית או הורה מחובר */
  return Store.member(id) || D().links.filter(function(l){ return l.id === id; })[0] || null;
};
Store.kid     = function(id){
  return D().kids.filter(function(k){ return k.id === id; })[0] || null;
};
Store.kidName = function(id){ var k = Store.kid(id); return k ? k.name : id; };

/* שיבוץ בפועל ליום מסוים: קודם שינוי נקודתי, אחרת התבנית הקבועה */
Store.pickOf = function(kidId, dayIdx, iso){
  var o = D().over[iso] && D().over[iso][kidId];
  if(o) return o;
  var row = D().pick[kidId];
  return (row && row[dayIdx]) ? row[dayIdx] : { who:null, t:'13:20' };
};
Store.setPick = function(kidId, dayIdx, iso, who, t, everyWeek){
  if(everyWeek){
    if(!D().pick[kidId]) D().pick[kidId] = [];
    D().pick[kidId][dayIdx] = { who:who, t:t };
    if(D().over[iso]) delete D().over[iso][kidId];
  } else {
    if(!D().over[iso]) D().over[iso] = {};
    D().over[iso][kidId] = { who:who, t:t };
  }
};

/* אירועים של יום מסוים */
Store.eventsOn = function(iso, kidId){
  return D().events.filter(function(e){
    return e.iso === iso && (!kidId || e.kid === kidId);
  });
};

/* ---------- יומן פעילות ---------- */
Store.log = function(actorId, text, note, unread){
  D().feed.unshift({
    id: 'f' + Date.now() + Math.floor(Math.random()*1000),
    who: actorId, txt: text,
    ago: note || 'עכשיו · מהמכשיר הזה',
    at: new Date().toISOString(),
    unread: !!unread
  });
  if(D().feed.length > 120) D().feed.length = 120;
};
Store.unread = function(){
  return D().feed.filter(function(f){ return f.unread; }).length;
};
Store.markRead = function(){ D().feed.forEach(function(f){ f.unread = false; }); };

/* ---------- מצב רשת ---------- */
window.addEventListener('online',  function(){ Store.online = true;  emit(); if(pending) flush(); });
window.addEventListener('offline', function(){ Store.online = false; emit(); });

})();
