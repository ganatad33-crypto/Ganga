'use strict';
/* דוכן הכפל — משחק ירי בברווזים לתרגול לוח הכפל.
 * הרעיון: ברווזים שטים בבריכה, כל אחד נושא מספר. למעלה מוצג תרגיל כפל.
 * לוחצים על הברווז עם התשובה הנכונה. הרמה עולה ויורדת אוטומטית לפי הפגיעות. */

// ===== DOM refs =====
const stage = document.getElementById('stage');
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const qAEl = document.getElementById('qA');
const qBEl = document.getElementById('qB');
const questionBox = document.getElementById('questionBox');
const qsignEl = questionBox.querySelector('.qsign');
const scoreEl = document.getElementById('scoreVal');
const levelEl = document.getElementById('levelVal');
const streakRow = document.getElementById('streakRow');
const toastEl = document.getElementById('toast');
const levelUpEl = document.getElementById('levelUp');
const soundBtn = document.getElementById('soundBtn');
const restartBtn = document.getElementById('restartBtn');
const startOverlay = document.getElementById('startOverlay');
const startBtn = document.getElementById('startBtn');
const settingsBtn = document.getElementById('settingsBtn');
const settingsOverlay = document.getElementById('settingsOverlay');
const settingsClose = document.getElementById('settingsClose');
const settingsSave = document.getElementById('settingsSave');
const goalMinus = document.getElementById('goalMinus');
const goalPlus = document.getElementById('goalPlus');
const goalVal = document.getElementById('goalVal');
const shareBtn = document.getElementById('shareBtn');
const shareBtnBig = document.getElementById('shareBtnBig');
const nameInput = document.getElementById('nameInput');
const bossBanner = document.getElementById('bossBanner');
const bossHeartsEl = document.getElementById('bossHearts');
const badgeShelf = document.getElementById('badgeShelf');

// ===== persistence =====
// רק העדפות (צליל, סף עלייה ברמה, שם השחקן) נשמרות בין ביקורים — לא ניקוד/רמה/הישגים.
// כל מי שפותח את הקישור, כולל מי ששלח אותו, מתחיל תמיד ממשחק חדש לגמרי.
const LS = {
  sound: 'duckhunt.sound', streakGoal: 'duckhunt.streakGoal', name: 'duckhunt.name'
};
// גישה בטוחה ל-localStorage — בדפדפנים/מצבים מסוימים (למשל דפדפן פנימי של אפליקציה,
// גלישה פרטית) הגישה עצמה יכולה לזרוק שגיאה; לא רוצים שזה יפיל את כל המשחק.
function safeGet(key) { try { return localStorage.getItem(key); } catch (e) { return null; } }
function safeSet(key, val) { try { localStorage.setItem(key, val); return true; } catch (e) { return false; } }
function loadNum(key, def) { const v = parseInt(safeGet(key), 10); return Number.isFinite(v) ? v : def; }
function persist() {
  safeSet(LS.streakGoal, String(state.streakGoal));
}

// ===== game state =====
const state = {
  score: 0,
  level: 1,
  // כמה תשובות נכונות ברצף צריך כדי לעלות רמה — ניתן לשינוי ע"י המשתמש בהגדרות
  streakGoal: clamp(loadNum(LS.streakGoal, 3), 1, 10),
  correctStreak: 0,
  wrongStreak: 0,
  muted: safeGet(LS.sound) === '0',
  started: false,
  playerName: safeGet(LS.name) || '',
  bestStreak: 0,
  totalCorrect: 0,
  tableCorrect: {}, // {2: 5, 7: 3, ...} כמה פעמים ענה נכון על כל לוח, בסיבוב הזה
  weakFacts: new Map(), // תרגילים שטעה בהם לאחרונה — עולים בעדיפות עד שמצליח בהם שוב
  badgesEarned: new Set(),
  bossActive: false,
  bossHitsNeeded: 0,
  bossesDefeated: 0,
};

let question = { a: 2, b: 2, answer: 4 };
let ducks = [];
let particles = [];
let logicalW = 300, logicalH = 400;
let lastTs = 0;
let pointer = { x: null, y: null };
let shots = []; // muzzle/impact flash effects
let gunRecoil = 0;
let pendingTimers = [];
let duckIdSeq = 1;

const COLORS = ['#f4c542', '#f28c28', '#5ac8fa', '#8ee06f', '#ff7fa8', '#c9a0ff'];
const BOSS_COLORS = ['#7a1f3d', '#3a1f5c', '#1f3a5c', '#5c1f1f', '#402060'];
function factKey(a, b) { const lo = Math.min(a, b), hi = Math.max(a, b); return lo + 'x' + hi; }
function say(phrase) { return (state.playerName ? state.playerName + ', ' : '') + phrase; }

// ===== utils =====
function randInt(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }
function pick(arr) { return arr[randInt(0, arr.length - 1)]; }
function shuffle(arr) { const a = arr.slice(); for (let i = a.length - 1; i > 0; i--) { const j = randInt(0, i);[a[i], a[j]] = [a[j], a[i]]; } return a; }
function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }
function schedule(fn, ms) { const id = setTimeout(fn, ms); pendingTimers.push(id); return id; }
function clearTimers() { pendingTimers.forEach(clearTimeout); pendingTimers = []; }

// ===== audio (WebAudio, ללא קבצים חיצוניים) =====
let actx = null;
function ensureAudio() {
  try {
    if (!actx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (AC) actx = new AC();
    }
    if (actx && actx.state === 'suspended') actx.resume();
  } catch (e) { /* אודיו לא זמין בדפדפן הזה — המשחק ימשיך בלי צלילים */ }
}
function tone(freq, dur, type, delay, vol) {
  if (state.muted || !actx) return;
  try {
  const t0 = actx.currentTime + (delay || 0);
  const osc = actx.createOscillator();
  const gain = actx.createGain();
  osc.type = type || 'sine';
  osc.frequency.setValueAtTime(freq, t0);
  gain.gain.setValueAtTime(0, t0);
  gain.gain.linearRampToValueAtTime(vol == null ? 0.15 : vol, t0 + 0.015);
  gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  osc.connect(gain).connect(actx.destination);
  osc.start(t0); osc.stop(t0 + dur + 0.03);
  } catch (e) { /* לא נורא, פשוט בלי הצליל הזה */ }
}
const sfx = {
  shoot() { tone(120, 0.05, 'square', 0, 0.10); },
  splash() { tone(200, 0.12, 'sine', 0, 0.05); },
  correct() { tone(523.25, 0.11, 'triangle', 0, 0.16); tone(659.25, 0.11, 'triangle', 0.08, 0.16); tone(880, 0.18, 'triangle', 0.16, 0.18); },
  wrong() { tone(220, 0.15, 'sawtooth', 0, 0.10); tone(160, 0.2, 'sawtooth', 0.1, 0.10); },
  levelUp() {
    tone(523, 0.1, 'triangle', 0, 0.16); tone(659, 0.1, 'triangle', 0.1, 0.16);
    tone(784, 0.1, 'triangle', 0.2, 0.16); tone(1046, 0.32, 'triangle', 0.3, 0.22);
    tone(784, 0.18, 'sine', 0.32, 0.14); tone(1318, 0.35, 'triangle', 0.34, 0.16);
  },
  levelDown() { tone(392, 0.16, 'sine', 0, 0.10); tone(311, 0.22, 'sine', 0.12, 0.10); },
  tick() { tone(500, 0.05, 'square', 0, 0.08); },
};

// ===== difficulty model =====
// אין תקרה למספר הרמה עצמו (מדד גאווה/הישג) — אבל הקושי בפועל (מהירות, מספר ברווזים,
// חדות המסיחים) מתייצב סביב רמה 20, כדי שגם מי שמטפס גבוה מאוד ישאר במשחק שאפשר לשחק בו.
function levelTables(level) {
  if (level <= 3) return [1, 2, 5, 10];
  if (level <= 6) return [1, 2, 3, 4, 5, 10];
  if (level <= 9) return [1, 2, 3, 4, 5, 6, 7, 10];
  return [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
}
function duckCountForLevel(level) { return clamp(3 + Math.floor((level - 1) / 3), 3, 8); }
function speedFactorForLevel(level) { const capped = Math.min(level, 20); return 1 + (capped - 1) * 0.07; }
function distractorSharpness(level) { return level >= 15 ? 'close' : (level >= 8 ? 'mid' : 'wide'); }

function generateQuestion() {
  // עדיפות לתרגילים שהילד טעה בהם לאחרונה בסיבוב הזה — עד שהוא חוזר ומצליח בהם
  if (state.weakFacts.size && Math.random() < 0.55) {
    const f = pick(Array.from(state.weakFacts.values()));
    return { a: f.a, b: f.b, answer: f.a * f.b };
  }
  const tables = levelTables(state.level);
  const a = pick(tables);
  const b = randInt(1, 10);
  return { a, b, answer: a * b };
}

function generateDistractors(q, count, exclude) {
  const used = new Set(exclude || []);
  used.add(q.answer);
  const out = [];
  const sharp = distractorSharpness(state.level);
  const candidates = shuffle([
    () => q.a * (q.b + 1),
    () => q.a * (q.b - 1),
    () => (q.a + 1) * q.b,
    () => (q.a - 1 > 0 ? (q.a - 1) * q.b : q.a * (q.b + 2)),
    () => q.a * (q.b + 2),
    () => (q.a + 2) * q.b,
    () => q.answer + (Math.random() < 0.5 ? -1 : 1) * randInt(1, sharp === 'close' ? 4 : (sharp === 'mid' ? 6 : 9)),
    () => q.answer + (Math.random() < 0.5 ? -1 : 1) * randInt(2, 12),
  ]);
  let guard = 0;
  while (out.length < count && guard < 60) {
    guard++;
    for (const fn of candidates) {
      if (out.length >= count) break;
      const v = fn();
      if (Number.isFinite(v) && v > 0 && v <= 121 && !used.has(v)) {
        used.add(v); out.push(v);
      }
    }
  }
  // מילוי בטוח אם עדיין חסר
  while (out.length < count) {
    const v = clamp(q.answer + randInt(-15, 15), 1, 121);
    if (!used.has(v)) { used.add(v); out.push(v); }
  }
  return out;
}

// ===== ducks =====
function poolBounds() {
  return { top: logicalH * 0.40, bottom: logicalH * 0.92 };
}
function spawnDucks(q) {
  const count = duckCountForLevel(state.level);
  const values = shuffle([q.answer, ...generateDistractors(q, count - 1, [])]);
  const { top, bottom } = poolBounds();
  const margin = 44;
  ducks = values.map((val, i) => {
    const lane = (i + 0.5) * ((bottom - top) / count);
    const baseY = top + lane + randInt(-6, 6);
    const dir = Math.random() < 0.5 ? -1 : 1;
    const speed = (46 + randInt(0, 34)) * speedFactorForLevel(state.level);
    return {
      id: duckIdSeq++,
      x: randInt(margin, Math.max(margin + 1, logicalW - margin)),
      baseY, y: baseY,
      vx: speed * dir,
      facing: dir,
      phase: Math.random() * Math.PI * 2,
      bobFreq: 2 + Math.random(),
      amp: 6 + Math.random() * 5,
      val, isCorrect: val === q.answer,
      color: pick(COLORS),
      state: 'alive', // alive | hit | wrong | gone
      t0: 0,
      isBoss: false,
    };
  });
  // בסיבוב בוס כל הברווזים מקבלים "עור" מיוחד (לא רק הנכון — כדי לא לחשוף את התשובה)
  if (state.bossActive) {
    for (const d of ducks) { d.color = pick(BOSS_COLORS); d.isBoss = true; d.vx *= 0.85; }
  }
}
function respawnSingleDuck(duck) {
  if (!ducks.includes(duck)) return;
  const others = ducks.filter(d => d !== duck).map(d => d.val);
  const [v] = generateDistractors(question, 1, others);
  duck.val = v;
  duck.isCorrect = v === question.answer;
  duck.state = 'alive';
}

// ===== particles =====
function burst(x, y, colors, count, spread) {
  for (let i = 0; i < count; i++) {
    const ang = Math.random() * Math.PI * 2;
    const spd = (spread || 90) * (0.4 + Math.random() * 0.8);
    particles.push({
      x, y, vx: Math.cos(ang) * spd, vy: Math.sin(ang) * spd - 40,
      g: 220, life: 0.6 + Math.random() * 0.4, age: 0,
      r: 2 + Math.random() * 3, color: pick(colors),
    });
  }
}
function floatText(x, y, text, color) {
  particles.push({ x, y, vx: 0, vy: -38, g: 0, life: 0.9, age: 0, text, color: color || '#173047', isText: true });
}
const CONFETTI_COLORS = ['#f4c542', '#f28c28', '#5ac8fa', '#8ee06f', '#ff7fa8', '#c9a0ff', '#ffffff'];
function confettiBurst() {
  for (let i = 0; i < 48; i++) {
    particles.push({
      x: Math.random() * logicalW, y: -20 - Math.random() * 80,
      vx: (Math.random() - 0.5) * 100, vy: 70 + Math.random() * 90,
      g: 70, life: 1.6 + Math.random() * 0.9, age: 0,
      rot: Math.random() * Math.PI * 2, vrot: (Math.random() - 0.5) * 9,
      w: 6 + Math.random() * 5, h: 9 + Math.random() * 6,
      color: pick(CONFETTI_COLORS), isConfetti: true,
    });
  }
}

// ===== UI helpers =====
let toastTimer = null;
function showToast(text, dur) {
  toastEl.textContent = text;
  toastEl.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toastEl.classList.remove('show'), dur || 1100);
}
function showLevelUp(big, small) {
  levelUpEl.innerHTML = `<div class="big">${big}</div><div class="small">${small}</div>`;
  levelUpEl.classList.remove('show');
  void levelUpEl.offsetWidth;
  levelUpEl.classList.add('show');
}
function updateHUD() {
  scoreEl.textContent = state.score;
  levelEl.textContent = state.level;
}
function updateStreakDots() {
  streakRow.innerHTML = '';
  for (let i = 0; i < state.streakGoal; i++) {
    const d = document.createElement('span');
    d.className = 'dot' + (i < state.correctStreak ? ' on' : '');
    d.textContent = '⭐';
    streakRow.appendChild(d);
  }
}
function pulseQuestion() {
  qsignEl.classList.remove('pulse');
  void qsignEl.offsetWidth;
  qsignEl.classList.add('pulse');
}
function renderBossBanner() {
  if (state.bossActive) {
    bossBanner.classList.add('show');
    bossHeartsEl.textContent = '❤️'.repeat(Math.max(0, state.bossHitsNeeded));
  } else {
    bossBanner.classList.remove('show');
  }
}

// ===== הישגים (לסיבוב הנוכחי בלבד) =====
const BADGES = [
  { id: 'first', emoji: '🥉', title: 'ברווז ראשון', check: s => s.totalCorrect >= 1 },
  { id: 'streak5', emoji: '🔥', title: 'רצף של 5', check: s => s.bestStreak >= 5 },
  { id: 'streak10', emoji: '🔥🔥', title: 'רצף של 10', check: s => s.bestStreak >= 10 },
  { id: 'boss1', emoji: '🏆', title: 'מנצח בוסים', check: s => s.bossesDefeated >= 1 },
  { id: 'level10', emoji: '⭐', title: 'רמה 10', check: s => s.level >= 10 },
  { id: 'level20', emoji: '🌟', title: 'רמה 20', check: s => s.level >= 20 },
  { id: 'score100', emoji: '💯', title: '100 נקודות', check: s => s.score >= 100 },
  { id: 'score500', emoji: '💎', title: '500 נקודות', check: s => s.score >= 500 },
];
for (let t = 1; t <= 10; t++) {
  BADGES.push({ id: 'table' + t, emoji: '👑', title: `אלוף לוח ה-${t}`, check: s => (s.tableCorrect[t] || 0) >= 6 });
}
function renderBadges() {
  badgeShelf.innerHTML = '';
  for (const b of BADGES) {
    const on = state.badgesEarned.has(b.id);
    const el = document.createElement('div');
    el.className = 'badgeTile' + (on ? ' on' : '');
    el.title = b.title;
    el.innerHTML = `<span class="ic">${b.emoji}</span><span>${b.title}</span>`;
    badgeShelf.appendChild(el);
  }
}
function checkBadges() {
  for (const b of BADGES) {
    if (!state.badgesEarned.has(b.id) && b.check(state)) {
      state.badgesEarned.add(b.id);
      showToast(say(`🏅 הישג חדש: ${b.title}!`), 1800);
      renderBadges();
    }
  }
}

const PRAISE = ['כל הכבוד! 🎉', 'מעולה! 👏', 'בול פגיעה! 🎯', 'אלוף! 🌟', 'יפה מאוד! 😄', 'ישר בול! 🦆'];
const TRY_AGAIN = ['כמעט! נסה שוב 🙂', 'לא נורא, עוד ניסיון 💪', 'קרוב מאוד! 🔁', 'שים לב לתרגיל למעלה 👀'];
const LEVEL_UP_TITLES = ['וואו!', 'מדהים!', 'איזה כישרון!', 'אש! 🔥', 'לא ייאמן!', 'כוכב עולה!', 'מכונה!', 'איזה גאון!'];
const LEVEL_UP_SUBS = [
  'הברווזים שוחים מהר יותר עכשיו!', 'עוד קצת ואי אפשר יהיה לעצור אותך!',
  'רמת האתגר עולה — בהצלחה!', 'תמשיך ככה ואתה שובר שיאים!', 'הידיים שלך על אש היום!',
];

// ===== round flow =====
function newQuestion() {
  question = generateQuestion();
  question.missedThisRound = false;
  qAEl.textContent = question.a;
  qBEl.textContent = question.b;
  pulseQuestion();
  spawnDucks(question);
}

function correctHit(duck) {
  duck.state = 'hit'; duck.t0 = performance.now();
  burst(duck.x, duck.y, ['#bfe8f5', '#ffffff', '#5ac8fa'], 14, 130);
  const gained = 10 + state.level * 2;
  floatText(duck.x, duck.y - 20, '+' + gained, '#2e7d46');
  sfx.correct();
  state.score += gained;
  state.totalCorrect++;
  state.tableCorrect[question.a] = (state.tableCorrect[question.a] || 0) + 1;
  // "נשלט" רק אם ענה נכון בלי טעות באמצע הסיבוב הזה — אחרת זה נשאר "חלש" ויחזור שוב מאוחר יותר
  if (!question.missedThisRound) state.weakFacts.delete(factKey(question.a, question.b));
  state.correctStreak++; state.wrongStreak = 0;
  state.bestStreak = Math.max(state.bestStreak, state.correctStreak);
  updateStreakDots(); updateHUD(); persist();

  let bossJustDefeated = false;
  if (state.bossActive) {
    state.bossHitsNeeded--;
    if (state.bossHitsNeeded <= 0) {
      state.bossActive = false;
      state.bossesDefeated++;
      bossJustDefeated = true;
      const bonus = 30 + state.level * 3;
      state.score += bonus;
      floatText(duck.x, duck.y - 42, '+' + bonus + ' 🏆', '#b8860b');
      sfx.levelUp();
      confettiBurst(); confettiBurst();
      showLevelUp('🏆 ניצחת את הבוס! 🏆', say('איזה כישרון!'));
      updateHUD();
    } else {
      showToast(say(`💥 פגיעה בבוס! עוד ${state.bossHitsNeeded}!`));
    }
    renderBossBanner();
  } else {
    showToast(say(pick(PRAISE)));
  }

  if (state.correctStreak >= state.streakGoal) {
    state.correctStreak = 0;
    state.level += 1;
    sfx.levelUp();
    if (!bossJustDefeated) {
      confettiBurst();
      showLevelUp(`🎉 ${say(pick(LEVEL_UP_TITLES))} רמה ${state.level}! 🎉`, pick(LEVEL_UP_SUBS));
    }
    updateStreakDots(); persist();
    if (state.level % 5 === 0 && !state.bossActive) {
      state.bossActive = true; state.bossHitsNeeded = 2;
      renderBossBanner();
    }
  }
  checkBadges();
  schedule(() => newQuestion(), 750);
}

function wrongHit(duck) {
  duck.state = 'wrong'; duck.t0 = performance.now();
  sfx.wrong();
  question.missedThisRound = true;
  state.weakFacts.set(factKey(question.a, question.b), { a: question.a, b: question.b });
  state.correctStreak = 0; state.wrongStreak++;
  updateStreakDots(); persist();
  if (state.bossActive) {
    state.bossHitsNeeded = 2;
    renderBossBanner();
    showToast(say('הבוס התחדש! 😤 נסה שוב'));
  } else {
    showToast(say(pick(TRY_AGAIN)));
  }
  if (state.wrongStreak >= 2) {
    state.wrongStreak = 0;
    if (state.level > 1) {
      state.level -= 1;
      sfx.levelDown();
      showToast(say('בואו ננסה קצת יותר לאט, אתה מצליח! 💪'), 1400);
    }
    persist();
  }
  schedule(() => respawnSingleDuck(duck), 550);
}

function missShot(x, y) {
  burst(x, y, ['#bfe8f5', '#ffffff'], 6, 70);
  sfx.splash();
}

// ===== rendering =====
function resizeCanvas() {
  const rect = stage.getBoundingClientRect();
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  logicalW = Math.max(1, rect.width);
  logicalH = Math.max(1, rect.height);
  canvas.width = Math.round(logicalW * dpr);
  canvas.height = Math.round(logicalH * dpr);
  canvas.style.width = logicalW + 'px';
  canvas.style.height = logicalH + 'px';
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}

function drawBackground(t) {
  // שמיים
  const sky = ctx.createLinearGradient(0, 0, 0, logicalH * 0.5);
  sky.addColorStop(0, '#8fd3ef'); sky.addColorStop(1, '#d8f2fa');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, logicalW, logicalH * 0.45);

  // עננים נעים
  ctx.fillStyle = 'rgba(255,255,255,.85)';
  for (let i = 0; i < 3; i++) {
    const cx = ((t * 8 + i * 160) % (logicalW + 160)) - 80;
    const cy = 20 + i * 22;
    cloud(cx, cy, 26 + i * 4);
  }

  // גדר עץ
  const fenceTop = logicalH * 0.36, fenceBot = poolBounds().top + 4;
  ctx.fillStyle = '#b5732f';
  ctx.fillRect(0, fenceTop, logicalW, fenceBot - fenceTop);
  ctx.strokeStyle = 'rgba(0,0,0,.15)'; ctx.lineWidth = 2;
  for (let x = -((t * 4) % 26); x < logicalW; x += 26) {
    ctx.beginPath(); ctx.moveTo(x, fenceTop); ctx.lineTo(x, fenceBot); ctx.stroke();
  }
  ctx.fillStyle = 'rgba(0,0,0,.12)';
  ctx.fillRect(0, fenceTop, logicalW, 4);

  // בריכה
  const { top, bottom } = poolBounds();
  const pond = ctx.createLinearGradient(0, top, 0, logicalH);
  pond.addColorStop(0, '#2f9fd0'); pond.addColorStop(1, '#1c6f9c');
  ctx.fillStyle = pond;
  ctx.fillRect(0, top, logicalW, logicalH - top);

  ctx.strokeStyle = 'rgba(255,255,255,.28)'; ctx.lineWidth = 2;
  for (let row = 0; row < 5; row++) {
    const y = top + 14 + row * ((bottom - top) / 5);
    ctx.beginPath();
    for (let x = 0; x <= logicalW; x += 10) {
      const yy = y + Math.sin(x * 0.05 + t * 1.6 + row) * 3;
      if (x === 0) ctx.moveTo(x, yy); else ctx.lineTo(x, yy);
    }
    ctx.stroke();
  }
}
function cloud(x, y, s) {
  ctx.beginPath();
  ctx.ellipse(x, y, s, s * 0.6, 0, 0, Math.PI * 2);
  ctx.ellipse(x + s * 0.7, y + s * 0.15, s * 0.7, s * 0.45, 0, 0, Math.PI * 2);
  ctx.ellipse(x - s * 0.6, y + s * 0.2, s * 0.55, s * 0.4, 0, 0, Math.PI * 2);
  ctx.fill();
}

// ציצית קטנה על הראש — צורה אחת, בשני גדלים (למתאר השחור ולצבע עצמו)
function tuftPath(c, e) {
  c.beginPath();
  c.moveTo(11 - e, -18 - e * 0.6);
  c.quadraticCurveTo(8 - e, -27 - e, 17, -31 - e);
  c.quadraticCurveTo(20 + e * 0.6, -24, 15 + e * 0.4, -16 + e * 0.3);
  c.closePath();
}
// מכהה/מבהיר צבע הקסה (hex) באחוז נתון — לשימוש בגוונים כמו הכנף
function shade(hex, percent) {
  const n = parseInt(hex.replace('#', ''), 16);
  const amt = Math.round(2.55 * percent);
  const r = clamp((n >> 16) + amt, 0, 255);
  const g = clamp(((n >> 8) & 0xff) + amt, 0, 255);
  const b = clamp((n & 0xff) + amt, 0, 255);
  return `rgb(${r},${g},${b})`;
}

function drawDuck(duck, t) {
  const hitAnim = duck.state === 'hit' ? clamp((performance.now() - duck.t0) / 600, 0, 1) : 0;
  const wrongAnim = duck.state === 'wrong' ? (performance.now() - duck.t0) / 400 : 0;
  ctx.save();
  const wiggle = duck.state === 'wrong' ? Math.sin(wrongAnim * 40) * 6 * Math.max(0, 1 - wrongAnim) : 0;
  ctx.translate(duck.x + wiggle, duck.y + hitAnim * 26);
  const scale = 1 - hitAnim * 0.5;
  ctx.globalAlpha = 1 - hitAnim;
  ctx.scale(duck.facing < 0 ? -scale : scale, scale);
  if (hitAnim > 0) ctx.rotate(hitAnim * 0.9);

  const OUT = '#171512'; // קו מתאר עבה בסגנון מדבקה, כמו הברווז שנשלח
  const skin = duck.color;

  // גל קטן מתחת
  ctx.fillStyle = 'rgba(255,255,255,.25)';
  ctx.beginPath(); ctx.ellipse(0, 22, 24, 5, 0, 0, Math.PI * 2); ctx.fill();

  // תת-שכבה שחורה מוגדלת — גוף + ראש + ציצית — יוצרת מתאר אחיד סביב הצללית המאוחדת
  ctx.fillStyle = OUT;
  ctx.beginPath(); ctx.ellipse(0, 6, 26, 18, 0, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(15, -9, 15, 0, Math.PI * 2); ctx.fill();
  tuftPath(ctx, 3); ctx.fill();

  // גוף + ראש + ציצית בצבע הברווז — מכסים את השחור פרט לטבעת המתאר החיצונית
  ctx.fillStyle = skin;
  ctx.beginPath(); ctx.ellipse(0, 6, 23, 15, 0, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(15, -9, 12, 0, Math.PI * 2); ctx.fill();
  tuftPath(ctx, 0); ctx.fill();

  // ברק פלסטיק
  ctx.fillStyle = 'rgba(255,255,255,.4)';
  ctx.beginPath(); ctx.ellipse(-3, -3, 12, 6, -0.35, 0, Math.PI * 2); ctx.fill();

  // כנף
  ctx.fillStyle = shade(skin, -16);
  ctx.strokeStyle = OUT; ctx.lineWidth = 2.2;
  ctx.beginPath(); ctx.ellipse(-4, 9, 12, 8, 0.25, 0, Math.PI * 2); ctx.fill(); ctx.stroke();

  // מקור — דו-גוני
  ctx.strokeStyle = OUT; ctx.lineWidth = 2.2; ctx.lineJoin = 'round';
  ctx.fillStyle = '#ffb238';
  ctx.beginPath();
  ctx.moveTo(25, -12); ctx.quadraticCurveTo(38, -15, 44, -8); ctx.quadraticCurveTo(36, -6, 25, -5);
  ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#e8871a';
  ctx.beginPath();
  ctx.moveTo(25, -5); ctx.quadraticCurveTo(35, -3, 43, -7); ctx.quadraticCurveTo(34, 1, 25, -1);
  ctx.closePath(); ctx.fill(); ctx.stroke();

  // עין
  ctx.fillStyle = '#fff'; ctx.strokeStyle = OUT; ctx.lineWidth = 2.2;
  ctx.beginPath(); ctx.arc(20, -13, 6, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#16305c';
  ctx.beginPath(); ctx.arc(22, -12, 3.6, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#fff';
  ctx.beginPath(); ctx.arc(23.3, -13.3, 1.2, 0, Math.PI * 2); ctx.fill();

  ctx.restore();

  if (hitAnim >= 1) return;
  // שלט מספר
  ctx.save();
  ctx.globalAlpha = 1 - hitAnim;
  ctx.translate(duck.x, duck.y - 44 + hitAnim * 26);
  const label = String(duck.val);
  const w = Math.max(34, 16 + label.length * 13);
  roundRect(ctx, -w / 2, -13, w, 26, 8);
  ctx.fillStyle = duck.isBoss ? '#fff0e6' : '#fff8ec';
  ctx.fill();
  ctx.lineWidth = 2.5; ctx.strokeStyle = duck.isBoss ? '#7a1f1f' : '#7d4b21'; ctx.stroke();
  ctx.fillStyle = '#173047';
  ctx.font = "800 17px Rubik, 'Heebo', sans-serif";
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(label, 0, 1);
  ctx.restore();
}
function roundRect(c, x, y, w, h, r) {
  c.beginPath();
  c.moveTo(x + r, y);
  c.arcTo(x + w, y, x + w, y + h, r);
  c.arcTo(x + w, y + h, x, y + h, r);
  c.arcTo(x, y + h, x, y, r);
  c.arcTo(x, y, x + w, y, r);
  c.closePath();
}

function drawParticles(dt) {
  particles = particles.filter(p => p.age < p.life);
  for (const p of particles) {
    p.age += dt;
    p.vy += (p.g || 0) * dt;
    p.x += p.vx * dt; p.y += p.vy * dt;
    if (p.isConfetti) p.rot += p.vrot * dt;
    // הקונפטי דוהה רק לקראת הסוף — ככה הוא נשאר בהיר ושמח רוב הזמן שהוא נופל
    const a = p.isConfetti ? clamp((p.life - p.age) / 0.5, 0, 1) : clamp(1 - p.age / p.life, 0, 1);
    ctx.save();
    ctx.globalAlpha = a;
    if (p.isText) {
      ctx.fillStyle = p.color;
      ctx.font = "800 16px Rubik, 'Heebo', sans-serif";
      ctx.textAlign = 'center';
      ctx.fillText(p.text, p.x, p.y);
    } else if (p.isConfetti) {
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      ctx.fillStyle = p.color;
      ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
    } else {
      ctx.fillStyle = p.color;
      ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();
  }
}

function drawGunAndCrosshair() {
  const gx = logicalW / 2, gy = logicalH - 34;
  const tx = pointer.x == null ? gx : pointer.x;
  const ty = pointer.y == null ? gy - 120 : pointer.y;
  const ang = Math.atan2(ty - gy, tx - gx);

  ctx.save();
  ctx.translate(gx, gy);
  ctx.rotate(ang + Math.PI / 2);
  const rec = gunRecoil * 6;
  ctx.translate(0, rec);
  // קת עץ
  ctx.fillStyle = '#6b4020';
  ctx.strokeStyle = '#3d2410'; ctx.lineWidth = 2;
  roundRect(ctx, -11, 4, 22, 30, 7); ctx.fill(); ctx.stroke();
  // הדק
  ctx.strokeStyle = '#3d2410'; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.arc(0, 16, 6, 0.2, Math.PI * 1.6); ctx.stroke();
  // קנה מתכת
  const bg = ctx.createLinearGradient(-6, 0, 6, 0);
  bg.addColorStop(0, '#8b939a'); bg.addColorStop(0.5, '#eef2f4'); bg.addColorStop(1, '#6b7378');
  ctx.fillStyle = bg;
  ctx.strokeStyle = '#3a3f43'; ctx.lineWidth = 1.5;
  roundRect(ctx, -6, -62, 12, 68, 5); ctx.fill(); ctx.stroke();
  // פס אדום קרנבלי
  ctx.fillStyle = '#e0483e';
  ctx.fillRect(-6, -16, 12, 6);
  // קצה הקנה
  ctx.fillStyle = '#2b2b2b';
  ctx.beginPath(); ctx.ellipse(0, -62, 6, 3, 0, 0, Math.PI * 2); ctx.fill();
  ctx.restore();

  if (pointer.x != null) {
    ctx.save();
    ctx.translate(pointer.x, pointer.y);
    ctx.strokeStyle = 'rgba(255,255,255,.9)'; ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.arc(0, 0, 20, 0, Math.PI * 2); ctx.stroke();
    ctx.strokeStyle = 'rgba(224,72,62,.9)'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(-26, 0); ctx.lineTo(-10, 0); ctx.moveTo(10, 0); ctx.lineTo(26, 0);
    ctx.moveTo(0, -26); ctx.lineTo(0, -10); ctx.moveTo(0, 10); ctx.lineTo(0, 26);
    ctx.stroke();
    ctx.restore();
  }

  // אפקטי ירי
  const now = performance.now();
  shots = shots.filter(s => now - s.t < 260);
  for (const s of shots) {
    const p = (now - s.t) / 260;
    ctx.save();
    ctx.globalAlpha = 1 - p;
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(s.x, s.y, 8 + p * 26, 0, Math.PI * 2); ctx.stroke();
    ctx.restore();
  }
}

function update(dt, t) {
  const margin = 44;
  for (const d of ducks) {
    if (d.state === 'gone') continue;
    if (d.state === 'alive') {
      d.x += d.vx * dt;
      if (d.x < margin) { d.x = margin; d.vx = Math.abs(d.vx); d.facing = 1; }
      if (d.x > logicalW - margin) { d.x = logicalW - margin; d.vx = -Math.abs(d.vx); d.facing = -1; }
      d.y = d.baseY + Math.sin(t * d.bobFreq + d.phase) * d.amp;
    }
    if (d.state === 'hit' && performance.now() - d.t0 > 620) d.state = 'gone';
  }
  gunRecoil = Math.max(0, gunRecoil - dt * 4);
}

function render(t) {
  ctx.clearRect(0, 0, logicalW, logicalH);
  drawBackground(t);
  for (const d of ducks) if (d.state !== 'gone') drawDuck(d, t);
  drawParticles(1 / 60);
  drawGunAndCrosshair();
}

function loop(ts) {
  if (!lastTs) lastTs = ts;
  const dt = Math.min((ts - lastTs) / 1000, 0.05);
  lastTs = ts;
  const t = ts / 1000;
  if (state.started) update(dt, t);
  render(t);
  requestAnimationFrame(loop);
}

// ===== input =====
function canvasPoint(e) {
  const rect = canvas.getBoundingClientRect();
  return { x: e.clientX - rect.left, y: e.clientY - rect.top };
}
function onPointerMove(e) {
  const p = canvasPoint(e);
  pointer.x = p.x; pointer.y = p.y;
}
function fireShot(x, y) {
  if (!state.started) return;
  gunRecoil = 1;
  shots.push({ x, y, t: performance.now() });
  sfx.shoot();
  let best = null, bestDist = Infinity;
  for (const d of ducks) {
    if (d.state !== 'alive') continue;
    const dx = x - d.x, dy = y - (d.y - 6);
    const dist = Math.hypot(dx, dy);
    if (dist < 42 && dist < bestDist) { best = d; bestDist = dist; }
  }
  if (best) {
    if (best.isCorrect) correctHit(best); else wrongHit(best);
  } else {
    missShot(x, y);
  }
}
function onPointerDown(e) {
  e.preventDefault();
  ensureAudio();
  const p = canvasPoint(e);
  pointer.x = p.x; pointer.y = p.y;
  fireShot(p.x, p.y);
}

canvas.addEventListener('pointerdown', onPointerDown);
canvas.addEventListener('pointermove', onPointerMove);
window.addEventListener('resize', resizeCanvas);
window.addEventListener('orientationchange', () => setTimeout(resizeCanvas, 200));

// ===== controls =====
soundBtn.addEventListener('click', () => {
  state.muted = !state.muted;
  soundBtn.textContent = state.muted ? '🔇' : '🔊';
  safeSet(LS.sound, state.muted ? '0' : '1');
  if (!state.muted) ensureAudio();
});
restartBtn.addEventListener('click', () => {
  clearTimers();
  state.score = 0; state.level = 1; state.correctStreak = 0; state.wrongStreak = 0;
  state.bestStreak = 0; state.totalCorrect = 0; state.tableCorrect = {};
  state.weakFacts.clear(); state.badgesEarned.clear();
  state.bossActive = false; state.bossHitsNeeded = 0; state.bossesDefeated = 0;
  updateHUD(); updateStreakDots(); renderBossBanner(); renderBadges(); persist();
  showToast(say('מתחילים מחדש! 🔄'));
  newQuestion();
});
startBtn.addEventListener('click', () => {
  state.playerName = nameInput.value.trim().slice(0, 12);
  safeSet(LS.name, state.playerName);
  ensureAudio();
  startOverlay.classList.add('hidden');
  state.started = true;
  newQuestion();
});

function renderGoalVal() { goalVal.textContent = state.streakGoal; }
function closeSettings() { settingsOverlay.classList.add('hidden'); }
settingsBtn.addEventListener('click', () => {
  renderGoalVal();
  settingsOverlay.classList.remove('hidden');
});
settingsClose.addEventListener('click', closeSettings);
settingsSave.addEventListener('click', closeSettings);
goalMinus.addEventListener('click', () => {
  state.streakGoal = clamp(state.streakGoal - 1, 1, 10);
  renderGoalVal(); updateStreakDots(); persist(); sfx.tick();
});
goalPlus.addEventListener('click', () => {
  state.streakGoal = clamp(state.streakGoal + 1, 1, 10);
  renderGoalVal(); updateStreakDots(); persist(); sfx.tick();
});

// שיתוף — פותח את תפריט השיתוף המובנה של הטלפון (וואטסאפ וכו') כשזמין,
// ואם לא, מעתיק את הקישור ללוח כדי שאפשר יהיה להדביק אותו
async function doShare() {
  const text = state.score > 0
    ? `אני ברמה ${state.level} עם ${state.score} נקודות במשחק דוכן הכפל! בואו לשחק גם אתם 🦆🎯`
    : 'בואו לשחק דוכן הכפל — משחק כיפי לתרגול לוח הכפל! 🦆🎯';
  const shareData = { title: '🦆 דוכן הכפל', text, url: location.href };
  if (navigator.share) {
    try { await navigator.share(shareData); return; }
    catch (e) { if (e && e.name === 'AbortError') return; /* בוטל ע"י המשתמש — לא נורא */ }
  }
  try {
    await navigator.clipboard.writeText(location.href);
    showToast('הקישור הועתק! 📋 אפשר להדביק בקבוצה', 1800);
  } catch (e2) {
    window.prompt('העתיקו את הקישור ושתפו:', location.href);
  }
}
shareBtn.addEventListener('click', doShare);
shareBtnBig.addEventListener('click', doShare);

// ===== init =====
soundBtn.textContent = state.muted ? '🔇' : '🔊';
nameInput.value = state.playerName;
updateHUD();
updateStreakDots();
renderBossBanner();
renderBadges();
resizeCanvas();
requestAnimationFrame(loop);
