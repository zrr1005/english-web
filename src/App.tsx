import { Routes, Route } from 'react-router-dom'
import Layout from './components/Layout'
import HomePage from './pages/HomePage'
import LibraryPage from './pages/LibraryPage'
import PracticePage from './pages/PracticePage'
import ReportPage from './pages/ReportPage'

export default function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/library" element={<LibraryPage />} />
        <Route path="/practice/:id" element={<PracticePage />} />
        <Route path="/report/:id" element={<ReportPage />} />
      </Routes>
    </Layout>
  )
}
