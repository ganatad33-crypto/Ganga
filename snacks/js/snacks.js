/* ═══════════════════════════════════════════════
   חטיף אהוב — לוגיקת האתר
   אין שרת: מועדפים והצבעה נשמרים ב-localStorage של הדפדפן.
   ═══════════════════════════════════════════════ */
(function () {
  'use strict';

  const $  = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));

  const CAT_COLOR = {
    salty: 'var(--sky)',
    sweet: 'var(--strawberry)',
    spicy: 'var(--tangerine)',
    sour:  'var(--mint)'
  };
  const CAT_LABEL = SNACK_CATS.reduce((a, c) => (a[c.id] = c.label, a), {});

  const LS = {
    get(k, def) { try { const v = localStorage.getItem('snacks:' + k); return v ? JSON.parse(v) : def; }
                  catch (e) { return def; } },
    set(k, v)   { try { localStorage.setItem('snacks:' + k, JSON.stringify(v)); } catch (e) {} },
    del(k)      { try { localStorage.removeItem('snacks:' + k); } catch (e) {} }
  };

  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const finePointer  = matchMedia('(hover: hover) and (pointer: fine)').matches;

  let favs   = LS.get('favs', []);
  let filter = 'all';
  let query  = '';

  /* ── טוסט ── */
  let toastTimer;
  function toast(msg) {
    const el = $('#toast');
    el.textContent = msg;
    el.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove('show'), 2600);
  }

  /* ── אפקט הטיה תלת־ממדי (מבוסס על BentoItem מ-21st.dev) ── */
  const MAX_ROT = 9;
  function addTilt(el) {
    if (!finePointer || reduceMotion) return;
    el.addEventListener('mousemove', e => {
      const r = el.getBoundingClientRect();
      const rotY = ((e.clientX - r.left - r.width / 2) / (r.width / 2)) * MAX_ROT;
      const rotX = (-(e.clientY - r.top - r.height / 2) / (r.height / 2)) * MAX_ROT;
      el.style.transform =
        `perspective(1000px) rotateX(${rotX}deg) rotateY(${rotY}deg) scale3d(1.03,1.03,1.03)`;
    });
    el.addEventListener('mouseleave', () => { el.style.transform = ''; });
  }

  /* ── סינון ── */
  function matches(s) {
    if (filter !== 'all' && s.cat !== filter) return false;
    if (!query) return true;
    const q = query.trim();
    return (s.name + ' ' + s.tag + ' ' + s.text + ' ' + CAT_LABEL[s.cat]).includes(q);
  }

  /* ── צ׳יפים ── */
  function renderChips() {
    $('#chips').innerHTML = SNACK_CATS.map(c => {
      const n = c.id === 'all' ? SNACKS.length : SNACKS.filter(s => s.cat === c.id).length;
      return `<button class="chip${c.id === filter ? ' on' : ''}" type="button"
                data-cat="${c.id}" aria-pressed="${c.id === filter}">
                <span aria-hidden="true">${c.emoji}</span>${c.label}<small>${n}</small></button>`;
    }).join('');
  }

  /* ── כרטיסים ── */
  function cardHTML(s) {
    const isFav = favs.includes(s.id);
    const dots = Array.from({ length: 5 },
      (_, i) => `<span class="dot${i < s.crunch ? ' on' : ''}"></span>`).join('');
    return `
      <article class="card" data-id="${s.id}" id="snack-${s.id}">
        <div class="card-top" style="background:${CAT_COLOR[s.cat]}">
          <span class="pill">${CAT_LABEL[s.cat]}</span>
          <button class="fav${isFav ? ' on' : ''}" type="button" data-fav="${s.id}"
            aria-pressed="${isFav}" aria-label="${isFav ? 'הסרה מהמועדפים' : 'הוספה למועדפים'}: ${s.name}"
            title="מועדפים">${isFav ? '❤️' : '🤍'}</button>
          <span class="card-emoji" aria-hidden="true">${s.emoji}</span>
        </div>
        <div class="card-body">
          <h3 class="card-name">${s.name}${s.classic ? '<span class="classic">קלאסיקה</span>' : ''}</h3>
          <p class="card-tag">${s.tag}</p>
          <p class="card-text">${s.text}</p>
          <div class="crunch"><span>פריכות</span>
            <span class="dots" role="img" aria-label="פריכות ${s.crunch} מתוך 5">${dots}</span>
          </div>
          <div class="meter">
            <div class="meter-lbl"><span>ציון טעם</span><span>${s.score}</span></div>
            <div class="meter-bar"><span class="meter-fill" data-w="${s.score}"
              style="background:${CAT_COLOR[s.cat]}"></span></div>
          </div>
          <p class="card-pair">🥤 ${s.pair}</p>
        </div>
      </article>`;
  }

  function renderGrid() {
    const list = SNACKS.filter(matches);
    const grid = $('#grid');
    grid.innerHTML = list.map(cardHTML).join('');
    $('#empty').hidden = list.length > 0;

    $('#resultLine').textContent = list.length === SNACKS.length
      ? `${SNACKS.length} חטיפים בקטלוג`
      : `${list.length} מתוך ${SNACKS.length} חטיפים`;

    $$('.card', grid).forEach(addTilt);
    requestAnimationFrame(() => {
      $$('.meter-fill', grid).forEach(f => { f.style.width = f.dataset.w + '%'; });
    });
  }

  /* ── מועדפים ── */
  function toggleFav(id) {
    const i = favs.indexOf(id);
    const snack = SNACKS.find(s => s.id === id);
    if (i > -1) { favs.splice(i, 1); toast('הוסר מהמועדפים 🤍'); }
    else        { favs.push(id);     toast(`${snack.name} נוסף למועדפים ❤️`); }
    LS.set('favs', favs);

    const btn = $(`[data-fav="${id}"]`);
    if (btn) {
      const on = favs.includes(id);
      btn.classList.toggle('on', on);
      btn.textContent = on ? '❤️' : '🤍';
      btn.setAttribute('aria-pressed', String(on));
      btn.setAttribute('aria-label', (on ? 'הסרה מהמועדפים' : 'הוספה למועדפים') + ': ' + snack.name);
    }
  }

  /* ── חטיף החודש ── */
  function renderMonth() {
    const s = SNACKS.find(x => x.id === SNACK_OF_MONTH) || SNACKS[0];
    $('#momEmoji').textContent  = s.emoji;
    $('#momName').textContent   = s.name;
    $('#momText').textContent   = s.text;
    $('#momScore').textContent  = s.score;
    $('#momCrunch').textContent = s.crunch + '/5';
    $('#momCat').textContent    = CAT_LABEL[s.cat];
    $('#momPair').textContent   = '🥤 ' + s.pair;
  }

  /* ── סקר ── */
  function pollVotes() {
    const mine = LS.get('vote', null);
    return POLL.options.map(o => ({
      ...o, total: o.votes + (mine === o.id ? 1 : 0), mine: mine === o.id
    }));
  }

  function renderPoll() {
    $('#pollQ').textContent = POLL.question;
    const opts  = pollVotes();
    const voted = opts.some(o => o.mine);
    const sum   = opts.reduce((a, o) => a + o.total, 0);

    $('#pollList').innerHTML = opts.map(o => {
      const pct = Math.round(o.total / sum * 1000) / 10;
      return `<button class="opt${o.mine ? ' mine' : ''}${voted ? ' voted' : ''}" type="button"
                data-vote="${o.id}" ${voted ? 'aria-disabled="true"' : ''}>
                <span class="opt-bar" data-w="${voted ? pct : 0}"></span>
                <span class="opt-row">
                  <span aria-hidden="true">${o.emoji}</span>${o.label}
                  <span class="mine-mark">ההצבעה שלי</span>
                  <span class="pct">${voted ? pct + '%' : '—'}</span>
                </span>
              </button>`;
    }).join('');

    $('#pollTotal').textContent = voted
      ? sum.toLocaleString('he-IL') + ' הצבעות עד כה'
      : 'לחצו על החטיף שלכם כדי לראות את התוצאות';
    $('#pollReset').hidden = !voted;

    requestAnimationFrame(() => {
      $$('#pollList .opt-bar').forEach(b => { b.style.width = b.dataset.w + '%'; });
    });
  }

  function vote(id) {
    if (LS.get('vote', null)) { toast('כבר הצבעתם 🙂'); return; }
    LS.set('vote', id);
    renderPoll();
    toast('ההצבעה נקלטה, תודה! 🎉');
  }

  /* ── מונים ── */
  function countUp(el) {
    const to = +el.dataset.to;
    if (reduceMotion || to === 0) { el.textContent = to.toLocaleString('he-IL'); return; }
    const dur = 1400, t0 = performance.now();
    (function step(t) {
      const p = Math.min((t - t0) / dur, 1);
      const e = 1 - Math.pow(1 - p, 3);
      el.textContent = Math.round(to * e).toLocaleString('he-IL');
      if (p < 1) requestAnimationFrame(step);
    })(t0);
  }

  /* ── גלילה ── */
  function observe() {
    if (!('IntersectionObserver' in window)) {
      $$('.reveal').forEach(e => e.classList.add('in'));
      $$('.count').forEach(countUp);
      return;
    }
    const io = new IntersectionObserver((entries, obs) => {
      entries.forEach(en => {
        if (!en.isIntersecting) return;
        en.target.classList.add('in');
        $$('.count', en.target).forEach(countUp);
        if (en.target.classList.contains('count')) countUp(en.target);
        obs.unobserve(en.target);
      });
    }, { threshold: .15, rootMargin: '0px 0px -40px' });
    $$('.reveal, .stats-strip').forEach(e => io.observe(e));
  }

  /* ── הגרלה ── */
  function randomSnack() {
    const pool = SNACKS.filter(matches);
    if (!pool.length) { toast('אין חטיף שמתאים לסינון הנוכחי'); return; }
    const s = pool[Math.floor(Math.random() * pool.length)];
    const el = $('#snack-' + s.id);
    if (!el) return;
    el.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'center' });
    el.classList.remove('hit');
    void el.offsetWidth;
    el.classList.add('hit');
    toast('היום מגיע לכם ' + s.name + ' ' + s.emoji);
  }

  /* ── אירועים ── */
  function bind() {
    $('#chips').addEventListener('click', e => {
      const b = e.target.closest('[data-cat]');
      if (!b) return;
      filter = b.dataset.cat;
      renderChips();
      renderGrid();
    });

    $('#q').addEventListener('input', e => { query = e.target.value; renderGrid(); });

    $('#grid').addEventListener('click', e => {
      const f = e.target.closest('[data-fav]');
      if (f) toggleFav(f.dataset.fav);
    });

    $('#clearBtn').addEventListener('click', () => {
      filter = 'all'; query = ''; $('#q').value = '';
      renderChips(); renderGrid();
    });

    $('#randomBtn').addEventListener('click', randomSnack);

    $('#pollList').addEventListener('click', e => {
      const b = e.target.closest('[data-vote]');
      if (b) vote(b.dataset.vote);
    });

    $('#pollReset').addEventListener('click', () => {
      LS.del('vote'); renderPoll(); toast('ההצבעה בוטלה');
    });

    $('#clubForm').addEventListener('submit', e => {
      e.preventDefault();
      const input = $('#email');
      const ok = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(input.value.trim());
      input.classList.toggle('bad', !ok);
      if (!ok) { $('#clubNote').textContent = 'רגע — נראה שהאימייל לא תקין 🙃'; input.focus(); return; }
      $('#clubNote').textContent = 'נרשמתם! נתראה בשבוע הבא עם חטיף חדש 🎉';
      LS.set('club', input.value.trim());
      input.value = '';
      toast('ברוכים הבאים למועדון 🍿');
    });
  }

  /* ── הפעלה ── */
  $('#factCount').textContent = SNACKS.length;
  renderChips();
  renderGrid();
  renderMonth();
  renderPoll();
  bind();
  observe();
})();
