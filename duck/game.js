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
const coinVal = document.getElementById('coinVal');
const shopBtn = document.getElementById('shopBtn');
const parentBtn = document.getElementById('parentBtn');
const shopOverlay = document.getElementById('shopOverlay');
const shopClose = document.getElementById('shopClose');
const gunSkinShelf = document.getElementById('gunSkinShelf');
const crosshairSkinShelf = document.getElementById('crosshairSkinShelf');
const parentOverlay = document.getElementById('parentOverlay');
const parentClose = document.getElementById('parentClose');
const parentStats = document.getElementById('parentStats');
const resetProfileBtn = document.getElementById('resetProfileBtn');

// ===== persistence =====
// שני סוגי נתונים נשמרים בין ביקורים, שניהם רק על המכשיר הזה (לא בענן, לא משותף):
// 1) העדפות (צליל, סף עלייה ברמה, שם) — כמו קודם.
// 2) "פרופיל" ארוך-טווח (מטבעות, סקינים, נתוני תרגול, שיא רמה) — חדש בשלב הזה.
// ניקוד/רמה/הישגי-הסיבוב עדיין מתאפסים בכל כניסה — זה לא השתנה.
const LS = {
  sound: 'duckhunt.sound', streakGoal: 'duckhunt.streakGoal', name: 'duckhunt.name',
  coins: 'duckhunt.coins', coinsEarned: 'duckhunt.coinsEarned',
  highestLevel: 'duckhunt.highestLevel', gunSkin: 'duckhunt.gunSkin', crosshairSkin: 'duckhunt.crosshairSkin',
  ownedGuns: 'duckhunt.ownedGuns', ownedCrosshairs: 'duckhunt.ownedCrosshairs',
  factStats: 'duckhunt.factStats', totalPlayMs: 'duckhunt.totalPlayMs',
  totalCorrectAll: 'duckhunt.totalCorrectAll', totalWrongAll: 'duckhunt.totalWrongAll',
  badgesLifetime: 'duckhunt.badgesLifetime',
};
// גישה בטוחה ל-localStorage — בדפדפנים/מצבים מסוימים (למשל דפדפן פנימי של אפליקציה,
// גלישה פרטית) הגישה עצמה יכולה לזרוק שגיאה; לא רוצים שזה יפיל את כל המשחק.
function safeGet(key) { try { return localStorage.getItem(key); } catch (e) { return null; } }
function safeSet(key, val) { try { localStorage.setItem(key, val); return true; } catch (e) { return false; } }
function loadNum(key, def) { const v = parseInt(safeGet(key), 10); return Number.isFinite(v) ? v : def; }
function loadJSON(key, def) { try { const v = JSON.parse(safeGet(key)); return v && typeof v === 'object' ? v : def; } catch (e) { return def; } }
function loadArr(key) { try { const v = JSON.parse(safeGet(key)); return Array.isArray(v) ? v : []; } catch (e) { return []; } }
function persist() {
  safeSet(LS.streakGoal, String(state.streakGoal));
}

// ===== פרופיל ארוך-טווח (נשמר על המכשיר הזה בין ביקורים) =====
const profile = {
  coins: loadNum(LS.coins, 0),
  coinsEarned: loadNum(LS.coinsEarned, 0), // מונוטוני — לא יורד כשקונים, לצורך הישגים
  highestLevel: loadNum(LS.highestLevel, 1),
  gunSkin: safeGet(LS.gunSkin) || 'classic',
  crosshairSkin: safeGet(LS.crosshairSkin) || 'classic',
  ownedGuns: loadArr(LS.ownedGuns).length ? loadArr(LS.ownedGuns) : ['classic'],
  ownedCrosshairs: loadArr(LS.ownedCrosshairs).length ? loadArr(LS.ownedCrosshairs) : ['classic'],
  factStats: loadJSON(LS.factStats, {}), // {"axb": {seen,correct,wrong}} — לאורך זמן, לא רק הסיבוב הזה
  totalPlayMs: loadNum(LS.totalPlayMs, 0),
  totalCorrectAll: loadNum(LS.totalCorrectAll, 0),
  totalWrongAll: loadNum(LS.totalWrongAll, 0),
  badgesLifetime: new Set(loadArr(LS.badgesLifetime)),
};
function persistProfile() {
  safeSet(LS.coins, String(profile.coins));
  safeSet(LS.coinsEarned, String(profile.coinsEarned));
  safeSet(LS.highestLevel, String(profile.highestLevel));
  safeSet(LS.gunSkin, profile.gunSkin);
  safeSet(LS.crosshairSkin, profile.crosshairSkin);
  safeSet(LS.ownedGuns, JSON.stringify(profile.ownedGuns));
  safeSet(LS.ownedCrosshairs, JSON.stringify(profile.ownedCrosshairs));
  safeSet(LS.factStats, JSON.stringify(profile.factStats));
  safeSet(LS.totalPlayMs, String(profile.totalPlayMs));
  safeSet(LS.totalCorrectAll, String(profile.totalCorrectAll));
  safeSet(LS.totalWrongAll, String(profile.totalWrongAll));
  safeSet(LS.badgesLifetime, JSON.stringify(Array.from(profile.badgesLifetime)));
}
function recordFactResult(a, b, correct) {
  const k = factKey(a, b);
  const s = profile.factStats[k] || { seen: 0, correct: 0, wrong: 0 };
  s.seen++; if (correct) s.correct++; else s.wrong++;
  profile.factStats[k] = s;
}
function resetProfile() {
  profile.coins = 0; profile.coinsEarned = 0; profile.highestLevel = 1;
  profile.gunSkin = 'classic'; profile.crosshairSkin = 'classic';
  profile.ownedGuns = ['classic']; profile.ownedCrosshairs = ['classic'];
  profile.factStats = {}; profile.totalPlayMs = 0;
  profile.totalCorrectAll = 0; profile.totalWrongAll = 0;
  profile.badgesLifetime.clear();
  persistProfile();
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
let goldenDuck = null; // "מטרת בונוס" נפרדת — לא קשורה לתשובה של התרגיל

const COLORS = ['#f4c542', '#f28c28', '#5ac8fa', '#8ee06f', '#ff7fa8', '#c9a0ff'];
const BOSS_COLORS = ['#7a1f3d', '#3a1f5c', '#1f3a5c', '#5c1f1f', '#402060'];
function factKey(a, b) { const lo = Math.min(a, b), hi = Math.max(a, b); return lo + 'x' + hi; }
function say(phrase) { return (state.playerName ? state.playerName + ', ' : '') + phrase; }

// ===== עולמות — כל 10 רמות משנים תפאורה (קוסמטי בלבד, לא משפיע על הקושי) =====
const WORLDS = [
  { name: 'בריכת הכפר', sky: ['#8fd3ef', '#d8f2fa'], pond: ['#4fc3e8', '#2f9fd0', '#164e73'], fence: '#b5732f', night: false, ducks: COLORS, skyline: 'hills', glow: '#fff6c8', hill: '#6fb56a' },
  { name: 'חוף פיראטים', sky: ['#ffd98a', '#fff3d6'], pond: ['#3fc4b0', '#1f9e8f', '#0a3e39'], fence: '#8a5a2b', night: false, ducks: ['#f4c542', '#e0483e', '#3aa65b', '#f28c28', '#5ac8fa', '#8b4a2b'], skyline: 'hills', glow: '#fff0c0', hill: '#c9a866' },
  { name: 'ביצת התנינים', sky: ['#8fbf7a', '#d9e8c9'], pond: ['#5c9a4c', '#4a7c3f', '#1c3117'], fence: '#5a4a2b', night: false, ducks: ['#7bb661', '#c9a227', '#8e6b3a', '#4a7c3f', '#b5732f', '#6b8f3a'], skyline: 'hills', glow: '#eaffd0', hill: '#3f6b35' },
  { name: 'עיר הניאון', sky: ['#1a0b2e', '#3a1a5c'], pond: ['#1c3a6b', '#0f2545', '#050b1a'], fence: '#2e1a4a', night: true, ducks: ['#ff2fd0', '#2fe6ff', '#c6ff2f', '#ff5c2f', '#7a2fff', '#2fffb0'], skyline: 'buildings', glow: '#dcefff', hill: '#160b2a' },
  { name: 'החלל', sky: ['#04041a', '#161033'], pond: ['#1c3a6b', '#0a1a3a', '#03060f'], fence: '#2a2450', night: true, ducks: ['#c9c9ff', '#8ee0ff', '#ffb3e6', '#b3ffcf', '#ffe08a', '#c9a0ff'], skyline: 'craters', glow: '#eaeaff', hill: '#0c0a24' },
  { name: 'ממלכת הדרקון', sky: ['#3a0f0f', '#6b1f1f'], pond: ['#5c1414', '#1c0a0a', '#070303'], fence: '#4a1a0a', night: true, ducks: ['#ff5c2f', '#ffd23f', '#c9302c', '#7a1f1f', '#f28c28', '#8b2020'], skyline: 'peaks', glow: '#ffd8a8', hill: '#2a0d0d' },
];
function worldIndexForLevel(level) { return clamp(Math.floor((level - 1) / 3), 0, WORLDS.length - 1); }
function currentWorld() { return WORLDS[worldIndexForLevel(state.level)]; }

// ===== סקינים לרובה ולכוונת — קוסמטיים בלבד, נקנים במטבעות =====
const GUN_SKINS = [
  { id: 'classic', name: 'קלאסי', price: 0, stock: '#6b4020', barrel1: '#8b939a', barrel2: '#eef2f4', barrel3: '#6b7378', band: '#e0483e' },
  { id: 'pirate', name: 'תותח פיראטים', price: 20, stock: '#2a1a0a', barrel1: '#4a3a2a', barrel2: '#c9a227', barrel3: '#2a1a0a', band: '#e0483e' },
  { id: 'laser', name: 'לייזר', price: 35, stock: '#1a2a3a', barrel1: '#0e8fa0', barrel2: '#eafffe', barrel3: '#0e8fa0', band: '#2fe6ff' },
  { id: 'gold', name: 'רובה זהב', price: 60, stock: '#6b4020', barrel1: '#a8790a', barrel2: '#fff3c4', barrel3: '#a8790a', band: '#f0c419' },
];
const CROSSHAIR_SKINS = [
  { id: 'classic', name: 'קלאסי', price: 0, color: 'rgba(255,255,255,.9)' },
  { id: 'red', name: 'אדום', price: 15, color: 'rgba(255,70,70,.95)' },
  { id: 'green', name: 'ירוק', price: 15, color: 'rgba(80,255,120,.95)' },
  { id: 'gold', name: 'זהב', price: 30, color: 'rgba(255,215,0,.95)' },
];
function gunSkinDef() { return GUN_SKINS.find(s => s.id === profile.gunSkin) || GUN_SKINS[0]; }
function crosshairSkinDef() { return CROSSHAIR_SKINS.find(s => s.id === profile.crosshairSkin) || CROSSHAIR_SKINS[0]; }

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

// ===== מוזיקת רקע =====
// קודם מנסים לנגן קובץ אודיו אמיתי (קובץ קרקסי שהמשתמש סיפק); אם משום מה הוא
// לא נטען/לא מצליח לנגן (רשת, פורמט לא נתמך וכו') — נופלים בחזרה למלודיה
// שנוצרת בקוד, כדי שלעולם לא יישאר המשחק בלי מוזיקה בכלל.
const musicFile = new Audio('audio/circus-theme.mp3');
musicFile.loop = true;
musicFile.volume = 0.4;
musicFile.preload = 'auto';
let musicFileFailed = false;
musicFile.addEventListener('error', () => { musicFileFailed = true; if (musicStarted) playMusicLoop(); });

const MUSIC_BEAT = 0.3; // שניות לכל תו — קצב עליז ולא ממהר
const MUSIC_MELODY = [
  523.25, 659.25, 783.99, 659.25, 523.25, 783.99, 1046.5, 783.99,
  987.77, 880.00, 783.99, 698.46, 659.25, 587.33, 523.25, 523.25,
];
const MUSIC_BASS = { 0: 130.81, 4: 98.00, 8: 130.81, 12: 98.00 };
// טיימר עצמאי (לא דרך schedule/pendingTimers) כדי שהמוזיקה תמשיך לנגן ברצף
// גם כש-restartBtn מנקה את הטיימרים של סבב המשחק.
let musicTimer = null, musicStarted = false;
function playMusicLoop() {
  for (let i = 0; i < MUSIC_MELODY.length; i++) {
    tone(MUSIC_MELODY[i], MUSIC_BEAT * 0.85, 'triangle', i * MUSIC_BEAT, 0.045);
    if (MUSIC_BASS[i]) tone(MUSIC_BASS[i], MUSIC_BEAT * 3.6, 'sine', i * MUSIC_BEAT, 0.05);
  }
  musicTimer = setTimeout(playMusicLoop, MUSIC_MELODY.length * MUSIC_BEAT * 1000);
}
function startMusic() {
  if (musicStarted) return;
  musicStarted = true;
  musicFile.muted = state.muted;
  const p = musicFile.play();
  if (p && p.catch) {
    p.catch(() => { musicFileFailed = true; playMusicLoop(); });
  }
  if (musicFileFailed) playMusicLoop();
}

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

// תרגילים שלאורך זמן (לא רק היום) יש בהם הרבה טעויות — "המאמן החכם"
function persistentWeakPool() {
  const pool = [];
  for (const k in profile.factStats) {
    const s = profile.factStats[k];
    if (s.seen >= 2 && s.wrong / s.seen >= 0.4) {
      const [a, b] = k.split('x').map(Number);
      pool.push({ a, b });
    }
  }
  return pool;
}
function generateQuestion() {
  // עדיפות לתרגילים שהילד טעה בהם לאחרונה בסיבוב הזה — עד שהוא חוזר ומצליח בהם
  if (state.weakFacts.size && Math.random() < 0.5) {
    const f = pick(Array.from(state.weakFacts.values()));
    return { a: f.a, b: f.b, answer: f.a * f.b };
  }
  // ואם אין כאלה כרגע — עדיפות קלה יותר לתרגילים שקשים לו לאורך זמן, מסיבובים קודמים
  const longTerm = persistentWeakPool();
  if (longTerm.length && Math.random() < 0.3) {
    const f = pick(longTerm);
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
  const palette = currentWorld().ducks;
  ducks = values.map((val, i) => {
    const lane = (i + 0.5) * ((bottom - top) / count);
    const baseY = top + lane + randInt(-6, 6);
    const dir = Math.random() < 0.5 ? -1 : 1;
    const speed = (46 + randInt(0, 34)) * speedFactorForLevel(state.level);
    const isCorrect = val === q.answer;
    // מגוון תנועה קל מרמה 4 ואילך — לא על הבוסים (שם כולם אחידים בכוונה), ולא "צוללן"
    // על הברווז הנכון (כדי שלא יהיה בלתי-לחיץ בזמן שהילד יודע את התשובה)
    let variant = 'normal';
    if (!state.bossActive && state.level >= 4 && Math.random() < 0.22) {
      variant = isCorrect ? pick(['fast', 'zigzag']) : pick(['fast', 'zigzag', 'diving']);
    }
    return {
      id: duckIdSeq++,
      x: randInt(margin, Math.max(margin + 1, logicalW - margin)),
      baseY, y: baseY,
      vx: speed * dir * (variant === 'fast' ? 1.6 : 1),
      facing: dir,
      phase: Math.random() * Math.PI * 2,
      bobFreq: 2 + Math.random(),
      amp: 6 + Math.random() * 5,
      val, isCorrect,
      color: pick(palette),
      state: 'alive', // alive | hit | wrong | gone
      t0: 0,
      isBoss: false,
      variant,
      submerged: false,
    };
  });
  // בסיבוב בוס כל הברווזים מקבלים "עור" מיוחד (לא רק הנכון — כדי לא לחשוף את התשובה)
  if (state.bossActive) {
    for (const d of ducks) { d.color = pick(BOSS_COLORS); d.isBoss = true; d.vx *= 0.85; d.variant = 'normal'; }
  }
  // מדי פעם ברווז זהב בונוס — לא קשור לשאלה, נעלם לבד
  if (!state.bossActive && !goldenDuck && Math.random() < 0.15) spawnGoldenDuck();
}
function spawnGoldenDuck() {
  const { top, bottom } = poolBounds();
  const dir = Math.random() < 0.5 ? -1 : 1;
  goldenDuck = {
    x: randInt(50, Math.max(51, logicalW - 50)), baseY: randInt(top + 10, bottom - 10),
    y: 0, vx: 70 * dir, facing: dir,
    phase: Math.random() * Math.PI * 2, bobFreq: 2.4, amp: 7,
    spawnT: performance.now(), life: 4200,
  };
  goldenDuck.y = goldenDuck.baseY;
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

// ===== הישגים =====
// 'session' — לסיבוב הנוכחי בלבד, מתאפס בהתחלה מחדש (כמו הניקוד).
// 'lifetime' — נשמר על המכשיר לצמיתות, מוצג גם אחרי איפוס סיבוב (רק "אזור ההורים" מאפס אותו).
const BADGES = [
  { id: 'first', emoji: '🥉', title: 'ברווז ראשון', scope: 'session', check: () => state.totalCorrect >= 1 },
  { id: 'streak5', emoji: '🔥', title: 'רצף של 5', scope: 'session', check: () => state.bestStreak >= 5 },
  { id: 'streak10', emoji: '🔥🔥', title: 'רצף של 10', scope: 'session', check: () => state.bestStreak >= 10 },
  { id: 'boss1', emoji: '🏆', title: 'מנצח בוסים', scope: 'session', check: () => state.bossesDefeated >= 1 },
  { id: 'level10', emoji: '⭐', title: 'רמה 10', scope: 'session', check: () => state.level >= 10 },
  { id: 'level20', emoji: '🌟', title: 'רמה 20', scope: 'session', check: () => state.level >= 20 },
  { id: 'score100', emoji: '💯', title: '100 נקודות', scope: 'session', check: () => state.score >= 100 },
  { id: 'score500', emoji: '💎', title: '500 נקודות', scope: 'session', check: () => state.score >= 500 },
  { id: 'world_pirate', emoji: '🏖️', title: 'הגעת לחוף הפיראטים', scope: 'lifetime', check: () => profile.highestLevel >= 4 },
  { id: 'world_neon', emoji: '🌃', title: 'הגעת לעיר הניאון', scope: 'lifetime', check: () => profile.highestLevel >= 10 },
  { id: 'world_dragon', emoji: '🐲', title: 'הגעת לממלכת הדרקון', scope: 'lifetime', check: () => profile.highestLevel >= 16 },
  { id: 'coins50', emoji: '💰', title: '50 מטבעות נאספו', scope: 'lifetime', check: () => profile.coinsEarned >= 50 },
  { id: 'coins200', emoji: '💰💰', title: '200 מטבעות נאספו', scope: 'lifetime', check: () => profile.coinsEarned >= 200 },
];
for (let t = 1; t <= 10; t++) {
  BADGES.push({ id: 'table' + t, emoji: '👑', title: `אלוף לוח ה-${t}`, scope: 'session', check: () => (state.tableCorrect[t] || 0) >= 6 });
}
function badgeStore(b) { return b.scope === 'lifetime' ? profile.badgesLifetime : state.badgesEarned; }
function renderBadges() {
  badgeShelf.innerHTML = '';
  for (const b of BADGES) {
    const on = badgeStore(b).has(b.id);
    const el = document.createElement('div');
    el.className = 'badgeTile' + (on ? ' on' : '');
    el.title = b.title + (b.scope === 'lifetime' ? ' (לצמיתות)' : '');
    el.innerHTML = `<span class="ic">${b.emoji}</span><span>${b.title}</span>`;
    badgeShelf.appendChild(el);
  }
}
function checkBadges() {
  for (const b of BADGES) {
    const store = badgeStore(b);
    if (!store.has(b.id) && b.check()) {
      store.add(b.id);
      if (b.scope === 'lifetime') persistProfile();
      showToast(say(`🏅 הישג חדש: ${b.title}!`), 1800);
      renderBadges();
    }
  }
}
function renderCoins() { coinVal.textContent = profile.coins; }

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

  // מעקב לטווח ארוך (נשמר על המכשיר) — למאמן החכם ולאזור ההורים
  recordFactResult(question.a, question.b, true);
  profile.totalCorrectAll++;
  profile.coins += 1; profile.coinsEarned += 1;
  renderCoins();

  let bossJustDefeated = false;
  if (state.bossActive) {
    state.bossHitsNeeded--;
    if (state.bossHitsNeeded <= 0) {
      state.bossActive = false;
      state.bossesDefeated++;
      bossJustDefeated = true;
      const bonus = 30 + state.level * 3;
      state.score += bonus;
      profile.coins += 10; profile.coinsEarned += 10;
      renderCoins();
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
    const prevWorldIdx = worldIndexForLevel(state.level);
    state.level += 1;
    profile.highestLevel = Math.max(profile.highestLevel, state.level);
    const newWorldIdx = worldIndexForLevel(state.level);
    sfx.levelUp();
    if (!bossJustDefeated) {
      confettiBurst();
      if (newWorldIdx !== prevWorldIdx) {
        confettiBurst();
        showLevelUp('🌍 עולם חדש! 🌍', say(`הגעתם ל${currentWorld().name}!`));
      } else {
        showLevelUp(`🎉 ${say(pick(LEVEL_UP_TITLES))} רמה ${state.level}! 🎉`, pick(LEVEL_UP_SUBS));
      }
    }
    updateStreakDots(); persist();
    if (state.level % 5 === 0 && !state.bossActive) {
      state.bossActive = true; state.bossHitsNeeded = 2;
      renderBossBanner();
    }
  }
  persistProfile();
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
  recordFactResult(question.a, question.b, false);
  profile.totalWrongAll++;
  persistProfile();
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
  const world = currentWorld();
  const horizonY = logicalH * 0.36;
  // שמיים — גרדיאנט עשיר יותר עם זוהר שמש/ירח
  const sky = ctx.createLinearGradient(0, 0, 0, horizonY);
  sky.addColorStop(0, world.sky[0]); sky.addColorStop(0.7, world.sky[1]); sky.addColorStop(1, world.sky[1]);
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, logicalW, horizonY);

  const orbX = logicalW * 0.78, orbY = logicalH * 0.11;
  drawGlowOrb(orbX, orbY, world.night ? 13 : 20, world.glow, world.night ? 0.5 : 0.35);

  if (world.night) {
    // כוכבים במקום עננים בעולמות הלילה
    ctx.fillStyle = 'rgba(255,255,255,.8)';
    for (let i = 0; i < 18; i++) {
      const sx = (i * 53 + (t * 3) % 37) % logicalW;
      const sy = (i * 29) % (horizonY * 0.9);
      const tw = 0.5 + 0.5 * Math.sin(t * 2 + i);
      ctx.globalAlpha = 0.3 + tw * 0.6;
      ctx.beginPath(); ctx.arc(sx, sy, 1.3, 0, Math.PI * 2); ctx.fill();
    }
    ctx.globalAlpha = 1;
  } else {
    // עננים נעים
    ctx.fillStyle = 'rgba(255,255,255,.85)';
    for (let i = 0; i < 3; i++) {
      const cx = ((t * 8 + i * 160) % (logicalW + 160)) - 80;
      const cy = 20 + i * 22;
      cloud(cx, cy, 26 + i * 4);
    }
  }

  drawSkyline(world, t, horizonY);

  // גדר/גבול — עם פס אור למעלה ופס צל למטה, לתחושת נפח
  const fenceTop = horizonY, fenceBot = poolBounds().top + 4;
  ctx.fillStyle = world.fence;
  ctx.fillRect(0, fenceTop, logicalW, fenceBot - fenceTop);
  ctx.fillStyle = 'rgba(255,255,255,.22)';
  ctx.fillRect(0, fenceTop, logicalW, 3);
  ctx.strokeStyle = 'rgba(0,0,0,.18)'; ctx.lineWidth = 2;
  for (let x = -((t * 4) % 26); x < logicalW; x += 26) {
    ctx.beginPath(); ctx.moveTo(x, fenceTop + 3); ctx.lineTo(x, fenceBot); ctx.stroke();
  }
  ctx.fillStyle = 'rgba(0,0,0,.22)';
  ctx.fillRect(0, fenceBot - 4, logicalW, 4);

  // בריכה — גרדיאנט תלת-שכבתי + פס ברק עליון שמדמה השתקפות שמיים
  const { top, bottom } = poolBounds();
  const pond = ctx.createLinearGradient(0, top, 0, logicalH);
  pond.addColorStop(0, world.pond[0]); pond.addColorStop(0.35, world.pond[1]); pond.addColorStop(1, world.pond[2] || world.pond[1]);
  ctx.fillStyle = pond;
  ctx.fillRect(0, top, logicalW, logicalH - top);
  const shine = ctx.createLinearGradient(0, top, 0, top + 22);
  shine.addColorStop(0, 'rgba(255,255,255,.32)'); shine.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = shine;
  ctx.fillRect(0, top, logicalW, 22);

  ctx.strokeStyle = 'rgba(255,255,255,.24)'; ctx.lineWidth = 2;
  for (let row = 0; row < 5; row++) {
    const y = top + 14 + row * ((bottom - top) / 5);
    ctx.globalAlpha = 1 - row * 0.12;
    ctx.beginPath();
    for (let x = 0; x <= logicalW; x += 10) {
      const yy = y + Math.sin(x * 0.05 + t * 1.6 + row) * 3;
      if (x === 0) ctx.moveTo(x, yy); else ctx.lineTo(x, yy);
    }
    ctx.stroke();
  }
  ctx.globalAlpha = 1;

  // נצנוצים קטנים על פני המים
  ctx.fillStyle = 'rgba(255,255,255,.7)';
  for (let i = 0; i < 6; i++) {
    const sx = (i * 71 + (t * 26) % 53) % logicalW;
    const sy = top + 20 + (i * 37) % (bottom - top - 30);
    const tw = 0.5 + 0.5 * Math.sin(t * 3 + i * 2);
    ctx.globalAlpha = tw * 0.55;
    ctx.beginPath(); ctx.arc(sx, sy, 1.4, 0, Math.PI * 2); ctx.fill();
  }
  ctx.globalAlpha = 1;
}
function drawGlowOrb(x, y, r, color, alpha) {
  const g = ctx.createRadialGradient(x, y, 0, x, y, r * 2.4);
  g.addColorStop(0, color); g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.globalAlpha = alpha;
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.arc(x, y, r * 2.4, 0, Math.PI * 2); ctx.fill();
  ctx.globalAlpha = 1;
  ctx.fillStyle = color;
  ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
}
function cloud(x, y, s) {
  ctx.beginPath();
  ctx.ellipse(x, y, s, s * 0.6, 0, 0, Math.PI * 2);
  ctx.ellipse(x + s * 0.7, y + s * 0.15, s * 0.7, s * 0.45, 0, 0, Math.PI * 2);
  ctx.ellipse(x - s * 0.6, y + s * 0.2, s * 0.55, s * 0.4, 0, 0, Math.PI * 2);
  ctx.fill();
}
// קו רקיע רחוק לפי סוג העולם — שכבת עומק בין השמיים לגדר
function drawSkyline(world, t, horizonY) {
  const base = horizonY;
  const drift = (t * 2) % 40;
  ctx.fillStyle = world.hill;
  if (world.skyline === 'hills') {
    ctx.globalAlpha = 0.9;
    for (let i = 0; i < 3; i++) {
      const h = 16 + i * 8, cy = base - h * 0.3;
      ctx.globalAlpha = 0.45 + i * 0.22;
      ctx.beginPath();
      for (let x = -drift - 20; x <= logicalW + 20; x += 4) {
        const yy = cy - Math.max(0, h - Math.abs(((x + i * 90) % 160) - 80) * 0.5);
        if (x === -drift - 20) ctx.moveTo(x, base);
        ctx.lineTo(x, yy);
      }
      ctx.lineTo(logicalW + 20, base); ctx.closePath(); ctx.fill();
    }
    ctx.globalAlpha = 1;
  } else if (world.skyline === 'buildings') {
    const n = 7;
    for (let i = 0; i < n; i++) {
      const w = logicalW / n;
      const bx = i * w + 2, bh = 18 + ((i * 37) % 26);
      ctx.globalAlpha = 0.85;
      ctx.fillRect(bx, base - bh, w - 4, bh);
      ctx.globalAlpha = 0.4 + 0.4 * Math.max(0, Math.sin(t * 2 + i * 1.7));
      ctx.fillStyle = '#ffe98a';
      ctx.fillRect(bx + 4, base - bh + 6, 3, 3);
      ctx.fillRect(bx + w - 12, base - bh + 12, 3, 3);
      ctx.fillStyle = world.hill;
    }
    ctx.globalAlpha = 1;
  } else if (world.skyline === 'craters') {
    ctx.globalAlpha = 0.55;
    ctx.beginPath(); ctx.arc(logicalW * 0.18, base - 6, 30, 0, Math.PI * 2); ctx.fill();
    ctx.globalAlpha = 0.8;
    ctx.beginPath(); ctx.arc(logicalW * 0.14, base - 10, 5, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(logicalW * 0.24, base - 2, 3.5, 0, Math.PI * 2); ctx.fill();
    ctx.globalAlpha = 1;
  } else if (world.skyline === 'peaks') {
    ctx.globalAlpha = 0.85;
    ctx.beginPath();
    ctx.moveTo(-10, base);
    const n = 6;
    for (let i = 0; i <= n; i++) {
      const x = (logicalW + 20) * (i / n) - 10;
      const h = 18 + (i % 2 === 0 ? 22 : 8) + ((i * 13) % 9);
      ctx.lineTo(x, base - h);
    }
    ctx.lineTo(logicalW + 10, base); ctx.closePath(); ctx.fill();
    ctx.globalAlpha = 1;
  }
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
  if (duck.submerged) {
    // "צוללן" — נעלם רגעית מתחת למים, רק אדוות נשארות; לא ניתן לפגיעה בזמן הזה
    ctx.save();
    ctx.strokeStyle = 'rgba(255,255,255,.35)'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.ellipse(duck.x, duck.y + 10, 16, 5, 0, 0, Math.PI * 2); ctx.stroke();
    ctx.restore();
    return;
  }
  const hitAnim = duck.state === 'hit' ? clamp((performance.now() - duck.t0) / 600, 0, 1) : 0;
  const wrongAnim = duck.state === 'wrong' ? (performance.now() - duck.t0) / 400 : 0;
  if (duck.variant === 'fast' && duck.state === 'alive') {
    ctx.save();
    ctx.strokeStyle = 'rgba(255,255,255,.5)'; ctx.lineWidth = 2;
    const dir = duck.facing < 0 ? 1 : -1;
    ctx.beginPath();
    ctx.moveTo(duck.x + dir * 22, duck.y + 4); ctx.lineTo(duck.x + dir * 34, duck.y + 4);
    ctx.moveTo(duck.x + dir * 20, duck.y + 10); ctx.lineTo(duck.x + dir * 30, duck.y + 10);
    ctx.stroke();
    ctx.restore();
  }
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
// ברווז הזהב — מטרת בונוס נפרדת לגמרי מהתרגיל, לא נספר כתשובה נכונה/שגויה
function drawGoldenDuck(g, t) {
  const sparkle = 0.6 + 0.4 * Math.sin(t * 8);
  ctx.save();
  ctx.translate(g.x, g.y);
  ctx.scale(g.facing < 0 ? -1 : 1, 1);
  ctx.shadowColor = 'rgba(255,215,0,.9)'; ctx.shadowBlur = 14 * sparkle;
  const OUT = '#171512';
  ctx.fillStyle = OUT;
  ctx.beginPath(); ctx.ellipse(0, 6, 26, 18, 0, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(15, -9, 15, 0, Math.PI * 2); ctx.fill();
  const gold = ctx.createLinearGradient(-20, -20, 20, 20);
  gold.addColorStop(0, '#fff3c4'); gold.addColorStop(0.5, '#f0c419'); gold.addColorStop(1, '#a8790a');
  ctx.fillStyle = gold;
  ctx.beginPath(); ctx.ellipse(0, 6, 23, 15, 0, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(15, -9, 12, 0, Math.PI * 2); ctx.fill();
  ctx.shadowBlur = 0;
  ctx.fillStyle = '#e8871a';
  ctx.beginPath();
  ctx.moveTo(25, -12); ctx.quadraticCurveTo(38, -14, 44, -8); ctx.quadraticCurveTo(36, -5, 25, -5);
  ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(20, -13, 5, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#16305c'; ctx.beginPath(); ctx.arc(22, -12, 3, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
  ctx.save();
  ctx.font = '18px sans-serif'; ctx.textAlign = 'center';
  ctx.globalAlpha = sparkle;
  ctx.fillText('✨', g.x - 22, g.y - 22);
  ctx.fillText('✨', g.x + 24, g.y - 14);
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
  const skin = gunSkinDef();

  // צל קבוע על הקרקע, לא מסתובב עם הרובה — נותן תחושת עומק
  ctx.save();
  ctx.globalAlpha = 0.25;
  ctx.fillStyle = '#000';
  ctx.beginPath(); ctx.ellipse(gx, gy + 20, 20, 6, 0, 0, Math.PI * 2); ctx.fill();
  ctx.restore();

  ctx.save();
  ctx.translate(gx, gy);
  ctx.rotate(ang + Math.PI / 2);
  const rec = gunRecoil * 7;
  ctx.translate(0, rec);
  ctx.scale(1, 1 - gunRecoil * 0.05);

  // קת — גרדיאנט דו-גוני + קו ברק עדין
  const stockG = ctx.createLinearGradient(-11, 0, 11, 0);
  stockG.addColorStop(0, shade(skin.stock, -18)); stockG.addColorStop(0.45, skin.stock); stockG.addColorStop(1, shade(skin.stock, 14));
  ctx.fillStyle = stockG;
  ctx.strokeStyle = 'rgba(0,0,0,.55)'; ctx.lineWidth = 2;
  roundRect(ctx, -11, 2, 22, 32, 8); ctx.fill(); ctx.stroke();

  // הדק
  ctx.strokeStyle = 'rgba(0,0,0,.55)'; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.arc(0, 15, 6, 0.2, Math.PI * 1.6); ctx.stroke();

  // בית-הרובה — גוף רחב יותר שמחבר בין הקת לקנה, לצליל "בלאסטר" יותר עשיר
  const bodyG = ctx.createLinearGradient(-13, 0, 13, 0);
  bodyG.addColorStop(0, shade(skin.barrel3, -10)); bodyG.addColorStop(0.5, skin.barrel2); bodyG.addColorStop(1, shade(skin.barrel3, -10));
  ctx.fillStyle = bodyG;
  ctx.strokeStyle = 'rgba(0,0,0,.5)'; ctx.lineWidth = 1.5;
  roundRect(ctx, -13, -18, 26, 22, 8); ctx.fill(); ctx.stroke();

  // קנה עם ברק מתכתי
  const bg = ctx.createLinearGradient(-6, 0, 6, 0);
  bg.addColorStop(0, skin.barrel1); bg.addColorStop(0.35, skin.barrel2); bg.addColorStop(0.55, '#ffffff'); bg.addColorStop(0.75, skin.barrel2); bg.addColorStop(1, skin.barrel3);
  ctx.fillStyle = bg;
  ctx.strokeStyle = 'rgba(0,0,0,.5)'; ctx.lineWidth = 1.5;
  roundRect(ctx, -6, -62, 12, 46, 5); ctx.fill(); ctx.stroke();
  // פס צבע קרנבלי
  ctx.fillStyle = skin.band;
  ctx.fillRect(-6, -34, 12, 7);
  // סנפירי אוורור קטנים ליד הקנה
  ctx.fillStyle = shade(skin.barrel3, -20);
  ctx.fillRect(-8, -46, 3, 8); ctx.fillRect(5, -46, 3, 8);
  // זוהר קל בקצה הקנה
  drawGlowOrb(0, -62, 5, skin.band, 0.55);
  ctx.fillStyle = '#1a1a1a';
  ctx.beginPath(); ctx.ellipse(0, -62, 5.5, 3, 0, 0, Math.PI * 2); ctx.fill();
  ctx.restore();

  if (pointer.x != null) {
    const xhColor = crosshairSkinDef().color;
    const pulse = 1 + Math.sin(performance.now() / 220) * 0.06;
    ctx.save();
    ctx.translate(pointer.x, pointer.y);
    // רשת HUD: טבעת חיצונית פועמת + סוגריים בפינות + נקודת מרכז
    ctx.globalAlpha = 0.5;
    ctx.strokeStyle = xhColor; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.arc(0, 0, 22 * pulse, 0, Math.PI * 2); ctx.stroke();
    ctx.globalAlpha = 1;
    ctx.strokeStyle = xhColor; ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.arc(0, 0, 15, 0, Math.PI * 2); ctx.stroke();
    const bl = 7, off = 15;
    ctx.lineWidth = 2.5;
    for (const [sx, sy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
      ctx.beginPath();
      ctx.moveTo(sx * off, sy * (off - bl)); ctx.lineTo(sx * off, sy * off); ctx.lineTo(sx * (off - bl), sy * off);
      ctx.stroke();
    }
    ctx.fillStyle = xhColor;
    ctx.beginPath(); ctx.arc(0, 0, 1.8, 0, Math.PI * 2); ctx.fill();
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
      if (d.variant === 'zigzag') d.x += Math.sin(t * 6 + d.phase) * 55 * dt;
      if (d.x < margin) { d.x = margin; d.vx = Math.abs(d.vx); d.facing = 1; }
      if (d.x > logicalW - margin) { d.x = logicalW - margin; d.vx = -Math.abs(d.vx); d.facing = -1; }
      d.y = d.baseY + Math.sin(t * d.bobFreq + d.phase) * d.amp;
      d.submerged = d.variant === 'diving' && ((t * 0.3 + d.phase) % 1) > 0.7;
    }
    if (d.state === 'hit' && performance.now() - d.t0 > 620) d.state = 'gone';
  }
  if (goldenDuck) {
    const g = goldenDuck;
    g.x += g.vx * dt;
    if (g.x < 40) { g.x = 40; g.vx = Math.abs(g.vx); g.facing = 1; }
    if (g.x > logicalW - 40) { g.x = logicalW - 40; g.vx = -Math.abs(g.vx); g.facing = -1; }
    g.y = g.baseY + Math.sin(t * g.bobFreq + g.phase) * g.amp;
    if (performance.now() - g.spawnT > g.life) goldenDuck = null;
  }
  gunRecoil = Math.max(0, gunRecoil - dt * 4);
}

function drawVignette() {
  const cx = logicalW / 2, cy = logicalH * 0.45;
  const r = Math.max(logicalW, logicalH) * 0.75;
  const v = ctx.createRadialGradient(cx, cy, r * 0.55, cx, cy, r);
  v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(0,0,0,.22)');
  ctx.fillStyle = v;
  ctx.fillRect(0, 0, logicalW, logicalH);
}

function render(t) {
  ctx.clearRect(0, 0, logicalW, logicalH);
  drawBackground(t);
  for (const d of ducks) if (d.state !== 'gone') drawDuck(d, t);
  if (goldenDuck) drawGoldenDuck(goldenDuck, t);
  drawParticles(1 / 60);
  drawGunAndCrosshair();
  drawVignette();
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
  // ברווז הזהב הוא מטרת בונוס נפרדת — פגיעה בו לא נחשבת כתשובה על התרגיל
  if (goldenDuck) {
    const dx = x - goldenDuck.x, dy = y - (goldenDuck.y - 6);
    if (Math.hypot(dx, dy) < 42) { collectGolden(); return; }
  }
  let best = null, bestDist = Infinity;
  for (const d of ducks) {
    if (d.state !== 'alive' || d.submerged) continue;
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
function collectGolden() {
  const g = goldenDuck;
  goldenDuck = null;
  const coinsWon = 15;
  profile.coins += coinsWon; profile.coinsEarned += coinsWon;
  persistProfile(); renderCoins();
  burst(g.x, g.y, ['#fff3c4', '#f0c419', '#ffffff'], 20, 150);
  floatText(g.x, g.y - 20, '+' + coinsWon + ' 🪙', '#a8790a');
  sfx.tick(); sfx.tick();
  showToast(say('ברווז הזהב! בונוס מטבעות 🪙✨'), 1400);
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
  musicFile.muted = state.muted;
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
  startMusic();
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

// ===== חנות (מטבעות בלבד, קוסמטי) =====
function renderShop() {
  coinVal.textContent = profile.coins;
  const shopCoinVal = document.getElementById('shopCoinVal');
  if (shopCoinVal) shopCoinVal.textContent = profile.coins;
  gunSkinShelf.innerHTML = '';
  for (const s of GUN_SKINS) {
    gunSkinShelf.appendChild(buildSkinTile(s, profile.ownedGuns, profile.gunSkin, 'gun'));
  }
  crosshairSkinShelf.innerHTML = '';
  for (const s of CROSSHAIR_SKINS) {
    crosshairSkinShelf.appendChild(buildSkinTile(s, profile.ownedCrosshairs, profile.crosshairSkin, 'crosshair'));
  }
}
function buildSkinTile(s, owned, equipped, kind) {
  const isOwned = owned.includes(s.id);
  const isEquipped = equipped === s.id;
  const el = document.createElement('div');
  el.className = 'skinTile' + (isEquipped ? ' equipped' : '');
  const swatch = kind === 'gun' ? s.barrel2 : s.color;
  el.innerHTML = `<span class="swatch" style="background:${swatch}"></span>
    <span class="skinName">${s.name}</span>
    <span class="skinTag">${isEquipped ? '✓ מצויד' : (isOwned ? 'לחצו לציוד' : '🪙 ' + s.price)}</span>`;
  el.addEventListener('click', () => buySkin(s, kind));
  return el;
}
function buySkin(s, kind) {
  const owned = kind === 'gun' ? profile.ownedGuns : profile.ownedCrosshairs;
  if (owned.includes(s.id)) {
    if (kind === 'gun') profile.gunSkin = s.id; else profile.crosshairSkin = s.id;
    sfx.tick();
  } else {
    if (profile.coins < s.price) { showToast(say('אין מספיק מטבעות עדיין 🪙'), 1200); return; }
    profile.coins -= s.price;
    owned.push(s.id);
    if (kind === 'gun') profile.gunSkin = s.id; else profile.crosshairSkin = s.id;
    showToast(say(`נרכש: ${s.name}! 🎉`), 1400);
    sfx.levelUp();
  }
  persistProfile(); renderShop();
}
function closeShop() { shopOverlay.classList.add('hidden'); }
shopBtn.addEventListener('click', () => { closeSettings(); renderShop(); shopOverlay.classList.remove('hidden'); });
shopClose.addEventListener('click', closeShop);

// ===== אזור הורים =====
function tableStats() {
  const rows = [];
  for (let t = 1; t <= 10; t++) {
    let seen = 0, correct = 0;
    for (const k in profile.factStats) {
      const [a, b] = k.split('x').map(Number);
      if (a === t || b === t) { seen += profile.factStats[k].seen; correct += profile.factStats[k].correct; }
    }
    if (seen >= 3) rows.push({ t, acc: correct / seen });
  }
  return rows;
}
function hardestFact() {
  let worst = null;
  for (const k in profile.factStats) {
    const s = profile.factStats[k];
    if (s.seen >= 2 && (!worst || s.wrong / s.seen > worst.rate)) worst = { key: k, rate: s.wrong / s.seen };
  }
  return worst ? worst.key.replace('x', ' × ') : null;
}
function renderParent() {
  const totalSeen = profile.totalCorrectAll + profile.totalWrongAll;
  const acc = totalSeen ? Math.round((profile.totalCorrectAll / totalSeen) * 100) : 0;
  const rows = tableStats();
  const strongest = rows.slice().sort((a, b) => b.acc - a.acc).slice(0, 2);
  const weakest = rows.slice().sort((a, b) => a.acc - b.acc).slice(0, 2);
  const hard = hardestFact();
  const minutes = Math.round(profile.totalPlayMs / 60000);
  const fmt = list => list.length ? list.map(r => `לוח ${r.t} (${Math.round(r.acc * 100)}%)`).join(', ') : '—';
  parentStats.innerHTML = `
    <div class="statRow"><span>סה"כ תשובות נכונות</span><b>${profile.totalCorrectAll}</b></div>
    <div class="statRow"><span>דיוק כללי</span><b>${totalSeen ? acc + '%' : '—'}</b></div>
    <div class="statRow"><span>שיא רמה</span><b>${profile.highestLevel}</b></div>
    <div class="statRow"><span>זמן משחק כולל</span><b>${minutes} דקות</b></div>
    <div class="statRow"><span>מטבעות</span><b>🪙 ${profile.coins}</b></div>
    <div class="statRow"><span>חזק במיוחד</span><b>${fmt(strongest)}</b></div>
    <div class="statRow"><span>צריך תרגול</span><b>${fmt(weakest)}</b></div>
    <div class="statRow"><span>התרגיל הקשה ביותר</span><b>${hard || '—'}</b></div>
  `;
}
function closeParent() { parentOverlay.classList.add('hidden'); }
parentBtn.addEventListener('click', () => { closeSettings(); renderParent(); parentOverlay.classList.remove('hidden'); });
parentClose.addEventListener('click', closeParent);
resetProfileBtn.addEventListener('click', () => {
  if (window.confirm('לאפס את כל ההתקדמות השמורה (מטבעות, סקינים, סטטיסטיקות)? זה לא ניתן לביטול.')) {
    resetProfile();
    renderCoins(); renderBadges(); renderParent();
    showToast(say('ההתקדמות אופסה'), 1500);
  }
});

// מעקב זמן משחק כולל (מוערך, לא מדויק לשנייה) — נשמר על המכשיר
setInterval(() => {
  if (state.started) { profile.totalPlayMs += 5000; persistProfile(); }
}, 5000);

// ===== init =====
soundBtn.textContent = state.muted ? '🔇' : '🔊';
nameInput.value = state.playerName;
updateHUD();
updateStreakDots();
renderBossBanner();
renderBadges();
renderCoins();
resizeCanvas();
requestAnimationFrame(loop);
