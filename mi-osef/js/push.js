/* ==========================================================================
   מי אוסף — התראות
   --------------------------------------------------------------------------
   שתי שכבות:
   1. פוש מהשרת — מגיע לנעילת המסך גם כשהאפליקציה סגורה. דורש Supabase +
      מפתח VAPID, ובאייפון דורש שהאפליקציה מותקנת למסך הבית.
   2. גיבוי מקומי — כשאין שרת, האפליקציה מתזמנת את התזכורות של היום הזה
      במכשיר עצמו. זה עובד כל עוד הדפדפן חי, ולכן זה גיבוי ולא תחליף.
   ========================================================================== */
(function(){
"use strict";

var Push = window.Push = {};
var timers = [];

Push.supported = ('Notification' in window) && ('serviceWorker' in navigator);
Push.state = function(){
  if(!Push.supported) return 'unsupported';
  return Notification.permission;             /* default | granted | denied */
};

/* האם אנחנו רצים כאפליקציה מותקנת — קריטי לאייפון */
Push.installed = function(){
  return window.matchMedia('(display-mode: standalone)').matches ||
         window.navigator.standalone === true;
};
Push.isIOS = function(){
  return /iPad|iPhone|iPod/.test(navigator.userAgent) ||
         (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
};
/* באייפון פוש קיים רק מ־iOS 16.4 ורק באפליקציה מותקנת */
Push.blockedByIOS = function(){ return Push.isIOS() && !Push.installed(); };

Push.ask = function(){
  if(!Push.supported) return Promise.resolve('unsupported');
  return Notification.requestPermission().then(function(p){
    if(p === 'granted') Push.register();
    return p;
  });
};

function urlB64ToUint8(base64){
  var pad = '='.repeat((4 - base64.length % 4) % 4);
  var raw = atob((base64 + pad).replace(/-/g,'+').replace(/_/g,'/'));
  var out = new Uint8Array(raw.length);
  for(var i=0;i<raw.length;i++) out[i] = raw.charCodeAt(i);
  return out;
}

/* רישום המכשיר אצל השרת כדי שיוכל לדחוף אליו התראות */
Push.register = function(){
  if(!Push.supported || Notification.permission !== 'granted') return Promise.resolve(null);
  if(!CONFIG.VAPID_PUBLIC_KEY || !Store.client) return Promise.resolve(null);
  return navigator.serviceWorker.ready.then(function(reg){
    return reg.pushManager.getSubscription().then(function(existing){
      return existing || reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlB64ToUint8(CONFIG.VAPID_PUBLIC_KEY)
      });
    });
  }).then(function(sub){
    var c = Store.client();
    if(!c || !sub) return sub;
    var j = sub.toJSON();
    return c.from('push_subscriptions').upsert({
      endpoint: j.endpoint,
      p256dh:   j.keys && j.keys.p256dh,
      auth:     j.keys && j.keys.auth,
      house:    Store.db && Store.db.house.id
    }, { onConflict:'endpoint' }).then(function(){ return sub; });
  }).catch(function(e){ console.warn('רישום פוש נכשל', e); return null; });
};

/* התראה מקומית — לתזכורות של היום כשאין שרת */
Push.local = function(title, body, tag){
  if(!Push.supported || Notification.permission !== 'granted') return;
  navigator.serviceWorker.ready.then(function(reg){
    reg.showNotification(title, {
      body: body, tag: tag || 'miosef', dir:'rtl', lang:'he',
      icon:'icons/icon-192.png', badge:'icons/favicon-48.png',
      vibrate:[80,40,80]
    });
  });
};

/* תזמון התזכורות של היום במכשיר. נקרא מחדש בכל שינוי בלוז. */
Push.scheduleToday = function(stations, remindMinutes){
  timers.forEach(clearTimeout); timers = [];
  if(Notification.permission !== 'granted') return;
  var now = new Date();
  stations.forEach(function(s){
    if(!s.mine) return;
    var p  = s.t.split(':');
    var at = new Date(now.getFullYear(), now.getMonth(), now.getDate(), +p[0], +p[1]);
    at.setMinutes(at.getMinutes() - remindMinutes);
    var ms = at.getTime() - Date.now();
    if(ms <= 0 || ms > 12*3600*1000) return;
    timers.push(setTimeout(function(){
      Push.local('עוד ' + M.remindLabel(remindMinutes).replace(' לפני','') + ': ' + s.what,
                 'אתה אוסף את ' + s.kids + ' · ' + s.t + ' · ' + s.where, 'remind-'+s.t);
    }, ms));
  });
};

})();
