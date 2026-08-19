/* ===========================================================
   ניווט אחיד לכל האתר.
   בונה: כותרת עליונה + כפתורי אחורה/קדימה + תפריט + פירורי לחם
   + ניווט "הקודם/הבא" בתחתית כל עמוד.
   קיים במקום אחד כדי שלא ייווצרו הבדלים בין עמודים.
   =========================================================== */

var ICONS = {
  paw:   '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><ellipse cx="7" cy="8" rx="2.1" ry="2.7"/><ellipse cx="12" cy="6.4" rx="2.1" ry="2.9"/><ellipse cx="17" cy="8" rx="2.1" ry="2.7"/><ellipse cx="20" cy="12.8" rx="1.9" ry="2.3"/><path d="M12 11.4c2.6 0 5.4 2.3 5.4 4.9 0 2-1.6 3.3-3.6 3.3-1 0-1.3-.3-1.8-.3s-.8.3-1.8.3c-2 0-3.6-1.3-3.6-3.3 0-2.6 2.8-4.9 5.4-4.9z"/></svg>',
  back:  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 6l6 6-6 6"/></svg>',
  fwd:   '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 6l-6 6 6 6"/></svg>',
  bolt:  '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M13 2L4.5 13H11l-1 9 8.5-11H12l1-9z"/></svg>',
  check: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 12.5l5 5L20 6.5"/></svg>',
  play:  '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M8 5l12 7-12 7z"/></svg>',
  alert: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3l9.5 17H2.5L12 3z"/><path d="M12 10v4.5M12 17.6v.01"/></svg>',
  dog:   '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4.5 5.5v5.2c0 4 3.4 7.3 7.5 7.3s7.5-3.3 7.5-7.3V5.5l-3.3 2.2h-8.4L4.5 5.5z"/><path d="M9.6 11.4v.01M14.4 11.4v.01"/><path d="M12 14.2c-.7 0-1.2.4-1.2.9s.5.9 1.2.9 1.2-.4 1.2-.9-.5-.9-1.2-.9z"/></svg>',
  eye:   '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M2.5 12S6 5.8 12 5.8 21.5 12 21.5 12 18 18.2 12 18.2 2.5 12 2.5 12z"/><circle cx="12" cy="12" r="2.8"/></svg>',
  home:  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3.5 10.5L12 3.5l8.5 7"/><path d="M5.5 9.6V20h13V9.6"/></svg>',
  chat:  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 5.5h16v11H9l-5 4v-15z"/></svg>',
  sound: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 9.5h3.5L12 5.5v13L7.5 14.5H4v-5z"/><path d="M15.6 9.2a4 4 0 010 5.6M18.3 6.7a7.6 7.6 0 010 10.6"/></svg>',
  users: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="9" cy="8" r="3.2"/><path d="M3 19.5c0-3.1 2.7-5.2 6-5.2s6 2.1 6 5.2"/><path d="M16.5 5.2a3.2 3.2 0 010 6.2M18 14.6c2 .7 3.3 2.5 3.3 4.9"/></svg>',
  leash: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="6.5" cy="5.5" r="2.5"/><path d="M6.5 8v4.5c0 4 3.5 4 3.5 7.5"/><path d="M14 12c3 0 5.5 2 5.5 5"/></svg>',
  house: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 20V9.5L12 4l8 5.5V20z"/><path d="M9.5 20v-5.5h5V20"/></svg>',
  cross: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M12 5.5v13M5.5 12h13"/></svg>',
  moon:  '<svg class="moon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 14.2A8.4 8.4 0 019.8 4a8.4 8.4 0 1010.2 10.2z"/></svg>',
  sun:   '<svg class="sun" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="4.2"/><path d="M12 2.6v2.2M12 19.2v2.2M2.6 12h2.2M19.2 12h2.2M5.4 5.4l1.6 1.6M17 17l1.6 1.6M18.6 5.4L17 7M7 17l-1.6 1.6"/></svg>',
  search:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="10.8" cy="10.8" r="6.8"/><path d="M20 20l-4.5-4.5"/></svg>'
};

/* סדר העמודים — קובע את התפריט, פירורי הלחם, "הקודם/הבא" ומפת האתר.
   inNav:false = לא בסרגל העליון, אבל כן במפה בתחתית ובניווט בין עמודים.
   slug: '' = הבית (בשורש). כל שאר הדפים חיים בתיקייה משלהם (slug/index.html)
   כדי לקבל כתובות נקיות בלי סיומת .html. */
var PAGES = [
  { slug: '',            nav: 'בית',        title: 'כלבלב',                  icon: 'home',  group: 'התחלה' },
  { slug: 'signals',     nav: 'לקרוא כלב',  title: 'לקרוא כלב',              icon: 'eye',   group: 'המסלול' },
  { slug: 'learning',    nav: 'להבין',      title: 'איך כלב לומד',           icon: 'bolt',  group: 'המסלול' },
  { slug: 'tricks',      nav: 'טריקים',     title: 'טריקים בסיסיים',         icon: 'check', group: 'המסלול', inNav: false },
  { slug: 'household',   nav: 'בני הבית',   title: 'מה בני הבית עושים לכלב', icon: 'users', group: 'המסלול', inNav: false },
  { slug: 'routine',     nav: 'לחיות',      title: 'לחיות עם כלב',           icon: 'house', group: 'המסלול' },
  { slug: 'barking',     nav: 'נביחה',      title: 'הכלב שלי נובח',          icon: 'sound', group: 'בעיות', inNav: false },
  { slug: 'aggression',  nav: 'תוקפנות',    title: 'הכלב שלי תוקפני',        icon: 'alert', group: 'בעיות', inNav: false },
  { slug: 'separation',  nav: 'חרדת נטישה', title: 'חרדת נטישה',             icon: 'house', group: 'בעיות', inNav: false },
  { slug: 'puppy',       nav: 'גור חדש',    title: 'גור חדש בבית',           icon: 'paw',   group: 'בעיות', inNav: false },
  { slug: 'world',       nav: 'בעולם',      title: 'לנוע בעולם',             icon: 'users', group: 'המסלול' },
  { slug: 'lifespan',    nav: 'לאורך החיים',title: 'לאורך החיים',            icon: 'dog',   group: 'המסלול', inNav: false },
  { slug: 'cases',       nav: 'מקרים',      title: 'שלושה מקרים',            icon: 'bolt',  group: 'כלים' },
  { slug: 'qa',          nav: 'שאלות',      title: 'שאלות ותשובות',          icon: 'chat',  group: 'כלים' },
  { slug: 'guide',       nav: 'מה קרה?',    title: 'מה קרה לכלב שלי',        icon: 'chat',  group: 'כלים' },
  { slug: 'profile',     nav: 'הכלב שלי',   title: 'פרטי הכלב שלי',          icon: 'dog',   group: 'כלים' }
];

(function () {
  /* data-page על ה-<html> קובע את המיקום הנוכחי (ראו migration script) —
     בלי לנחש לפי pathname, כדי שזה יעבוד גם ב-file:// וגם מאחורי כל בסיס. */
  var CUR_SLUG = document.documentElement.getAttribute('data-page') || '';
  var ROOT = CUR_SLUG ? '../' : '';
  window.SITE_ROOT = ROOT; /* profile.js משתמש באותו בסיס */

  function pageHref(slug) {
    return slug ? ROOT + slug + '/' : (ROOT || './');
  }

  function here() { return CUR_SLUG; }

  function buildTop(el) {
    var cur = here();
    var links = PAGES.filter(function (p) { return p.inNav !== false; }).map(function (p) {
      return '<a href="' + pageHref(p.slug) + '"' + (p.slug === cur ? ' aria-current="page"' : '') + '>' + p.nav + '</a>';
    }).join('');

    el.innerHTML =
      '<div class="wrap">' +
        '<div class="topbar-row">' +
          '<a class="brand" href="' + pageHref('') + '">' + ICONS.paw + 'כלבלב</a>' +
          '<span class="brand-note">בבנייה</span>' +
          '<div class="navbtns">' +
            '<button class="iconbtn" type="button" data-hist="back" aria-label="חזרה לעמוד הקודם" title="אחורה">' + ICONS.back + '</button>' +
            '<button class="iconbtn" type="button" data-hist="fwd" aria-label="קדימה" title="קדימה">' + ICONS.fwd + '</button>' +
            '<button class="iconbtn" type="button" data-search-open aria-label="חיפוש באתר" title="חיפוש (Ctrl+K)">' + ICONS.search + '</button>' +
            '<button class="iconbtn themebtn" type="button" aria-label="החלפת תצוגה בהירה או כהה" title="תצוגה בהירה / כהה">' + ICONS.moon + ICONS.sun + '</button>' +
          '</div>' +
        '</div>' +
        '<nav class="mainnav" aria-label="ניווט ראשי">' + links + '</nav>' +
      '</div>';

    /* בגלילה אופקית במובייל — לוודא שהעמוד הפעיל נראה, לא רק הראשון ברשימה */
    var navEl = el.querySelector('.mainnav');
    var activeLink = navEl.querySelector('[aria-current="page"]');
    if (activeLink) activeLink.scrollIntoView({ block: 'nearest', inline: 'nearest' });
    /* רמז חזותי (דהייה בקצוות) רק כשבאמת יש מה לגלול */
    if (navEl.scrollWidth > navEl.clientWidth + 1) navEl.classList.add('is-scrollable');
  }

  function buildCrumbs(el) {
    var cur = here();
    var p = PAGES.filter(function (x) { return x.slug === cur; })[0];
    if (!p || p.slug === '') { el.remove(); return; }
    el.className = 'crumbs';
    el.innerHTML = '<a href="' + pageHref('') + '">בית</a><span>›</span>' + p.nav;
  }

  function buildPager(el) {
    var cur = here();
    var i = -1;
    PAGES.forEach(function (p, n) { if (p.slug === cur) i = n; });
    if (i === -1) { el.remove(); return; }
    var prev = PAGES[i - 1], next = PAGES[i + 1], h = '';
    if (prev) h += '<a class="prev" href="' + pageHref(prev.slug) + '">' + ICONS.back +
      '<span><small>הקודם</small><b>' + prev.title + '</b></span></a>';
    if (next) h += '<a class="next" href="' + pageHref(next.slug) + '">' + ICONS.fwd +
      '<span><small>הבא</small><b>' + next.title + '</b></span></a>';
    if (!h) { el.remove(); return; }
    el.className = 'pager';
    el.setAttribute('aria-label', 'ניווט בין עמודים');
    el.innerHTML = h;
  }

  function buildMap(el) {
    var cur = here(), groups = {}, order = [];
    PAGES.forEach(function (p) {
      if (p.slug === '') return;
      if (!groups[p.group]) { groups[p.group] = []; order.push(p.group); }
      groups[p.group].push(p);
    });
    var h = '<div class="wrap"><p class="map-title">כל העמודים</p><div class="map-cols">';
    order.forEach(function (g) {
      h += '<div><h3>' + g + '</h3><ul>';
      groups[g].forEach(function (p) {
        h += '<li>' + (p.slug === cur
          ? '<span aria-current="page">' + p.nav + '</span>'
          : '<a href="' + pageHref(p.slug) + '">' + p.nav + '</a>') + '</li>';
      });
      h += '</ul></div>';
    });
    h += '</div><p class="map-note">כלבלב · מדריך עברי לבעלי כלבים · האתר בבנייה</p></div>';
    el.className = 'sitemap';
    el.innerHTML = h;
  }

  document.addEventListener('DOMContentLoaded', function () {
    /* מסמן שה-JS חי — רק אז אנימציות ההופעה מופעלות */
    document.documentElement.classList.add('js-on');
    document.querySelectorAll('[data-nav]').forEach(buildTop);
    document.querySelectorAll('[data-crumbs]').forEach(buildCrumbs);
    document.querySelectorAll('[data-pager]').forEach(buildPager);
    document.querySelectorAll('[data-map]').forEach(buildMap);

    /* מילוי אייקונים לפי data-icon */
    document.querySelectorAll('[data-icon]').forEach(function (el) {
      var name = el.getAttribute('data-icon');
      if (ICONS[name]) el.insertAdjacentHTML('afterbegin', ICONS[name]);
    });
  });

  document.addEventListener('click', function (e) {
    var t = e.target;
    if (!t || !t.closest) return;
    var b = t.closest('[data-hist]');
    if (!b) return;
    if (b.getAttribute('data-hist') === 'back') history.back();
    else history.forward();
  });

  /* ===========================================================
     חיפוש באתר — אינדקס נבנה מראש (tools/build_search_index.py),
     נטען פעם אחת בעצלנות בפתיחה הראשונה. חיפוש תת-מחרוזת פשוט,
     בלי תלות חיצונית.
     =========================================================== */
  var TYPE_META = {
    qa:    { icon: 'chat',  label: 'שאלה' },
    tree:  { icon: 'bolt',  label: 'מסלול שאלות' },
    page:  { icon: 'eye',   label: 'עמוד' },
    breed: { icon: 'dog',   label: 'גזע' }
  };

  var searchIndex = null, searchPromise = null, modal, input, resultsEl, activeIdx = -1, curResults = [];

  function ensureModal() {
    if (modal) return modal;
    modal = document.createElement('div');
    modal.className = 'searchmodal';
    modal.hidden = true;
    modal.innerHTML =
      '<div class="searchbackdrop" data-search-close></div>' +
      '<div class="searchbox" role="dialog" aria-modal="true" aria-label="חיפוש באתר">' +
        '<div class="searchhead">' +
          ICONS.search +
          '<input type="text" class="searchinput" placeholder="חפשו שאלה, נושא, גזע…" autocomplete="off" aria-label="חיפוש">' +
          '<button type="button" class="iconbtn" data-search-close aria-label="סגירת חיפוש">' + ICONS.cross + '</button>' +
        '</div>' +
        '<div class="searchresults"></div>' +
      '</div>';
    document.body.appendChild(modal);
    input = modal.querySelector('.searchinput');
    resultsEl = modal.querySelector('.searchresults');
    input.addEventListener('input', function () { renderResults(input.value); });
    return modal;
  }

  function loadIndex() {
    if (searchPromise) return searchPromise;
    searchPromise = fetch(ROOT + 'assets/search-index.json')
      .then(function (r) { return r.json(); })
      .then(function (data) { searchIndex = data; return data; })
      .catch(function () { searchIndex = []; return []; });
    return searchPromise;
  }

  function openSearch() {
    ensureModal();
    modal.hidden = false;
    document.documentElement.classList.add('search-open');
    input.value = '';
    resultsEl.innerHTML = '';
    activeIdx = -1;
    loadIndex().then(function () { input.focus(); });
  }

  function closeSearch() {
    if (!modal || modal.hidden) return;
    modal.hidden = true;
    document.documentElement.classList.remove('search-open');
  }

  function renderResults(query) {
    query = query.trim();
    if (!searchIndex || !query) { resultsEl.innerHTML = ''; curResults = []; activeIdx = -1; return; }
    var q = query.toLowerCase();
    curResults = searchIndex.filter(function (it) {
      return it.title.toLowerCase().indexOf(q) !== -1 ||
             (it.snippet && it.snippet.toLowerCase().indexOf(q) !== -1) ||
             (it.group && it.group.toLowerCase().indexOf(q) !== -1);
    }).sort(function (a, b) {
      var ai = a.title.toLowerCase().indexOf(q), bi = b.title.toLowerCase().indexOf(q);
      if (ai === -1) ai = 999; if (bi === -1) bi = 999;
      return ai - bi;
    }).slice(0, 30);

    activeIdx = curResults.length ? 0 : -1;

    if (!curResults.length) {
      resultsEl.innerHTML = '<p class="search-empty">לא נמצאו תוצאות ל"' + Dog.esc(query) + '".</p>';
      return;
    }

    resultsEl.innerHTML = curResults.map(function (it, i) {
      var meta = TYPE_META[it.type] || TYPE_META.page;
      return '<a class="search-result' + (i === 0 ? ' active' : '') + '" href="' + ROOT + it.url + '" data-idx="' + i + '">' +
        '<span class="search-result-icon">' + ICONS[meta.icon] + '</span>' +
        '<span class="search-result-text">' +
          '<b>' + Dog.esc(it.title) + '</b>' +
          '<small>' + Dog.esc(meta.label) + (it.group && it.type !== 'page' ? ' · ' + Dog.esc(it.group) : '') + '</small>' +
          (it.snippet ? '<span class="search-snippet">' + Dog.esc(it.snippet) + '</span>' : '') +
        '</span>' +
      '</a>';
    }).join('');
  }

  function moveActive(delta) {
    if (!curResults.length) return;
    var items = resultsEl.querySelectorAll('.search-result');
    activeIdx = (activeIdx + delta + items.length) % items.length;
    items.forEach(function (el, i) { el.classList.toggle('active', i === activeIdx); });
    items[activeIdx].scrollIntoView({ block: 'nearest' });
  }

  document.addEventListener('click', function (e) {
    var t = e.target;
    if (!t || !t.closest) return;
    if (t.closest('[data-search-open]')) { openSearch(); return; }
    if (t.closest('[data-search-close]')) { closeSearch(); return; }
  });

  document.addEventListener('keydown', function (e) {
    var isOpen = modal && !modal.hidden;
    var tag = document.activeElement && document.activeElement.tagName;
    var typing = tag === 'INPUT' || tag === 'TEXTAREA' || (document.activeElement && document.activeElement.isContentEditable);

    if ((e.key === 'k' && (e.ctrlKey || e.metaKey)) || (e.key === '/' && !typing && !isOpen)) {
      e.preventDefault(); openSearch(); return;
    }
    if (!isOpen) return;
    if (e.key === 'Escape') { closeSearch(); return; }
    if (e.key === 'ArrowDown') { e.preventDefault(); moveActive(1); return; }
    if (e.key === 'ArrowUp') { e.preventDefault(); moveActive(-1); return; }
    if (e.key === 'Enter' && activeIdx > -1) {
      var el = resultsEl.querySelectorAll('.search-result')[activeIdx];
      if (el) { e.preventDefault(); location.href = el.getAttribute('href'); }
    }
  });
})();
