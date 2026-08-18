/* טעינת סרטון בלחיצה בלבד — הדף לא מושך שום דבר מיוטיוב עד שהגולש ביקש.
   שומר על זמן טעינה מהיר ועל פרטיות הגולש. */
document.addEventListener('click', function (e) {
  var t = e.target;
  if (!t || !t.closest) return;
  var btn = t.closest('.video-frame[data-yt]');
  if (!btn) return;

  var id    = btn.getAttribute('data-yt');
  var start = btn.getAttribute('data-start') || '';
  var src   = 'https://www.youtube-nocookie.com/embed/' + encodeURIComponent(id) +
              '?autoplay=1&rel=0' + (start ? '&start=' + encodeURIComponent(start) : '');

  var frame = document.createElement('iframe');
  frame.className = 'video-frame';
  frame.src = src;
  frame.title = btn.getAttribute('data-title') || 'סרטון';
  frame.allow = 'accelerometer; autoplay; encrypted-media; picture-in-picture';
  frame.allowFullscreen = true;

  btn.replaceWith(frame);
});

/* אם תמונת התצוגה של יוטיוב לא נטענת — לא משאירים ריבוע שבור */
document.querySelectorAll('.video-frame img').forEach(function (img) {
  img.addEventListener('error', function () { img.style.display = 'none'; });
});
