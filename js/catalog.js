/*
 * קטלוג הפריטים.
 * ⚠️ זהו קטלוג זמני שנבנה מתוך דוח המלאי של 11/08/2026 — הוא כולל רק את
 * הפריטים שהיו ידועים בעת הבנייה. ברגע שקובץ המקור (mlay.html) יתקבל,
 * הקובץ הזה יוחלף בקטלוג המלא של 57 הפריטים כולל הספירה ההתחלתית.
 *
 * שדות לכל פריט:
 *   sku        — מק"ט
 *   name       — שם הפריט
 *   type       — 'env' (מעטפת חלון) או 'page' (דף נושא)
 *   boxQty     — כמות יחידות בארגז
 *   monthlyUse — צריכה חודשית ממוצעת (מטבלת הספק)
 *   initBoxes  — ארגזים בתא העמסה בספירה ההתחלתית (11/08/2026)
 *   initShelf  — יחידות במדף השוטף בספירה ההתחלתית
 */
const CATALOG = {
  version: '2026-08-11-temp',
  date: '2026-08-11',
  suppliers: { env: 'מטניר', page: 'שביט/מזל' },
  typeNames: { env: 'מעטפות חלון', page: 'דפי נושא' },
  items: [
    // ——— מעטפות חלון (מטניר) — 500 יח' בארגז ———
    { sku: 'M-101', name: 'כאל מהיר לתיבה',            type: 'env',  boxQty: 500,  monthlyUse: 24000, initBoxes: 0, initShelf: 0 },
    { sku: 'M-102', name: 'כאל שליחות',                 type: 'env',  boxQty: 500,  monthlyUse: 21000, initBoxes: 0, initShelf: 0 },
    { sku: 'M-103', name: 'שופרסל',                     type: 'env',  boxQty: 500,  monthlyUse: 14500, initBoxes: 0, initShelf: 0 },
    { sku: 'M-104', name: 'פליי קארד + דיינרס שליחות', type: 'env',  boxQty: 500,  monthlyUse: 8000,  initBoxes: 0, initShelf: 0 },
    // ——— דפי נושא (שביט/מזל) — ברירת מחדל 2,000 יח' בארגז ———
    { sku: 'S-201', name: 'דיסקונט כרטיס חיוב מיידי',  type: 'page', boxQty: 2000, monthlyUse: 15000, initBoxes: 0, initShelf: 0 },
    { sku: 'S-202', name: 'פליי קארד כאל',              type: 'page', boxQty: 2000, monthlyUse: 12100, initBoxes: 0, initShelf: 0 },
    { sku: 'S-203', name: 'פליי קארד משולב כאל',        type: 'page', boxQty: 2000, monthlyUse: 12100, initBoxes: 0, initShelf: 0 },
    { sku: 'S-204', name: 'מרכנתיל',                    type: 'page', boxQty: 2000, monthlyUse: 12000, initBoxes: 0, initShelf: 0 },
    { sku: 'S-205', name: 'שופרסל',                     type: 'page', boxQty: 2000, monthlyUse: 19000, initBoxes: 0, initShelf: 0 },
    { sku: 'S-206', name: 'כאל',                        type: 'page', boxQty: 2000, monthlyUse: 11000, initBoxes: 0, initShelf: 0 },
    { sku: 'S-207', name: 'פועלים',                     type: 'page', boxQty: 2000, monthlyUse: 10000, initBoxes: 0, initShelf: 0 }
  ]
};
