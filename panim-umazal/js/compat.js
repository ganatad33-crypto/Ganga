/* חישוב התאמה בין שני פרופילים, לפי תחומי חיים */
const Compat = (function () {
  const clamp = (v) => Math.max(30, Math.min(97, Math.round(v)));

  /* ציון יחס זוויתי בין שני מזלות (מרחק בסימנים 0–6) */
  const ANGLE_SCORE = { 0: 72, 1: 60, 2: 86, 3: 55, 4: 94, 5: 62, 6: 68 };
  function angleScore(signA, signB) {
    let d = Math.abs(signA - signB) % 12;
    if (d > 6) d = 12 - d;
    return ANGLE_SCORE[d];
  }

  function elementScore(elA, elB) { return ELEMENT_COMPAT[elA][elB]; }

  function numScore(a, b) {
    const ra = a > 9 ? Numerology.reduce(a, false) : a;
    const rb = b > 9 ? Numerology.reduce(b, false) : b;
    if (ra === rb) return 84;
    const sameGroup = NUM_GROUPS.some((g) => g.includes(ra) && g.includes(rb));
    return sameGroup ? 88 : 64;
  }

  /* התאמת תווי פנים: השלמה בין קצוות נחשבת חיובית */
  function faceScore(fa, fb) {
    if (!fa || !fb) return null;
    let score = 65;
    for (const key of Object.keys(FACE_TRAITS)) {
      const a = fa[key], b = fb[key];
      if (!a || !b) continue;
      if ((a === "low" && b === "high") || (a === "high" && b === "low")) score += 3;      // השלמה
      else if (a === "mid" && b === "mid") score += 2;                                     // איזון
      else if (a === b && a !== "mid") score += (key === "lips" || key === "eyeSize") ? 3  // רגש דומה מחבר
        : (key === "jaw" || key === "faceWidth") ? -3 : 1;                                 // שתי עקשנויות מתנגשות
      else score += 1;
    }
    return clamp(score);
  }

  const BAND_TEXT = [
    [85, "התאמה יוצאת דופן — חיבור טבעי וזורם", "🌟"],
    [72, "התאמה טובה מאוד — בסיס חזק לקשר", "💫"],
    [58, "התאמה בינונית — קשר שדורש עבודה, אבל יש עם מה", "🌗"],
    [0,  "התאמה מאתגרת — שונות גדולה שיכולה ללמד, אם שניכם מוכנים", "🌊"],
  ];
  function verdict(score) { return BAND_TEXT.find(([min]) => score >= min); }

  /*
   * חישוב מלא. profileA/B: { name, chart:{sun,...}, lifePath, face }
   */
  function match(A, B) {
    const zA = ZODIAC[A.chart.sun], zB = ZODIAC[B.chart.sun];
    const el = elementScore(zA.element, zB.element);
    const ang = angleScore(A.chart.sun, B.chart.sun);
    const num = numScore(A.lifePath, B.lifePath);
    const face = faceScore(A.face, B.face); // null אם אין נתוני פנים
    const f = face ?? Math.round((el + num) / 2); // בהיעדר פנים — ממוצע שאר הרכיבים

    const astroLove = 0.6 * el + 0.4 * ang;
    const aspects = [
      { key: "רומנטיקה ותשוקה", icon: "❤️", score: clamp(0.45 * astroLove + 0.30 * num + 0.25 * f) },
      { key: "תקשורת והבנה",    icon: "💬", score: clamp(0.40 * ang + 0.30 * f + 0.30 * num) },
      { key: "קריירה ושותפות",  icon: "💼", score: clamp(0.40 * num + 0.35 * el + 0.25 * f) },
      { key: "חברות וכיף",      icon: "🎈", score: clamp((el + ang + f) / 3) },
      { key: "יציבות לטווח ארוך", icon: "🏡", score: clamp(0.40 * el + 0.30 * num + 0.30 * f) },
    ];
    const overall = clamp(aspects.reduce((s, a) => s + a.score, 0) / aspects.length);

    return { aspects, overall, verdict: verdict(overall), faceIncluded: face !== null,
             elements: [zA.element, zB.element] };
  }

  return { match, angleScore, numScore, faceScore };
})();

if (typeof module !== "undefined") module.exports = Compat;
