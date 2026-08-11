/*
 * שכבת אחסון: IndexedDB עם גיבוי־תאימות ל-localStorage.
 * מפתחות: 'work' (מצב עבודה), 'test' (מצב טסט), 'meta' (הגדרות).
 * בהפעלה ראשונה מתבצעת מיגרציה אוטומטית מהמפתחות הישנים של האב-טיפוס:
 *   inventory-app-v1, inventory-app-test-v1, inv-meta
 */
const DB = (() => {
  const DB_NAME = 'inventory-db';
  const STORE = 'kv';
  let dbPromise = null;

  function open() {
    if (dbPromise) return dbPromise;
    dbPromise = new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, 1);
      req.onupgradeneeded = () => req.result.createObjectStore(STORE);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
    return dbPromise;
  }

  async function get(key) {
    const db = await open();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, 'readonly');
      const req = tx.objectStore(STORE).get(key);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }

  async function set(key, value) {
    const db = await open();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, 'readwrite');
      tx.objectStore(STORE).put(value, key);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  // localStorage הוא רשת ביטחון: כל שמירה נכתבת גם אליו, כך שגם אם
  // IndexedDB נמחק — הנתונים לא אובדים.
  function lsBackup(key, value) {
    try { localStorage.setItem('inv2-' + key, JSON.stringify(value)); } catch (e) { /* מלא */ }
  }
  function lsRestore(key) {
    try {
      const raw = localStorage.getItem('inv2-' + key);
      return raw ? JSON.parse(raw) : undefined;
    } catch (e) { return undefined; }
  }

  async function load(key) {
    let v;
    try { v = await get(key); } catch (e) { /* IndexedDB לא זמין */ }
    if (v === undefined) v = lsRestore(key);
    return v;
  }

  async function save(key, value) {
    lsBackup(key, value);
    try { await set(key, value); } catch (e) { /* localStorage כבר שמר */ }
  }

  // מיגרציה חד-פעמית מהאב-טיפוס הישן (mlay.html)
  async function migrateLegacy() {
    const meta = await load('meta');
    if (meta && meta.legacyMigrated) return false;
    const legacy = {};
    const keys = { 'inventory-app-v1': 'work', 'inventory-app-test-v1': 'test', 'inv-meta': 'legacyMeta' };
    let found = false;
    for (const [oldKey, newKey] of Object.entries(keys)) {
      try {
        const raw = localStorage.getItem(oldKey);
        if (raw) {
          found = true;
          legacy[newKey] = JSON.parse(raw);
          // שומרים גם עותק גולמי ליתר ביטחון
          await save('legacy-raw-' + oldKey, raw);
        }
      } catch (e) { /* ממשיכים */ }
    }
    if (found) {
      // מאמצים את הנתונים הישנים אם המבנה מוכר (items + log)
      for (const mode of ['work', 'test']) {
        const old = legacy[mode];
        if (old && typeof old === 'object' && old.items && Array.isArray(old.log)) {
          const existing = await load(mode);
          if (!existing) await save(mode, old);
        }
      }
    }
    await save('meta', Object.assign({}, meta, { legacyMigrated: true, legacyFound: found }));
    return found;
  }

  async function requestPersist() {
    try {
      if (navigator.storage && navigator.storage.persist) {
        const already = await navigator.storage.persisted();
        if (already) return true;
        return await navigator.storage.persist();
      }
    } catch (e) { /* לא קריטי */ }
    return false;
  }

  return { load, save, migrateLegacy, requestPersist };
})();
