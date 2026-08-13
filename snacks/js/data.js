/* קטלוג החטיפים — כאן מוסיפים / משנים חטיפים.
   crunch: 1-5 (כמה פריך)  ·  score: 0-100 (ציון טעם)
   cat: salty | sweet | spicy | sour   ·   classic: true = קלאסיקה */
const SNACK_CATS = [
  { id: 'all',   label: 'הכול',  emoji: '🍽️' },
  { id: 'salty', label: 'מלוח',  emoji: '🧂' },
  { id: 'sweet', label: 'מתוק',  emoji: '🍫' },
  { id: 'spicy', label: 'חריף',  emoji: '🌶️' },
  { id: 'sour',  label: 'חמוץ',  emoji: '🍋' }
];

const SNACKS = [
  { id:'bamba', name:'במבה', emoji:'🥜', cat:'salty', crunch:2, score:96, classic:true,
    tag:'הראשונה של כולם',
    text:'אוויר, בוטנים ואהבה. אין ילד בארץ שלא התחיל ממנה, ואין מבוגר שמפסיק אחרי אחת.',
    pair:'עם קפה שחור בבוקר. כן, ברצינות.' },

  { id:'bisli', name:'ביסלי גריל', emoji:'🌾', cat:'salty', crunch:5, score:91, classic:true,
    tag:'הקשקוש שלא נגמר',
    text:'קשה, מלוח, ומכור. הריח נשאר על האצבעות עד הערב — וזה בדיוק החלק הכי טוב.',
    pair:'עם קולה קרה מהמקרר האחורי.' },

  { id:'doritos', name:'דוריטוס', emoji:'🔺', cat:'spicy', crunch:5, score:89,
    tag:'משולש עם אופי',
    text:'אבקה כתומה שנדבקת לאצבעות ואגרוף של טעם. השקית מסתיימת מהר מדי, תמיד.',
    pair:'עם גוואקמולה או חומוס — לא משנה, זה עובד.' },

  { id:'apropo', name:'אפרופו', emoji:'🥨', cat:'salty', crunch:4, score:84, classic:true,
    tag:'הצינור המושלם',
    text:'החטיף היחיד שאפשר לשים על עשר האצבעות ואז לאכול אחת־אחת. חוק ידוע.',
    pair:'עם גבינה לבנה בפנים. תנסו פעם אחת.' },

  { id:'para', name:'שוקולד פרה', emoji:'🐮', cat:'sweet', crunch:1, score:93, classic:true,
    tag:'הריבוע הסגול',
    text:'חצי לוח נחשב מנה אחת, וכולנו מסכימים על זה בשקט. שוקולד חלב שגדלנו עליו.',
    pair:'עם כוס חלב חם בחורף.' },

  { id:'tapuchips', name:'תפוצ׳יפס', emoji:'🥔', cat:'salty', crunch:5, score:90,
    tag:'מלך המסיבות',
    text:'פרוסות תפוח אדמה דקות ופריכות. השקית הגדולה נפתחת אחת — ונגמרת בעשר דקות.',
    pair:'עם רוטב שום מהקערה שבאמצע השולחן.' },

  { id:'krembo', name:'קרמבו', emoji:'🍦', cat:'sweet', crunch:1, score:88, classic:true,
    tag:'עונתי ומפלג',
    text:'קצף על ביסקוויט בעטיפת שוקולד. מחלק את המדינה לשניים: מלמעלה או מהצד?',
    pair:'עם ויכוח סוער בסלון.' },

  { id:'kifkaf', name:'כיף כף', emoji:'🍫', cat:'sweet', crunch:3, score:87,
    tag:'חטיף ההפסקה',
    text:'פריך מבפנים, שוקולד מבחוץ, ורעש שכולם בכיתה שומעים כשפותחים את העטיפה.',
    pair:'עם הפסקה גדולה בחצר.' },

  { id:'bigla', name:'ביגלה', emoji:'🥯', cat:'salty', crunch:5, score:79,
    tag:'הטבעות הקטנות',
    text:'טבעות מלח שנעלמות מהקערה בלי שאף אחד בחדר מודה שהוא אכל אותן.',
    pair:'עם משחק קלפים ליד השולחן.' },

  { id:'pesekzman', name:'פסק זמן', emoji:'🍬', cat:'sweet', crunch:2, score:86,
    tag:'תירוץ להפסקה',
    text:'וופל, קרמל ושוקולד בשלוש שכבות. השם עצמו כבר נותן לך אישור לעצור הכול.',
    pair:'עם עשר דקות שקט וכיסא נוח.' },

  { id:'dubonim', name:'דובוני גומי חמוצים', emoji:'🐻', cat:'sour', crunch:1, score:81,
    tag:'צריך אומץ',
    text:'סוכר, חומצה וקצת גבורה. הלשון תזכור את זה עוד חצי שעה אחרי.',
    pair:'עם מים. הרבה מים.' },

  { id:'popcorn', name:'פופקורן חמאה', emoji:'🍿', cat:'salty', crunch:3, score:85,
    tag:'ריח של ערב טוב',
    text:'הריח ממלא את כל הבית לפני שהקערה בכלל מגיעה לסלון. הסרט הוא רק תירוץ.',
    pair:'עם סרט ישן שראית כבר חמש פעמים.' }
];

/* חטיף החודש — מזהה מתוך הרשימה למעלה */
const SNACK_OF_MONTH = 'bamba';

/* הסקר הגדול — הצבעות פתיחה (ההצבעה של המשתמש נשמרת בדפדפן) */
const POLL = {
  question: 'מה החטיף הכי טוב בעולם?',
  options: [
    { id:'bamba',    label:'במבה',        emoji:'🥜', votes: 4820 },
    { id:'bisli',    label:'ביסלי גריל',  emoji:'🌾', votes: 3915 },
    { id:'para',     label:'שוקולד פרה',  emoji:'🐮', votes: 3402 },
    { id:'doritos',  label:'דוריטוס',     emoji:'🔺', votes: 2733 },
    { id:'krembo',   label:'קרמבו',       emoji:'🍦', votes: 2190 }
  ]
};
