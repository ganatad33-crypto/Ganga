/* סדר העמודים — קובע את התפריט, פירורי הלחם, "הקודם/הבא" ומפת האתר.
   מקביל ל-assets/nav.js של הגרסה הסטטית. inNav:false = לא בסרגל העליון,
   אבל כן במפה בתחתית ובניווט בין עמודים. */
export const PAGES = [
  { path: '/',            nav: 'בית',        title: 'כלב טוב',                  icon: 'home',  group: 'התחלה' },
  { path: '/signals',     nav: 'לקרוא כלב',  title: 'לקרוא כלב',              icon: 'eye',   group: 'המסלול' },
  { path: '/learning',    nav: 'להבין',      title: 'איך כלב לומד',           icon: 'bolt',  group: 'המסלול' },
  { path: '/household',   nav: 'בני הבית',   title: 'מה בני הבית עושים לכלב', icon: 'users', group: 'המסלול', inNav: false },
  { path: '/routine',     nav: 'לחיות',      title: 'לחיות עם כלב',           icon: 'house', group: 'המסלול' },
  { path: '/barking',     nav: 'נביחה',      title: 'הכלב שלי נובח',          icon: 'sound', group: 'בעיות', inNav: false },
  { path: '/aggression',  nav: 'תוקפנות',    title: 'הכלב שלי תוקפני',        icon: 'alert', group: 'בעיות', inNav: false },
  { path: '/separation',  nav: 'חרדת נטישה', title: 'חרדת נטישה',             icon: 'house', group: 'בעיות', inNav: false },
  { path: '/puppy',       nav: 'גור חדש',    title: 'גור חדש בבית',           icon: 'paw',   group: 'בעיות', inNav: false },
  { path: '/world',       nav: 'בעולם',      title: 'לנוע בעולם',             icon: 'users', group: 'המסלול' },
  { path: '/lifespan',    nav: 'לאורך החיים',title: 'לאורך החיים',            icon: 'dog',   group: 'המסלול', inNav: false },
  { path: '/cases',       nav: 'מקרים',      title: 'שלושה מקרים',            icon: 'bolt',  group: 'כלים' },
  { path: '/qa',          nav: 'שאלות',      title: 'שאלות ותשובות',          icon: 'chat',  group: 'כלים' },
  { path: '/guide',       nav: 'מה קרה?',    title: 'מה קרה לכלב שלי',        icon: 'chat',  group: 'כלים' },
  { path: '/profile',     nav: 'הכלב שלי',   title: 'פרטי הכלב שלי',          icon: 'dog',   group: 'כלים' },
]
