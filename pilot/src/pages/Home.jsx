import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  motion, useScroll, useTransform, useSpring,
  useInView, animate, useReducedMotion,
} from 'framer-motion'
import heroPhoto from '../assets/img/hero.webp'
import signalsPhoto from '../assets/img/signals.webp'

/* ═════════ נתונים ═════════ */

const STAGES = [
  { n: 1, t: 'לראות',        d: 'לקרוא שפת גוף, לזהות מתח ובקשת מרחב' },
  { n: 2, t: 'להבין',        d: 'איך כלב לומד — תזמון, חיזוק, הכללה' },
  { n: 3, t: 'לתקשר',        d: 'מה אתם משדרים בלי לשים לב' },
  { n: 4, t: 'לחיות',        d: 'השגרה שמונעת את רוב הבעיות מראש' },
  { n: 5, t: 'לתקן',         d: 'נביחה, תוקפנות, חרדת נטישה, גור חדש' },
  { n: 6, t: 'לנוע בעולם',   d: 'כלבים זרים, גן כלבים, ילדים, אורחים' },
  { n: 7, t: 'לאורך החיים',  d: 'גור, בוגר, מבוגר — מה משתנה ומתי' },
]

const ENTRIES = [
  { t: 'לקרוא כלב',      d: 'עשרה סימנים שאומרים "אני לא בנוח", והסולם שמסביר למה כלבים "נושכים בלי אזהרה".', img: signalsPhoto, to: '/signals' },
  { t: 'מה קרה לכלב שלי', d: 'תארו מה קרה, ענו על כמה שאלות, וקבלו הסבר שמתאים למצב שלכם ולגיל הכלב.', to: '/guide' },
  { t: 'שלושה מקרים',     d: 'הקשת המלאה של תהליך — מה נראה בהתחלה, איפה כולם טעו, ומתי משהו נסדק לטובה.', to: '/cases' },
  { t: 'שאלות ותשובות',   d: 'שלושים שאלות שבעלי כלבים באמת שואלים, עם תשובות קצרות וישירות.', to: '/qa' },
]

/* ═════════ עזרים ═════════ */

function Counter({ to, suffix = '' }) {
  const ref = useRef(null)
  const inView = useInView(ref, { once: true, margin: '-80px' })
  const [v, setV] = useState(0)
  const reduce = useReducedMotion()
  useEffect(() => {
    if (!inView) return
    if (reduce) { setV(to); return }
    const c = animate(0, to, { duration: 1.4, ease: [0.22, 1, 0.36, 1], onUpdate: (x) => setV(Math.round(x)) })
    return () => c.stop()
  }, [inView, to, reduce])
  return <span ref={ref} className="tabular-nums">{v.toLocaleString('he-IL')}{suffix}</span>
}

function Reveal({ children, delay = 0, y = 26 }) {
  const reduce = useReducedMotion()
  return (
    <motion.div
      initial={reduce ? false : { opacity: 0, y, filter: 'blur(6px)' }}
      whileInView={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
      viewport={{ once: true, margin: '-70px' }}
      transition={{ duration: 0.65, delay, ease: [0.22, 1, 0.36, 1] }}
    >{children}</motion.div>
  )
}

/* ═════════ המסלול — הקו שמתמלא לפי הגלילה ═════════ */

function PathTrack() {
  const ref = useRef(null)
  const reduce = useReducedMotion()
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start 0.75', 'end 0.55'] })
  const fill = useSpring(scrollYProgress, { stiffness: 90, damping: 26, restDelta: 0.001 })
  const height = useTransform(fill, (v) => `${v * 100}%`)

  return (
    <div ref={ref} className="relative">
      <div className="absolute top-3 bottom-3 right-[22px] w-[3px] rounded-full bg-line" aria-hidden="true" />
      <motion.div
        className="absolute top-3 right-[22px] w-[3px] rounded-full bg-gradient-to-b from-accentfill to-olive origin-top"
        style={{ height: reduce ? '100%' : height }}
        aria-hidden="true"
      />
      <ol className="space-y-3 m-0 p-0 list-none">
        {STAGES.map((s, i) => (
          <PathItem key={s.n} s={s} i={i} progress={fill} reduce={reduce} />
        ))}
      </ol>
    </div>
  )
}

function PathItem({ s, i, progress, reduce }) {
  const [on, setOn] = useState(reduce)
  useEffect(() => {
    if (reduce) return
    const threshold = (i + 0.55) / STAGES.length
    const un = progress.on('change', (v) => setOn(v >= threshold))
    return un
  }, [i, progress, reduce])

  return (
    <li className="relative flex gap-5 pr-14 min-h-[62px]">
      <motion.span
        className="absolute right-0 top-1 grid place-items-center w-[47px] h-[47px] rounded-full border-[3px] font-bold text-[0.95rem] shrink-0"
        animate={{
          backgroundColor: on ? 'var(--color-accentfill)' : 'var(--color-surface)',
          borderColor:     on ? 'var(--color-accentfill)' : 'var(--color-line)',
          color:           on ? '#ffffff' : 'var(--color-muted)',
          scale:           on ? 1 : 0.92,
        }}
        transition={{ type: 'spring', stiffness: 300, damping: 22 }}
      >{s.n}</motion.span>
      <div className="pt-1">
        <h3 className="text-[1.15rem] font-bold m-0 leading-snug">{s.t}</h3>
        <p className="text-muted text-[0.95rem] m-0 leading-relaxed">{s.d}</p>
      </div>
    </li>
  )
}

/* ═════════ העמוד ═════════ */

export default function Home() {
  const reduce = useReducedMotion()
  const heroRef = useRef(null)
  const { scrollYProgress: heroP } = useScroll({ target: heroRef, offset: ['start start', 'end start'] })
  const artY = useTransform(heroP, [0, 1], [0, reduce ? 0 : 90])
  const artScale = useTransform(heroP, [0, 1], [1, reduce ? 1 : 1.07])

  return (
    <main className="mx-auto max-w-5xl px-5 pb-24">

      {/* פתיחה */}
      <section ref={heroRef} className="pt-10 pb-6">
        <div className="grid lg:grid-cols-12 gap-8 items-end">
          <motion.p
            className="lg:col-span-4 text-[0.95rem] text-muted max-w-[22ch] m-0 border-r-[3px] border-accentfill pr-4"
            initial={reduce ? false : { opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: .6, delay: .05, ease: [.22, 1, .36, 1] }}
          >מדריך עברי לבעלי כלבים · נכתב להבנה, לא לשינון</motion.p>

          <div className="lg:col-span-8">
            <motion.h1
              className="text-[clamp(2rem,6vw,3.4rem)] font-medium leading-[1.12] tracking-tight m-0 mb-3"
              initial={reduce ? false : { opacity: 0, y: 22, filter: 'blur(8px)' }}
              animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
              transition={{ duration: .75, delay: .12, ease: [.22, 1, .36, 1] }}
            >להבין את הכלב שלך, צעד אחר צעד</motion.h1>

            <motion.p
              className="text-[1.15rem] text-muted leading-relaxed m-0"
              initial={reduce ? false : { opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: .7, delay: .24, ease: [.22, 1, .36, 1] }}
            >רוב התוכן על כלבים נכתב למי שיש לו בעיה עכשיו. כאן זה נכתב גם למי שרוצה להבין — ולומד ללכת בעולם הזה, לא רק לכבות שריפות.</motion.p>
          </div>
        </div>

        <motion.div
          className="mt-8 rounded-3xl overflow-hidden shadow-[0_10px_40px_rgba(90,60,30,.14)] border border-line"
          style={{ y: artY, scale: artScale }}
          initial={reduce ? false : { opacity: 0, y: 30 }}
          animate={{ opacity: 1 }}
          transition={{ duration: .9, delay: .3, ease: [.22, 1, .36, 1] }}
        >
          <img
            src={heroPhoto}
            alt="אדם וכלב הולכים יחד בשביל עפר בשעת בין ערביים, על רצועה משוחררת"
            className="w-full h-auto block"
            width={1168}
            height={784}
            loading="eager"
            fetchPriority="high"
          />
        </motion.div>
      </section>

      {/* מספרים */}
      <section className="grid grid-cols-3 gap-3 py-10">
        {[['עמודי עומק', 15], ['מילות תוכן', 21452], ['גזעים במאגר', 30]].map(([label, n], i) => (
          <Reveal key={label} delay={i * 0.08}>
            <div className="rounded-2xl border border-line bg-surface px-4 py-5 text-center shadow-sm">
              <div className="font-display text-[1.9rem] text-accent leading-none">
                <Counter to={n} />
              </div>
              <div className="text-[0.82rem] text-muted mt-1">{label}</div>
            </div>
          </Reveal>
        ))}
      </section>

      {/* מאיפה מתחילים */}
      <section className="py-8">
        <Reveal><h2 className="text-[1.7rem] font-bold m-0 mb-6 pt-6 border-t border-line">מאיפה מתחילים</h2></Reveal>
        <div className="grid sm:grid-cols-2 gap-4">
          {ENTRIES.map((e, i) => (
            <Reveal key={e.t} delay={i * 0.07}>
              <motion.div
                whileHover={reduce ? {} : { y: -6, boxShadow: '0 14px 34px rgba(90,60,30,.14)', borderColor: 'var(--color-accentfill)' }}
                transition={{ type: 'spring', stiffness: 320, damping: 22 }}
                className="rounded-2xl border border-line bg-surface shadow-sm h-full"
              >
                <Link to={e.to} className="block relative overflow-hidden rounded-2xl p-5 no-underline text-ink h-full">
                  {e.img ? (
                    <div className="-m-5 mb-4 h-36 overflow-hidden">
                      <img src={e.img} alt="" className="w-full h-full object-cover" loading="lazy" />
                    </div>
                  ) : (
                    <span className="absolute inset-x-0 top-0 h-[3px] bg-gradient-to-l from-accentfill to-olive" aria-hidden="true" />
                  )}
                  <h3 className="text-[1.15rem] font-bold m-0 mb-1">{e.t}</h3>
                  <p className="text-[0.95rem] text-muted m-0 leading-relaxed">{e.d}</p>
                </Link>
              </motion.div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* המסלול */}
      <section className="py-10">
        <Reveal>
          <h2 className="text-[1.7rem] font-bold m-0 mb-2 pt-6 border-t border-line">המסלול</h2>
          <p className="text-muted m-0 mb-8">לא אוסף טיפים — רצף. גללו, והקו מתמלא איתכם.</p>
        </Reveal>
        <PathTrack />
      </section>
    </main>
  )
}
