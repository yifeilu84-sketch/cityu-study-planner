import { lazy, Suspense } from 'react'
import { Routes, Route } from 'react-router-dom'
import Layout from './components/Layout'
import WelcomeModal from './components/WelcomeModal'

const Home = lazy(() => import('./pages/Home'))
const CollegePage = lazy(() => import('./pages/CollegePage'))
const MajorPage = lazy(() => import('./pages/MajorPage'))
const SpotlightDetailPage = lazy(() => import('./pages/SpotlightDetailPage'))
const GEPage = lazy(() => import('./pages/GEPage'))
const CoveragePage = lazy(() => import('./pages/CoveragePage'))
const ComparePage = lazy(() => import('./pages/ComparePage'))
const PostgraduatePage = lazy(() => import('./pages/PostgraduatePage'))
const PostgraduateDetailPage = lazy(() => import('./pages/PostgraduateDetailPage'))
const AcademicPage = lazy(() => import('./pages/AcademicPage'))
const AcademicProfilePage = lazy(() => import('./pages/AcademicProfilePage'))

function App() {
  return (
    <Layout>
      <WelcomeModal />
      <Suspense fallback={<div className="py-12 text-center text-gray-500">加载中...</div>}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/spotlight/:spotlightId" element={<SpotlightDetailPage />} />
          <Route path="/ge" element={<GEPage />} />
          <Route path="/compare" element={<ComparePage />} />
          <Route path="/academic" element={<AcademicPage />} />
          <Route path="/academic/:profileId" element={<AcademicProfilePage />} />
          <Route path="/postgraduate" element={<PostgraduatePage />} />
          <Route path="/postgraduate/:programmeCode" element={<PostgraduateDetailPage />} />
          <Route path="/coverage" element={<CoveragePage />} />
          <Route path="/college/:collegeId" element={<CollegePage />} />
          <Route path="/major/:majorCode" element={<MajorPage />} />
        </Routes>
      </Suspense>
    </Layout>
  )
}

export default App
