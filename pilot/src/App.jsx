import { useEffect, useRef, useState } from 'react'
import {
  motion, useScroll, useTransform, useSpring,
  useInView, useMotionValue, animate, useReducedMotion,
} from 'framer-motion'
import Lenis from 'lenis'

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
  { t: 'לקרוא כלב',      d: 'עשרה סימנים שאומרים "אני לא בנוח", והסולם שמסביר למה כלבים "נושכים בלי אזהרה".' },
  { t: 'מה קרה לכלב שלי', d: 'תארו מה קרה, ענו על כמה שאלות, וקבלו הסבר שמתאים למצב שלכם ולגיל הכלב.' },
  { t: 'שלושה מקרים',     d: 'הקשת המלאה של תהליך — מה נראה בהתחלה, איפה כולם טעו, ומתי משהו נסדק לטובה.' },
  { t: 'שאלות ותשובות',   d: 'שלושים שאלות שבעלי כלבים באמת שואלים, עם תשובות קצרות וישירות.' },
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

/* ═════════ איור הפתיחה ═════════ */

function HeroArt() {
  return (
    <svg viewBox="0 0 800 400" className="w-full h-auto" role="img" aria-label="איור: אדם והכלב שלו הולכים בשדה בשעת בין ערביים">
      <defs>
        <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#F7DFC6" /><stop offset="55%" stopColor="#FAEDDD" /><stop offset="100%" stopColor="#FBF7EF" />
        </linearGradient>
        <linearGradient id="h1" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#A9B486" /><stop offset="100%" stopColor="#93A171" /></linearGradient>
        <linearGradient id="h2" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#6E7C46" /><stop offset="100%" stopColor="#5A6739" /></linearGradient>
        <clipPath id="fr"><rect width="800" height="400" rx="22" /></clipPath>
      </defs>
      <g clipPath="url(#fr)">
        <rect width="800" height="400" fill="url(#sky)" />
        <circle cx="596" cy="150" r="74" fill="#EFB98C" opacity=".55" />
        <circle cx="596" cy="150" r="46" fill="#E8A473" opacity=".65" />
        <g fill="#fff" opacity=".55">
          <ellipse cx="180" cy="86" rx="58" ry="17" /><ellipse cx="214" cy="76" rx="38" ry="15" />
          <ellipse cx="660" cy="60" rx="46" ry="13" /><ellipse cx="688" cy="52" rx="30" ry="11" />
        </g>
        <path d="M-20 268c120-46 224-30 318 2 96 33 190 26 288-14 62-25 130-30 234-8v170H-20z" fill="url(#h1)" />
        <path d="M-20 316c150-40 250-16 356 10 92 22 186 12 274-20 54-20 118-22 210-2v116H-20z" fill="url(#h2)" />
        <g>
          <rect x="120" y="228" width="8" height="46" rx="4" fill="#6B5238" />
          <circle cx="124" cy="218" r="28" fill="#4E5B2E" /><circle cx="105" cy="230" r="19" fill="#59683A" /><circle cx="142" cy="231" r="17" fill="#59683A" />
          <rect x="700" y="246" width="7" height="40" rx="3.5" fill="#6B5238" />
          <circle cx="703" cy="238" r="23" fill="#4E5B2E" /><circle cx="686" cy="248" r="15" fill="#59683A" />
        </g>
        <path d="M-20 400C120 356 236 344 348 348s214 20 300 52" fill="none" stroke="#E4D6BA" strokeWidth="32" strokeLinecap="round" />
        <g transform="translate(300,196)">
          <path d="M20 62l-8 62h13l10-46 9 46h13l-6-62z" fill="#3E3428" />
          <path d="M12 14h30c7 0 12 6 11 13l-6 40H8L3 27C2 20 6 14 12 14z" fill="#9E4A26" />
          <path d="M44 22c9 5 15 13 18 23" fill="none" stroke="#9E4A26" strokeWidth="9" strokeLinecap="round" />
          <circle cx="27" cy="-2" r="15" fill="#E8C9A8" />
          <path d="M12 -4c0-11 7-17 15-17s15 6 15 17c0 3-30 4-30 0z" fill="#3E3428" />
        </g>
        <path d="M363 240c30 12 52 26 74 38" fill="none" stroke="#8E4526" strokeWidth="3" strokeLinecap="round" opacity=".85" />
        <g transform="translate(430,268)">
          <ellipse cx="34" cy="16" rx="34" ry="19" fill="#B5613F" />
          <path d="M8 30v22M24 32v20M46 32v20M62 29v23" stroke="#B5613F" strokeWidth="9" strokeLinecap="round" />
          <path d="M66 8c10-12 18-9 16 2-1 8-8 12-14 10" fill="#B5613F" />
          <circle cx="9" cy="-4" r="16" fill="#C06E4A" />
          <path d="M-3 -16c-6-9-3-15 5-11l6 4z" fill="#9E4A26" />
          <path d="M-6 -2c-8 1-11 5-10 9 1 4 6 5 11 3" fill="#C06E4A" />
          <circle cx="-9" cy="1" r="2.6" fill="#3E3428" /><circle cx="10" cy="-7" r="2.4" fill="#3E3428" />
        </g>
      </g>
    </svg>
  )
}

/* ═════════ המסלול — הקו שמתמלא לפי הגלילה ═════════ */

function Journey() {
  const ref = useRef(null)
  const reduce = useReducedMotion()
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start 0.75', 'end 0.55'] })
  const fill = useSpring(scrollYProgress, { stiffness: 90, damping: 26, restDelta: 0.001 })
  const height = useTransform(fill, (v) => `${v * 100}%`)

  return (
    <div ref={ref} className="relative">
      {/* המסילה */}
      <div className="absolute top-3 bottom-3 right-[22px] w-[3px] rounded-full bg-line" aria-hidden="true" />
      {/* המילוי — נע עם הגלילה */}
      <motion.div
        className="absolute top-3 right-[22px] w-[3px] rounded-full bg-gradient-to-b from-accentfill to-olive origin-top"
        style={{ height: reduce ? '100%' : height }}
        aria-hidden="true"
      />
      <ol className="space-y-3 m-0 p-0 list-none">
        {STAGES.map((s, i) => (
          <JourneyItem key={s.n} s={s} i={i} progress={fill} reduce={reduce} />
        ))}
      </ol>
    </div>
  )
}

function JourneyItem({ s, i, progress, reduce }) {
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

export default function App() {
  const reduce = useReducedMotion()
  const { scrollYProgress } = useScroll()
  const bar = useSpring(scrollYProgress, { stiffness: 120, damping: 30, restDelta: 0.001 })

  /* גלילה חלקה */
  useEffect(() => {
    if (reduce) return
    const lenis = new Lenis({ duration: 1.05, smoothWheel: true })
    let id
    const raf = (t) => { lenis.raf(t); id = requestAnimationFrame(raf) }
    id = requestAnimationFrame(raf)
    return () => { cancelAnimationFrame(id); lenis.destroy() }
  }, [reduce])

  /* פרלקסה על איור הפתיחה */
  const heroRef = useRef(null)
  const { scrollYProgress: heroP } = useScroll({ target: heroRef, offset: ['start start', 'end start'] })
  const artY = useTransform(heroP, [0, 1], [0, reduce ? 0 : 90])
  const artScale = useTransform(heroP, [0, 1], [1, reduce ? 1 : 1.07])

  return (
    <>
      {/* פס התקדמות קריאה */}
      <motion.div
        className="fixed top-0 inset-x-0 h-[3px] origin-right z-50 bg-gradient-to-l from-accentfill to-olive"
        style={{ scaleX: bar }}
        aria-hidden="true"
      />

      {/* ניווט */}
      <header className="sticky top-0 z-40 border-b border-line bg-cream/85 backdrop-blur-md">
        <div className="mx-auto max-w-5xl px-5 py-3 flex items-center gap-3">
          <span className="grid place-items-center w-9 h-9 rounded-xl bg-accentsoft text-accent">
            <svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor" aria-hidden="true">
              <ellipse cx="7" cy="8" rx="2.1" ry="2.7" /><ellipse cx="12" cy="6.4" rx="2.1" ry="2.9" />
              <ellipse cx="17" cy="8" rx="2.1" ry="2.7" /><ellipse cx="20" cy="12.8" rx="1.9" ry="2.3" />
              <path d="M12 11.4c2.6 0 5.4 2.3 5.4 4.9 0 2-1.6 3.3-3.6 3.3-1 0-1.3-.3-1.8-.3s-.8.3-1.8.3c-2 0-3.6-1.3-3.6-3.3 0-2.6 2.8-4.9 5.4-4.9z" />
            </svg>
          </span>
          <span className="font-display font-bold text-xl">כלבלב</span>
          <span className="text-xs text-muted">פיילוט</span>
          <nav className="mr-auto hidden sm:flex gap-1 text-[0.93rem]">
            {['לקרוא כלב', 'להבין', 'לחיות', 'שאלות'].map((t) => (
              <a key={t} href="#" className="px-3 py-2 rounded-lg text-muted hover:text-accent hover:bg-accentsoft transition-colors">{t}</a>
            ))}
          </nav>
        </div>
      </header>

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
            <HeroArt />
          </motion.div>
        </section>

        {/* מספרים */}
        <section className="grid grid-cols-3 gap-3 py-10">
          {[['עמודי עומק', 12], ['מילות תוכן', 21452], ['גזעים במאגר', 30]].map(([label, n], i) => (
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
                <motion.a
                  href="#"
                  className="block relative overflow-hidden rounded-2xl border border-line bg-surface p-5 shadow-sm no-underline text-ink h-full"
                  whileHover={reduce ? {} : { y: -6, boxShadow: '0 14px 34px rgba(90,60,30,.14)', borderColor: 'var(--color-accentfill)' }}
                  transition={{ type: 'spring', stiffness: 320, damping: 22 }}
                >
                  <span className="absolute inset-x-0 top-0 h-[3px] bg-gradient-to-l from-accentfill to-olive" aria-hidden="true" />
                  <h3 className="text-[1.15rem] font-bold m-0 mb-1">{e.t}</h3>
                  <p className="text-[0.95rem] text-muted m-0 leading-relaxed">{e.d}</p>
                </motion.a>
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
          <Journey />
        </section>

        <Reveal>
          <p className="mt-10 pt-6 border-t border-line text-[0.85rem] text-muted">
            זו גרסת פיילוט של דף הבית בלבד, שנבנתה ב-Vite + Tailwind 4 + Framer Motion כדי להשוות מול הגרסה הסטטית.
            התוכן זהה; מה שהשתנה הוא איך הוא מתנהג.
          </p>
        </Reveal>
      </main>
    </>
  )
}
