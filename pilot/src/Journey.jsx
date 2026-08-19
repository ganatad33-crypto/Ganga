import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'
import { TREES, NEVER_PUNISH } from './data/trees.js'
import { md, useDogProfile } from './dog.js'

const CLEAN_HTML =
  '<h4>ואיך מנקים</h4>' +
  '<ul>' +
  '<li>קודם להרים את המוצק עם נייר, בלי לשפשף. שפשוף דוחס את זה פנימה לתוך הסיבים.</li>' +
  '<li>לספוג את הנוזל בלחיצה עם מגבת נייר או מטלית — לא לשפשף.</li>' +
  '<li>לנקות עם <strong>מנקה אנזימטי</strong> לחיות מחמד. אנזימים מפרקים את השאריות האורגניות; סבון רגיל רק מכסה את הריח, והכלב עדיין מריח אותו.</li>' +
  '<li><strong>להימנע ממנקים על בסיס אמוניה.</strong> הריח שלהם דומה לשתן, והוא עלול דווקא למשוך את הכלב לסמן שוב באותו מקום.</li>' +
  '<li>על שטיח — לספוג, להרטיב במנקה אנזימטי, להשאיר להיספג לפי ההוראות, ורק אז לספוג שוב.</li>' +
  '</ul>'

/* מסע שאלות ותשובות — פורט מ-assets/journey.js לרכיב React אמיתי. */
export default function Journey({ treeKey, onProfileOpen }) {
  const tree = TREES[treeKey]
  const [path, setPath] = useState([tree.start])
  const { band } = useDogProfile()
  const reduce = useReducedMotion()
  const navigate = useNavigate()

  if (!tree) return <p>לא נמצא.</p>

  /* לוכד קליקים על קישורים פנימיים בתוך תוכן העץ (למשל הפניה מתוך
     תשובה לעמוד אחר) ומנתב אותם דרך React Router. תומך גם בצורה
     היחסית מהאתר הסטטי (../aggression/) וגם בנתיב אפליקציה מוחלט. */
  function onTreeClick(e) {
    const a = e.target.closest('a')
    if (!a) return
    const href = a.getAttribute('href')
    if (!href) return
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || a.target === '_blank') return
    if (href.startsWith('/') && !href.startsWith('//')) {
      e.preventDefault()
      navigate(href)
    } else if (href.startsWith('../')) {
      e.preventDefault()
      navigate('/' + href.replace(/^(\.\.\/)+/, '').replace(/\/$/, ''))
    }
  }

  const id = path[path.length - 1]
  const node = tree.nodes[id]

  function trail() {
    const out = []
    for (let i = 0; i < path.length - 1; i++) {
      const n = tree.nodes[path[i]]
      if (!n || !n.q) continue
      const next = path[i + 1]
      const chosen = n.opts.find((o) => o.go === next)
      if (chosen) out.push(chosen.t)
    }
    return out.join(' ← ') || '—'
  }

  function go(i) {
    setPath((p) => [...p, node.opts[i].go])
  }
  function back() { setPath((p) => p.slice(0, -1)) }
  function restart() { setPath([tree.start]) }

  const variants = {
    initial: reduce ? { opacity: 1 } : { opacity: 0, y: 14 },
    animate: { opacity: 1, y: 0 },
    exit: reduce ? { opacity: 1 } : { opacity: 0, y: -10 },
  }

  return (
    <div className="journey" onClick={onTreeClick}>
      <AnimatePresence mode="wait">
        <motion.div key={id} variants={variants} initial="initial" animate="animate" exit="exit" transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}>
          {node.q ? (
            <>
              <p className="j-step">שאלה {path.length}</p>
              <p className="j-q" dangerouslySetInnerHTML={{ __html: md(node.q) }} />
              {node.help && <p className="j-help" dangerouslySetInnerHTML={{ __html: md(node.help) }} />}
              <div className="j-opts">
                {node.opts.map((o, i) => (
                  <button key={i} className="j-opt" type="button" onClick={() => go(i)}>
                    <span dangerouslySetInnerHTML={{ __html: md(o.t) }} />
                    {o.s && <small dangerouslySetInnerHTML={{ __html: md(o.s) }} />}
                  </button>
                ))}
              </div>
            </>
          ) : (
            <div className="j-answer">
              {node.a.urgent ? (
                <div className="j-urgent">
                  <p><strong dangerouslySetInnerHTML={{ __html: md(node.a.title) }} /></p>
                  <p dangerouslySetInnerHTML={{ __html: md(node.a.urgent) }} />
                </div>
              ) : (
                <h3 dangerouslySetInnerHTML={{ __html: md(node.a.title) }} />
              )}

              {(node.a.body || []).map((p, i) => (
                <p key={i} dangerouslySetInnerHTML={{ __html: md(p) }} />
              ))}

              {node.a.age && band && node.a.age[band.id] && (
                <div className="ageblock">
                  <span className="agechip">מותאם לגיל: {band.label}</span>
                  <p dangerouslySetInnerHTML={{ __html: md(node.a.age[band.id]) }} />
                </div>
              )}
              {node.a.age && !band && (
                <div className="ageblock">
                  <p className="j-help">
                    יש כאן גם מידע שמשתנה לפי גיל הכלב.{' '}
                    <button className="btn btn-plain" type="button" onClick={onProfileOpen}>הזנת גיל</button>
                  </p>
                </div>
              )}

              {node.a.clean && <div dangerouslySetInnerHTML={{ __html: CLEAN_HTML }} />}

              {node.a.flags?.length > 0 && (
                <div className="flags">
                  <p><strong>דגלים אדומים</strong></p>
                  <ul>{node.a.flags.map((f, i) => <li key={i} dangerouslySetInnerHTML={{ __html: md(f) }} />)}</ul>
                </div>
              )}

              {node.a.todo && (
                <div className="today">
                  <p className="today-title">נסה את זה היום</p>
                  <p dangerouslySetInnerHTML={{ __html: md(node.a.todo) }} />
                </div>
              )}

              <div className="j-trail"><b>הדרך שעברת:</b> {trail()}</div>
            </div>
          )}
        </motion.div>
      </AnimatePresence>

      <div className="j-nav">
        {path.length > 1 && <button type="button" onClick={back}>חזרה לשאלה הקודמת</button>}
        <button type="button" onClick={restart}>להתחיל מחדש</button>
      </div>
    </div>
  )
}

export { NEVER_PUNISH }
