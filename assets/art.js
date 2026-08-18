/* ===========================================================
   איורים מקוריים — SVG שמצויר כאן, לא נשאב מאף מקום.
   יתרונות: חד בכל גודל, נטען מיידית, שלנו לגמרי,
   ואפשר לשנות בו צבע בשורה אחת.
   שימוש בעמוד: <div data-art="hero"></div>
   =========================================================== */

var ART = {};

/* ---------- סצנת פתיחה: הליכה עם כלב בשעה מאוחרת ---------- */
ART.hero = '' +
'<svg viewBox="0 0 800 400" role="img" aria-label="איור: אדם והכלב שלו הולכים יחד בשדה בשעת בין ערביים">' +
  '<defs>' +
    '<linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">' +
      '<stop offset="0%" stop-color="#F7DFC6"/><stop offset="55%" stop-color="#FAEDDD"/><stop offset="100%" stop-color="#FBF7EF"/>' +
    '</linearGradient>' +
    '<linearGradient id="hillFar" x1="0" y1="0" x2="0" y2="1">' +
      '<stop offset="0%" stop-color="#A9B486"/><stop offset="100%" stop-color="#93A171"/>' +
    '</linearGradient>' +
    '<linearGradient id="hillNear" x1="0" y1="0" x2="0" y2="1">' +
      '<stop offset="0%" stop-color="#6E7C46"/><stop offset="100%" stop-color="#5A6739"/>' +
    '</linearGradient>' +
    '<clipPath id="frame"><rect width="800" height="400" rx="20"/></clipPath>' +
  '</defs>' +

  '<g clip-path="url(#frame)">' +
    '<rect width="800" height="400" fill="url(#sky)"/>' +
    '<circle cx="596" cy="150" r="74" fill="#EFB98C" opacity=".55"/>' +
    '<circle cx="596" cy="150" r="46" fill="#E8A473" opacity=".65"/>' +

    /* עננים רכים */
    '<g fill="#FFFFFF" opacity=".55">' +
      '<ellipse cx="180" cy="86" rx="58" ry="17"/><ellipse cx="214" cy="76" rx="38" ry="15"/>' +
      '<ellipse cx="660" cy="60" rx="46" ry="13"/><ellipse cx="688" cy="52" rx="30" ry="11"/>' +
    '</g>' +

    /* ציפורים */
    '<g fill="none" stroke="#9E7A5C" stroke-width="2.4" stroke-linecap="round" opacity=".7">' +
      '<path d="M300 92c6-7 12-7 17 0M317 92c5-7 11-7 16 0"/>' +
      '<path d="M370 66c4-5 9-5 13 0M383 66c4-5 9-5 12 0"/>' +
    '</g>' +

    /* גבעות */
    '<path d="M-20 268c120-46 224-30 318 2 96 33 190 26 288-14 62-25 130-30 234-8v170H-20z" fill="url(#hillFar)"/>' +
    '<path d="M-20 316c150-40 250-16 356 10 92 22 186 12 274-20 54-20 118-22 210-2v116H-20z" fill="url(#hillNear)"/>' +

    /* עצים ברקע */
    '<g>' +
      '<rect x="120" y="228" width="8" height="46" rx="4" fill="#6B5238"/>' +
      '<circle cx="124" cy="218" r="28" fill="#4E5B2E"/><circle cx="105" cy="230" r="19" fill="#59683A"/><circle cx="142" cy="231" r="17" fill="#59683A"/>' +
      '<rect x="700" y="246" width="7" height="40" rx="3.5" fill="#6B5238"/>' +
      '<circle cx="703" cy="238" r="23" fill="#4E5B2E"/><circle cx="686" cy="248" r="15" fill="#59683A"/>' +
    '</g>' +

    /* שביל */
    '<path d="M-20 400C120 356 236 344 348 348s214 20 300 52" fill="none" stroke="#D8C6A4" stroke-width="46" stroke-linecap="round" opacity=".9"/>' +
    '<path d="M-20 400C120 356 236 344 348 348s214 20 300 52" fill="none" stroke="#E4D6BA" stroke-width="30" stroke-linecap="round"/>' +

    /* אדם */
    '<g transform="translate(300,196)">' +
      '<path d="M20 62l-8 62h13l10-46 9 46h13l-6-62z" fill="#3E3428"/>' +      /* רגליים */
      '<path d="M12 14h30c7 0 12 6 11 13l-6 40H8L3 27C2 20 6 14 12 14z" fill="#9E4A26"/>' + /* גוף */
      '<path d="M44 22c9 5 15 13 18 23" fill="none" stroke="#9E4A26" stroke-width="9" stroke-linecap="round"/>' + /* יד */
      '<circle cx="27" cy="-2" r="15" fill="#E8C9A8"/>' +
      '<path d="M12 -4c0-11 7-17 15-17s15 6 15 17c0 3-30 4-30 0z" fill="#3E3428"/>' +
    '</g>' +

    /* רצועה */
    '<path d="M363 240c30 12 52 26 74 38" fill="none" stroke="#8E4526" stroke-width="3" stroke-linecap="round" opacity=".85"/>' +

    /* כלב */
    '<g transform="translate(430,268)">' +
      '<ellipse cx="34" cy="16" rx="34" ry="19" fill="#B5613F"/>' +
      '<path d="M8 30v22M24 32v20M46 32v20M62 29v23" stroke="#B5613F" stroke-width="9" stroke-linecap="round"/>' +
      '<path d="M66 8c10-12 18-9 16 2-1 8-8 12-14 10" fill="#B5613F"/>' +          /* זנב */
      '<circle cx="9" cy="-4" r="16" fill="#C06E4A"/>' +
      '<path d="M-3 -16c-6-9-3-15 5-11l6 4z" fill="#9E4A26"/>' +                    /* אוזן */
      '<path d="M-6 -2c-8 1-11 5-10 9 1 4 6 5 11 3" fill="#C06E4A"/>' +             /* חוטם */
      '<circle cx="-9" cy="1" r="2.6" fill="#3E3428"/>' +
      '<circle cx="10" cy="-7" r="2.4" fill="#3E3428"/>' +
    '</g>' +

    /* עשב קדמי */
    '<g stroke="#4E5B2E" stroke-width="3" stroke-linecap="round" opacity=".8">' +
      '<path d="M60 388c2-14 8-20 12-24M74 388c0-10 4-16 9-19"/>' +
      '<path d="M736 384c2-13 8-19 12-23M752 386c0-10 4-15 9-18"/>' +
    '</g>' +
  '</g>' +
'</svg>';

/* ---------- כותרת עמוד: עין שקוראת ---------- */
ART.spotEye = '' +
'<svg viewBox="0 0 320 130" role="img" aria-label="איור: פני כלב עם אוזניים שמוטות וסימני הרגעה סביבו">' +
  '<ellipse cx="160" cy="120" rx="118" ry="9" fill="#B5613F" opacity=".13"/>' +
  '<g transform="translate(160,58)">' +
    /* אוזניים שמוטות */
    '<ellipse cx="-40" cy="4" rx="13" ry="27" fill="#C06E4A" transform="rotate(-14 -40 4)"/>' +
    '<ellipse cx="40" cy="4" rx="13" ry="27" fill="#C06E4A" transform="rotate(14 40 4)"/>' +
    /* ראש */
    '<path d="M-33-14c0-17 15-28 33-28s33 11 33 28v10c0 22-15 38-33 38S-33 18-33-4z" fill="#F0E0CC" stroke="#B5613F" stroke-width="4" stroke-linejoin="round"/>' +
    /* חוטם */
    '<ellipse cx="0" cy="20" rx="16" ry="12" fill="#E8CDB4"/>' +
    '<ellipse cx="0" cy="13" rx="6" ry="4.4" fill="#8E4526"/>' +
    '<path d="M0 17v7M0 24c-3 3-8 2-9-1M0 24c3 3 8 2 9-1" fill="none" stroke="#8E4526" stroke-width="2.6" stroke-linecap="round"/>' +
    /* עיניים */
    '<circle cx="-13" cy="-6" r="3.6" fill="#3E3428"/><circle cx="13" cy="-6" r="3.6" fill="#3E3428"/>' +
  '</g>' +
  /* סימני הרגעה מסביב */
  '<g fill="none" stroke="#4E5B2E" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" opacity=".8">' +
    '<path d="M64 44c-9 5-13 14-11 23"/><path d="M53 67l-10-4M53 67l-2 10"/>' +
    '<path d="M256 44c9 5 13 14 11 23"/><path d="M267 67l10-4M267 67l2 10"/>' +
  '</g>' +
  '<g fill="#B5613F" opacity=".5">' +
    '<circle cx="42" cy="26" r="3.4"/><circle cx="278" cy="26" r="3.4"/><circle cx="30" cy="96" r="2.6"/><circle cx="290" cy="96" r="2.6"/>' +
  '</g>' +
'</svg>';

/* ---------- כותרת עמוד: בית ---------- */
ART.spotHome = '' +
'<svg viewBox="0 0 320 130" role="img" aria-label="איור: בית עם אנשים וכלב">' +
  '<ellipse cx="160" cy="118" rx="126" ry="10" fill="#B5613F" opacity=".13"/>' +
  '<path d="M96 112V56l64-40 64 40v56z" fill="#F0E0CC" stroke="#B5613F" stroke-width="4" stroke-linejoin="round"/>' +
  '<path d="M84 60l76-48 76 48" fill="none" stroke="#9E4A26" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/>' +
  '<rect x="146" y="80" width="28" height="32" rx="3" fill="#B5613F" opacity=".8"/>' +
  '<rect x="110" y="70" width="22" height="20" rx="3" fill="#4E5B2E" opacity=".55"/>' +
  '<rect x="188" y="70" width="22" height="20" rx="3" fill="#4E5B2E" opacity=".55"/>' +
  '<g transform="translate(232,74)">' +
    '<ellipse cx="20" cy="22" rx="20" ry="11" fill="#B5613F"/>' +
    '<path d="M5 32v9M15 33v8M27 33v8M36 31v10" stroke="#B5613F" stroke-width="5.5" stroke-linecap="round"/>' +
    '<circle cx="5" cy="8" r="10" fill="#C06E4A"/>' +
    '<path d="M-2 0c-4-6-2-10 3-7l4 3z" fill="#9E4A26"/>' +
    '<path d="M38 15c6-8 11-6 10 1-1 5-5 8-9 6" fill="#B5613F"/>' +
  '</g>' +
  '<g fill="none" stroke="#4E5B2E" stroke-width="3.5" stroke-linecap="round">' +
    '<circle cx="58" cy="72" r="9"/><path d="M58 82v20M50 88l16 0M58 102l-6 12M58 102l6 12"/>' +
  '</g>' +
'</svg>';

/* ---------- כותרת עמוד: קול ---------- */
ART.spotSound = '' +
'<svg viewBox="0 0 320 130" role="img" aria-label="איור: כלב נובח וגלי קול">' +
  '<ellipse cx="160" cy="118" rx="120" ry="10" fill="#B5613F" opacity=".13"/>' +
  '<g transform="translate(88,34)">' +
    '<ellipse cx="52" cy="42" rx="40" ry="22" fill="#B5613F"/>' +
    '<path d="M22 60v18M40 62v16M64 62v16M82 59v19" stroke="#B5613F" stroke-width="10" stroke-linecap="round"/>' +
    '<path d="M88 30c11-14 20-10 18 3-1 9-9 13-16 11" fill="#B5613F"/>' +
    '<circle cx="22" cy="16" r="18" fill="#C06E4A"/>' +
    '<path d="M8 2c-7-11-3-17 6-12l7 5z" fill="#9E4A26"/>' +
    '<path d="M6 20c-9 1-12 6-11 10 1 5 7 6 13 4" fill="#C06E4A"/>' +
    '<path d="M2 26c-2 4 0 7 4 8" fill="none" stroke="#9E4A26" stroke-width="2.6" stroke-linecap="round"/>' +
    '<circle cx="24" cy="12" r="2.8" fill="#3E3428"/>' +
  '</g>' +
  '<g fill="none" stroke="#9E4A26" stroke-width="4" stroke-linecap="round" opacity=".8">' +
    '<path d="M58 44a30 30 0 000 26"/><path d="M42 36a48 48 0 000 42"/><path d="M26 28a66 66 0 000 58"/>' +
  '</g>' +
'</svg>';

/* ---------- כותרת עמוד: שאלות ---------- */
ART.spotAsk = '' +
'<svg viewBox="0 0 320 130" role="img" aria-label="איור: שאלה שמתפצלת לשלוש תשובות">' +
  '<ellipse cx="160" cy="118" rx="118" ry="10" fill="#B5613F" opacity=".13"/>' +
  '<rect x="120" y="12" width="80" height="42" rx="12" fill="#B5613F"/>' +
  '<path d="M148 54l6 12 10-12z" fill="#B5613F"/>' +
  '<text x="160" y="41" text-anchor="middle" font-family="serif" font-size="26" font-weight="700" fill="#FBF7EF">?</text>' +
  '<g fill="none" stroke="#9E4A26" stroke-width="3.5" stroke-linecap="round">' +
    '<path d="M160 68v10M160 78H70v12M160 78h90v12M160 78v12"/>' +
  '</g>' +
  '<g fill="#F0E0CC" stroke="#9E4A26" stroke-width="3.5">' +
    '<rect x="42" y="90" width="56" height="26" rx="9"/>' +
    '<rect x="132" y="90" width="56" height="26" rx="9"/>' +
    '<rect x="222" y="90" width="56" height="26" rx="9"/>' +
  '</g>' +
  '<g stroke="#4E5B2E" stroke-width="4" stroke-linecap="round" stroke-linejoin="round" fill="none">' +
    '<path d="M58 103l6 6 12-12"/><path d="M148 103l6 6 12-12"/><path d="M238 103l6 6 12-12"/>' +
  '</g>' +
'</svg>';

/* ---------- כותרת עמוד: הכלב שלי ---------- */
ART.spotDog = '' +
'<svg viewBox="0 0 320 130" role="img" aria-label="איור: כרטיס פרופיל של כלב">' +
  '<ellipse cx="160" cy="118" rx="110" ry="10" fill="#B5613F" opacity=".13"/>' +
  '<rect x="86" y="16" width="148" height="94" rx="16" fill="#F0E0CC" stroke="#B5613F" stroke-width="4"/>' +
  '<g transform="translate(104,34)">' +
    '<path d="M4 4v22c0 13 11 23 22 23s22-10 22-23V4L36 12H16L4 4z" fill="#B5613F"/>' +
    '<path d="M18 24h.01M34 24h.01" stroke="#F0E0CC" stroke-width="4.5" stroke-linecap="round"/>' +
  '</g>' +
  '<g stroke="#B5613F" stroke-width="6" stroke-linecap="round" opacity=".55">' +
    '<path d="M166 44h50M166 62h58M166 80h34"/>' +
  '</g>' +
'</svg>';


/* ---------- כותרת עמוד: מרחק ---------- */
ART.spotGuard = '' +
'<svg viewBox="0 0 320 130" role="img" aria-label="איור: כלב מבקש מרחק, וחץ שמסמן את המרחק הבטוח">' +
  '<ellipse cx="160" cy="120" rx="126" ry="9" fill="#B5613F" opacity=".13"/>' +
  /* כלב מתוח, משקל אחורה */
  '<g transform="translate(214,58)">' +
    '<ellipse cx="34" cy="30" rx="30" ry="17" fill="#B5613F"/>' +
    '<path d="M12 44v14M26 45v13M44 45v13M58 43v15" stroke="#B5613F" stroke-width="8" stroke-linecap="round"/>' +
    '<path d="M62 22c9-10 16-7 14 2-1 7-7 10-12 8" fill="#B5613F"/>' +
    '<circle cx="10" cy="10" r="14" fill="#C06E4A"/>' +
    '<path d="M-1 -1c-5-8-2-13 4-9l5 4z" fill="#9E4A26"/>' +
    '<path d="M-4 14c-7 1-9 5-8 8 1 4 5 5 10 3" fill="#C06E4A"/>' +
    /* שיניים — אזהרה */
    '<path d="M-3 17l2 4 2-4 2 4 2-4" fill="none" stroke="#FBF7EF" stroke-width="1.8" stroke-linejoin="round"/>' +
    '<circle cx="11" cy="6" r="2.6" fill="#3E3428"/>' +
  '</g>' +
  /* אדם — מרוחק */
  '<g transform="translate(40,44)" fill="none" stroke="#4E5B2E" stroke-width="4" stroke-linecap="round" stroke-linejoin="round">' +
    '<circle cx="16" cy="9" r="9"/><path d="M16 19v22M6 27h20M16 41l-7 17M16 41l7 17"/>' +
  '</g>' +
  /* חץ המרחק */
  '<g stroke="#9E4A26" stroke-width="2.6" fill="none" stroke-linecap="round">' +
    '<path d="M84 92h136"/><path d="M92 86l-8 6 8 6"/><path d="M212 86l8 6-8 6"/>' +
  '</g>' +
  '<rect x="128" y="80" width="48" height="24" rx="9" fill="#F3E7DA"/>' +
  '<path d="M141 92h22M152 84v16" stroke="#9E4A26" stroke-width="3" stroke-linecap="round"/>' +
'</svg>';

/* ---------- כותרת עמוד: לבד מול הדלת ---------- */
ART.spotAlone = '' +
'<svg viewBox="0 0 320 130" role="img" aria-label="איור: כלב יושב מול דלת סגורה">' +
  '<ellipse cx="160" cy="120" rx="118" ry="9" fill="#B5613F" opacity=".13"/>' +
  /* קיר ודלת */
  '<rect x="176" y="8" width="96" height="106" rx="6" fill="#F0E0CC" stroke="#B5613F" stroke-width="4"/>' +
  '<circle cx="192" cy="64" r="5" fill="#9E4A26"/>' +
  '<path d="M176 8v106" stroke="#9E4A26" stroke-width="4"/>' +
  /* כלב יושב, גב אלינו */
  '<g transform="translate(96,44)">' +
    '<path d="M30 68c-10 0-17-5-17-13 0-11 6-22 6-31 0-9 6-16 15-16s15 7 15 16c0 9 6 20 6 31 0 8-7 13-17 13z" fill="#B5613F"/>' +
    '<path d="M17 24c-6-11-3-18 5-13" fill="#B5613F"/>' +
    '<path d="M51 24c6-11 3-18-5-13" fill="#B5613F"/>' +
    '<path d="M13 66c-9 3-13 6-12 9 1 3 7 3 13 1" fill="#B5613F"/>' +
    '<ellipse cx="34" cy="70" rx="24" ry="6" fill="#9E4A26" opacity=".35"/>' +
  '</g>' +
  /* שעון */
  '<g transform="translate(44,26)">' +
    '<circle cx="18" cy="18" r="17" fill="none" stroke="#4E5B2E" stroke-width="3.5"/>' +
    '<path d="M18 8v11l7 5" fill="none" stroke="#4E5B2E" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"/>' +
  '</g>' +
'</svg>';

/* ---------- כותרת עמוד: גור ועולם חדש ---------- */
ART.spotPuppy = '' +
'<svg viewBox="0 0 320 130" role="img" aria-label="איור: גור קטן וסביבו דברים חדשים שהוא פוגש">' +
  '<ellipse cx="160" cy="118" rx="120" ry="9" fill="#B5613F" opacity=".13"/>' +
  /* גור */
  '<g transform="translate(134,50)">' +
    '<ellipse cx="28" cy="42" rx="26" ry="16" fill="#C06E4A"/>' +
    '<path d="M10 54v10M22 55v9M36 55v9M48 53v11" stroke="#C06E4A" stroke-width="7" stroke-linecap="round"/>' +
    '<path d="M52 34c8-7 13-4 11 3-1 6-6 8-10 6" fill="#C06E4A"/>' +
    '<circle cx="12" cy="18" r="17" fill="#D07E58"/>' +
    '<ellipse cx="-2" cy="14" rx="7" ry="12" fill="#B5613F" transform="rotate(-18 -2 14)"/>' +
    '<ellipse cx="26" cy="13" rx="7" ry="12" fill="#B5613F" transform="rotate(18 26 13)"/>' +
    '<ellipse cx="10" cy="26" rx="9" ry="6" fill="#EBD3BC"/>' +
    '<ellipse cx="10" cy="22" rx="3.4" ry="2.6" fill="#8E4526"/>' +
    '<circle cx="4" cy="15" r="2.6" fill="#3E3428"/><circle cx="19" cy="15" r="2.6" fill="#3E3428"/>' +
  '</g>' +
  /* דברים חדשים בעולם */
  '<g fill="none" stroke="#4E5B2E" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round">' +
    '<rect x="24" y="22" width="30" height="24" rx="5"/><path d="M31 34h16M39 28v12"/>' +      /* קופסה */
    '<circle cx="52" cy="82" r="13"/><path d="M43 74l18 16M61 74l-18 16"/>' +                   /* כדור */
    '<path d="M254 34c10 0 17 7 17 16s-7 16-17 16"/><path d="M254 34v32"/>' +                   /* צליל */
    '<path d="M282 40a26 26 0 010 20"/>' +
    '<path d="M240 96h44M248 96v-12M276 96v-12"/>' +                                            /* מדרגה */
  '</g>' +
  '<g fill="#B5613F" opacity=".45">' +
    '<circle cx="96" cy="24" r="4"/><circle cx="230" cy="20" r="3.4"/><circle cx="288" cy="106" r="3"/><circle cx="20" cy="102" r="3.4"/>' +
  '</g>' +
'</svg>';

document.addEventListener('DOMContentLoaded', function () {
  document.querySelectorAll('[data-art]').forEach(function (el) {
    var k = el.getAttribute('data-art');
    if (ART[k]) el.innerHTML = ART[k];
  });
});
