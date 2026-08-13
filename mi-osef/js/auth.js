/* ==========================================================================
   מי אוסף — כניסה והקמת בית
   --------------------------------------------------------------------------
   הכניסה נבנתה סביב אילוץ אחד: סבתא צריכה להיכנס לבד. לכן אין סיסמה —
   מספר טלפון, קוד ב־SMS, וזהו. במצב הדגמה אין אפילו את זה.
   ========================================================================== */
(function(){
"use strict";

var Auth = window.Auth = {};
var esc  = M.esc;
var step = 'profile';
var draft = { phone:'', name:'', relation:'אבא', house:'', kid:'', school:'' };
var user  = null;
var err   = '';

function gate(){ return document.getElementById('gate'); }
function body(){ return document.getElementById('gateBody'); }

Auth.show = function(which){
  step = which || (CONFIG.isConfigured ? 'phone' : 'profile');
  document.getElementById('app').hidden  = true;
  gate().hidden = false;
  document.getElementById('gateStrip').innerHTML =
    M.COLORS.map(function(c){ return '<i style="background:var('+c+')"></i>'; }).join('');
  render();
};
Auth.hide = function(){ gate().hidden = true; document.getElementById('app').hidden = false; };

function steps(n, total){
  var out = '';
  for(var i=1;i<=total;i++) out += '<i class="'+(i<=n?'on':'')+'"></i>';
  return '<div class="steps">'+out+'<span>שלב '+n+' מתוך '+total+'</span></div>';
}

function render(){
  var h = '';
  if(err) h += '<div class="err">'+esc(err)+'</div>';

  if(step === 'phone'){
    h += steps(1,3) + '<form id="f">'+
      '<div class="field"><label for="ph">מספר הטלפון שלך</label>'+
      '<input class="inp" id="ph" type="tel" inputmode="tel" autocomplete="tel" '+
      'placeholder="050-000-0000" value="'+esc(draft.phone)+'" required></div>'+
      '<button class="btn pri" type="submit">שלחו לי קוד ב־SMS</button>'+
      '<p class="fine">נשלח קוד בן שש ספרות. <b>אין סיסמה</b> — לא צריך לזכור כלום, '+
      'ואפשר להיכנס מכל מכשיר עם אותו מספר.</p></form>';
  }

  else if(step === 'code'){
    h += steps(2,3) + '<form id="f">'+
      '<div class="field"><label for="code">הקוד שנשלח ל־'+esc(M.prettyPhone(draft.phone))+'</label>'+
      '<input class="inp otp" id="code" type="text" inputmode="numeric" autocomplete="one-time-code" '+
      'maxlength="6" placeholder="——————" required></div>'+
      '<button class="btn pri" type="submit">כניסה</button>'+
      '<button class="btn ghost" type="button" data-go="phone">מספר אחר</button></form>';
  }

  else if(step === 'profile'){
    h += steps(CONFIG.isConfigured?3:1, CONFIG.isConfigured?3:2) + '<form id="f">'+
      '<div class="field"><label for="nm">איך קוראים לך</label>'+
      '<input class="inp" id="nm" value="'+esc(draft.name)+'" placeholder="השם שיופיע בלוז" required></div>'+
      '<div class="field"><label for="rel">מי אתה בבית</label><select class="inp" id="rel">'+
        M.RELATIONS.map(function(r){
          return '<option'+(r===draft.relation?' selected':'')+'>'+esc(r)+'</option>'; }).join('')+
      '</select></div>'+
      '<div class="field"><label for="hs">שם הבית</label>'+
      '<input class="inp" id="hs" value="'+esc(draft.house)+'" placeholder="למשל: משפחת כהן"></div>'+
      '<button class="btn pri" type="submit">המשך</button>'+
      '<p class="fine">אלה הפרטים שבני הבית שלך יראו. אף אחד מחוץ לבית לא רואה אותם '+
      'עד שתיצור הסדר איסוף.</p></form>';
  }

  else if(step === 'kid'){
    h += steps(CONFIG.isConfigured?3:2, CONFIG.isConfigured?3:2) + '<form id="f">'+
      '<div class="field"><label for="kd">שם הילד הראשון</label>'+
      '<input class="inp" id="kd" value="'+esc(draft.kid)+'" placeholder="אפשר להוסיף עוד אחר כך"></div>'+
      '<div class="field"><label for="sc">גן / בית ספר</label>'+
      '<input class="inp" id="sc" value="'+esc(draft.school)+'" placeholder="למשל: כיתה ג׳2, בי״ס רמון"></div>'+
      '<button class="btn pri" type="submit">בונים את הלוז</button>'+
      '<p class="fine">אתה מזין את הילדים שלך — <b>אין מאגר מרכזי</b>. הורה אחר יראה ילד שלך רק '+
      'אחרי שתיצור איתו הסדר, ורק את השם, המקום והשעה.</p></form>';
  }

  else if(step === 'busy'){
    h += '<div class="center"><div class="spin"></div><span>רגע…</span></div>';
  }

  if(!CONFIG.isConfigured && step === 'profile'){
    h += '<p class="fine">האפליקציה רצה כרגע ב<b>מצב הדגמה</b>: הכול נשמר במכשיר הזה בלבד, '+
         'בלי חשבון ובלי שרת. חיבור לשרת מפעיל כניסה בקוד SMS וסנכרון חי בין כל בני המשפחה — '+
         'ההוראות ב־README.</p>';
  }
  body().innerHTML = h;

  var f = document.getElementById('f');
  if(f) f.addEventListener('submit', onSubmit);
  var first = body().querySelector('input');
  if(first) setTimeout(function(){ first.focus(); }, 60);
}

function go(next){ err=''; step = next; render(); }

document.addEventListener('click', function(e){
  var b = e.target.closest('[data-go]');
  if(b) go(b.getAttribute('data-go'));
});

function onSubmit(e){
  e.preventDefault();
  err = '';
  var v = function(id){ var n = document.getElementById(id); return n ? n.value.trim() : ''; };

  if(step === 'phone'){
    draft.phone = v('ph');
    var phone = M.normPhone(draft.phone);
    if(phone.length < 12){ err = 'המספר לא נראה תקין. נסו שוב, למשל 050-1234567.'; return render(); }
    go('busy');
    Store.client().auth.signInWithOtp({ phone:phone }).then(function(r){
      if(r.error){ err = 'שליחת הקוד נכשלה: ' + r.error.message; return go('phone'); }
      go('code');
    });
    return;
  }

  if(step === 'code'){
    var code = v('code');
    if(code.length < 4){ err = 'צריך את הקוד בן שש הספרות שקיבלתם ב־SMS.'; return render(); }
    go('busy');
    Store.client().auth.verifyOtp({
      phone: M.normPhone(draft.phone), token: code, type:'sms'
    }).then(function(r){
      if(r.error){ err = 'הקוד לא התאים. אפשר לבקש קוד חדש.'; return go('code'); }
      user = r.data.user;
      return Store.loadRemote(user).then(function(res){
        if(res.ready){ Auth.hide(); App.start(); }
        else go('profile');
      });
    }).catch(function(){ err = 'משהו השתבש. נסו שוב.'; go('code'); });
    return;
  }

  if(step === 'profile'){
    draft.name  = v('nm');
    draft.relation = v('rel');
    draft.house = v('hs') || ('משפחת ' + draft.name);
    if(!draft.name){ err = 'צריך שם — הוא מה שיופיע בלוז.'; return render(); }
    return go('kid');
  }

  if(step === 'kid'){
    draft.kid = v('kd'); draft.school = v('sc');
    go('busy');
    var make = CONFIG.isConfigured
      ? Store.createRemoteHouse(draft, user)
      : Store.createLocalHouse(draft);
    make.then(function(){
      if(draft.kid){
        Store.db.kids.push({
          id:'k'+Date.now(), name:draft.kid, school:draft.school, color:M.colorOf(1)
        });
        Store.db.pick[Store.db.kids[0].id] = [];
        Store.commit('setup');
      }
      Auth.hide(); App.start();
    }).catch(function(e2){
      err = 'ההקמה נכשלה: ' + (e2.message || e2); go('kid');
    });
  }
}

Auth.signOut = function(){
  var c = Store.client && Store.client();
  var done = function(){ Store.wipeLocal(); location.reload(); };
  if(c) c.auth.signOut().then(done, done); else done();
};

})();
