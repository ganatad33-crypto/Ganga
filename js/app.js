(function () {
  'use strict';

  var MANAGER_NAME = 'אמיר טייאר';
  var YEAR = 2026;

  var SHIFT_TYPES = [
    { key: 'morning', label: 'משמרת בוקר', time: 'החל מ-08:00', color: 'var(--shift-morning)', cls: 'dot-morning' },
    { key: 'regular', label: 'משמרת רגילה', time: 'החל מ-10:00', color: 'var(--shift-regular)', cls: 'dot-regular' },
    { key: 'night', label: 'משמרת לילה', time: 'החל מ-20:00', color: 'var(--shift-night)', cls: 'dot-night' }
  ];

  var MONTH_NAMES = ['ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני', 'יולי', 'אוגוסט', 'ספטמבר', 'אוקטובר', 'נובמבר', 'דצמבר'];
  var WEEKDAY_NAMES = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'];

  var STATUS_LABEL = { pending: 'ממתין לאישור', approved: 'מאושר', rejected: 'נדחה' };
  var SHIFT_ORDER = { morning: 0, regular: 1, night: 2 };

  // A fixed, distinct color per employee (derived from their name) so the
  // same person always shows the same color everywhere in the app.
  var EMPLOYEE_PALETTE = [
    '#f87171', '#fb923c', '#fbbf24', '#a3e635', '#34d399',
    '#22d3ee', '#60a5fa', '#a78bfa', '#f472b6', '#facc15',
    '#4ade80', '#38bdf8'
  ];
  function colorForName(name) {
    var hash = 0;
    for (var i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) >>> 0;
    return EMPLOYEE_PALETTE[hash % EMPLOYEE_PALETTE.length];
  }

  // ---------- Firebase ----------
  var db = null;
  var firebaseReady = false;
  try {
    if (typeof firebaseConfig !== 'undefined' && firebaseConfig.apiKey && firebaseConfig.apiKey.indexOf('PASTE_') !== 0) {
      firebase.initializeApp(firebaseConfig);
      db = firebase.firestore();
      // Caches data on the device so a reopen (or a flaky connection) shows
      // the last-known list/shifts immediately instead of looking empty.
      if (typeof db.enablePersistence === 'function') {
        db.enablePersistence({ synchronizeTabs: true }).catch(function (e) {
          console.warn('Offline cache not enabled:', e.code);
        });
      }
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
    selectedDateKey: null,
    lastHistoryName: '',
    lastHistoryRows: [],
    myShifts: []
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
      row.innerHTML = '<span style="display:flex;align-items:center;gap:8px;">' +
        '<span class="name-swatch" style="background:' + colorForName(emp.name) + '"></span>' +
        escapeHtml(emp.name) + '</span>';
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
    var label = MONTH_NAMES[state.month] + ' ' + YEAR;
    document.getElementById('monthLabel').textContent = label;
    document.getElementById('prevMonth').disabled = state.month === 0;
    document.getElementById('nextMonth').disabled = state.month === 11;

    document.getElementById('allRegMonthLabel').textContent = label;
    document.getElementById('allRegPrevMonth').disabled = state.month === 0;
    document.getElementById('allRegNextMonth').disabled = state.month === 11;
  }

  function changeMonth(delta) {
    var next = state.month + delta;
    if (next < 0 || next > 11) return;
    state.month = next;
    renderMonthLabel();
    subscribeMonth();
  }

  // One row per shift type (fixed position: morning/regular/night, always
  // in that order) so the shift a dot belongs to is read from its position
  // in the cell, not its color - color is reserved for the employee.
  function shiftRowsFor(dKey) {
    var data = state.shiftsByDate[dKey];
    return SHIFT_TYPES.map(function (st) {
      var entries = (data && data[st.key]) || [];
      return { key: st.key, color: st.color, entries: entries };
    });
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

      var rowsWrap = document.createElement('div');
      rowsWrap.className = 'shift-rows';
      shiftRowsFor(dKey).forEach(function (row) {
        var rowEl = document.createElement('div');
        rowEl.className = 'shift-row';
        rowEl.style.borderInlineStartColor = row.entries.length ? row.color : 'transparent';
        var shown = row.entries.slice(0, 3);
        shown.forEach(function (entry) {
          var chip = document.createElement('span');
          chip.className = 'emp-chip' + (entry.status === 'approved' ? ' approved' : ' pending');
          chip.style.color = colorForName(entry.employeeName);
          chip.style.borderColor = colorForName(entry.employeeName);
          chip.textContent = entry.employeeName;
          chip.title = entry.employeeName;
          rowEl.appendChild(chip);
        });
        if (row.entries.length > shown.length) {
          var more = document.createElement('span');
          more.className = 'emp-more';
          more.textContent = '+' + (row.entries.length - shown.length);
          rowEl.appendChild(more);
        }
        rowsWrap.appendChild(rowEl);
      });
      cell.appendChild(rowsWrap);

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
    history.pushState({ modal: true }, '', '#day');
  }

  function closeDayModal(fromPopstate) {
    document.getElementById('dayModalBackdrop').classList.remove('open');
    state.selectedDateKey = null;
    if (!fromPopstate) history.back();
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
          left.style.display = 'flex';
          left.style.alignItems = 'center';
          left.style.gap = '7px';
          var swatch = document.createElement('span');
          swatch.className = 'name-swatch';
          swatch.style.background = colorForName(entry.employeeName);
          left.appendChild(swatch);
          left.appendChild(document.createTextNode(entry.employeeName));
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
        joinBtn.onclick = function () {
          joinBtn.disabled = true;
          joinBtn.textContent = 'שולח בקשה...';
          joinShift(dKey, st.key);
        };
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
    }).catch(function (e) {
      showToast('שגיאה: ' + e.message);
      if (state.selectedDateKey === dKey) renderDayModalBody();
    });
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
        '<span style="display:flex;align-items:center;gap:7px;">' +
        '<span class="name-swatch" style="background:' + colorForName(item.employeeName) + '"></span>' +
        '<b>' + escapeHtml(item.employeeName) + '</b>' +
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

  // ---------- Manager: all registrations this month ----------
  function flattenMonthRows() {
    var rows = [];
    Object.keys(state.shiftsByDate).forEach(function (dKey) {
      var dayData = state.shiftsByDate[dKey];
      SHIFT_TYPES.forEach(function (st) {
        (dayData[st.key] || []).forEach(function (entry) {
          rows.push({
            date: dKey,
            shiftKey: st.key,
            shiftLabel: st.label,
            employeeName: entry.employeeName,
            status: entry.status
          });
        });
      });
    });
    rows.sort(function (a, b) {
      if (a.date !== b.date) return a.date.localeCompare(b.date);
      if (SHIFT_ORDER[a.shiftKey] !== SHIFT_ORDER[b.shiftKey]) return SHIFT_ORDER[a.shiftKey] - SHIFT_ORDER[b.shiftKey];
      return (a.employeeName || '').localeCompare(b.employeeName || '', 'he');
    });
    return rows;
  }

  function weekdayNameFor(dKey) {
    var parts = dKey.split('-').map(Number);
    var d = new Date(parts[0], parts[1] - 1, parts[2]);
    return WEEKDAY_NAMES[d.getDay()];
  }

  function monthRowsTableHtml(rows) {
    if (!rows.length) return '<div class="empty-note">אין עדיין רישומים לחודש זה</div>';
    var html = '<table><thead><tr><th>תאריך</th><th>יום</th><th>עובד</th><th>משמרת</th><th>סטטוס</th></tr></thead><tbody>';
    rows.forEach(function (r) {
      html += '<tr><td>' + r.date + '</td><td>' + weekdayNameFor(r.date) + '</td><td>' +
        '<span style="display:inline-flex;align-items:center;gap:6px;">' +
        '<span class="name-swatch" style="background:' + colorForName(r.employeeName) + '"></span>' +
        escapeHtml(r.employeeName) + '</span></td><td>' + r.shiftLabel + '</td><td>' +
        (STATUS_LABEL[r.status] || r.status) + '</td></tr>';
    });
    html += '</tbody></table>';
    return html;
  }

  // Renders the same "whole month" table into both the manager's card and
  // the public list toggle on the calendar tab (open to every user).
  function renderAllRegistrationsTable() {
    var rows = flattenMonthRows();
    var html = monthRowsTableHtml(rows);
    var mgrWrap = document.getElementById('allRegTableWrap');
    if (mgrWrap) mgrWrap.innerHTML = html;
    var publicWrap = document.getElementById('monthListWrap');
    if (publicWrap) publicWrap.innerHTML = html;
  }

  // ---------- PDF export ----------
  // html2canvas + jsPDF are fairly heavy (~500KB together), so they're only
  // fetched the first time a "PDF" button is actually clicked, not on page load.
  var pdfLibsPromise = null;
  function loadScript(src) {
    return new Promise(function (resolve, reject) {
      var s = document.createElement('script');
      s.src = src;
      s.onload = resolve;
      s.onerror = function () { reject(new Error('נכשלה טעינת ' + src)); };
      document.head.appendChild(s);
    });
  }
  function ensurePdfLibs() {
    if (!pdfLibsPromise) {
      pdfLibsPromise = Promise.all([
        loadScript('https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js'),
        loadScript('https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js')
      ]);
    }
    return pdfLibsPromise;
  }

  function exportRowsToPdf(title, subtitle, headers, rows, filename) {
    if (!rows.length) { showToast('אין נתונים לייצוא'); return; }
    showToast('טוען כלי PDF...');
    ensurePdfLibs().then(function () {
      buildAndSavePdf(title, subtitle, headers, rows, filename);
    }).catch(function (e) {
      pdfLibsPromise = null;
      showToast('שגיאה בטעינת כלי ה-PDF: ' + e.message);
    });
  }

  function buildAndSavePdf(title, subtitle, headers, rows, filename) {

    var node = document.createElement('div');
    node.style.position = 'fixed';
    node.style.top = '-10000px';
    node.style.left = '0';
    node.style.width = '780px';
    node.style.background = '#ffffff';
    node.style.color = '#111827';
    node.style.direction = 'rtl';
    node.style.fontFamily = 'Arial, sans-serif';
    node.style.padding = '24px';

    var html = '<h2 style="margin:0 0 4px;font-size:20px;">' + escapeHtml(title) + '</h2>';
    if (subtitle) html += '<p style="margin:0 0 16px;color:#555;font-size:13px;">' + escapeHtml(subtitle) + '</p>';
    html += '<table style="width:100%;border-collapse:collapse;font-size:12.5px;">';
    html += '<thead><tr>' + headers.map(function (h) {
      return '<th style="text-align:right;border-bottom:2px solid #333;padding:6px 8px;">' + escapeHtml(h) + '</th>';
    }).join('') + '</tr></thead><tbody>';
    rows.forEach(function (row, i) {
      var bg = i % 2 === 0 ? '#ffffff' : '#f3f4f6';
      html += '<tr style="background:' + bg + ';">' + row.map(function (cell) {
        return '<td style="text-align:right;border-bottom:1px solid #e5e7eb;padding:6px 8px;">' + escapeHtml(String(cell)) + '</td>';
      }).join('') + '</tr>';
    });
    html += '</tbody></table>';
    node.innerHTML = html;
    document.body.appendChild(node);

    showToast('מכין PDF...');
    html2canvas(node, { scale: 2 }).then(function (canvas) {
      document.body.removeChild(node);
      var pdf = new window.jspdf.jsPDF('p', 'mm', 'a4');
      var pageWidth = pdf.internal.pageSize.getWidth();
      var pageHeight = pdf.internal.pageSize.getHeight();
      var imgWidth = pageWidth;
      var imgHeight = (canvas.height * imgWidth) / canvas.width;
      var imgData = canvas.toDataURL('image/png');
      var heightLeft = imgHeight;
      var position = 0;

      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;
      while (heightLeft > 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }
      pdf.save(filename);
    }).catch(function (e) {
      if (node.parentNode) document.body.removeChild(node);
      showToast('שגיאה ביצירת PDF: ' + e.message);
    });
  }

  function exportAllRegistrationsPdf() {
    var rows = flattenMonthRows();
    var tableRows = rows.map(function (r) {
      return [r.date, weekdayNameFor(r.date), r.employeeName, r.shiftLabel, STATUS_LABEL[r.status] || r.status];
    });
    exportRowsToPdf(
      'נותנים בראש 2026 - דוח משמרות',
      MONTH_NAMES[state.month] + ' ' + YEAR,
      ['תאריך', 'יום', 'עובד', 'משמרת', 'סטטוס'],
      tableRows,
      'דוח-משמרות-' + MONTH_NAMES[state.month] + '-' + YEAR + '.pdf'
    );
  }

  function exportMyShiftsPdf() {
    if (!state.currentUser || !state.myShifts.length) { showToast('אין עדיין משמרות לייצוא'); return; }
    var rows = state.myShifts.slice().sort(function (a, b) { return a.date.localeCompare(b.date); });
    var tableRows = rows.map(function (r) {
      var st = SHIFT_TYPES.filter(function (s) { return s.key === r.shiftType; })[0] || {};
      return [r.date, weekdayNameFor(r.date), st.label || r.shiftType, STATUS_LABEL[r.status] || r.status];
    });
    exportRowsToPdf(
      'נותנים בראש 2026 - המשמרות שלי',
      state.currentUser,
      ['תאריך', 'יום', 'משמרת', 'סטטוס'],
      tableRows,
      'המשמרות-שלי-' + state.currentUser + '.pdf'
    );
  }

  function exportHistoryPdf() {
    if (!state.lastHistoryName || !state.lastHistoryRows.length) { showToast('אין נתוני היסטוריה לייצוא'); return; }
    var tableRows = state.lastHistoryRows.map(function (r) {
      var st = SHIFT_TYPES.filter(function (s) { return s.key === r.shiftType; })[0] || {};
      return [r.date, st.label || r.shiftType, STATUS_LABEL[r.status] || r.status];
    });
    exportRowsToPdf(
      'נותנים בראש 2026 - היסטוריית עבודה',
      state.lastHistoryName,
      ['תאריך', 'משמרת', 'סטטוס'],
      tableRows,
      'היסטוריה-' + state.lastHistoryName + '.pdf'
    );
  }

  // ---------- Manager: history ----------
  var historyUnsub = null;
  function loadHistoryFor(name) {
    var wrap = document.getElementById('historyTableWrap');
    var statsWrap = document.getElementById('historyStats');
    var pdfBtn = document.getElementById('historyPdfBtn');
    if (!name) {
      wrap.innerHTML = '<div class="empty-note">בחר/י עובד כדי לראות היסטוריה</div>';
      statsWrap.innerHTML = '';
      pdfBtn.style.display = 'none';
      state.lastHistoryName = '';
      state.lastHistoryRows = [];
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
        state.lastHistoryName = name;
        state.lastHistoryRows = rows;
        pdfBtn.style.display = rows.length ? '' : 'none';

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
        renderAllRegistrationsTable();
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

  // Watches the current (non-manager) user's own shifts and toasts a
  // notification whenever the manager approves/rejects one, comparing
  // against the last-seen statuses stored per-name in this browser.
  var myShiftsUnsub = null;
  function subscribeMyShifts(name) {
    if (myShiftsUnsub) { myShiftsUnsub(); myShiftsUnsub = null; }
    state.myShifts = [];
    if (!name || name === MANAGER_NAME) { renderMyShiftsList(); return; }
    if (!firebaseReady) return;
    myShiftsUnsub = db.collection('shifts').where('employeeName', '==', name).limit(300)
      .onSnapshot(function (snap) {
        var newMap = {};
        snap.forEach(function (doc) { newMap[doc.id] = doc.data(); });

        var storageKey = 'nvb_seen_' + name;
        var oldMapRaw = localStorage.getItem(storageKey);
        var oldMap = oldMapRaw ? JSON.parse(oldMapRaw) : null;

        if (oldMap) {
          var changes = [];
          Object.keys(newMap).forEach(function (id) {
            var oldStatus = oldMap[id];
            var newStatus = newMap[id].status;
            if (oldStatus === 'pending' && (newStatus === 'approved' || newStatus === 'rejected')) {
              changes.push({ date: newMap[id].date, shiftType: newMap[id].shiftType, status: newStatus });
            }
          });
          changes.slice(0, 5).forEach(function (ch, idx) {
            var st = SHIFT_TYPES.filter(function (s) { return s.key === ch.shiftType; })[0] || {};
            var msg = (ch.status === 'approved' ? '✅ המשמרת שלך ב-' : '❌ המשמרת שלך ב-') +
              ch.date + ' (' + (st.label || ch.shiftType) + ') ' + (ch.status === 'approved' ? 'אושרה' : 'נדחתה');
            setTimeout(function () { showToast(msg); }, idx * 2600);
          });
        }

        var slimMap = {};
        Object.keys(newMap).forEach(function (id) { slimMap[id] = newMap[id].status; });
        localStorage.setItem(storageKey, JSON.stringify(slimMap));

        state.myShifts = Object.keys(newMap).map(function (id) {
          return Object.assign({ id: id }, newMap[id]);
        });
        renderMyShiftsList();
      }, function (e) {
        console.error(e);
        var wrap = document.getElementById('myShiftsList');
        if (wrap) wrap.innerHTML = '<div class="empty-note">שגיאה בטעינה: ' + e.message + '</div>';
      });
  }

  function renderMyShiftsList() {
    var wrap = document.getElementById('myShiftsList');
    if (!wrap) return;

    if (!state.currentUser) {
      wrap.innerHTML = '<div class="empty-note">בחר/י את שמך בראש העמוד</div>';
      return;
    }
    if (state.currentUser === MANAGER_NAME) {
      wrap.innerHTML = '<div class="empty-note">המסך הזה מיועד לעובדים. בתור מנהל/ת, תוכל/י לראות הכל בלשונית "ניהול".</div>';
      return;
    }
    if (!state.myShifts.length) {
      wrap.innerHTML = '<div class="empty-note">עדיין לא נרשמת לאף משמרת. עברו ל"לוח משמרות" כדי להירשם.</div>';
      return;
    }

    var rows = state.myShifts.slice().sort(function (a, b) { return a.date.localeCompare(b.date); });
    wrap.innerHTML = '';
    rows.forEach(function (r) {
      var st = SHIFT_TYPES.filter(function (s) { return s.key === r.shiftType; })[0] || {};
      var row = document.createElement('div');
      row.className = 'list-row';
      row.innerHTML =
        '<span><b>' + r.date + '</b><span class="meta"> · ' + weekdayNameFor(r.date) + ' · ' + (st.label || r.shiftType) + '</span></span>';

      var right = document.createElement('span');
      right.style.display = 'flex';
      right.style.alignItems = 'center';
      right.style.gap = '8px';

      var badge = document.createElement('span');
      badge.className = 'badge ' + r.status;
      badge.textContent = STATUS_LABEL[r.status] || r.status;
      right.appendChild(badge);

      var cancelBtn = document.createElement('button');
      cancelBtn.className = 'mini-btn cancel';
      cancelBtn.textContent = 'ביטול';
      cancelBtn.onclick = function () { cancelShift(r.id); };
      right.appendChild(cancelBtn);

      row.appendChild(right);
      wrap.appendChild(row);
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
    document.getElementById('panel-myshifts').classList.toggle('active', tab === 'myshifts');
    document.getElementById('panel-manage').classList.toggle('active', tab === 'manage');
  }

  // ---------- Wiring ----------
  function wireEvents() {
    document.getElementById('userSelect').addEventListener('change', function (e) {
      state.currentUser = e.target.value;
      localStorage.setItem('nvb_myname', state.currentUser);
      renderUserSelect();
      subscribeMyShifts(state.currentUser);
      if (state.selectedDateKey) renderDayModalBody();
    });

    document.querySelectorAll('.tab-btn').forEach(function (btn) {
      btn.addEventListener('click', function () {
        if (btn.dataset.tab === 'manage' && !isManager()) return;
        switchTab(btn.dataset.tab);
        history.pushState({ tab: btn.dataset.tab }, '', '#' + btn.dataset.tab);
      });
    });

    // Makes the phone's/browser's back button move between tabs and close the
    // open day modal, instead of leaving the app - important once it's
    // installed as a home-screen app, where "back" is the only nav control.
    window.addEventListener('popstate', function (e) {
      if (document.getElementById('dayModalBackdrop').classList.contains('open')) {
        closeDayModal(true);
        return;
      }
      var tab = (e.state && e.state.tab) || 'calendar';
      if (tab === 'manage' && !isManager()) tab = 'calendar';
      switchTab(tab);
    });

    document.getElementById('prevMonth').addEventListener('click', function () { changeMonth(-1); });
    document.getElementById('nextMonth').addEventListener('click', function () { changeMonth(1); });
    document.getElementById('allRegPrevMonth').addEventListener('click', function () { changeMonth(-1); });
    document.getElementById('allRegNextMonth').addEventListener('click', function () { changeMonth(1); });

    document.getElementById('allRegPdfBtn').addEventListener('click', exportAllRegistrationsPdf);
    document.getElementById('historyPdfBtn').addEventListener('click', exportHistoryPdf);
    document.getElementById('myShiftsPdfBtn').addEventListener('click', exportMyShiftsPdf);

    document.getElementById('toggleMonthListBtn').addEventListener('click', function () {
      var listWrap = document.getElementById('monthListWrap');
      var gridWrap = document.getElementById('calendarGridWrap');
      var showingList = listWrap.style.display !== 'none';
      listWrap.style.display = showingList ? 'none' : 'block';
      gridWrap.style.display = showingList ? '' : 'none';
      this.textContent = showingList ? '📋 הצג את כל החודש כרשימה' : '🗓️ הצג לוח שנה במקום רשימה';
    });

    document.getElementById('closeDayModal').addEventListener('click', closeDayModal);
    document.getElementById('dayModalBackdrop').addEventListener('click', function (e) {
      if (e.target === e.currentTarget) closeDayModal();
    });

    document.getElementById('addEmployeeBtn').addEventListener('click', addEmployee);
    document.getElementById('newEmployeeName').addEventListener('keydown', function (e) {
      if (e.key === 'Enter') addEmployee();
    });

    document.getElementById('addMyNameBtn').addEventListener('click', promptAddMyName);

    document.getElementById('historyEmployeeSelect').addEventListener('change', function (e) {
      loadHistoryFor(e.target.value);
    });
  }

  function addEmployeeName(name, selectAfter) {
    if (!firebaseReady) { showToast('יש להגדיר קודם את חיבור Firebase (ראו README.md)'); return; }
    name = (name || '').trim();
    if (!name) return;
    if (name === MANAGER_NAME) { showToast('השם הזה שמור למנהל/ת'); return; }
    if (state.employees.some(function (e) { return e.name === name; })) {
      if (selectAfter) selectUser(name);
      return;
    }
    db.collection('employees').add({ name: name, createdAt: firebase.firestore.FieldValue.serverTimestamp() })
      .then(function () {
        showToast('השם "' + name + '" נוסף בהצלחה');
        if (selectAfter) selectUser(name);
      })
      .catch(function (e) { showToast('שגיאה: ' + e.message); });
  }

  function addEmployee() {
    var input = document.getElementById('newEmployeeName');
    addEmployeeName(input.value);
    input.value = '';
  }

  function selectUser(name) {
    state.currentUser = name;
    localStorage.setItem('nvb_myname', name);
    renderUserSelect();
    subscribeMyShifts(name);
  }

  function promptAddMyName() {
    var name = window.prompt('מה השם שלך? (יופיע ברשימה כדי שתוכל/י להירשם למשמרות)');
    if (name === null) return;
    addEmployeeName(name, true);
  }

  // ---------- Boot ----------
  function boot() {
    wireEvents();
    history.replaceState({ tab: 'calendar' }, '', '#calendar');
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
    subscribeMyShifts(state.currentUser);

    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('sw.js').catch(function () {});
    }
  }

  document.addEventListener('DOMContentLoaded', boot);
})();
