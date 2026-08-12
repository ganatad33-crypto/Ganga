/* פורטפוליו צילום — לוגיקת האתר. אין צורך לערוך קובץ זה; עורכים רק את config.js */
(function () {
  const cfg = SITE_CONFIG;

  // ממלא כל אלמנט עם data-cfg בטקסט מההגדרות
  document.querySelectorAll("[data-cfg]").forEach((el) => {
    el.textContent = cfg[el.dataset.cfg] || "";
  });
  document.title = cfg.name + " · פורטפוליו צילום";

  // ── גלריה ──────────────────────────────────────
  const grid = document.getElementById("grid");
  const filters = document.getElementById("filters");
  let currentFilter = cfg.categories[0] || "הכול";
  let visiblePhotos = [];

  // ממלא-מקום מעוצב כשאין עדיין קובץ תמונה
  const PH_ICONS = ["📷", "🌄", "🎞️", "✨", "🖼️"];

  function renderFilters() {
    filters.innerHTML = "";
    cfg.categories.forEach((cat) => {
      const b = document.createElement("button");
      b.className = "filter-btn" + (cat === currentFilter ? " active" : "");
      b.textContent = cat;
      b.onclick = () => { currentFilter = cat; renderFilters(); renderGrid(); };
      filters.appendChild(b);
    });
  }

  function renderGrid() {
    grid.innerHTML = "";
    visiblePhotos = cfg.photos.filter(
      (p) => currentFilter === "הכול" || p.category === currentFilter
    );
    visiblePhotos.forEach((p, i) => {
      const item = document.createElement("div");
      item.className = "grid-item";
      const img = document.createElement("img");
      img.src = p.src;
      img.alt = p.title;
      img.loading = "lazy";
      img.onerror = () => {
        // אין קובץ תמונה — מציגים ממלא-מקום
        img.remove();
        const ph = document.createElement("div");
        ph.className = "ph";
        ph.style.background = placeholderGradient(i);
        ph.innerHTML =
          '<span class="ph-icon">' + PH_ICONS[i % PH_ICONS.length] + "</span>" +
          "<span>" + p.title + "</span><span style='font-size:0.75rem'>(" +
          p.src + ")</span>";
        item.prepend(ph);
      };
      const cap = document.createElement("div");
      cap.className = "cap";
      cap.textContent = p.title + " · " + p.category;
      item.append(img, cap);
      item.onclick = () => openLightbox(i);
      grid.appendChild(item);
    });
  }

  function placeholderGradient(i) {
    const hues = [[35, 25], [215, 30], [280, 20], [160, 18], [10, 22]];
    const [h, s] = hues[i % hues.length];
    return `linear-gradient(135deg, hsl(${h} ${s}% 16%), hsl(${h + 40} ${s}% 26%))`;
  }

  // ── לייטבוקס ───────────────────────────────────
  const lb = document.getElementById("lightbox");
  const stage = lb.querySelector(".lb-stage");
  const caption = lb.querySelector(".lb-caption");
  let lbIndex = 0;

  function openLightbox(i) { lbIndex = i; showLb(); lb.hidden = false; }
  function showLb() {
    const p = visiblePhotos[lbIndex];
    stage.innerHTML = "";
    const img = document.createElement("img");
    img.src = p.src;
    img.alt = p.title;
    img.onerror = () => {
      stage.innerHTML = "<div class='ph'>📷<br>" + p.title +
        "<br><small>התמונה תוצג כאן כשתוסיף את הקובץ " + p.src + "</small></div>";
    };
    stage.appendChild(img);
    caption.textContent = p.title + " · " + p.category;
  }
  function moveLb(dir) {
    lbIndex = (lbIndex + dir + visiblePhotos.length) % visiblePhotos.length;
    showLb();
  }

  lb.querySelector(".lb-close").onclick = () => (lb.hidden = true);
  lb.querySelector(".lb-prev").onclick = () => moveLb(-1);
  lb.querySelector(".lb-next").onclick = () => moveLb(1);
  lb.onclick = (e) => { if (e.target === lb) lb.hidden = true; };
  document.addEventListener("keydown", (e) => {
    if (lb.hidden) return;
    if (e.key === "Escape") lb.hidden = true;
    if (e.key === "ArrowLeft") moveLb(1);
    if (e.key === "ArrowRight") moveLb(-1);
  });

  // ── שירותים ────────────────────────────────────
  const servicesGrid = document.getElementById("services-grid");
  if (cfg.services && cfg.services.length) {
    cfg.services.forEach((s) => {
      const card = document.createElement("div");
      card.className = "service-card";
      card.innerHTML =
        "<div class='icon'>" + s.icon + "</div><h3>" + s.title + "</h3><p>" + s.desc + "</p>";
      servicesGrid.appendChild(card);
    });
  } else {
    document.getElementById("services").style.display = "none";
  }

  // ── יצירת קשר ──────────────────────────────────
  const cb = document.getElementById("contact-buttons");
  const links = [];
  if (cfg.whatsapp) links.push({ cls: "wa", icon: "💬", label: "וואטסאפ", href: "https://wa.me/" + cfg.whatsapp });
  if (cfg.phone) links.push({ icon: "📞", label: cfg.phone, href: "tel:" + cfg.phone.replace(/-/g, "") });
  if (cfg.email) links.push({ icon: "✉️", label: "אימייל", href: "mailto:" + cfg.email });
  if (cfg.facebook) links.push({ icon: "📘", label: "פייסבוק", href: cfg.facebook });
  if (cfg.instagram) links.push({ icon: "📸", label: "אינסטגרם", href: cfg.instagram });
  links.forEach((l) => {
    const a = document.createElement("a");
    a.className = "contact-btn " + (l.cls || "");
    a.href = l.href;
    a.target = "_blank";
    a.rel = "noopener";
    a.innerHTML = l.icon + " " + l.label;
    cb.appendChild(a);
  });

  renderFilters();
  renderGrid();
})();
