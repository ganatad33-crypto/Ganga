/* בונה קובץ HTML יחיד לתצוגה מהירה — הפונטים, ה־CSS וה־JS מוטמעים בפנים.
   שימושי לשליחה בוואטסאפ או לפתיחה בטלפון בלי להעלות לשרת.
   להתקנה למסך הבית ולהתראות צריך את הגרסה הרגילה (index.html).
      node mi-osef/build.js  →  mi-osef/dist/miosef.html                     */
const fs = require('fs'), path = require('path');
const ROOT = __dirname;
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');

/* פונטים כ־data URI */
let css = read('css/app.css').replace(/url\('\.\.\/fonts\/([^']+)'\)/g, (_, f) => {
  const b64 = fs.readFileSync(path.join(ROOT, 'fonts', f)).toString('base64');
  return `url(data:font/woff2;base64,${b64})`;
});

/* כשמוגדר שרת, ספריית Supabase חייבת להיכנס גם היא לקובץ היחיד */
const cfg = read('js/config.js');
const needsSupabase = /SUPABASE_URL:\s*'http/.test(cfg);
const vendor = needsSupabase ? read('vendor/supabase.js') + '\n;\n' : '';

const js = vendor + ['js/config.js','js/model.js','js/store.js','js/push.js','js/auth.js','js/ui.js','js/app.js']
  .map(read).join('\n;\n');

/* חשוב: מחליפים דרך פונקציה ולא דרך מחרוזת — אחרת רצפים כמו $& ו-$' בקוד
   המוטמע מתפרשים כהוראות החלפה ומשחיתים את הקובץ */
let html = read('index.html')
  .replace(/<link rel="manifest"[^>]*>\s*/, '')
  .replace(/<link rel="stylesheet"[^>]*>/, () => '<style>\n' + css + '\n</style>')
  .replace(/<script src="vendor\/supabase.js"><\/script>\s*/, '')
  .replace(/(<script src="js\/[^"]+"><\/script>\s*)+/, () => '<script>\n' + js + '\n</script>')
  .replace(/<link rel="icon"[^>]*>\s*/, '')
  .replace(/<link rel="apple-touch-icon"[^>]*>\s*/, '');

fs.mkdirSync(path.join(ROOT, 'dist'), { recursive: true });
fs.writeFileSync(path.join(ROOT, 'dist', 'miosef.html'), html);
console.log('נבנה: mi-osef/dist/miosef.html · ' + Math.round(html.length / 1024) + 'KB');
