import { lazy, Suspense } from 'react'
import { Routes, Route } from 'react-router-dom'
import Layout from './components/Layout'
import WelcomeModal from './components/WelcomeModal'

const Home = lazy(() => import('./pages/Home'))
const CollegePage = lazy(() => import('./pages/CollegePage'))
const MajorPage = lazy(() => import('./pages/MajorPage'))
const GEPage = lazy(() => import('./pages/GEPage'))
const CoveragePage = lazy(() => import('./pages/CoveragePage'))

function App() {
  return (
    <Layout>
      <WelcomeModal />
      <Suspense fallback={<div className="py-12 text-center text-gray-500">加载中...</div>}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/ge" element={<GEPage />} />
          <Route path="/coverage" element={<CoveragePage />} />
          <Route path="/college/:collegeId" element={<CollegePage />} />
          <Route path="/major/:majorCode" element={<MajorPage />} />
        </Routes>
      </Suspense>
    </Layout>
  )
}

export default App
