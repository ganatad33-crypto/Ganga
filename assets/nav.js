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
  cross: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M12 5.5v13M5.5 12h13"/></svg>'
};

/* סדר העמודים — קובע גם את התפריט וגם את "הקודם/הבא" */
var PAGES = [
  { file: 'index.html',     nav: 'בית',         title: 'כלבלב',              icon: 'home'  },
  { file: 'signals.html',   nav: 'לקרוא כלב',   title: 'לקרוא כלב',          icon: 'eye'   },
  { file: 'household.html', nav: 'בני הבית',    title: 'מה בני הבית עושים לכלב', icon: 'users' },
  { file: 'puppy.html',     nav: 'גור חדש',     title: 'גור חדש בבית',       icon: 'paw'   },
  { file: 'barking.html',   nav: 'נביחה',       title: 'הכלב שלי נובח',      icon: 'sound' },
  { file: 'aggression.html',nav: 'תוקפנות',     title: 'הכלב שלי תוקפני',    icon: 'alert' },
  { file: 'separation.html',nav: 'חרדת נטישה',  title: 'חרדת נטישה',         icon: 'house' },
  { file: 'cases.html',     nav: 'מקרים',       title: 'שלושה מקרים',        icon: 'bolt'  },
  { file: 'guide.html',     nav: 'מה קרה?',     title: 'מה קרה לכלב שלי',    icon: 'chat'  },
  { file: 'profile.html',   nav: 'הכלב שלי',    title: 'פרטי הכלב שלי',      icon: 'dog'   }
];

(function () {
  function here() {
    var f = location.pathname.split('/').pop() || 'index.html';
    return f;
  }

  function buildTop(el) {
    var cur = here();
    var links = PAGES.map(function (p) {
      return '<a href="' + p.file + '"' + (p.file === cur ? ' aria-current="page"' : '') + '>' + p.nav + '</a>';
    }).join('');

    el.innerHTML =
      '<div class="wrap">' +
        '<div class="topbar-row">' +
          '<a class="brand" href="index.html">' + ICONS.paw + 'כלבלב</a>' +
          '<span class="brand-note">בבנייה</span>' +
          '<div class="navbtns">' +
            '<button class="iconbtn" type="button" data-hist="back" aria-label="חזרה לעמוד הקודם" title="אחורה">' + ICONS.back + '</button>' +
            '<button class="iconbtn" type="button" data-hist="fwd" aria-label="קדימה" title="קדימה">' + ICONS.fwd + '</button>' +
          '</div>' +
        '</div>' +
        '<nav class="mainnav" aria-label="ניווט ראשי">' + links + '</nav>' +
      '</div>';
  }

  function buildCrumbs(el) {
    var cur = here();
    var p = PAGES.filter(function (x) { return x.file === cur; })[0];
    if (!p || p.file === 'index.html') { el.remove(); return; }
    el.className = 'crumbs';
    el.innerHTML = '<a href="index.html">בית</a><span>›</span>' + p.nav;
  }

  function buildPager(el) {
    var cur = here();
    var i = -1;
    PAGES.forEach(function (p, n) { if (p.file === cur) i = n; });
    if (i === -1) { el.remove(); return; }
    var prev = PAGES[i - 1], next = PAGES[i + 1], h = '';
    if (prev) h += '<a class="prev" href="' + prev.file + '">' + ICONS.back +
      '<span><small>הקודם</small><b>' + prev.title + '</b></span></a>';
    if (next) h += '<a class="next" href="' + next.file + '">' + ICONS.fwd +
      '<span><small>הבא</small><b>' + next.title + '</b></span></a>';
    if (!h) { el.remove(); return; }
    el.className = 'pager';
    el.setAttribute('aria-label', 'ניווט בין עמודים');
    el.innerHTML = h;
  }

  document.addEventListener('DOMContentLoaded', function () {
    /* מסמן שה-JS חי — רק אז אנימציות ההופעה מופעלות */
    document.documentElement.classList.add('js-on');
    document.querySelectorAll('[data-nav]').forEach(buildTop);
    document.querySelectorAll('[data-crumbs]').forEach(buildCrumbs);
    document.querySelectorAll('[data-pager]').forEach(buildPager);

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
})();
