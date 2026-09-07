(function () {
  'use strict';

  var MANAGER_NAME = 'טייאר';
  var YEAR = 2026;

  var SHIFT_TYPES = [
    { key: 'morning', label: 'משמרת בוקר', time: 'החל מ-08:00', color: 'var(--shift-morning)', cls: 'dot-morning' },
    { key: 'regular', label: 'משמרת רגילה', time: 'החל מ-10:00', color: 'var(--shift-regular)', cls: 'dot-regular' },
    { key: 'night', label: 'משמרת לילה', time: 'החל מ-20:00', color: 'var(--shift-night)', cls: 'dot-night' }
  ];

  var MONTH_NAMES = ['ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני', 'יולי', 'אוגוסט', 'ספטמבר', 'אוקטובר', 'נובמבר', 'דצמבר'];

  var STATUS_LABEL = { pending: 'ממתין לאישור', approved: 'מאושר', rejected: 'נדחה' };

  // ---------- Firebase ----------
  var db = null;
  var firebaseReady = false;
  try {
    if (typeof firebaseConfig !== 'undefined' && firebaseConfig.apiKey && firebaseConfig.apiKey.indexOf('PASTE_') !== 0) {
      firebase.initializeApp(firebaseConfig);
      db = firebase.firestore();
      firebaseReady = true;
    }
  } catch (e) {
    console.error('Firebase init failed', e);
  }

  // ---------- State ----------
  var state = {
    currentUser: localStorage.getItem('nvb_myname') || '',
    month: (new Date().getFullYear() === YEAR) ? new Date().getMonth() : 0,
    employees: [], // {id, name}
    shiftsByDate: {}, // 'YYYY-MM-DD' -> { morning: [entries], regular: [...], night: [...] }
    pending: [], // raw pending shift docs
    selectedDateKey: null
  };

  // ---------- Helpers ----------
  function pad2(n) { return n < 10 ? '0' + n : '' + n; }
  function dateKey(y, m, d) { return y + '-' + pad2(m + 1) + '-' + pad2(d); }
  function todayKey() {
    var t = new Date();
    return dateKey(t.getFullYear(), t.getMonth(), t.getDate());
  }
  function daysInMonth(y, m) { return new Date(y, m + 1, 0).getDate(); }
  function firstWeekday(y, m) { return new Date(y, m, 1).getDay(); }
  function isManager() { return state.currentUser === MANAGER_NAME; }
  function slugName(name) { return name.trim(); }

  function showToast(msg) {
    var t = document.getElementById('toast');
    t.textContent = msg;
    t.classList.add('show');
    clearTimeout(showToast._tm);
    showToast._tm = setTimeout(function () { t.classList.remove('show'); }, 2400);
  }

  // ---------- Firestore refs ----------
  function shiftDocId(dKey, shiftType, employeeName) {
    return dKey + '_' + shiftType + '_' + slugName(employeeName);
  }

  // ---------- Rendering: user select ----------
  function renderUserSelect() {
    var sel = document.getElementById('userSelect');
    var current = state.currentUser;
    sel.innerHTML = '<option value="">בחר/י שם...</option>';

    var mgrOpt = document.createElement('option');
    mgrOpt.value = MANAGER_NAME;
    mgrOpt.textContent = MANAGER_NAME + ' (מנהל)';
    sel.appendChild(mgrOpt);

    state.employees.forEach(function (emp) {
      var opt = document.createElement('option');
      opt.value = emp.name;
      opt.textContent = emp.name;
      sel.appendChild(opt);
    });

    if (current) {
      var exists = current === MANAGER_NAME || state.employees.some(function (e) { return e.name === current; });
      if (exists) sel.value = current;
    }

    document.getElementById('manageTabBtn').style.display = isManager() ? '' : 'none';
    if (!isManager()) {
      var activeTab = document.querySelector('.tab-btn.active');
      if (activeTab && activeTab.dataset.tab === 'manage') switchTab('calendar');
    }
  }

  function renderEmployeeManageList() {
    var wrap = document.getElementById('employeeList');
    if (!state.employees.length) {
      wrap.innerHTML = '<div class="empty-note">עדיין אין עובדים ברשימה. הוסיפו עובד ראשון למעלה.</div>';
      return;
    }
    wrap.innerHTML = '';
    state.employees.forEach(function (emp) {
      var row = document.createElement('div');
      row.className = 'list-row';
      row.innerHTML = '<span>' + escapeHtml(emp.name) + '</span>';
      var btn = document.createElement('button');
      btn.className = 'btn danger';
      btn.textContent = 'הסרה';
      btn.onclick = function () {
        if (confirm('להסיר את ' + emp.name + ' מרשימת העובדים? (ההיסטוריה שלו/ה תישמר)')) {
          db.collection('employees').doc(emp.id).delete().catch(function (e) { showToast('שגיאה: ' + e.message); });
        }
      };
      row.appendChild(btn);
      wrap.appendChild(row);
    });
  }

  function renderHistorySelect() {
    var sel = document.getElementById('historyEmployeeSelect');
    var current = sel.value;
    sel.innerHTML = '<option value="">בחר/י עובד...</option>';
    var names = state.employees.map(function (e) { return e.name; });
    if (names.indexOf(MANAGER_NAME) === -1) names.unshift(MANAGER_NAME);
    names.forEach(function (name) {
      var opt = document.createElement('option');
      opt.value = name;
      opt.textContent = name;
      sel.appendChild(opt);
    });
    if (current && names.indexOf(current) !== -1) sel.value = current;
  }

  function escapeHtml(str) {
    var d = document.createElement('div');
    d.textContent = str;
    return d.innerHTML;
  }

  // ---------- Calendar rendering ----------
  function renderMonthLabel() {
    document.getElementById('monthLabel').textContent = MONTH_NAMES[state.month] + ' ' + YEAR;
    document.getElementById('prevMonth').disabled = state.month === 0;
    document.getElementById('nextMonth').disabled = state.month === 11;
  }

  function summarizeDay(dKey) {
    var data = state.shiftsByDate[dKey];
    var result = [];
    SHIFT_TYPES.forEach(function (st) {
      var entries = (data && data[st.key]) || [];
      if (!entries.length) return;
      var hasApproved = entries.some(function (e) { return e.status === 'approved'; });
      result.push({ key: st.key, cls: st.cls, approved: hasApproved });
    });
    return result;
  }

  function renderCalendarGrid() {
    var grid = document.getElementById('calGrid');
    grid.innerHTML = '';
    var lead = firstWeekday(YEAR, state.month);
    var total = daysInMonth(YEAR, state.month);
    var tKey = todayKey();

    for (var i = 0; i < lead; i++) {
      var empty = document.createElement('div');
      empty.className = 'day-cell empty';
      grid.appendChild(empty);
    }

    for (var d = 1; d <= total; d++) {
      var dKey = dateKey(YEAR, state.month, d);
      var cell = document.createElement('div');
      cell.className = 'day-cell' + (dKey === tKey ? ' today' : '');
      var num = document.createElement('div');
      num.className = 'day-num';
      num.textContent = d;
      cell.appendChild(num);

      var dots = document.createElement('div');
      dots.className = 'day-dots';
      summarizeDay(dKey).forEach(function (s) {
        var dot = document.createElement('span');
        dot.className = 'dot ' + s.cls + ' ' + (s.approved ? 'approved' : 'pending');
        dots.appendChild(dot);
      });
      cell.appendChild(dots);

      cell.addEventListener('click', (function (key) {
        return function () { openDayModal(key); };
      })(dKey));

      grid.appendChild(cell);
    }
  }

  // ---------- Day modal ----------
  function openDayModal(dKey) {
    state.selectedDateKey = dKey;
    var parts = dKey.split('-');
    document.getElementById('dayModalTitle').textContent =
      parseInt(parts[2], 10) + ' ב' + MONTH_NAMES[parseInt(parts[1], 10) - 1] + ' ' + parts[0];
    renderDayModalBody();
    document.getElementById('dayModalBackdrop').classList.add('open');
  }

  function closeDayModal() {
    document.getElementById('dayModalBackdrop').classList.remove('open');
    state.selectedDateKey = null;
  }

  function renderDayModalBody() {
    var dKey = state.selectedDateKey;
    if (!dKey) return;
    var body = document.getElementById('dayModalBody');
    body.innerHTML = '';
    var dayData = state.shiftsByDate[dKey] || {};
    var manager = isManager();

    SHIFT_TYPES.forEach(function (st) {
      var entries = (dayData[st.key] || []).slice().sort(function (a, b) {
        return (a.employeeName || '').localeCompare(b.employeeName || '', 'he');
      });

      var block = document.createElement('div');
      block.className = 'shift-block';

      var head = document.createElement('div');
      head.className = 'shift-block-head';
      head.innerHTML =
        '<span class="shift-swatch" style="background:' + st.color + '"></span>' +
        '<span class="shift-title">' + st.label + '</span>' +
        '<span class="shift-time">· ' + st.time + '</span>';
      block.appendChild(head);

      if (!entries.length) {
        var none = document.createElement('div');
        none.className = 'empty-note';
        none.style.padding = '4px 0 8px';
        none.textContent = 'אין עדיין נרשמים למשמרת זו';
        block.appendChild(none);
      } else {
        entries.forEach(function (entry) {
          var row = document.createElement('div');
          row.className = 'person-row';
          var left = document.createElement('span');
          left.textContent = entry.employeeName;
          row.appendChild(left);

          var right = document.createElement('span');
          right.style.display = 'flex';
          right.style.alignItems = 'center';
          right.style.gap = '6px';

          var badge = document.createElement('span');
          badge.className = 'badge ' + entry.status;
          badge.textContent = STATUS_LABEL[entry.status] || entry.status;
          right.appendChild(badge);

          if (manager && entry.status === 'pending') {
            var okBtn = document.createElement('button');
            okBtn.className = 'mini-btn approve';
            okBtn.textContent = 'אישור';
            okBtn.onclick = function () { decideShift(entry.id, 'approved'); };
            right.appendChild(okBtn);

            var noBtn = document.createElement('button');
            noBtn.className = 'mini-btn reject';
            noBtn.textContent = 'דחייה';
            noBtn.onclick = function () { decideShift(entry.id, 'rejected'); };
            right.appendChild(noBtn);
          } else if (entry.employeeName === state.currentUser) {
            var cancelBtn = document.createElement('button');
            cancelBtn.className = 'mini-btn cancel';
            cancelBtn.textContent = 'ביטול';
            cancelBtn.onclick = function () { cancelShift(entry.id); };
            right.appendChild(cancelBtn);
          }

          row.appendChild(right);
          block.appendChild(row);
        });
      }

      var alreadyIn = entries.some(function (e) { return e.employeeName === state.currentUser && e.status !== 'rejected'; });
      if (state.currentUser && !manager) {
        var joinBtn = document.createElement('button');
        joinBtn.className = 'join-btn';
        joinBtn.textContent = alreadyIn ? 'כבר נרשמת למשמרת זו' : '+ הרשמה למשמרת זו';
        joinBtn.disabled = alreadyIn;
        joinBtn.onclick = function () { joinShift(dKey, st.key); };
        block.appendChild(joinBtn);
      }

      body.appendChild(block);
    });

    if (!state.currentUser) {
      var hint = document.createElement('div');
      hint.className = 'empty-note';
      hint.textContent = 'בחר/י את שמך בראש העמוד כדי להירשם למשמרת';
      body.appendChild(hint);
    }
  }

  // ---------- Firestore actions ----------
  function joinShift(dKey, shiftType) {
    if (!firebaseReady) { showToast('יש להגדיר קודם את חיבור Firebase (ראו README.md)'); return; }
    if (!state.currentUser) { showToast('בחר/י קודם את שמך'); return; }
    var id = shiftDocId(dKey, shiftType, state.currentUser);
    db.collection('shifts').doc(id).set({
      date: dKey,
      shiftType: shiftType,
      employeeName: state.currentUser,
      status: 'pending',
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    }).then(function () {
      showToast('נרשמת למשמרת - ממתין לאישור המנהל');
    }).catch(function (e) { showToast('שגיאה: ' + e.message); });
  }

  function cancelShift(shiftId) {
    if (!firebaseReady) return;
    db.collection('shifts').doc(shiftId).delete().then(function () {
      showToast('ההרשמה בוטלה');
    }).catch(function (e) { showToast('שגיאה: ' + e.message); });
  }

  function decideShift(shiftId, status) {
    if (!firebaseReady) return;
    db.collection('shifts').doc(shiftId).update({
      status: status,
      decidedAt: firebase.firestore.FieldValue.serverTimestamp()
    }).then(function () {
      showToast(status === 'approved' ? 'המשמרת אושרה' : 'המשמרת נדחתה');
    }).catch(function (e) { showToast('שגיאה: ' + e.message); });
  }

  // ---------- Manager: pending list ----------
  function renderPendingList() {
    var wrap = document.getElementById('pendingList');
    if (!state.pending.length) {
      wrap.innerHTML = '<div class="empty-note">אין בקשות ממתינות כרגע 🎉</div>';
      return;
    }
    var sorted = state.pending.slice().sort(function (a, b) { return a.date.localeCompare(b.date); });
    wrap.innerHTML = '';
    sorted.forEach(function (item) {
      var st = SHIFT_TYPES.filter(function (s) { return s.key === item.shiftType; })[0] || {};
      var row = document.createElement('div');
      row.className = 'list-row';
      row.innerHTML =
        '<span><b>' + escapeHtml(item.employeeName) + '</b>' +
        '<span class="meta"> · ' + item.date + ' · ' + (st.label || item.shiftType) + '</span></span>';
      var actions = document.createElement('span');
      actions.style.display = 'flex';
      actions.style.gap = '6px';

      var okBtn = document.createElement('button');
      okBtn.className = 'mini-btn approve';
      okBtn.textContent = 'אישור';
      okBtn.onclick = function () { decideShift(item.id, 'approved'); };
      actions.appendChild(okBtn);

      var noBtn = document.createElement('button');
      noBtn.className = 'mini-btn reject';
      noBtn.textContent = 'דחייה';
      noBtn.onclick = function () { decideShift(item.id, 'rejected'); };
      actions.appendChild(noBtn);

      row.appendChild(actions);
      wrap.appendChild(row);
    });
  }

  // ---------- Manager: history ----------
  var historyUnsub = null;
  function loadHistoryFor(name) {
    var wrap = document.getElementById('historyTableWrap');
    var statsWrap = document.getElementById('historyStats');
    if (!name) {
      wrap.innerHTML = '<div class="empty-note">בחר/י עובד כדי לראות היסטוריה</div>';
      statsWrap.innerHTML = '';
      return;
    }
    if (!firebaseReady) return;
    if (historyUnsub) historyUnsub();
    wrap.innerHTML = '<div class="empty-note">טוען...</div>';
    historyUnsub = db.collection('shifts').where('employeeName', '==', name).limit(500)
      .onSnapshot(function (snap) {
        var rows = [];
        snap.forEach(function (doc) { rows.push(doc.data()); });
        rows.sort(function (a, b) { return b.date.localeCompare(a.date); });

        var approved = rows.filter(function (r) { return r.status === 'approved'; }).length;
        var pending = rows.filter(function (r) { return r.status === 'pending'; }).length;
        var rejected = rows.filter(function (r) { return r.status === 'rejected'; }).length;

        statsWrap.innerHTML =
          '<div class="stat"><div class="num">' + approved + '</div><div class="lbl">משמרות מאושרות</div></div>' +
          '<div class="stat"><div class="num">' + pending + '</div><div class="lbl">ממתינות</div></div>' +
          '<div class="stat"><div class="num">' + rejected + '</div><div class="lbl">נדחו</div></div>';

        if (!rows.length) {
          wrap.innerHTML = '<div class="empty-note">אין עדיין רישום עבור ' + escapeHtml(name) + '</div>';
          return;
        }

        var html = '<table><thead><tr><th>תאריך</th><th>משמרת</th><th>סטטוס</th></tr></thead><tbody>';
        rows.forEach(function (r) {
          var st = SHIFT_TYPES.filter(function (s) { return s.key === r.shiftType; })[0] || {};
          html += '<tr><td>' + r.date + '</td><td>' + (st.label || r.shiftType) + '</td>' +
            '<td>' + (STATUS_LABEL[r.status] || r.status) + '</td></tr>';
        });
        html += '</tbody></table>';
        wrap.innerHTML = html;
      }, function (e) {
        wrap.innerHTML = '<div class="empty-note">שגיאה בטעינת היסטוריה: ' + e.message + '</div>';
      });
  }

  // ---------- Subscriptions ----------
  var monthUnsub = null;
  function subscribeMonth() {
    if (!firebaseReady) {
      renderCalendarGrid();
      return;
    }
    if (monthUnsub) monthUnsub();
    var startKey = dateKey(YEAR, state.month, 1);
    var nextMonth = state.month + 1;
    var endKey = nextMonth > 11 ? (YEAR + 1) + '-01-01' : dateKey(YEAR, nextMonth, 1);

    monthUnsub = db.collection('shifts')
      .where('date', '>=', startKey)
      .where('date', '<', endKey)
      .orderBy('date')
      .onSnapshot(function (snap) {
        var map = {};
        snap.forEach(function (doc) {
          var d = doc.data();
          if (!map[d.date]) map[d.date] = { morning: [], regular: [], night: [] };
          if (!map[d.date][d.shiftType]) map[d.date][d.shiftType] = [];
          map[d.date][d.shiftType].push({
            id: doc.id,
            employeeName: d.employeeName,
            status: d.status
          });
        });
        state.shiftsByDate = map;
        renderCalendarGrid();
        if (state.selectedDateKey) renderDayModalBody();
      }, function (e) {
        console.error(e);
        showToast('שגיאה בטעינת הלוח: ' + e.message);
      });
  }

  var pendingUnsub = null;
  function subscribePending() {
    if (!firebaseReady) return;
    if (pendingUnsub) pendingUnsub();
    pendingUnsub = db.collection('shifts').where('status', '==', 'pending').limit(300)
      .onSnapshot(function (snap) {
        var list = [];
        snap.forEach(function (doc) { list.push(Object.assign({ id: doc.id }, doc.data())); });
        state.pending = list;
        renderPendingList();
      }, function (e) {
        console.error(e);
      });
  }

  var employeesUnsub = null;
  function subscribeEmployees() {
    if (!firebaseReady) return;
    employeesUnsub = db.collection('employees').orderBy('name').onSnapshot(function (snap) {
      var list = [];
      snap.forEach(function (doc) { list.push({ id: doc.id, name: doc.data().name }); });
      state.employees = list;
      renderUserSelect();
      renderEmployeeManageList();
      renderHistorySelect();
    }, function (e) {
      console.error(e);
    });
  }

  // ---------- Tabs ----------
  function switchTab(tab) {
    document.querySelectorAll('.tab-btn').forEach(function (b) {
      b.classList.toggle('active', b.dataset.tab === tab);
    });
    document.getElementById('panel-calendar').classList.toggle('active', tab === 'calendar');
    document.getElementById('panel-manage').classList.toggle('active', tab === 'manage');
  }

  // ---------- Wiring ----------
  function wireEvents() {
    document.getElementById('userSelect').addEventListener('change', function (e) {
      state.currentUser = e.target.value;
      localStorage.setItem('nvb_myname', state.currentUser);
      renderUserSelect();
      if (state.selectedDateKey) renderDayModalBody();
    });

    document.querySelectorAll('.tab-btn').forEach(function (btn) {
      btn.addEventListener('click', function () {
        if (btn.dataset.tab === 'manage' && !isManager()) return;
        switchTab(btn.dataset.tab);
      });
    });

    document.getElementById('prevMonth').addEventListener('click', function () {
      if (state.month > 0) { state.month--; renderMonthLabel(); subscribeMonth(); }
    });
    document.getElementById('nextMonth').addEventListener('click', function () {
      if (state.month < 11) { state.month++; renderMonthLabel(); subscribeMonth(); }
    });

    document.getElementById('closeDayModal').addEventListener('click', closeDayModal);
    document.getElementById('dayModalBackdrop').addEventListener('click', function (e) {
      if (e.target === e.currentTarget) closeDayModal();
    });

    document.getElementById('addEmployeeBtn').addEventListener('click', addEmployee);
    document.getElementById('newEmployeeName').addEventListener('keydown', function (e) {
      if (e.key === 'Enter') addEmployee();
    });

    document.getElementById('historyEmployeeSelect').addEventListener('change', function (e) {
      loadHistoryFor(e.target.value);
    });
  }

  function addEmployee() {
    if (!firebaseReady) { showToast('יש להגדיר קודם את חיבור Firebase (ראו README.md)'); return; }
    var input = document.getElementById('newEmployeeName');
    var name = input.value.trim();
    if (!name) return;
    if (name === MANAGER_NAME) { showToast('השם הזה שמור למנהל/ת'); return; }
    if (state.employees.some(function (e) { return e.name === name; })) { showToast('העובד כבר קיים ברשימה'); return; }
    db.collection('employees').add({ name: name, createdAt: firebase.firestore.FieldValue.serverTimestamp() })
      .then(function () { input.value = ''; showToast('העובד נוסף בהצלחה'); })
      .catch(function (e) { showToast('שגיאה: ' + e.message); });
  }

  // ---------- Boot ----------
  function boot() {
    wireEvents();
    renderMonthLabel();
    renderUserSelect();

    if (!firebaseReady) {
      document.getElementById('calGrid').innerHTML =
        '<div class="empty-note" style="grid-column: 1 / -1;">⚠️ החיבור למסד הנתונים עדיין לא הוגדר.<br>פתחו את js/firebase-config.js ומלאו את הפרטים לפי ההוראות ב-README.md.</div>';
      renderMonthLabel();
      return;
    }

    subscribeEmployees();
    subscribeMonth();
    subscribePending();

    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('sw.js').catch(function () {});
    }
  }

  document.addEventListener('DOMContentLoaded', boot);
})();
