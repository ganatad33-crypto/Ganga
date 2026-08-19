/* ===========================================================
   ליטוש חוויה: פס התקדמות קריאה, חשיפה בגלילה, ובורר תצוגה.
   הכל שיפור-הדרגתי: אם ה-JS לא רץ, העמוד עובד בדיוק אותו דבר.
   =========================================================== */

(function () {
  var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- מצב תצוגה ---------- */
  var KEY = 'kalbalav-theme';
  try {
    var saved = localStorage.getItem(KEY);
    if (saved === 'dark' || saved === 'light') document.documentElement.setAttribute('data-theme', saved);
  } catch (e) {}

  function toggleTheme() {
    var el = document.documentElement;
    var cur = el.getAttribute('data-theme');
    if (!cur) {
      var sysDark = window.matchMedia && matchMedia('(prefers-color-scheme: dark)').matches;
      cur = sysDark ? 'dark' : 'light';
    }
    var next = cur === 'dark' ? 'light' : 'dark';
    el.setAttribute('data-theme', next);
    try { localStorage.setItem(KEY, next); } catch (e) {}
    var b = document.querySelector('.themebtn');
    if (b) b.setAttribute('aria-label', next === 'dark' ? 'מעבר לתצוגה בהירה' : 'מעבר לתצוגה כהה');
  }

  document.addEventListener('click', function (e) {
    var t = e.target;
    if (t && t.closest && t.closest('.themebtn')) toggleTheme();
  });

  document.addEventListener('DOMContentLoaded', function () {

    /* ---------- פס התקדמות קריאה — רק בעמודי תוכן ארוכים ---------- */
    var main = document.getElementById('main');
    if (main && main.offsetHeight > 2200) {
      var bar = document.createElement('div');
      bar.className = 'readbar';
      bar.setAttribute('aria-hidden', 'true');
      bar.innerHTML = '<i></i>';
      document.body.appendChild(bar);
      var fill = bar.firstChild, ticking = false;
      function draw() {
        var top = main.offsetTop;
        var total = main.offsetHeight - window.innerHeight;
        var done = window.scrollY - top;
        var pct = total > 0 ? Math.min(100, Math.max(0, (done / total) * 100)) : 0;
        fill.style.width = pct + '%';
        ticking = false;
      }
      addEventListener('scroll', function () {
        if (!ticking) { ticking = true; requestAnimationFrame(draw); }
      }, { passive: true });
      draw();
    }

    /* ---------- חשיפה בגלילה ---------- */
    if (!reduce && 'IntersectionObserver' in window) {
      var targets = main ? main.querySelectorAll('h2, .types, .angles, .today, .flags, .case, .diagram, .entrys, .journeypath, .facts, .qagroup') : [];
      if (targets.length) {
        var io = new IntersectionObserver(function (entries) {
          entries.forEach(function (en) {
            if (en.isIntersecting) { en.target.classList.add('seen'); io.unobserve(en.target); }
          });
        }, { rootMargin: '0px 0px -8% 0px', threshold: 0.05 });
        targets.forEach(function (el) {
          /* לא מסתירים את מה שכבר נראה במסך הראשון */
          if (el.getBoundingClientRect().top < window.innerHeight * 0.95) return;
          el.classList.add('onview');
          io.observe(el);
        });
      }
    }

    /* ---------- קפיצה ישירה לשאלה ספציפית (מהחיפוש, או קישור עם #qa12) ---------- */
    if (location.hash) {
      var target = document.getElementById(location.hash.slice(1));
      if (target && target.tagName === 'DETAILS') {
        target.open = true;
        var group = target.closest('.qagroup');
        if (group) group.classList.remove('onview');
        requestAnimationFrame(function () { target.scrollIntoView({ block: 'center' }); });
      }
    }
  });
})();
