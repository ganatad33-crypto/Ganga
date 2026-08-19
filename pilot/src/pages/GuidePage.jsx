import { useState } from 'react'
import { Link } from 'react-router-dom'
import { motion, useReducedMotion } from 'framer-motion'
import { Icon } from '../icons.jsx'
import { TREES } from '../data/trees.js'
import Journey from '../Journey.jsx'

const SITUATIONS = [
  { key: 'growl',     icon: 'dog',   t: 'ביקשתי מהכלב לרדת מהספה והוא נהם עליי', s: 'נהמה, חשיפת שיניים, או מתח כשמתקרבים אליו' },
  { key: 'leash',     icon: 'leash', t: 'הכלב מושך ברצועה', s: 'הליכה, ציוד, ותגובתיות לכלבים או לאופניים' },
  { key: 'alone',     icon: 'house', t: 'הרס או נביחה כשאני לא בבית', s: 'איך מבדילים בין שעמום למצוקה אמיתית — וזה משנה הכל' },
  { key: 'vomit',     icon: 'cross', t: 'הכלב הקיא', s: 'מיון ראשוני — מה מסתכלים עליו בבית ומתי מרימים טלפון לווטרינר' },
  { key: 'diarrhea',  icon: 'cross', t: 'לכלב יש שלשול', s: 'מיון ראשוני, כולל מה שמצריך פנייה מיידית' },
  { key: 'barkingpasser', icon: 'sound', t: 'הכלב נובח על עוברים ושבים', s: 'מהחלון, בטיול, או כשמישהו נכנס הביתה' },
  { key: 'noisefear', icon: 'alert', t: 'הכלב פוחד מרעשים', s: 'רעמים, זיקוקים, ומתי זה דורש יותר מהרגלה' },
  { key: 'recall', icon: 'dog', t: 'הכלב לא בא כשקוראים לו', s: 'מה שקורה בפועל כשקוראים לו מסביר את הסיבה' },
  { key: 'limping', icon: 'cross', t: 'הכלב צולע או מסרב לעלות מדרגות', s: 'מיון ראשוני — מה מצריך בדיקה היום ומה אפשר לעקוב אחריו' },
  { key: 'scratching', icon: 'cross', t: 'הכלב מגרד יותר מדי', s: 'איפה ומתי הגירוד קורה מצמצם משמעותית את הסיבה' },
  { key: 'marking', icon: 'house', t: 'כלב מאולף מתחיל לסמן בבית', s: 'לרוב זה לא נסיגה סתמית — יש סיבה ספציפית' },
]

export default function GuidePage() {
  const [treeKey, setTreeKey] = useState(null)
  const reduce = useReducedMotion()
  const tree = treeKey ? TREES[treeKey] : null

  return (
    <div className="wrap">
      <h1>מה קרה?</h1>
      <p className="lede">אותה התנהגות יכולה לנבוע מכמה סיבות שונות לגמרי. במקום לתת לכם תשובה ממוצעת שלא מתאימה לאף אחד, נשאל כמה שאלות קצרות ונגיע להסבר שמתאים למה שקרה אצלכם.</p>

      {!treeKey ? (
        <motion.div id="picker" initial={reduce ? false : { opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.4 }}>
          <p><strong>בחרו מה קרה:</strong></p>
          <ul className="situations">
            {SITUATIONS.map((s) => (
              <li key={s.key}>
                <button type="button" onClick={() => setTreeKey(s.key)}>
                  <Icon name={s.icon} />
                  <span><b>{s.t}</b><small>{s.s}</small></span>
                </button>
              </li>
            ))}
          </ul>
          <p className="j-help">בקרוב: עוד מצבים יתווספו כאן</p>
          <p>עמודי עומק בנושאים האלה: <Link to="/aggression">תוקפנות</Link> · <Link to="/separation">חרדת נטישה</Link> · <Link to="/puppy">גור חדש בבית</Link></p>
        </motion.div>
      ) : (
        <>
          {tree.medical && (
            <div className="medical">
              <p><strong>שימו לב.</strong> המסלול הזה הוא כלי עזר לקבלת החלטה, לא אבחון. הוא לא רואה את הכלב שלכם, לא יודע את ההיסטוריה הרפואית שלו ולא מחליף בדיקה. בכל ספק — התקשרו לווטרינר. עדיף שיחת טלפון מיותרת מאשר המתנה מיותרת.</p>
            </div>
          )}
          <Journey treeKey={treeKey} onProfileOpen={() => {}} />
          <p style={{ marginTop: '1.5rem' }}>
            <button className="btn btn-plain" type="button" onClick={() => setTreeKey(null)}>בחירת מצב אחר</button>
          </p>
        </>
      )}

      <h2>איך זה עובד</h2>
      <p>כל שאלה מצמצמת את טווח ההסברים האפשריים. אנחנו מתחילים תמיד מהשאלות שיכולות לשנות הכל — האם הייתה נשיכה, האם ההתנהגות חדשה, האם יש סימן שדורש וטרינר — ורק אז נכנסים להסבר ההתנהגותי.</p>
      <p>אם הזנתם את גיל הכלב, חלק מהתשובות יכללו גם פסקה שמתאימה דווקא לשלב החיים שלו. גור בן 9 חודשים וכלב בן 4 לא מקבלים את אותה תשובה, כי אצלם באמת קורים דברים שונים.</p>
      <p><strong>שום דבר ממה שאתם עונים לא נשלח לשום מקום.</strong> אין כאן שרת ואין איסוף נתונים. הכל רץ בדפדפן שלכם, והפרופיל נשמר מקומית במכשיר.</p>
      <p><strong>לפני הכל, שווה ללמוד לראות.</strong> חלק גדול מהשאלות כאן נפתרות מוקדם יותר אצל מי שמזהה את <Link to="/signals">הסימנים המוקדמים</Link> — הם מופיעים הרבה לפני שמשהו מתפוצץ.</p>

      <p className="sitefoot">כל התוכן באתר הוא מידע כללי בגדר המלצה בלבד. הוא אינו מהווה ייעוץ וטרינרי, אבחון רפואי או תוכנית אילוף פרטנית, ואינו מחליף בדיקה של וטרינר מורשה או ליווי של מאלף מוסמך שרואה את הכלב. במצב חירום רפואי — פנו מיד לווטרינר או לחדר מיון וטרינרי.</p>
    </div>
  )
}
