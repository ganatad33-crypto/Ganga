/* ===========================================================
   פרופיל הכלב — נשמר בדפדפן של הגולש בלבד (localStorage).
   שום דבר לא נשלח לשרת. אין שרת.

   הפרופיל משפיע על התוכן בכל האתר:
   - data-age="puppy adolescent"  → הבלוק מוצג רק בשלבי החיים האלה
   - data-age-not="senior"        → הבלוק מוסתר בשלב הזה
   כשאין פרופיל — הכל מוצג. אנחנו לא מסתירים מידע ממי שלא מילא.
   =========================================================== */

var Dog = (function () {
  var KEY = 'dog-profile-v1';

  var BANDS = [
    { id: 'puppy',      label: 'גור',     from: 0,  to: 6,   desc: 'עד 6 חודשים' },
    { id: 'adolescent', label: 'מתבגר',   from: 6,  to: 18,  desc: '6 עד 18 חודשים' },
    { id: 'adult',      label: 'בוגר',    from: 18, to: 84,  desc: 'שנה וחצי עד 7 שנים' },
    { id: 'senior',     label: 'מבוגר',   from: 84, to: 400, desc: 'מגיל 7 בערך' }
  ];

  function load() {
    try { return JSON.parse(localStorage.getItem(KEY)) || null; }
    catch (e) { return null; }
  }
  function save(p) {
    try { localStorage.setItem(KEY, JSON.stringify(p)); } catch (e) {}
    apply();
  }
  function clear() {
    try { localStorage.removeItem(KEY); } catch (e) {}
    apply();
  }

  function band(months) {
    if (months === null || months === undefined || months === '') return null;
    for (var i = 0; i < BANDS.length; i++) {
      if (months >= BANDS[i].from && months < BANDS[i].to) return BANDS[i];
    }
    return BANDS[BANDS.length - 1];
  }

  function ageText(p) {
    if (!p || p.months == null) return '';
    var m = p.months;
    if (m < 24) return m + ' חודשים';
    var y = Math.floor(m / 12);
    if (y === 2) return 'שנתיים';
    return y + ' שנים';
  }

  /* הסתרה/הצגה של בלוקים לפי שלב החיים */
  function apply() {
    var p = load();
    var b = p ? band(p.months) : null;

    document.querySelectorAll('[data-age]').forEach(function (el) {
      var want = el.getAttribute('data-age').split(/\s+/);
      el.hidden = !!(b && want.indexOf(b.id) === -1);
    });
    document.querySelectorAll('[data-age-not]').forEach(function (el) {
      var no = el.getAttribute('data-age-not').split(/\s+/);
      el.hidden = !!(b && no.indexOf(b.id) !== -1);
    });

    document.querySelectorAll('[data-profile-bar]').forEach(function (el) { renderBar(el, p, b); });
    document.dispatchEvent(new CustomEvent('dog:profile', { detail: { profile: p, band: b } }));
  }

  function breedText(p) {
    if (!p) return '';
    if (p.breed2) return p.breed + ' מעורב ב' + p.breed2;
    return p.breed || '';
  }

  function renderBar(el, p, b) {
    if (!p || (p.months == null && !p.breed)) {
      el.innerHTML = '<div class="wrap"><span class="pb-text">התוכן באתר מותאם לגיל הכלב.</span>' +
        '<button class="btn" type="button" data-profile-open>הזנת פרטי הכלב</button></div>';
    } else {
      var bits = [];
      if (p.name)   bits.push('<b>' + esc(p.name) + '</b>');
      if (b)        bits.push(esc(b.label) + ' · ' + esc(ageText(p)));
      if (p.breed)  bits.push(esc(breedText(p)));
      el.innerHTML = '<div class="wrap"><span class="pb-text">' + bits.join(' · ') + '</span>' +
        '<button class="btn btn-plain" type="button" data-profile-open>שינוי</button></div>';
    }
  }

  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c];
    });
  }

  document.addEventListener('DOMContentLoaded', apply);
  document.addEventListener('click', function (e) {
    var t = e.target;
    if (!t || !t.closest) return;
    if (t.closest('[data-profile-open]')) {
      var form = document.getElementById('profile-form');
      if (form) { form.hidden = false; form.scrollIntoView({ block: 'center' }); }
      else { location.href = 'profile.html'; }
    }
  });

  return { load: load, save: save, clear: clear, band: band, bands: BANDS,
           apply: apply, ageText: ageText, breedText: breedText, esc: esc };
})();

/* ===========================================================
   "מה רלוונטי לך" — פאנל מותאם אישית לפי גיל וגזע.
   כללי, לא אבחון: מסביר נטיות ומפנה לעמודים הרלוונטיים.
   =========================================================== */

Dog.forYou = function () {
  var p = Dog.load();
  if (!p || (p.months == null && !p.breedKey)) return '';
  var b = p.months != null ? Dog.band(p.months) : null;
  var e = Dog.esc;
  var name = p.name ? e(p.name) : 'הכלב שלך';
  var br  = (typeof BREEDS !== 'undefined' && p.breedKey)  ? BREEDS[p.breedKey]  : null;
  var br2 = (typeof BREEDS !== 'undefined' && p.breedKey2) ? BREEDS[p.breedKey2] : null;

  var STAGE = {
    puppy: {
      head: 'אתם בשלב הבנייה',
      body: 'עד גיל חצי שנה כמעט הכל עוד פתוח. מה שנבנה עכשיו — איך ' + name + ' מרגיש עם מגע, עם זרים, עם להיות לבד — נשאר איתו הרבה מעבר לגיל הזה. זה גם השלב שבו הכי משתלם ללמוד לקרוא אותו, כי הוא כבר משדר הכל, רק בשקט.',
      links: ['signals', 'household']
    },
    adolescent: {
      head: 'אתם בשלב שהכי מפתיע בעלים',
      body: 'בין 6 ל-18 חודשים המוח בונה את מערכת השליטה בדחפים, בזמן שהתגובה הרגשית כבר עובדת במלוא העוצמה. לכן דברים ש' + name + ' כבר ידע נשברים זמנית — הריקול נחלש, הרצועה מחמירה, מופיעה נביחה שלא הייתה. זו לא רגרסיה באילוף ולא ניסיון לבדוק אתכם. מה שעובד עכשיו זה עקביות והורדת חשיפה, לא הקשחה.',
      links: ['signals', 'barking', 'guide']
    },
    adult: {
      head: 'אתם בשלב היציב',
      body: 'בגיל הזה מה שרואים הוא בדרך כלל מה שנבנה קודם — וזה עובד לשני הכיוונים. הרגלים ותיקים מתוקנים לאט יותר מאשר אצל גור, אבל הם מתוקנים. אם משהו השתנה לאחרונה אצל ' + name + ' בלי סיבה ברורה, שווה לחשוב מה השתנה בבית לפני כמה שבועות.',
      links: ['guide', 'household']
    },
    senior: {
      head: 'בגיל הזה, קודם רפואה ואז התנהגות',
      body: 'כמעט כל שינוי התנהגותי חדש אצל ' + name + ' בשלב הזה מצדיק בדיקה וטרינרית לפני כל תרגיל. כאב, ירידה בשמיעה או בראייה ושינויים קוגניטיביים מתבטאים בדיוק כמו "החמרה באופי" — נהמה כשמתקרבים, נביחה בלילה, בלבול, פחות סבלנות.',
      links: ['guide', 'signals']
    }
  };

  var LINKS = {
    signals:  { href: 'signals.html',   icon: 'eye',   t: 'לקרוא כלב', s: 'הסימנים המוקדמים — הבסיס לכל השאר' },
    barking:  { href: 'barking.html',   icon: 'sound', t: 'נביחה',      s: 'שישה סוגים, ולכל אחד פתרון אחר' },
    guide:    { href: 'guide.html',     icon: 'chat',  t: 'מה קרה?',    s: 'מסלול שאלות שמוביל לתשובה מותאמת' },
    household:{ href: 'household.html', icon: 'users', t: 'בני הבית',   s: 'מה שקורה בבית ומגיע אל הכלב' }
  };

  var h = '<div class="foryou"><p class="fy-kicker" data-icon="bolt">מה רלוונטי ל' +
          (p.name ? e(p.name) : 'כלב שלך') + '</p>';

  var picks = [];
  if (b) {
    var st = STAGE[b.id];
    h += '<h3>' + st.head + '</h3><p>' + st.body + '</p>';
    picks = st.links.slice();
  }

  /* נטיות גזע — נאמר בזהירות, כנטייה ולא כתחזית */
  var notes = [];
  [br, br2].forEach(function (x) {
    if (!x) return;
    if (x.voice === 'high') notes.push('<strong>' + e(x.he) + '</strong> נוטה להשתמש בקול. נביחה מרובה אצלו היא לרוב חלק מהגזע ולא סימן לבעיה — אפשר להוריד את הכמות משמעותית, אבל לא לאפס.');
    if (x.energy === 'high') notes.push('<strong>' + e(x.he) + '</strong> גודל לעבודה לאורך שעות. בלי תעסוקה מנטלית קבועה, חלק ניכר ממה שנראה כמו בעיית התנהגות הוא בעצם אנרגיה שלא מצאה לאן ללכת.');
  });
  if (br && br.cross) {
    notes.push('<strong>מוצא:</strong> ' + br.cross);
  }
  if (br2) {
    notes.push('<strong>ולגבי הערבוב:</strong> תערובת של שני גזעים אינה ממוצע שלהם. תכונות עוברות בירושה בנפרד, ולכן אפשר לקבל את האנרגיה של האחד יחד עם הסף הרגשי של השני.');
    if (picks.indexOf('signals') === -1) picks.push('signals');
  }
  if (notes.length) {
    h += '<h4>מה שווה לדעת על הגזע</h4><ul>';
    notes.forEach(function (n) { h += '<li>' + n + '</li>'; });
    h += '</ul>';
  }

  if (picks.length) {
    h += '<ul class="fy-list">';
    picks.forEach(function (k) {
      var l = LINKS[k];
      h += '<li><a href="' + l.href + '" data-icon="' + l.icon + '"><span><b>' + l.t + '</b><small>' + l.s + '</small></span></a></li>';
    });
    h += '</ul>';
  }

  h += '<p class="hint" style="margin-top:1rem">המידע כאן מבוסס על שלב החיים ועל נטיות גידוליות כלליות. הוא לא ראה את ' +
       name + ' ואינו אבחון — ההבדלים בין פרטים בתוך אותו גזע גדולים לרוב מההבדלים בין הגזעים.</p></div>';
  return h;
};

Dog.renderForYou = function () {
  var html = Dog.forYou();
  document.querySelectorAll('[data-foryou]').forEach(function (el) {
    el.innerHTML = html;
    el.hidden = !html;
    if (html && typeof ICONS !== 'undefined') {
      el.querySelectorAll('[data-icon]').forEach(function (n) {
        if (!n.querySelector('svg') && ICONS[n.getAttribute('data-icon')]) {
          n.insertAdjacentHTML('afterbegin', ICONS[n.getAttribute('data-icon')]);
        }
      });
    }
  });
};

document.addEventListener('DOMContentLoaded', Dog.renderForYou);
document.addEventListener('dog:profile', Dog.renderForYou);
