import { Routes, Route } from 'react-router-dom'
import Navbar from './components/Navbar'
import ScannerPage from './pages/ScannerPage'
import DaftarMahasiswaPage from './pages/DaftarMahasiswaPage'

export default function App() {
  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-900 dark:text-slate-100 transition-colors">
      <Navbar />
      <Routes>
        <Route path="/" element={<ScannerPage />} />
        <Route path="/mahasiswa" element={<DaftarMahasiswaPage />} />
        <Route path="*" element={<div className="p-8">404 - Halaman tidak ditemukan</div>} />
      </Routes>
    </div>
  )
}