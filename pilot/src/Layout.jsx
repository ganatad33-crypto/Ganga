import { useEffect, useRef, useState } from 'react'
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { motion, useScroll, useSpring, useReducedMotion } from 'framer-motion'
import Lenis from 'lenis'
import { PAGES } from './pages-data.js'
import { Icon } from './icons.jsx'
import { useDogProfile, ageText, breedText } from './dog.js'

const THEME_KEY = 'kalbalav-theme'

function useTheme() {
  const [theme, setTheme] = useState(() => {
    try { return localStorage.getItem(THEME_KEY) } catch { return null }
  })
  useEffect(() => {
    if (theme) document.documentElement.setAttribute('data-theme', theme)
    else document.documentElement.removeAttribute('data-theme')
  }, [theme])
  function toggle() {
    const sysDark = window.matchMedia?.('(prefers-color-scheme: dark)').matches
    const cur = theme || (sysDark ? 'dark' : 'light')
    const next = cur === 'dark' ? 'light' : 'dark'
    setTheme(next)
    try { localStorage.setItem(THEME_KEY, next) } catch { /* no-op */ }
  }
  return { theme, toggle }
}

function ProfileBar() {
  const { profile, band } = useDogProfile()
  const bits = []
  if (profile?.name) bits.push(<b key="n">{profile.name}</b>)
  if (band) bits.push(<span key="b">{band.label} · {ageText(profile)}</span>)
  if (profile?.breed) bits.push(<span key="br">{breedText(profile)}</span>)

  return (
    <div className="profilebar">
      <div className="wrap">
        {bits.length ? (
          <span className="pb-text">{bits.map((b, i) => <span key={i}>{i > 0 && ' · '}{b}</span>)}</span>
        ) : (
          <span className="pb-text">התוכן באתר מותאם לגיל הכלב.</span>
        )}
        <Link className={bits.length ? 'btn btn-plain' : 'btn'} to="/profile">{bits.length ? 'שינוי' : 'הזנת פרטי הכלב'}</Link>
      </div>
    </div>
  )
}

export default function Layout() {
  const location = useLocation()
  const navigate = useNavigate()
  const reduce = useReducedMotion()
  const { theme, toggle } = useTheme()

  const cur = PAGES.find((p) => p.path === location.pathname)
  const idx = PAGES.findIndex((p) => p.path === location.pathname)
  const prev = idx > 0 ? PAGES[idx - 1] : null
  const next = idx > -1 && idx < PAGES.length - 1 ? PAGES[idx + 1] : null

  const { scrollYProgress } = useScroll()
  const bar = useSpring(scrollYProgress, { stiffness: 120, damping: 30, restDelta: 0.001 })

  useEffect(() => {
    if (reduce) return
    const lenis = new Lenis({ duration: 1.05, smoothWheel: true })
    let id
    const raf = (t) => { lenis.raf(t); id = requestAnimationFrame(raf) }
    id = requestAnimationFrame(raf)
    return () => { cancelAnimationFrame(id); lenis.destroy() }
  }, [reduce, location.pathname])

  useEffect(() => { window.scrollTo(0, 0) }, [location.pathname])

  const groups = {}
  const order = []
  PAGES.forEach((p) => {
    if (p.path === '/') return
    if (!groups[p.group]) { groups[p.group] = []; order.push(p.group) }
    groups[p.group].push(p)
  })

  return (
    <>
      <motion.div
        className="fixed top-0 inset-x-0 h-[3px] origin-right z-50 bg-gradient-to-l from-accentfill to-olive"
        style={{ scaleX: bar }}
        aria-hidden="true"
      />

      <header className="sticky top-0 z-40 border-b border-line bg-cream/85 backdrop-blur-md">
        <div className="mx-auto max-w-5xl px-5 py-3 flex items-center gap-3">
          <Link to="/" className="flex items-center gap-2 no-underline text-ink">
            <span className="grid place-items-center w-9 h-9 rounded-xl bg-accentsoft text-accent">
              <Icon name="paw" className="w-5 h-5" />
            </span>
            <span className="font-display font-bold text-xl">ויקיכלב</span>
          </Link>
          <nav className="mr-auto hidden sm:flex gap-1 text-[0.93rem]">
            {PAGES.filter((p) => p.inNav !== false && p.path !== '/').map((p) => (
              <Link
                key={p.path}
                to={p.path}
                aria-current={p.path === location.pathname ? 'page' : undefined}
                className="px-3 py-2 rounded-lg text-muted hover:text-accent hover:bg-accentsoft transition-colors aria-[current=page]:text-accent aria-[current=page]:bg-accentsoft"
              >{p.nav}</Link>
            ))}
          </nav>
          <div className="flex items-center gap-1 shrink-0">
            <button type="button" aria-label="חזרה" title="אחורה" onClick={() => navigate(-1)}
              className="grid place-items-center w-8 h-8 rounded-lg text-muted hover:text-accent hover:bg-accentsoft transition-colors">
              <Icon name="back" className="w-4 h-4" />
            </button>
            <button type="button" aria-label="קדימה" title="קדימה" onClick={() => navigate(1)}
              className="grid place-items-center w-8 h-8 rounded-lg text-muted hover:text-accent hover:bg-accentsoft transition-colors">
              <Icon name="fwd" className="w-4 h-4" />
            </button>
            <button type="button" aria-label={theme === 'dark' ? 'מעבר לתצוגה בהירה' : 'מעבר לתצוגה כהה'} title="תצוגה בהירה / כהה" onClick={toggle}
              className="grid place-items-center w-8 h-8 rounded-lg text-muted hover:text-accent hover:bg-accentsoft transition-colors">
              <Icon name={theme === 'dark' ? 'sun' : 'moon'} className="w-4 h-4" />
            </button>
          </div>
        </div>
        {cur && cur.path !== '/' && (
          <div className="mx-auto max-w-5xl px-5 pb-2.5 text-[0.85rem] text-muted flex items-center gap-1.5">
            <Link to="/" className="text-muted hover:text-accent no-underline">בית</Link>
            <span aria-hidden="true">›</span>
            <span>{cur.nav}</span>
          </div>
        )}
      </header>

      <ProfileBar />

      <main>
        <Outlet />
      </main>

      {(prev || next) && (
        <nav aria-label="ניווט בין עמודים" className="mx-auto max-w-5xl px-5 pb-10 grid sm:grid-cols-2 gap-3">
          {prev ? (
            <Link to={prev.path} className="flex items-center gap-3 rounded-2xl border border-line bg-surface p-4 no-underline text-ink hover:border-accentfill transition-colors">
              <Icon name="back" className="w-4 h-4 text-accent shrink-0" />
              <span><small className="block text-muted text-[0.8rem]">הקודם</small><b>{prev.title}</b></span>
            </Link>
          ) : <span />}
          {next && (
            <Link to={next.path} className="flex items-center gap-3 justify-end text-left rounded-2xl border border-line bg-surface p-4 no-underline text-ink hover:border-accentfill transition-colors sm:flex-row-reverse">
              <Icon name="fwd" className="w-4 h-4 text-accent shrink-0" />
              <span><small className="block text-muted text-[0.8rem]">הבא</small><b>{next.title}</b></span>
            </Link>
          )}
        </nav>
      )}

      <footer className="border-t border-line bg-raised py-10 mt-6">
        <div className="mx-auto max-w-5xl px-5">
          <p className="font-display font-bold text-lg m-0 mb-5">כל העמודים</p>
          <div className="grid sm:grid-cols-3 gap-6">
            {order.map((g) => (
              <div key={g}>
                <h3 className="text-[0.85rem] text-muted font-bold m-0 mb-2">{g}</h3>
                <ul className="list-none p-0 m-0 space-y-1.5">
                  {groups[g].map((p) => (
                    <li key={p.path}>
                      <Link to={p.path} className="text-[0.9rem] text-ink no-underline hover:text-accent">{p.nav}</Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <p className="text-[0.8rem] text-muted mt-8 pt-6 border-t border-line">ויקיכלב · מדריך עברי לבעלי כלבים · האתר בבנייה</p>
        </div>
      </footer>
    </>
  )
}
