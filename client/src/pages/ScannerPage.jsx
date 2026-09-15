/**
 * ScannerPage - Halaman utama yang dilihat operator scanner.
 * Menampilkan status scan, daftar kehadiran terakhir, dan statistik.
 */

import { useEffect, useState, useCallback } from 'react'
import useScanner from '../hooks/useScanner'
import useSocket from '../hooks/useSocket'
import { playSuccess, playError } from '../utils/sound'

const API_URL = import.meta.env.VITE_SERVER_URL || ''

// Konfigurasi warna/label untuk setiap status scan
const statusConfig = {
  success:   { bg: 'bg-green-500',  text: 'text-white', icon: '✓', label: 'HADIR' },
  duplicate: { bg: 'bg-yellow-400', text: 'text-black', icon: '⚠', label: 'SUDAH HADIR' },
  not_found: { bg: 'bg-red-500',    text: 'text-white', icon: '✗', label: 'QR TIDAK VALID' },
  default:   { bg: 'bg-gray-200',   text: 'text-gray-500', icon: '', label: 'Menunggu scan...' }
}

export default function ScannerPage() {
  const [lastResult, setLastResult] = useState(null)
  const [attendances, setAttendances] = useState([])
  const [stats, setStats] = useState({ total: 0, hadir: 0, belumHadir: 0 })
  const [manualInput, setManualInput] = useState('')

  // Fetch statistik kehadiran
  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/api/stats`)
      const json = await res.json()
      setStats(json.data)
    } catch (err) {
      console.error('Gagal mengambil stats:', err)
    }
  }, [])

  // Ambil data awal saat mount
  useEffect(() => {
    const fetchInitial = async () => {
      try {
        const res = await fetch(`${API_URL}/api/attendances`)
        const json = await res.json()
        setAttendances(json.data.slice(0, 10))
      } catch (err) {
        console.error('Gagal mengambil data kehadiran:', err)
      }
      fetchStats()
    }
    fetchInitial()
  }, [fetchStats])

  // Socket: dengarkan event attendance_update dari server
  const { status: connectionStatus } = useSocket('attendance_update', useCallback((data) => {
    setLastResult(data)
    setAttendances((prev) => [data, ...prev].slice(0, 10))
    fetchStats()
    if (data.status === 'success') {
      playSuccess()
    } else {
      playError()
    }
  }, [fetchStats]))

  // Fungsi handleScan: dikirim dari useScanner ATAU dari input manual
  async function handleScan(code) {
    try {
      const res = await fetch(`${API_URL}/api/scan`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          qr_code: code,
          scanner_id: localStorage.getItem('scanner_id') || 'PC-1'
        })
      })
      const json = await res.json()
      // not_found ditangani di sini karena socket tidak emit event ini
      if (json.status === 'not_found') {
        setLastResult({ status: 'not_found', qr_code: code })
        playError()
      }
      // success/duplicate sudah di-handle via socket event
    } catch (err) {
      console.error(err)
      setLastResult({ status: 'not_found', qr_code: code })
      playError()
    }
  }

  // Scanner: kirim kode ke server saat scan terdeteksi
  useScanner(handleScan)

  // Tentukan config berdasarkan status terakhir
  const cfg = statusConfig[lastResult?.status] || statusConfig.default

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col">
      {/* Header */}
      <header className="bg-white shadow px-6 py-4 flex justify-between items-center">
        <h1 className="text-2xl font-bold">Absensi Wisuda</h1>
        <div className="flex items-center gap-2">
          <span className={`w-3 h-3 rounded-full ${connectionStatus === 'connected' ? 'bg-green-500' : 'bg-red-500'}`} />
          <span className="text-sm text-slate-600">{connectionStatus}</span>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 grid grid-cols-3 gap-4 p-6">
        {/* Kiri: Input + Status */}
        <div className="col-span-2 flex flex-col gap-4">
          {/* Input manual untuk testing tanpa scanner HID */}
          <form onSubmit={(e) => {
            e.preventDefault()
            if (manualInput.trim()) {
              handleScan(manualInput.trim())
              setManualInput('')
            }
          }} className="flex gap-2">
            <input
              type="text"
              value={manualInput}
              onChange={(e) => setManualInput(e.target.value)}
              placeholder="Ketik kode undangan lalu Enter (test manual)"
              className="flex-1 text-2xl px-4 py-3 rounded-lg border-2 border-slate-300 bg-white font-mono focus:border-blue-500 focus:outline-none"
            />
            <button
              type="submit"
              className="bg-blue-500 hover:bg-blue-600 text-white px-6 rounded-lg font-semibold"
            >
              Scan
            </button>
          </form>

          {/* Kotak status besar */}
          <div className={`flex-1 rounded-2xl flex flex-col items-center justify-center ${cfg.bg} ${cfg.text} min-h-[16rem]`}>
            {cfg.icon && <div className="text-7xl mb-4">{cfg.icon}</div>}
            <div className="text-4xl font-bold">{cfg.label}</div>
            {lastResult?.name && <div className="text-3xl mt-2">{lastResult.name}</div>}
          </div>
        </div>

        {/* Kanan: Daftar kehadiran terakhir */}
        <div className="bg-white rounded-2xl shadow p-4 flex flex-col">
          <h2 className="text-lg font-bold mb-3">Kehadiran Terakhir</h2>
          <ul className="flex-1 overflow-y-auto space-y-2">
            {attendances.map((a, i) => (
              <li key={i} className="flex justify-between text-sm border-b pb-1">
                <span className="font-medium">{a.name}</span>
                <span className="text-slate-500">
                  {new Date(a.scanned_at).toLocaleTimeString('id-ID')}
                </span>
              </li>
            ))}
            {attendances.length === 0 && (
              <li className="text-slate-400 text-sm">Belum ada kehadiran</li>
            )}
          </ul>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-white shadow px-6 py-3 text-center text-lg font-semibold">
        Hadir: {stats.hadir} / Total: {stats.total}
      </footer>
    </div>
  )
}
