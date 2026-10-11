import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './auth'
import Navbar from './components/Navbar'
import ScannerPage from './pages/ScannerPage'
import DaftarMahasiswaPage from './pages/DaftarMahasiswaPage'
import PilihEventPage from './pages/PilihEventPage'
import ManagementEventsPage from './pages/ManagementEventsPage'
import CetakQRPage from './pages/CetakQRPage'
import LoginPage from './pages/LoginPage'
import DashboardPage from './pages/DashboardPage'

// Halaman khusus admin; operator diarahkan ke halaman scan
function AdminOnly({ children }) {
  const { isAdmin } = useAuth()
  return isAdmin ? children : <Navigate to="/scan" replace />
}

// Halaman awal sesuai role: admin → dashboard; operator → scan (jika event
// sudah dipilih di perangkat ini) atau pilih event
function HomeRedirect() {
  const { isAdmin } = useAuth()
  if (isAdmin) return <Navigate to="/dashboard" replace />
  const hasEvent = !!localStorage.getItem('currentEventId')
  return <Navigate to={hasEvent ? '/scan' : '/pilih-event'} replace />
}

export default function App() {
  const { user } = useAuth()

  // Masih cek sesi ke server
  if (user === undefined) {
    return <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900 text-slate-400">Memuat...</div>
  }

  if (!user) return <LoginPage />

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-900 dark:text-slate-100 transition-colors">
      <Navbar />
      <Routes>
        <Route path="/" element={<HomeRedirect />} />
        <Route path="/dashboard" element={<AdminOnly><DashboardPage /></AdminOnly>} />
        <Route path="/pilih-event" element={<PilihEventPage />} />
        <Route path="/scan" element={<ScannerPage />} />
        <Route path="/mahasiswa" element={<DaftarMahasiswaPage />} />
        <Route path="/events" element={<AdminOnly><ManagementEventsPage /></AdminOnly>} />
        <Route path="/events/:id/cetak-qr" element={<AdminOnly><CetakQRPage /></AdminOnly>} />
        <Route path="*" element={<div className="p-8">404 - Halaman tidak ditemukan</div>} />
      </Routes>
    </div>
  )
}
