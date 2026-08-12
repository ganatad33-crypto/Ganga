/* פנים ומזל — חיבור הממשק למנועים */
(function () {
  const profiles = { A: null, B: null };

  /* ── לשוניות ── */
  document.querySelectorAll(".tab-btn").forEach((btn) => {
    btn.onclick = () => {
      document.querySelectorAll(".tab-btn").forEach((b) => b.classList.remove("active"));
      document.querySelectorAll(".tab-pane").forEach((p) => p.classList.remove("active"));
      btn.classList.add("active");
      document.getElementById(btn.dataset.tab).classList.add("active");
    };
  });

  /* ── בניית פאנל אדם ── */
  function buildPanel(rootId, title) {
    const root = document.getElementById(rootId);
    const tpl = document.getElementById("person-panel-template");
    root.appendChild(tpl.content.cloneNode(true));
    const panel = root.querySelector(".person-panel");
    panel.querySelector(".panel-title").textContent = title;

    /* ערים */
    const citySel = panel.querySelector(".inp-city");
    CITIES.forEach(([name], i) => {
      const opt = document.createElement("option");
      opt.value = i; opt.textContent = name;
      citySel.appendChild(opt);
    });
    const latlonRow = panel.querySelector(".latlon-row");
    citySel.onchange = () => {
      const [, lat, lon, tz] = CITIES[citySel.value];
      const manual = lat === null;
      latlonRow.hidden = !manual;
      if (!manual) {
        panel.querySelector(".inp-lat").value = lat;
        panel.querySelector(".inp-lon").value = lon;
        panel.querySelector(".inp-tz").value = tz;
      }
    };

    /* בוררים ידניים לתווי פנים */
    const manualGrid = panel.querySelector(".manual-face-grid");
    for (const [key, trait] of Object.entries(FACE_TRAITS)) {
      const label = document.createElement("label");
      label.textContent = trait.label + ":";
      const sel = document.createElement("select");
      sel.dataset.trait = key;
      sel.innerHTML = "<option value=''>— לא ידוע —</option>" +
        FACE_LEVELS.map((lv) => `<option value="${lv}">${trait[lv].title}</option>`).join("");
      label.appendChild(sel);
      manualGrid.appendChild(label);
    }

    /* העלאת תמונה */
    const photoInput = panel.querySelector(".inp-photo");
    const canvas = panel.querySelector(".photo-canvas");
    const status = panel.querySelector(".face-status");
    let autoMetrics = null;

    photoInput.onchange = async () => {
      const file = photoInput.files[0];
      if (!file) return;
      const img = new Image();
      img.onload = async () => {
        /* תצוגה מוקטנת */
        const scale = Math.min(320 / img.width, 320 / img.height, 1);
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        canvas.hidden = false;
        canvas.getContext("2d").drawImage(img, 0, 0, canvas.width, canvas.height);

        status.textContent = "🔍 מזהה תווי פנים...";
        status.className = "face-status muted";
        const res = await FaceEngine.analyze(img);
        if (res.metrics) {
          autoMetrics = res.metrics;
          status.textContent = "✅ תווי הפנים זוהו אוטומטית! אפשר לדייק ידנית בהרחבה למטה.";
          status.className = "face-status ok";
          /* מילוי הבוררים הידניים לפי הזיהוי */
          manualGrid.querySelectorAll("select").forEach((s) => { s.value = res.metrics[s.dataset.trait] || ""; });
        } else if (res.error === "no-face") {
          status.textContent = "😕 לא זוהו פנים בתמונה — נסו תמונת פורטרט חזיתית וברורה, או הזינו ידנית למטה.";
          status.className = "face-status err";
        } else {
          status.textContent = "ℹ️ הזיהוי האוטומטי אינו זמין כרגע (אין חיבור לרשת?) — אפשר להזין את תווי הפנים ידנית בהרחבה למטה.";
          status.className = "face-status err";
          panel.querySelector(".manual-face").open = true;
        }
        URL.revokeObjectURL(img.src);
      };
      img.src = URL.createObjectURL(file);
    };

    /* כפתור ניתוח */
    panel.querySelector(".btn-analyze").onclick = () => {
      const dateStr = panel.querySelector(".inp-date").value;
      if (!dateStr) { alert("נא להזין תאריך לידה 🌟"); return; }
      const name = panel.querySelector(".inp-name").value.trim();
      const timeStr = panel.querySelector(".inp-time").value || null;
      const lat = parseFloat(panel.querySelector(".inp-lat").value);
      const lon = parseFloat(panel.querySelector(".inp-lon").value);
      const tz = parseFloat(panel.querySelector(".inp-tz").value);
      const dst = panel.querySelector(".inp-dst").checked;

      /* תווי פנים: ידני גובר על אוטומטי */
      const face = {};
      let hasFace = false;
      manualGrid.querySelectorAll("select").forEach((s) => {
        const v = s.value || (autoMetrics ? autoMetrics[s.dataset.trait] : "");
        if (v) { face[s.dataset.trait] = v; hasFace = true; }
      });

      const chart = Astro.chart(dateStr, timeStr, tz, dst, lat, lon);
      const lifePath = Numerology.lifePath(dateStr);
      const personalYear = Numerology.personalYear(dateStr, new Date().getFullYear());
      const nameNum = Numerology.nameNumber(name);

      const profile = { name: name || title, chart, lifePath, personalYear, nameNum,
                        face: hasFace ? face : null };
      profiles[rootId === "personA" ? "A" : "B"] = profile;
      renderProfile(panel.parentElement.querySelector(".results") || panel.querySelector(".results"), profile);
    };

    return panel;
  }

  /* ── רינדור ניתוח אישי ── */
  const traitHtml = (face) => Object.entries(face).map(([key, lv]) => {
    const t = FACE_TRAITS[key];
    return `<div class="trait-item"><b>${t.label} — ${t[lv].title}:</b> ${t[lv].text}</div>`;
  }).join("");

  function renderProfile(box, p) {
    const sun = ZODIAC[p.chart.sun];
    const moon = ZODIAC[p.chart.moon];
    const asc = p.chart.asc !== null ? ZODIAC[p.chart.asc] : null;
    const lp = NUMEROLOGY[p.lifePath];
    const nn = p.nameNum ? NUMEROLOGY[p.nameNum.number] : null;
    const py = NUMEROLOGY[p.personalYear];

    let html = `<h2>🔮 הניתוח של ${p.name}</h2>`;

    if (p.face) {
      html += `<h3>🪞 מה שהפנים מספרות (חכמת הפרצוף)</h3>` + traitHtml(p.face);
    } else {
      html += `<p class="muted">💡 לא הוזנו תווי פנים — העלו תמונת פורטרט או מלאו ידנית כדי לקבל גם ניתוח פנים.</p>`;
    }

    html += `<h3>🌌 המפה האסטרולוגית</h3>
      <p><span class="badge">${sun.emoji} שמש ב${sun.he}</span>
         <span class="badge">יסוד ${sun.element}</span>
         <span class="badge">כוכב שולט: ${sun.planet}</span></p>
      <div class="trait-item"><b>האישיות (מזל השמש):</b> ${sun.general}</div>
      <div class="trait-item"><b>באהבה:</b> ${sun.love}</div>
      <div class="trait-item"><b>בקריירה:</b> ${sun.career}</div>
      <div class="trait-item"><b>🌙 מזל הירח — ${moon.he}${p.chart.moonApprox ? " (משוער — הזינו שעת לידה לדיוק)" : ""}:</b>
        העולם הרגשי הפנימי נצבע בגוון ${moon.he}: ${moon.general}</div>`;
    if (asc) {
      html += `<div class="trait-item"><b>⬆️ האופק העולה — ${asc.he}:</b>
        הרושם הראשוני שאתם משדרים לעולם: ${asc.general}</div>`;
    } else {
      html += `<p class="muted">💡 הזנת שעת לידה ומקום מאפשרת לחשב גם את האופק העולה (האסצנדנט).</p>`;
    }
    html += `<p><span class="badge">חוזקות: ${sun.strengths.join(" · ")}</span>
             <span class="badge">אתגרים: ${sun.challenges.join(" · ")}</span></p>`;

    html += `<h3>🔢 נומרולוגיה</h3>
      <div class="trait-item"><b>מספר מסלול חיים ${p.lifePath} — ${lp.title}:</b> ${lp.essence}<br>
        <b>באהבה:</b> ${lp.love} <b>בקריירה:</b> ${lp.career}</div>`;
    if (nn) {
      html += `<div class="trait-item"><b>מספר השם (גימטריה ${p.nameNum.gematria} ← ${p.nameNum.number}) — ${nn.title}:</b>
        האנרגיה שהשם משדר לעולם: ${nn.essence}</div>`;
    }
    html += `<div class="trait-item"><b>שנה אישית ${p.personalYear} — ${py.title}:</b>
      השנה הנוכחית מזמינה אנרגיה של ${py.essence}</div>`;

    /* סינתזה */
    html += `<h3>✨ השורה התחתונה</h3><div class="trait-item">`;
    const parts = [`${p.name} משלב/ת את האש הפנימית של מזל ${sun.he} עם אנרגיית "${lp.title}" הנומרולוגית`];
    if (p.face) {
      const strong = Object.entries(p.face).filter(([, lv]) => lv !== "mid");
      if (strong.length) {
        const [k, lv] = strong[0];
        parts.push(`ותווי הפנים מוסיפים את החותם של ${FACE_TRAITS[k][lv].title.toLowerCase()}`);
      }
    }
    html += parts.join(", ") + `. שילוב שלושת העולמות מצייר אדם עם ${sun.strengths[0]} ו${sun.strengths[1]},
      שהאתגר המרכזי שלו הוא ${sun.challenges[0]} — ומי שיודע את זה עליו, מחזיק מפתח אמיתי להבנתו.</div>
      <p class="muted">⚠️ תזכורת: ניתוח זה מבוסס על מסורות עתיקות ומיועד להעשרה והשראה בלבד.</p>`;

    box.innerHTML = html;
    box.hidden = false;
    box.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }

  /* ── התאמה ── */
  document.getElementById("btn-match").onclick = () => {
    const out = document.getElementById("match-results");
    if (!profiles.A || !profiles.B) {
      out.innerHTML = `<p class="face-status err">יש לנתח קודם את שני האנשים בלשוניות "אדם א'" ו"אדם ב'" 🙂</p>`;
      out.hidden = false;
      return;
    }
    const m = Compat.match(profiles.A, profiles.B);
    const [, text, icon] = m.verdict;

    let html = `<div class="match-verdict">${icon} <b>${m.overall}%</b> — ${text}</div>
      <p class="muted" style="text-align:center">
        ${profiles.A.name} (${ZODIAC[profiles.A.chart.sun].he}, יסוד ${m.elements[0]}) ✕
        ${profiles.B.name} (${ZODIAC[profiles.B.chart.sun].he}, יסוד ${m.elements[1]})
        ${m.faceIncluded ? "· כולל ניתוח תווי פנים" : "· ללא נתוני פנים (הוסיפו תמונות לניתוח מלא)"}
      </p>`;

    m.aspects.forEach((a) => {
      html += `<div class="score-row">
        <div class="score-label"><span>${a.icon} ${a.key}</span><span class="score-num">${a.score}%</span></div>
        <div class="score-bar"><div class="score-fill" style="width:${a.score}%"></div></div>
      </div>`;
    });

    const best = [...m.aspects].sort((a, b) => b.score - a.score)[0];
    const worst = [...m.aspects].sort((a, b) => a.score - b.score)[0];
    html += `<div class="trait-item"><b>💪 הכוח של הקשר:</b> תחום ה${best.key} (${best.score}%) —
      כאן החיבור ביניכם זורם באופן טבעי, וכדאי לבנות עליו.</div>
      <div class="trait-item"><b>🌱 מרחב הצמיחה:</b> תחום ה${worst.key} (${worst.score}%) —
      כאן תידרש עבודה משותפת. מודעות לפער היא כבר חצי מהדרך.</div>
      <p class="muted">⚠️ להעשרה והשראה בלבד — שום מספר אינו קובע גורל של קשר בין שני אנשים.</p>`;

    out.innerHTML = html;
    out.hidden = false;
  };

  buildPanel("personA", "אדם א'");
  buildPanel("personB", "אדם ב'");
})();
