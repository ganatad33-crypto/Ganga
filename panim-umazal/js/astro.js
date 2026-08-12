/* חישובים אסטרונומיים מקורבים (דיוק של כ־1° — מספיק לקביעת מזל ברוב המקרים) */
const Astro = (function () {
  const rad = (d) => (d * Math.PI) / 180;
  const deg = (r) => (r * 180) / Math.PI;
  const mod360 = (x) => ((x % 360) + 360) % 360;

  /* יום יוליאני מתוך זמן UTC (מילישניות) */
  function julian(utcMs) { return utcMs / 86400000 + 2440587.5; }

  /* אורך אקליפטי של השמש */
  function sunLongitude(jd) {
    const d = jd - 2451545.0;
    const g = rad(mod360(357.529 + 0.98560028 * d));
    const L = mod360(280.459 + 0.98564736 * d);
    return mod360(L + 1.915 * Math.sin(g) + 0.02 * Math.sin(2 * g));
  }

  /* אורך אקליפטי של הירח (קירוב) */
  function moonLongitude(jd) {
    const d = jd - 2451545.0;
    const L = mod360(218.316 + 13.176396 * d);
    const M = rad(mod360(134.963 + 13.064993 * d));
    return mod360(L + 6.289 * Math.sin(M));
  }

  /* מעלת האופק העולה (אסצנדנט) — דורש שעה ומקום */
  function ascendant(jd, latDeg, lonDeg) {
    const d = jd - 2451545.0;
    const lst = mod360(280.16 + 360.9856235 * d + lonDeg); // זמן כוכבים מקומי במעלות
    const ramc = rad(lst);
    const eps = rad(23.4367); // נטיית המילקה
    const phi = rad(latDeg);
    let asc = deg(Math.atan2(Math.cos(ramc), -(Math.sin(ramc) * Math.cos(eps) + Math.tan(phi) * Math.sin(eps))));
    return mod360(asc);
  }

  /* אינדקס מזל (0=טלה) מתוך אורך אקליפטי */
  function signIndex(lon) { return Math.floor(mod360(lon) / 30); }

  /*
   * חישוב מפה בסיסית.
   * dateStr: "YYYY-MM-DD", timeStr: "HH:MM" או null, tz: אזור זמן, dst: שעון קיץ,
   * lat/lon: מיקום (נדרש לאופק בלבד)
   */
  function chart(dateStr, timeStr, tz, dst, lat, lon) {
    const [y, m, d] = dateStr.split("-").map(Number);
    const hasTime = !!timeStr;
    const [hh, mm] = hasTime ? timeStr.split(":").map(Number) : [12, 0];
    const offset = (tz ?? 2) + (dst ? 1 : 0);
    const utcMs = Date.UTC(y, m - 1, d, hh, mm) - offset * 3600000;
    const jd = julian(utcMs);

    const result = {
      sun: signIndex(sunLongitude(jd)),
      moon: signIndex(moonLongitude(jd)),
      moonApprox: !hasTime, // בלי שעה — הירח משוער (נע ~13° ביום)
      asc: null,
    };
    if (hasTime && lat != null && lon != null) {
      result.asc = signIndex(ascendant(jd, lat, lon));
    }
    return result;
  }

  return { chart, signIndex, sunLongitude, moonLongitude, ascendant, julian };
})();

if (typeof module !== "undefined") module.exports = Astro;
