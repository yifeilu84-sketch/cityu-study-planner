import { Routes, Route } from 'react-router-dom'
import Layout from './components/Layout'
import WelcomeModal from './components/WelcomeModal'
import Home from './pages/Home'
import CollegePage from './pages/CollegePage'
import MajorPage from './pages/MajorPage'

function App() {
  return (
    <Layout>
      <WelcomeModal />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/college/:collegeId" element={<CollegePage />} />
        <Route path="/major/:majorCode" element={<MajorPage />} />
      </Routes>
    </Layout>
  )
}

export default App
