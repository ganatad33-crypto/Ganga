/*
 * שכבת אחסון עמידה: window.storage מבוסס IndexedDB עם עותק ביטחון ב-localStorage.
 * האפליקציה (js/app.js) משתמשת ב-window.storage אם הוא קיים — אותם מפתחות
 * בדיוק כמו באב-טיפוס (inventory-app-v1, inventory-app-test-v1, inv-meta),
 * כך שנתונים קיימים ב-localStorage נקלטים אוטומטית בהפעלה הראשונה.
 */
(() => {
  'use strict';
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

  function idbGet(key) {
    return open().then((db) => new Promise((resolve, reject) => {
      const req = db.transaction(STORE, 'readonly').objectStore(STORE).get(key);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    }));
  }

  function idbSet(key, value) {
    return open().then((db) => new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, 'readwrite');
      tx.objectStore(STORE).put(value, key);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    }));
  }

  window.storage = {
    async get(key) {
      // קודם IndexedDB; אם אין — מיגרציה שקטה מ-localStorage (נתונים מהגרסה הישנה)
      try {
        const v = await idbGet(key);
        if (v !== undefined && v !== null) return { key, value: v };
      } catch (e) { /* נופלים ל-localStorage */ }
      let ls = null;
      try { ls = localStorage.getItem(key); } catch (e) { /* חסום */ }
      if (ls !== null) {
        try { await idbSet(key, ls); } catch (e) { /* לא קריטי */ }
        return { key, value: ls };
      }
      return null;
    },
    async set(key, value) {
      let lsOk = false;
      try { localStorage.setItem(key, value); lsOk = true; } catch (e) { /* מלא/חסום */ }
      try {
        await idbSet(key, value);
      } catch (e) {
        if (!lsOk) throw e; // שני האחסונים נכשלו — שהאפליקציה תציג "שגיאת שמירה"
      }
      return { key, value };
    }
  };

  // בקשה לאחסון עמיד — מונע מהמערכת למחוק את הנתונים כשנגמר מקום
  try {
    if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(() => {});
  } catch (e) { /* לא נתמך */ }
})();
