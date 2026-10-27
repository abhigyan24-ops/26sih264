import { Routes, Route, Navigate } from 'react-router-dom'
import Layout from './components/Layout'
import LoginPage from './pages/LoginPage'
import DashboardPage from './pages/DashboardPage'
import CasesPage from './pages/CasesPage'
import CaseDetailPage from './pages/CaseDetailPage'
import OverlapsPage from './pages/OverlapsPage'
import InstitutionPage from './pages/InstitutionPage'
import AlertsPage from './pages/AlertsPage'
import ReportsPage from './pages/ReportsPage'
import AdminPage from './pages/AdminPage'
import ImportPage from './pages/Import'
import UiGallery from './pages/UiGallery'
import LandingPage from './pages/LandingPage'

function RequireAuth({ children }: { children: React.ReactNode }) {
  const token = localStorage.getItem('token')
  if (!token || token === 'undefined' || token === 'null') return <Navigate to="/login" replace />
  return <>{children}</>
}

// When root / is visited: public visitors see LandingPage; authenticated officers go to Dashboard
function RootRoute() {
  const token = localStorage.getItem('token')
  const isAuthenticated = Boolean(token && token !== 'undefined' && token !== 'null')
  if (!isAuthenticated) {
    return <LandingPage />
  }
  return <Navigate to="/dashboard" replace />
}

export default function App() {
  return (
    <Routes>
      {/* Root route: automatically opens Landing Page for visitors on Vercel */}
      <Route path="/" element={<RootRoute />} />
      <Route path="/landing" element={<LandingPage />} />
      <Route path="/login" element={<LoginPage />} />

      {/* Authenticated operational app routes */}
      <Route element={<RequireAuth><Layout /></RequireAuth>}>
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/cases" element={<CasesPage />} />
        <Route path="/cases/:id" element={<CaseDetailPage />} />
        <Route path="/overlaps" element={<OverlapsPage />} />
        <Route path="/institutions/:id" element={<InstitutionPage />} />
        <Route path="/alerts" element={<AlertsPage />} />
        <Route path="/reports" element={<ReportsPage />} />
        <Route path="/import" element={<ImportPage />} />
        <Route path="/admin" element={<AdminPage />} />
      </Route>

      {/* Dev-only UI component gallery */}
      {import.meta.env.DEV && <Route path="/__ui" element={<UiGallery />} />}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
