import { useEffect, useState } from 'react'
import { BREEDS, BREED_ORDER } from '../data/breeds.js'
import { useDogProfile } from '../dog.js'
import ForYou from '../ForYou.jsx'

const VOICE_LABEL = { low: 'נמוכה', mid: 'בינונית', high: 'גבוהה' }

function BreedCard({ breedKey }) {
  const b = BREEDS[breedKey]
  if (!b) return null
  return (
    <div className="breedcard">
      <h3>{b.he}<span className="hint"> · {b.en}</span></h3>
      <dl>
        <dt>האם זו הכלאה</dt><dd>{b.cross || 'לא רלוונטי — אין ייעוד גידולי אחד.'}</dd>
        <dt>למה גידלו אותו</dt><dd>{b.built}</dd>
        <dt>מה כדאי לדעת</dt><dd>{b.note}</dd>
        {b.caveat && (<><dt>הסתייגות</dt><dd>{b.caveat}</dd></>)}
      </dl>
      <div className="tags">
        <span className="tag">נטיית נביחה: {VOICE_LABEL[b.voice]}</span>
        <span className="tag">צורך בפעילות: {VOICE_LABEL[b.energy]}</span>
      </div>
    </div>
  )
}

export default function ProfilePage() {
  const { profile, save, clear } = useDogProfile()
  const [name, setName] = useState('')
  const [years, setYears] = useState('')
  const [months, setMonths] = useState('')
  const [breedKey, setBreedKey] = useState('')
  const [mixed, setMixed] = useState(false)
  const [breedKey2, setBreedKey2] = useState('')
  const [savedFlash, setSavedFlash] = useState(false)

  useEffect(() => {
    if (!profile) return
    setName(profile.name || '')
    if (profile.months != null) {
      setYears(String(Math.floor(profile.months / 12) || ''))
      setMonths(String(profile.months % 12 || ''))
    }
    setBreedKey(profile.breedKey || '')
    if (profile.breedKey2) { setMixed(true); setBreedKey2(profile.breedKey2) }
  }, [])

  function onSubmit(e) {
    e.preventDefault()
    const y = parseInt(years, 10) || 0
    const m = parseInt(months, 10) || 0
    const total = y * 12 + m
    save({
      name: name.trim(),
      months: (y || m) ? total : null,
      breedKey: breedKey || null,
      breedKey2: (mixed && breedKey2) ? breedKey2 : null,
      breed: breedKey ? BREEDS[breedKey].he : null,
      breed2: (mixed && breedKey2) ? BREEDS[breedKey2].he : null,
    })
    setSavedFlash(true)
    setTimeout(() => setSavedFlash(false), 2500)
  }

  function onClear() {
    clear()
    setName(''); setYears(''); setMonths(''); setBreedKey(''); setMixed(false); setBreedKey2('')
  }

  return (
    <div className="wrap">
      <h1>הכלב שלי</h1>
      <p className="lede">גיל הכלב משנה כמעט כל תשובה באתר. גור בן 9 חודשים וכלב בן 4 שעושים בדיוק את אותה התנהגות — עושים אותה לרוב מסיבות שונות, ומטפלים בהן אחרת.</p>
      <p><strong>הפרטים נשמרים בדפדפן שלכם בלבד.</strong> אין כאן שרת, שום דבר לא נשלח לשום מקום, ואפשר למחוק בכל רגע.</p>

      <form className="pform" onSubmit={onSubmit}>
        <div>
          <label htmlFor="f-name">שם הכלב <span className="hint">לא חובה</span></label>
          <input id="f-name" type="text" autoComplete="off" placeholder="למשל: לונה" value={name} onChange={(e) => setName(e.target.value)} />
        </div>

        <div className="row2">
          <div>
            <label htmlFor="f-years">גיל — שנים</label>
            <input id="f-years" type="number" min="0" max="25" inputMode="numeric" placeholder="0" value={years} onChange={(e) => setYears(e.target.value)} />
          </div>
          <div>
            <label htmlFor="f-months">ובנוסף חודשים</label>
            <input id="f-months" type="number" min="0" max="11" inputMode="numeric" placeholder="9" value={months} onChange={(e) => setMonths(e.target.value)} />
          </div>
        </div>
        <p className="hint">לא יודעים בדיוק? הערכה מספיקה. גם "בערך שנתיים" משנה את התשובות.</p>

        <div>
          <label htmlFor="f-breed">גזע</label>
          <select id="f-breed" value={breedKey} onChange={(e) => setBreedKey(e.target.value)}>
            <option value="">בחרו גזע</option>
            {BREED_ORDER.map((k) => <option key={k} value={k}>{BREEDS[k].he}</option>)}
          </select>
        </div>

        <div>
          <label><input type="checkbox" style={{ width: 'auto' }} checked={mixed} onChange={(e) => { setMixed(e.target.checked); if (!e.target.checked) setBreedKey2('') }} /> הכלב שלי מעורב בגזע נוסף</label>
        </div>

        {mixed && (
          <div>
            <label htmlFor="f-breed2">מעורב עם</label>
            <select id="f-breed2" value={breedKey2} onChange={(e) => setBreedKey2(e.target.value)}>
              <option value="">בחרו גזע נוסף</option>
              {BREED_ORDER.map((k) => <option key={k} value={k}>{BREEDS[k].he}</option>)}
            </select>
          </div>
        )}

        <div className="actions">
          <button className="btn" type="submit">שמירה</button>
          <button className="btn btn-plain" type="button" onClick={onClear}>מחיקת הפרטים</button>
          {savedFlash && <span className="hint">נשמר.</span>}
        </div>
      </form>

      <ForYou />

      {breedKey && (
        <div id="breed-info">
          <h2>על הגזע</h2>
          <BreedCard breedKey={breedKey} />
          {mixed && breedKey2 && (
            <>
              <BreedCard breedKey={breedKey2} />
              <div className="medical">
                <p><strong>ולגבי הערבוב עצמו.</strong> תערובת של שני גזעים אינה ממוצע שלהם. תכונות עוברות בירושה בנפרד — אפשר בהחלט לקבל את רמת האנרגיה של האחד יחד עם הסף הרגשי של השני, ולא משהו באמצע. השתמשו במידע כאן כדי להבין <em>אילו נטיות ייתכנו</em>, לא כדי לחזות מה יקרה.</p>
              </div>
            </>
          )}
          <p className="hint">המידע כאן הוא היסטורי וגידולי — הוא מסביר נטיות של הגזע, לא את הכלב שלכם. ההבדלים בין פרטים בתוך אותו גזע גדולים לרוב מההבדלים בין הגזעים. זיהוי גזע לפי מראה בלבד נמצא במחקרים כלא מדויק ברוב המקרים.</p>
        </div>
      )}

      <h2>שלבי החיים שאנחנו עובדים לפיהם</h2>
      <ul>
        <li><strong>גור — עד 6 חודשים.</strong> חלון הסוציאליזציה והבנייה. מה שנבנה כאן משפיע על כל החיים.</li>
        <li><strong>מתבגר — 6 עד 18 חודשים.</strong> השלב שהכי מפתיע בעלים. מחקרים מתארים שבשלב הזה הדחף הרגשי מקדים את התפתחות השליטה בדחפים, ולכן דברים שכבר עבדו נשברים זמנית. זו לא רגרסיה באילוף ולא "הוא מנסה אותך".</li>
        <li><strong>בוגר — שנה וחצי עד 7 שנים.</strong> יציב יחסית. מה שרואים כאן הוא בדרך כלל מה שנבנה קודם.</li>
        <li><strong>מבוגר — מגיל 7 בערך.</strong> משתנה מאוד לפי גודל: גזעים גדולים מזדקנים מוקדם יותר, קטנים מאוחר יותר. בשלב הזה כל שינוי התנהגותי מצדיק קודם כל בדיקה וטרינרית.</li>
      </ul>

      <p className="sitefoot">כל התוכן באתר הוא מידע כללי בגדר המלצה בלבד. הוא אינו מהווה ייעוץ וטרינרי, אבחון רפואי או תוכנית אילוף פרטנית, ואינו מחליף בדיקה של וטרינר מורשה או ליווי של מאלף מוסמך שרואה את הכלב.</p>
    </div>
  )
}
