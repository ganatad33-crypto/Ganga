import { lazy, Suspense } from 'react'
import { Routes, Route } from 'react-router-dom'
import Layout from './Layout.jsx'
import Home from './pages/Home.jsx'

const SignalsPage    = lazy(() => import('./pages/SignalsPage.jsx'))
const LearningPage   = lazy(() => import('./pages/LearningPage.jsx'))
const HouseholdPage  = lazy(() => import('./pages/HouseholdPage.jsx'))
const RoutinePage    = lazy(() => import('./pages/RoutinePage.jsx'))
const BarkingPage    = lazy(() => import('./pages/BarkingPage.jsx'))
const AggressionPage = lazy(() => import('./pages/AggressionPage.jsx'))
const SeparationPage = lazy(() => import('./pages/SeparationPage.jsx'))
const PuppyPage      = lazy(() => import('./pages/PuppyPage.jsx'))
const WorldPage      = lazy(() => import('./pages/WorldPage.jsx'))
const LifespanPage   = lazy(() => import('./pages/LifespanPage.jsx'))
const CasesPage      = lazy(() => import('./pages/CasesPage.jsx'))
const QaPage         = lazy(() => import('./pages/QaPage.jsx'))
const GuidePage      = lazy(() => import('./pages/GuidePage.jsx'))
const ProfilePage    = lazy(() => import('./pages/ProfilePage.jsx'))

function Fallback() {
  return <div className="wrap" style={{ minHeight: '40vh' }} />
}

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<Home />} />
        <Route path="/signals" element={<Suspense fallback={<Fallback />}><SignalsPage /></Suspense>} />
        <Route path="/learning" element={<Suspense fallback={<Fallback />}><LearningPage /></Suspense>} />
        <Route path="/household" element={<Suspense fallback={<Fallback />}><HouseholdPage /></Suspense>} />
        <Route path="/routine" element={<Suspense fallback={<Fallback />}><RoutinePage /></Suspense>} />
        <Route path="/barking" element={<Suspense fallback={<Fallback />}><BarkingPage /></Suspense>} />
        <Route path="/aggression" element={<Suspense fallback={<Fallback />}><AggressionPage /></Suspense>} />
        <Route path="/separation" element={<Suspense fallback={<Fallback />}><SeparationPage /></Suspense>} />
        <Route path="/puppy" element={<Suspense fallback={<Fallback />}><PuppyPage /></Suspense>} />
        <Route path="/world" element={<Suspense fallback={<Fallback />}><WorldPage /></Suspense>} />
        <Route path="/lifespan" element={<Suspense fallback={<Fallback />}><LifespanPage /></Suspense>} />
        <Route path="/cases" element={<Suspense fallback={<Fallback />}><CasesPage /></Suspense>} />
        <Route path="/qa" element={<Suspense fallback={<Fallback />}><QaPage /></Suspense>} />
        <Route path="/guide" element={<Suspense fallback={<Fallback />}><GuidePage /></Suspense>} />
        <Route path="/profile" element={<Suspense fallback={<Fallback />}><ProfilePage /></Suspense>} />
      </Route>
    </Routes>
  )
}
