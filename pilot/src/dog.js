import { useCallback, useEffect, useState } from 'react'

/* פרופיל הכלב — נשמר בדפדפן בלבד (localStorage). שום דבר לא נשלח לשרת.
   מקביל ל-assets/profile.js של הגרסה הסטטית. */

const KEY = 'dog-profile-v1'

export const BANDS = [
  { id: 'puppy',      label: 'גור',    from: 0,  to: 6,   desc: 'עד 6 חודשים' },
  { id: 'adolescent', label: 'מתבגר',  from: 6,  to: 18,  desc: '6 עד 18 חודשים' },
  { id: 'adult',      label: 'בוגר',   from: 18, to: 84,  desc: 'שנה וחצי עד 7 שנים' },
  { id: 'senior',     label: 'מבוגר',  from: 84, to: 400, desc: 'מגיל 7 בערך' },
]

export function loadProfile() {
  try { return JSON.parse(localStorage.getItem(KEY)) || null }
  catch { return null }
}

export function saveProfile(p) {
  try { localStorage.setItem(KEY, JSON.stringify(p)) } catch { /* no-op */ }
}

export function clearProfile() {
  try { localStorage.removeItem(KEY) } catch { /* no-op */ }
}

export function bandFor(months) {
  if (months === null || months === undefined || months === '') return null
  for (const b of BANDS) if (months >= b.from && months < b.to) return b
  return BANDS[BANDS.length - 1]
}

export function ageText(p) {
  if (!p || p.months == null) return ''
  const m = p.months
  if (m < 24) return `${m} חודשים`
  const y = Math.floor(m / 12)
  return y === 2 ? 'שנתיים' : `${y} שנים`
}

export function breedText(p) {
  if (!p) return ''
  return p.breed2 ? `${p.breed} מעורב ב${p.breed2}` : (p.breed || '')
}

export function md(s) {
  return String(s).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
}

/* דפדפן/React: פרופיל הכלב + עדכון חי בין רכיבים באותו טאב */
const LISTENERS = new Set()

export function useDogProfile() {
  const [profile, setProfileState] = useState(() => loadProfile())

  useEffect(() => {
    const listener = () => setProfileState(loadProfile())
    LISTENERS.add(listener)
    return () => LISTENERS.delete(listener)
  }, [])

  const save = useCallback((p) => {
    saveProfile(p)
    setProfileState(p)
    LISTENERS.forEach((l) => l())
  }, [])

  const clear = useCallback(() => {
    clearProfile()
    setProfileState(null)
    LISTENERS.forEach((l) => l())
  }, [])

  return { profile, band: profile ? bandFor(profile.months) : null, save, clear }
}
