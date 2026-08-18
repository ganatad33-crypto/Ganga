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
