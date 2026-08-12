/* נומרולוגיה: מספר מסלול חיים, מספר השם (גימטריה), שנה אישית */
const Numerology = (function () {
  /* צמצום ספרות תוך שמירה על מספרי מאסטר 11/22/33 */
  function reduce(n, keepMasters = true) {
    while (n > 9) {
      if (keepMasters && (n === 11 || n === 22 || n === 33)) return n;
      n = String(n).split("").reduce((s, c) => s + Number(c), 0);
    }
    return n;
  }

  const digitSum = (str) => String(str).replace(/\D/g, "").split("").reduce((s, c) => s + Number(c), 0);

  /* מספר מסלול חיים מתוך "YYYY-MM-DD" */
  function lifePath(dateStr) {
    const [y, m, d] = dateStr.split("-").map(Number);
    return reduce(reduce(digitSum(y), false) + reduce(digitSum(m), false) + reduce(digitSum(d), false));
  }

  /* שנה אישית: יום + חודש + השנה הנוכחית */
  function personalYear(dateStr, currentYear) {
    const [, m, d] = dateStr.split("-").map(Number);
    return reduce(digitSum(d) + digitSum(m) + digitSum(currentYear), false);
  }

  /* גימטריה של שם עברי (מספר קטן — מצומצם ל־1–9) */
  const GEMATRIA = {
    "א": 1, "ב": 2, "ג": 3, "ד": 4, "ה": 5, "ו": 6, "ז": 7, "ח": 8, "ט": 9,
    "י": 10, "כ": 20, "ך": 20, "ל": 30, "מ": 40, "ם": 40, "נ": 50, "ן": 50,
    "ס": 60, "ע": 70, "פ": 80, "ף": 80, "צ": 90, "ץ": 90,
    "ק": 100, "ר": 200, "ש": 300, "ת": 400,
  };

  function nameNumber(name) {
    let sum = 0, counted = false;
    for (const ch of name || "") {
      if (GEMATRIA[ch]) { sum += GEMATRIA[ch]; counted = true; }
    }
    if (!counted) return null;
    return { gematria: sum, number: reduce(sum, false) };
  }

  return { lifePath, personalYear, nameNumber, reduce };
})();

if (typeof module !== "undefined") module.exports = Numerology;
