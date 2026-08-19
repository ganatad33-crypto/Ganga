import { useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, useScroll, useTransform, useReducedMotion } from 'framer-motion'
import { useDogProfile } from './dog.js'

/* עמוד תוכן גנרי: תצלום הירו עם פרלקסת גלילה + התוכן המקורי (מ-content/*.html)
   כפי שהוא, בלי לשנות מילה — כולל התאמת גיל חיה דרך data-age / data-age-not. */
export default function ContentPage({ photo, photoAlt, html }) {
  const reduce = useReducedMotion()
  const heroRef = useRef(null)
  const articleRef = useRef(null)
  const { band } = useDogProfile()
  const navigate = useNavigate()

  /* לוכד קליקים על קישורים פנימיים בתוכן המקורי (href="/עמוד")
     ומנתב אותם דרך React Router במקום טעינת דף מלאה. */
  function onContentClick(e) {
    const a = e.target.closest('a')
    if (!a) return
    const href = a.getAttribute('href')
    if (!href || !href.startsWith('/') || href.startsWith('//')) return
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return
    if (a.target === '_blank') return
    e.preventDefault()
    navigate(href)
  }

  const { scrollYProgress } = useScroll({ target: heroRef, offset: ['start start', 'end start'] })
  const artY = useTransform(scrollYProgress, [0, 1], [0, reduce ? 0 : 60])
  const artScale = useTransform(scrollYProgress, [0, 1], [1, reduce ? 1 : 1.06])

  useEffect(() => {
    const root = articleRef.current
    if (!root) return
    root.querySelectorAll('[data-age]').forEach((el) => {
      const want = el.getAttribute('data-age').split(/\s+/)
      el.hidden = !!(band && !want.includes(band.id))
    })
    root.querySelectorAll('[data-age-not]').forEach((el) => {
      const no = el.getAttribute('data-age-not').split(/\s+/)
      el.hidden = !!(band && no.includes(band.id))
    })
  }, [band, html])

  return (
    <div className="wrap">
      {photo && (
        <motion.div
          ref={heroRef}
          className="mt-6 mb-8 rounded-3xl overflow-hidden shadow-[0_10px_40px_rgba(90,60,30,.14)] border border-line"
          style={{ y: artY, scale: artScale }}
          initial={reduce ? false : { opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
        >
          <img src={photo} alt={photoAlt || ''} className="w-full h-auto block" loading="eager" />
        </motion.div>
      )}
      <motion.article
        ref={articleRef}
        onClick={onContentClick}
        initial={reduce ? false : { opacity: 0, y: 18 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-40px' }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </div>
  )
}
