import { Link } from 'react-router-dom'
import { Icon } from './icons.jsx'
import { BREEDS } from './data/breeds.js'
import { useDogProfile, bandFor } from './dog.js'

const STAGE = {
  puppy: {
    head: 'אתם בשלב הבנייה',
    body: (name) => `עד גיל חצי שנה כמעט הכל עוד פתוח. מה שנבנה עכשיו — איך ${name} מרגיש עם מגע, עם זרים, עם להיות לבד — נשאר איתו הרבה מעבר לגיל הזה. זה גם השלב שבו הכי משתלם ללמוד לקרוא אותו, כי הוא כבר משדר הכל, רק בשקט.`,
    links: ['signals', 'household'],
  },
  adolescent: {
    head: 'אתם בשלב שהכי מפתיע בעלים',
    body: (name) => `בין 6 ל-18 חודשים המוח בונה את מערכת השליטה בדחפים, בזמן שהתגובה הרגשית כבר עובדת במלוא העוצמה. לכן דברים ש${name} כבר ידע נשברים זמנית — הריקול נחלש, הרצועה מחמירה, מופיעה נביחה שלא הייתה. זו לא רגרסיה באילוף ולא ניסיון לבדוק אתכם. מה שעובד עכשיו זה עקביות והורדת חשיפה, לא הקשחה.`,
    links: ['signals', 'barking', 'guide'],
  },
  adult: {
    head: 'אתם בשלב היציב',
    body: (name) => `בגיל הזה מה שרואים הוא בדרך כלל מה שנבנה קודם — וזה עובד לשני הכיוונים. הרגלים ותיקים מתוקנים לאט יותר מאשר אצל גור, אבל הם מתוקנים. אם משהו השתנה לאחרונה אצל ${name} בלי סיבה ברורה, שווה לחשוב מה השתנה בבית לפני כמה שבועות.`,
    links: ['guide', 'household'],
  },
  senior: {
    head: 'בגיל הזה, קודם רפואה ואז התנהגות',
    body: (name) => `כמעט כל שינוי התנהגותי חדש אצל ${name} בשלב הזה מצדיק בדיקה וטרינרית לפני כל תרגיל. כאב, ירידה בשמיעה או בראייה ושינויים קוגניטיביים מתבטאים בדיוק כמו "החמרה באופי" — נהמה כשמתקרבים, נביחה בלילה, בלבול, פחות סבלנות.`,
    links: ['guide', 'signals'],
  },
}

const LINKS = {
  signals:   { to: '/signals',   icon: 'eye',   t: 'לקרוא כלב', s: 'הסימנים המוקדמים — הבסיס לכל השאר' },
  barking:   { to: '/barking',   icon: 'sound', t: 'נביחה',      s: 'שישה סוגים, ולכל אחד פתרון אחר' },
  guide:     { to: '/guide',     icon: 'chat',  t: 'מה קרה?',    s: 'מסלול שאלות שמוביל לתשובה מותאמת' },
  household: { to: '/household', icon: 'users', t: 'בני הבית',   s: 'מה שקורה בבית ומגיע אל הכלב' },
}

/* פאנל "מה רלוונטי לך" — פורט מ-Dog.forYou() ב-assets/profile.js */
export default function ForYou() {
  const { profile } = useDogProfile()
  if (!profile || (profile.months == null && !profile.breedKey)) return null

  const band = profile.months != null ? bandFor(profile.months) : null
  const name = profile.name || 'הכלב שלך'
  const br = profile.breedKey ? BREEDS[profile.breedKey] : null
  const br2 = profile.breedKey2 ? BREEDS[profile.breedKey2] : null

  const picks = []
  const st = band ? STAGE[band.id] : null
  if (st) picks.push(...st.links)

  const notes = []
  ;[br, br2].forEach((x) => {
    if (!x) return
    if (x.voice === 'high') notes.push(<li key={`v-${x.he}`}><strong>{x.he}</strong> נוטה להשתמש בקול. נביחה מרובה אצלו היא לרוב חלק מהגזע ולא סימן לבעיה — אפשר להוריד את הכמות משמעותית, אבל לא לאפס.</li>)
    if (x.energy === 'high') notes.push(<li key={`e-${x.he}`}><strong>{x.he}</strong> גודל לעבודה לאורך שעות. בלי תעסוקה מנטלית קבועה, חלק ניכר ממה שנראה כמו בעיית התנהגות הוא בעצם אנרגיה שלא מצאה לאן ללכת.</li>)
  })
  if (br?.cross) notes.push(<li key="cross"><strong>מוצא:</strong> {br.cross}</li>)
  if (br2) {
    notes.push(<li key="mix">תערובת של שני גזעים אינה ממוצע שלהם. תכונות עוברות בירושה בנפרד, ולכן אפשר לקבל את האנרגיה של האחד יחד עם הסף הרגשי של השני.</li>)
    if (!picks.includes('signals')) picks.push('signals')
  }

  return (
    <div className="foryou">
      <p className="fy-kicker"><Icon name="bolt" /> מה רלוונטי ל{profile.name ? name : 'כלב שלך'}</p>
      {st && (<><h3>{st.head}</h3><p>{st.body(name)}</p></>)}
      {notes.length > 0 && (<><h4>מה שווה לדעת על הגזע</h4><ul>{notes}</ul></>)}
      {picks.length > 0 && (
        <ul className="fy-list">
          {picks.map((k) => {
            const l = LINKS[k]
            return (
              <li key={k}><Link to={l.to}><Icon name={l.icon} /><span><b>{l.t}</b><small>{l.s}</small></span></Link></li>
            )
          })}
        </ul>
      )}
      <p className="hint" style={{ marginTop: '1rem' }}>
        המידע כאן מבוסס על שלב החיים ועל נטיות גידוליות כלליות. הוא לא ראה את {name} ואינו אבחון — ההבדלים בין פרטים בתוך אותו גזע גדולים לרוב מההבדלים בין הגזעים.
      </p>
    </div>
  )
}
