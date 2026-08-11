/* אפליקציית ניהול מלאי — מעטפות ודפי נושא
 * שני מאגרי מלאי לכל פריט: תא העמסה (ארגזים) + מדף שוטף (יחידות).
 */
(() => {
  'use strict';

  const DAY_MS = 24 * 60 * 60 * 1000;
  const ACT_NAMES = {
    pull:    'משיכה לשוטף',
    receive: 'קליטת הזמנה',
    count:   'ספירת מדף',
    fix:     'תיקון ספירה',
    reset:   'איפוס לספירה המקורית'
  };

  // ---------- מצב גלובלי ----------
  let meta = { mode: 'work' };
  let state = null;          // הנתונים של המצב הפעיל (עבודה/טסט)
  let filter = 'all';
  let searchTerm = '';
  let currentSku = null;
  let currentAction = 'pull';
  let deferredInstall = null;

  const $ = (id) => document.getElementById(id);
  const fmt = (n) => (n ?? 0).toLocaleString('he-IL');

  const itemBySku = (sku) => CATALOG.items.find((i) => i.sku === sku);

  function freshState() {
    const items = {};
    for (const it of CATALOG.items) items[it.sku] = { boxes: it.initBoxes, shelf: it.initShelf };
    return { items, log: [] };
  }

  function ensureCatalogItems(st) {
    for (const it of CATALOG.items) {
      if (!st.items[it.sku]) st.items[it.sku] = { boxes: it.initBoxes, shelf: it.initShelf };
    }
    return st;
  }

  const storageKey = () => (meta.mode === 'test' ? 'test' : 'work');

  async function persist() {
    await DB.save(storageKey(), state);
    await DB.save('meta', meta);
  }

  // ---------- חישובים ----------
  function totals(sku) {
    const it = itemBySku(sku);
    const s = state.items[sku] || { boxes: 0, shelf: 0 };
    const bayUnits = s.boxes * it.boxQty;
    return { boxes: s.boxes, shelf: s.shelf, bayUnits, total: bayUnits + s.shelf };
  }

  // קצב שימוש יומי: לפי שתי ספירות המדף האחרונות אם יש, אחרת לפי קצב המשיכות
  function dailyRate(sku) {
    const it = itemBySku(sku);
    const entries = state.log.filter((e) => e.sku === sku);
    const counts = entries.filter((e) => e.act === 'count');
    if (counts.length >= 2) {
      const c1 = counts[counts.length - 2];
      const c2 = counts[counts.length - 1];
      const pulledBetween = entries
        .filter((e) => e.act === 'pull' && e.ts > c1.ts && e.ts < c2.ts)
        .reduce((sum, e) => sum + e.qty * it.boxQty, 0);
      const used = c1.shelfAfter + pulledBetween - c2.shelfAfter;
      const days = Math.max((c2.ts - c1.ts) / DAY_MS, 1 / 24);
      const rate = used / days;
      if (rate > 0) return { rate, source: 'שימוש בפועל' };
    }
    const pulls = entries.filter((e) => e.act === 'pull');
    if (pulls.length) {
      const pulledUnits = pulls.reduce((sum, e) => sum + e.qty * it.boxQty, 0);
      const days = Math.max((Date.now() - entries[0].ts) / DAY_MS, 1);
      return { rate: pulledUnits / days, source: 'קצב משיכות' };
    }
    return { rate: it.monthlyUse / 30, source: 'צריכה ממוצעת' };
  }

  function forecastDays(sku) {
    const { rate } = dailyRate(sku);
    if (rate <= 0) return Infinity;
    return totals(sku).total / rate;
  }

  // סטטוס: אזל / חוסר / גבולי (120% מהצריכה) / תקין
  function status(sku) {
    const it = itemBySku(sku);
    const t = totals(sku).total;
    if (t <= 0) return { key: 'out', label: 'אזל', rank: 0 };
    if (it.monthlyUse > 0) {
      if (t < it.monthlyUse) return { key: 'short', label: 'חוסר', rank: 1 };
      if (t < it.monthlyUse * 1.2) return { key: 'low', label: 'גבולי', rank: 2 };
    }
    return { key: 'ok', label: 'תקין', rank: 3 };
  }

  // ---------- רשימת הפריטים ----------
  function visibleItems() {
    let list = CATALOG.items.slice();
    if (filter === 'env' || filter === 'page') list = list.filter((i) => i.type === filter);
    if (filter === 'short') list = list.filter((i) => status(i.sku).rank <= 2);
    if (searchTerm) {
      const q = searchTerm.trim();
      list = list.filter((i) => i.name.includes(q) || i.sku.includes(q));
    }
    // חוסרים למעלה, ובתוך אותו סטטוס — מי שנגמר קודם
    list.sort((a, b) => {
      const r = status(a.sku).rank - status(b.sku).rank;
      if (r !== 0) return r;
      return forecastDays(a.sku) - forecastDays(b.sku);
    });
    return list;
  }

  function renderList() {
    const listEl = $('list');
    const items = visibleItems();
    $('empty').classList.toggle('hidden', items.length > 0);
    listEl.innerHTML = '';
    for (const it of items) {
      const t = totals(it.sku);
      const st = status(it.sku);
      const fd = forecastDays(it.sku);
      const forecastText = t.total <= 0 ? '❌ אין מלאי'
        : fd === Infinity ? '⏳ אין נתוני צריכה'
        : fd < 1 ? '⏳ נשאר פחות מיום'
        : `⏳ יספיק ל־${fmt(Math.floor(fd))} ימים`;
      const fClass = fd < 7 ? 'f-red' : fd < 14 ? 'f-yellow' : 'f-green';

      const card = document.createElement('div');
      card.className = `card st-${st.key}`;
      card.innerHTML = `
        <div class="card-top">
          <div>
            <div class="card-name">${esc(it.name)}</div>
            <div class="card-sub">${CATALOG.typeNames[it.type]} · ${CATALOG.suppliers[it.type]} · מק"ט ${esc(it.sku)} · ${fmt(it.boxQty)} בארגז</div>
          </div>
          <span class="badge st-${st.key}">${st.label}</span>
        </div>
        <div class="card-nums">
          <div class="num-box"><div class="lbl">תא העמסה</div><div class="val">${fmt(t.boxes)} ארגזים</div><div class="sub">${fmt(t.bayUnits)} יח'</div></div>
          <div class="num-box"><div class="lbl">מדף שוטף</div><div class="val">${fmt(t.shelf)}</div><div class="sub">יחידות</div></div>
          <div class="num-box"><div class="lbl">סה"כ</div><div class="val">${fmt(t.total)}</div><div class="sub">יחידות</div></div>
        </div>
        <div class="card-forecast">
          <span class="forecast ${fClass}">${forecastText}</span>
          <span class="consumption">צריכה חודשית: ${fmt(it.monthlyUse)}</span>
        </div>
        <div class="card-actions">
          <button class="card-btn accent" data-quick-count="${esc(it.sku)}">📝 ספירת מדף</button>
          <button class="card-btn" data-open-item="${esc(it.sku)}">פעולות ⌄</button>
        </div>`;
      listEl.appendChild(card);
    }
  }

  function esc(s) {
    return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }

  // ---------- ניווט (תמיכה בכפתור Back של אנדרואיד) ----------
  const navStack = [];
  let suppressPop = 0; // סגירה מתוך הממשק כבר הסתירה את השכבה — בולעים את ה-popstate שבדרך

  function openLayer(id) {
    $(id).classList.remove('hidden');
    navStack.push(id);
    history.pushState({ layer: id, depth: navStack.length }, '');
  }

  function closeLayer() {
    const id = navStack.pop();
    if (!id) return;
    $(id).classList.add('hidden');
    suppressPop++;
    history.back();
  }

  window.addEventListener('popstate', () => {
    if (suppressPop > 0) { suppressPop--; return; }
    const id = navStack.pop();
    if (id) $(id).classList.add('hidden');
  });

  // ---------- חלונית פעולות לפריט ----------
  const ACTION_HINTS = {
    pull:    'כמה ארגזים מושכים מתא ההעמסה למדף השוטף?',
    count:   'כמה יחידות נשארו עכשיו על המדף השוטף? (המספר שתזינו יקבע)',
    receive: 'כמה ארגזים הגיעו מהספק לתא ההעמסה?',
    fix:     'כמה ארגזים יש בפועל בתא ההעמסה? (המספר שתזינו יקבע)'
  };

  function openItemSheet(sku, action) {
    currentSku = sku;
    currentAction = action || 'pull';
    refreshItemSheet();
    openLayer('sheet-item');
  }

  function refreshItemSheet() {
    const it = itemBySku(currentSku);
    const t = totals(currentSku);
    $('item-title').textContent = it.name;
    $('item-summary').textContent =
      `תא העמסה: ${fmt(t.boxes)} ארגזים (${fmt(t.bayUnits)} יח') · מדף: ${fmt(t.shelf)} יח' · סה"כ: ${fmt(t.total)} יח'`;
    document.querySelectorAll('#action-tabs .tab').forEach((b) =>
      b.classList.toggle('active', b.dataset.act === currentAction));
    $('action-hint').textContent = ACTION_HINTS[currentAction];
    const input = $('qty-input');
    if (currentAction === 'pull') input.value = Math.min(1, t.boxes) || 1;
    else if (currentAction === 'count') input.value = t.shelf;
    else if (currentAction === 'fix') input.value = t.boxes;
    else input.value = 1;
    $('qty-unit').textContent =
      currentAction === 'count' ? `יחידות (${CATALOG.typeNames[it.type]})` : `ארגזים של ${fmt(it.boxQty)} יח'`;
  }

  function doAction() {
    const it = itemBySku(currentSku);
    const s = state.items[currentSku];
    const qty = Math.floor(Number($('qty-input').value));
    if (!Number.isFinite(qty) || qty < 0) return toast('נא להזין מספר תקין');

    if (currentAction === 'pull') {
      if (qty === 0) return toast('נא להזין כמה ארגזים למשוך');
      if (qty > s.boxes) return toast(`אין מספיק בתא ההעמסה — יש רק ${fmt(s.boxes)} ארגזים`);
      s.boxes -= qty;
      s.shelf += qty * it.boxQty;
      addLog(currentSku, 'pull', qty);
      toast(`נמשכו ${fmt(qty)} ארגזים למדף השוטף`);
    } else if (currentAction === 'receive') {
      if (qty === 0) return toast('נא להזין כמה ארגזים התקבלו');
      s.boxes += qty;
      addLog(currentSku, 'receive', qty);
      toast(`נקלטו ${fmt(qty)} ארגזים לתא ההעמסה`);
    } else if (currentAction === 'count') {
      const before = s.shelf;
      s.shelf = qty;
      addLog(currentSku, 'count', qty, { shelfBefore: before });
      const diff = before - qty;
      toast(diff > 0 ? `נרשמה ספירה. שימוש מאז הספירה הקודמת: ${fmt(diff)} יח'` : 'נרשמה ספירת מדף');
    } else if (currentAction === 'fix') {
      const before = s.boxes;
      s.boxes = qty;
      addLog(currentSku, 'fix', qty, { boxesBefore: before });
      toast('ספירת תא ההעמסה עודכנה');
    }
    persist();
    renderList();
    closeLayer();
  }

  function addLog(sku, act, qty, extra) {
    const s = state.items[sku];
    state.log.push(Object.assign({
      ts: Date.now(), sku, act, qty,
      boxesAfter: s.boxes, shelfAfter: s.shelf
    }, extra || {}));
  }

  // ---------- קליטת תעודת משלוח ----------
  function addDeliveryRow() {
    const row = document.createElement('div');
    row.className = 'delivery-row';
    const options = CATALOG.items
      .map((i) => `<option value="${esc(i.sku)}">${esc(i.name)} (${CATALOG.typeNames[i.type]})</option>`)
      .join('');
    row.innerHTML = `
      <select>${options}</select>
      <input type="number" inputmode="numeric" min="1" value="1" title="ארגזים">
      <button class="row-del" title="מחיקת שורה">✕</button>`;
    row.querySelector('.row-del').addEventListener('click', () => row.remove());
    $('delivery-rows').appendChild(row);
  }

  function saveDelivery() {
    const rows = [...document.querySelectorAll('#delivery-rows .delivery-row')];
    const entries = [];
    for (const row of rows) {
      const sku = row.querySelector('select').value;
      const qty = Math.floor(Number(row.querySelector('input').value));
      if (Number.isFinite(qty) && qty > 0) entries.push({ sku, qty });
    }
    if (!entries.length) return toast('לא הוזנו כמויות');
    for (const { sku, qty } of entries) {
      state.items[sku].boxes += qty;
      addLog(sku, 'receive', qty);
    }
    persist();
    renderList();
    closeLayer();
    toast(`נקלטו ${entries.length} פריטים מתעודת המשלוח ✓`);
  }

  // ---------- יומן ----------
  function renderLog() {
    const body = $('log-body');
    if (!state.log.length) {
      body.innerHTML = '<div class="empty">אין עדיין תנועות ביומן</div>';
      return;
    }
    const dayFmt = new Intl.DateTimeFormat('he-IL', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
    const timeFmt = new Intl.DateTimeFormat('he-IL', { hour: '2-digit', minute: '2-digit' });
    const groups = new Map();
    for (const e of [...state.log].reverse()) {
      const day = dayFmt.format(new Date(e.ts));
      if (!groups.has(day)) groups.set(day, []);
      groups.get(day).push(e);
    }
    body.innerHTML = '';
    for (const [day, entries] of groups) {
      const sec = document.createElement('div');
      sec.className = 'log-day';
      sec.innerHTML = `<h3>${esc(day)}</h3>`;
      for (const e of entries) {
        const it = itemBySku(e.sku);
        const name = e.act === 'reset' ? 'כל הפריטים' : (it ? it.name : e.sku);
        let details = '';
        if (e.act === 'pull') details = `${fmt(e.qty)} ארגזים (${fmt(e.qty * (it?.boxQty || 0))} יח') → נשארו בתא ${fmt(e.boxesAfter)} ארגזים`;
        else if (e.act === 'receive') details = `${fmt(e.qty)} ארגזים לתא ההעמסה → סה"כ בתא ${fmt(e.boxesAfter)} ארגזים`;
        else if (e.act === 'count') {
          const used = (e.shelfBefore ?? 0) - e.qty;
          details = `מדף: ${fmt(e.qty)} יח'` + (used > 0 ? ` · שימוש: ${fmt(used)} יח'` : '');
        } else if (e.act === 'fix') details = `תא ההעמסה עודכן ל־${fmt(e.qty)} ארגזים`;
        else if (e.act === 'reset') details = 'כל הנתונים חזרו לספירה המקורית';
        const div = document.createElement('div');
        div.className = 'log-entry';
        div.innerHTML = `
          <div class="log-main">
            <div class="log-item-name">${esc(name)}</div>
            <div class="log-details"><span class="log-act a-${e.act}">${ACT_NAMES[e.act] || e.act}</span> · ${details}</div>
          </div>
          <div class="log-time">${timeFmt.format(new Date(e.ts))}</div>`;
        sec.appendChild(div);
      }
      body.appendChild(sec);
    }
  }

  // ---------- ייצוא XLSX ----------
  function exportXlsx() {
    const wb = XLSX.utils.book_new();
    wb.Workbook = { Views: [{ RTL: true }] };

    const invRows = [[
      'מק"ט', 'שם פריט', 'סוג', 'ספק', 'כמות בארגז',
      'ארגזים בתא', 'יח\' בתא', 'יח\' במדף', 'סה"כ יח\'',
      'צריכה חודשית', 'יספיק לימים', 'סטטוס'
    ]];
    for (const it of visibleAllSorted()) {
      const t = totals(it.sku);
      const fd = forecastDays(it.sku);
      invRows.push([
        it.sku, it.name, CATALOG.typeNames[it.type], CATALOG.suppliers[it.type], it.boxQty,
        t.boxes, t.bayUnits, t.shelf, t.total,
        it.monthlyUse, fd === Infinity ? '' : Math.round(fd * 10) / 10, status(it.sku).label
      ]);
    }
    const wsInv = XLSX.utils.aoa_to_sheet(invRows);
    wsInv['!cols'] = [{ wch: 8 }, { wch: 28 }, { wch: 12 }, { wch: 10 }, { wch: 10 }, { wch: 10 }, { wch: 10 }, { wch: 10 }, { wch: 10 }, { wch: 12 }, { wch: 10 }, { wch: 8 }];
    XLSX.utils.book_append_sheet(wb, wsInv, 'מלאי');

    const dtFmt = new Intl.DateTimeFormat('he-IL', { day: '2-digit', month: '2-digit', year: 'numeric' });
    const tmFmt = new Intl.DateTimeFormat('he-IL', { hour: '2-digit', minute: '2-digit' });
    const logRows = [['תאריך', 'שעה', 'מק"ט', 'שם פריט', 'פעולה', 'כמות', 'ארגזים בתא אחרי', 'יח\' במדף אחרי']];
    for (const e of [...state.log].reverse()) {
      const it = itemBySku(e.sku);
      logRows.push([
        dtFmt.format(new Date(e.ts)), tmFmt.format(new Date(e.ts)),
        e.sku, it ? it.name : '', ACT_NAMES[e.act] || e.act, e.qty, e.boxesAfter, e.shelfAfter
      ]);
    }
    const wsLog = XLSX.utils.aoa_to_sheet(logRows);
    wsLog['!cols'] = [{ wch: 11 }, { wch: 7 }, { wch: 8 }, { wch: 28 }, { wch: 16 }, { wch: 8 }, { wch: 14 }, { wch: 14 }];
    XLSX.utils.book_append_sheet(wb, wsLog, 'יומן');

    XLSX.writeFile(wb, 'inventory_report.xlsx');
    toast('דוח XLSX נשמר ✓');
  }

  function visibleAllSorted() {
    return CATALOG.items.slice().sort((a, b) => {
      const r = status(a.sku).rank - status(b.sku).rank;
      if (r !== 0) return r;
      return forecastDays(a.sku) - forecastDays(b.sku);
    });
  }

  // ---------- גיבוי / שחזור JSON ----------
  async function exportJson() {
    const backup = {
      app: 'inventory-app',
      version: 2,
      exportedAt: new Date().toISOString(),
      catalogVersion: CATALOG.version,
      meta,
      work: await DB.load('work'),
      test: await DB.load('test')
    };
    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    const d = new Date();
    a.download = `גיבוי-מלאי-${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
    toast('קובץ הגיבוי נשמר ✓');
  }

  async function importJson(file) {
    try {
      const data = JSON.parse(await file.text());
      if (data.app !== 'inventory-app' || (!data.work && !data.test)) {
        return toast('הקובץ אינו קובץ גיבוי של האפליקציה');
      }
      if (!confirm('שחזור מגיבוי יחליף את כל הנתונים הנוכחיים (עבודה + טסט). להמשיך?')) return;
      if (data.work) await DB.save('work', ensureCatalogItems(data.work));
      if (data.test) await DB.save('test', ensureCatalogItems(data.test));
      if (data.meta && data.meta.mode) meta.mode = data.meta.mode;
      await DB.save('meta', meta);
      state = ensureCatalogItems((await DB.load(storageKey())) || freshState());
      applyMode();
      renderList();
      toast('הנתונים שוחזרו מהגיבוי ✓');
    } catch (e) {
      toast('שגיאה בקריאת קובץ הגיבוי');
    }
  }

  // ---------- מצבים ואיפוס ----------
  async function switchMode(mode) {
    if (meta.mode === mode) return;
    await persist(); // שומרים את המצב הנוכחי לפני מעבר
    meta.mode = mode;
    state = ensureCatalogItems((await DB.load(storageKey())) || freshState());
    await persist();
    applyMode();
    renderList();
    toast(mode === 'test' ? 'עברת למצב טסט 🧪' : 'עברת למצב עבודה 🏭');
  }

  function applyMode() {
    const isTest = meta.mode === 'test';
    $('test-banner').classList.toggle('hidden', !isTest);
    $('subtitle').textContent = isTest ? 'מעטפות ודפי נושא · מצב טסט' : 'מעטפות ודפי נושא';
    $('mode-work').classList.toggle('active', !isTest);
    $('mode-test').classList.toggle('active', isTest);
  }

  async function resetToInitial() {
    const modeName = meta.mode === 'test' ? 'מצב הטסט' : 'מצב העבודה';
    if (!confirm(`לאפס את ${modeName} לספירה המקורית של ${CATALOG.date}? כל התנועות ביומן של ${modeName} יימחקו.`)) return;
    state = freshState();
    state.log = [{ ts: Date.now(), sku: null, act: 'reset', qty: 0, boxesAfter: 0, shelfAfter: 0 }];
    await persist();
    renderList();
    toast('הנתונים אופסו לספירה המקורית ✓');
  }

  // ---------- טוסט ----------
  let toastTimer = null;
  function toast(msg) {
    const el = $('toast');
    el.textContent = msg;
    el.classList.remove('hidden');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.add('hidden'), 2600);
  }

  // ---------- התקנת PWA ----------
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredInstall = e;
    $('btn-install').classList.remove('hidden');
    $('menu-install').classList.remove('hidden');
  });

  async function promptInstall() {
    if (!deferredInstall) return;
    deferredInstall.prompt();
    const { outcome } = await deferredInstall.userChoice;
    if (outcome === 'accepted') {
      $('btn-install').classList.add('hidden');
      $('menu-install').classList.add('hidden');
      toast('האפליקציה מותקנת ✓');
    }
    deferredInstall = null;
  }

  window.addEventListener('appinstalled', () => {
    $('btn-install').classList.add('hidden');
    $('menu-install').classList.add('hidden');
  });

  // ---------- אתחול ----------
  async function init() {
    await DB.migrateLegacy();
    meta = Object.assign({ mode: 'work' }, (await DB.load('meta')) || {});
    state = ensureCatalogItems((await DB.load(storageKey())) || freshState());
    await persist();
    DB.requestPersist();

    applyMode();
    renderList();
    $('about').textContent =
      `גרסת קטלוג: ${CATALOG.version} · ${CATALOG.items.length} פריטים · ספירה התחלתית: ${CATALOG.date}`;

    // service worker — עבודה אופליין
    if ('serviceWorker' in navigator && location.protocol !== 'file:') {
      navigator.serviceWorker.register('sw.js').catch(() => {});
    }

    bindEvents();
  }

  function bindEvents() {
    // חיפוש וסינון
    $('search').addEventListener('input', (e) => { searchTerm = e.target.value; renderList(); });
    $('filters').addEventListener('click', (e) => {
      const btn = e.target.closest('.chip');
      if (!btn) return;
      filter = btn.dataset.filter;
      document.querySelectorAll('#filters .chip').forEach((c) => c.classList.toggle('active', c === btn));
      renderList();
    });

    // כרטיסי פריטים
    $('list').addEventListener('click', (e) => {
      const quick = e.target.closest('[data-quick-count]');
      if (quick) return openItemSheet(quick.dataset.quickCount, 'count');
      const open = e.target.closest('[data-open-item]');
      if (open) return openItemSheet(open.dataset.openItem, 'pull');
    });

    // חלונית פעולות
    $('action-tabs').addEventListener('click', (e) => {
      const tab = e.target.closest('.tab');
      if (!tab) return;
      currentAction = tab.dataset.act;
      refreshItemSheet();
    });
    $('qty-minus').addEventListener('click', () => {
      const input = $('qty-input');
      input.value = Math.max(0, Math.floor(Number(input.value) || 0) - 1);
    });
    $('qty-plus').addEventListener('click', () => {
      const input = $('qty-input');
      input.value = Math.floor(Number(input.value) || 0) + 1;
    });
    $('btn-do-action').addEventListener('click', doAction);

    // תעודת משלוח
    $('btn-delivery').addEventListener('click', () => {
      $('delivery-rows').innerHTML = '';
      addDeliveryRow();
      openLayer('sheet-delivery');
    });
    $('btn-add-row').addEventListener('click', addDeliveryRow);
    $('btn-save-delivery').addEventListener('click', saveDelivery);

    // מסכים
    $('btn-log').addEventListener('click', () => { renderLog(); openLayer('screen-log'); });
    $('btn-menu').addEventListener('click', () => openLayer('screen-menu'));
    $('btn-help').addEventListener('click', () => openLayer('screen-help'));
    document.querySelectorAll('[data-close]').forEach((b) => b.addEventListener('click', () => closeLayer()));

    // סגירת גיליון בלחיצה על הרקע
    for (const id of ['sheet-item', 'sheet-delivery']) {
      $(id).addEventListener('click', (e) => { if (e.target.id === id) closeLayer(); });
    }

    // תפריט
    $('btn-export-xlsx').addEventListener('click', exportXlsx);
    $('btn-export-json').addEventListener('click', exportJson);
    $('btn-import-json').addEventListener('click', () => $('file-import').click());
    $('file-import').addEventListener('change', (e) => {
      if (e.target.files[0]) importJson(e.target.files[0]);
      e.target.value = '';
    });
    $('mode-work').addEventListener('click', () => switchMode('work'));
    $('mode-test').addEventListener('click', () => switchMode('test'));
    $('btn-reset').addEventListener('click', resetToInitial);

    // התקנה
    $('btn-install').addEventListener('click', promptInstall);
    $('menu-install').addEventListener('click', promptInstall);
  }

  init();
})();
