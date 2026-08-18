/* ===========================================================
   מנוע המסע — מציג עץ שאלות ומוביל לתשובה.
   התשובה מותאמת לגיל הכלב אם הוזן פרופיל.
   =========================================================== */

var Journey = (function () {

  var CLEAN_HTML =
    '<h4>ואיך מנקים</h4>' +
    '<ul>' +
    '<li>קודם להרים את המוצק עם נייר, בלי לשפשף. שפשוף דוחס את זה פנימה לתוך הסיבים.</li>' +
    '<li>לספוג את הנוזל בלחיצה עם מגבת נייר או מטלית — לא לשפשף.</li>' +
    '<li>לנקות עם <strong>מנקה אנזימטי</strong> לחיות מחמד. אנזימים מפרקים את השאריות האורגניות; סבון רגיל רק מכסה את הריח, והכלב עדיין מריח אותו.</li>' +
    '<li><strong>להימנע ממנקים על בסיס אמוניה.</strong> הריח שלהם דומה לשתן, והוא עלול דווקא למשוך את הכלב לסמן שוב באותו מקום.</li>' +
    '<li>על שטיח — לספוג, להרטיב במנקה אנזימטי, להשאיר להיספג לפי ההוראות, ורק אז לספוג שוב.</li>' +
    '</ul>';

  function md(s) {
    return Dog.esc(s).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  }

  function render(root, treeKey) {
    var tree = TREES[treeKey];
    if (!tree) { root.innerHTML = '<p>לא נמצא.</p>'; return; }
    var path = [tree.start];

    function band() {
      var p = Dog.load();
      return p ? Dog.band(p.months) : null;
    }

    function draw() {
      var id = path[path.length - 1];
      var node = tree.nodes[id];
      var h = '';

      if (node.q) {
        h += '<p class="j-step">שאלה ' + path.length + '</p>';
        h += '<p class="j-q">' + md(node.q) + '</p>';
        if (node.help) h += '<p class="j-help">' + md(node.help) + '</p>';
        h += '<div class="j-opts">';
        node.opts.forEach(function (o, i) {
          h += '<button class="j-opt" type="button" data-go="' + i + '">' + md(o.t) +
               (o.s ? '<small>' + md(o.s) + '</small>' : '') + '</button>';
        });
        h += '</div>';
      } else {
        var a = node.a, b = band();
        h += '<div class="j-answer">';
        if (a.urgent) h += '<div class="j-urgent"><p><strong>' + md(a.title) + '</strong></p><p>' + md(a.urgent) + '</p></div>';
        else h += '<h3>' + md(a.title) + '</h3>';

        (a.body || []).forEach(function (p) { h += '<p>' + md(p) + '</p>'; });

        if (a.age && b && a.age[b.id]) {
          h += '<div class="ageblock"><span class="agechip">מותאם לגיל: ' + Dog.esc(b.label) + '</span>' +
               '<p>' + md(a.age[b.id]) + '</p></div>';
        } else if (a.age && !b) {
          h += '<div class="ageblock"><p class="j-help">יש כאן גם מידע שמשתנה לפי גיל הכלב. ' +
               '<button class="btn btn-plain" type="button" data-profile-open>הזנת גיל</button></p></div>';
        }

        if (a.clean) h += CLEAN_HTML;

        if (a.flags && a.flags.length) {
          h += '<div class="flags"><p><strong>דגלים אדומים</strong></p><ul>';
          a.flags.forEach(function (f) { h += '<li>' + md(f) + '</li>'; });
          h += '</ul></div>';
        }
        if (a.todo) {
          h += '<div class="today"><p class="today-title">נסה את זה היום</p><p>' + md(a.todo) + '</p></div>';
        }

        h += '<div class="j-trail"><b>הדרך שעברת:</b> ' + trail() + '</div>';
        h += '</div>';
      }

      h += '<div class="j-nav">';
      if (path.length > 1) h += '<button type="button" data-back>חזרה לשאלה הקודמת</button>';
      h += '<button type="button" data-restart>להתחיל מחדש</button>';
      h += '</div>';

      root.innerHTML = h;
    }

    function trail() {
      var out = [];
      for (var i = 0; i < path.length - 1; i++) {
        var n = tree.nodes[path[i]];
        if (!n || !n.q) continue;
        var next = path[i + 1], chosen = null;
        n.opts.forEach(function (o) { if (o.go === next && chosen === null) chosen = o.t; });
        if (chosen) out.push(Dog.esc(chosen));
      }
      return out.join(' ← ') || '—';
    }

    root.addEventListener('click', function (e) {
      var t = e.target;
      if (!t || !t.closest) return;
      var opt = t.closest('[data-go]');
      if (opt) {
        var node = tree.nodes[path[path.length - 1]];
        path.push(node.opts[+opt.getAttribute('data-go')].go);
        draw();
        root.scrollIntoView({ block: 'start' });
        return;
      }
      if (t.closest('[data-back]'))    { path.pop(); draw(); return; }
      if (t.closest('[data-restart]')) { path = [tree.start]; draw(); return; }
    });

    document.addEventListener('dog:profile', draw);
    draw();
  }

  /* בדיקת שלמות — כל הפניה חייבת להוביל לצומת קיים */
  function validate() {
    var bad = [];
    for (var k in TREES) {
      var t = TREES[k];
      if (!t.nodes[t.start]) bad.push(k + ': start "' + t.start + '" missing');
      for (var id in t.nodes) {
        var n = t.nodes[id];
        if (n.q) (n.opts || []).forEach(function (o) {
          if (!t.nodes[o.go]) bad.push(k + '.' + id + ' -> "' + o.go + '" missing');
        });
      }
    }
    return bad;
  }

  return { render: render, validate: validate };
})();
