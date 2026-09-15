/**
 * ScannerPage - Halaman utama yang dilihat operator scanner.
 * Menampilkan status scan, daftar kehadiran terakhir, dan statistik.
 */

import { useEffect, useState, useCallback } from 'react'
import useScanner from '../hooks/useScanner'
import useSocket from '../hooks/useSocket'
import { playSuccess, playError } from '../utils/sound'

const API_URL = import.meta.env.VITE_SERVER_URL || ''

export default function ScannerPage() {
  const [lastResult, setLastResult] = useState(null)
  const [attendances, setAttendances] = useState([])
  const [stats, setStats] = useState({ total: 0, hadir: 0, belumHadir: 0 })
  const [manualInput, setManualInput] = useState('')
  const [lastUpdateTime, setLastUpdateTime] = useState(null)

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
    setLastUpdateTime(new Date())
    // Hanya tampilkan di sidebar jika status success
    if (data.status === 'success') {
      setAttendances((prev) => [data, ...prev].slice(0, 10))
    }
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

  const cfg = lastResult?.status

  return (
    <div className="p-6 max-w-7xl mx-auto w-full flex flex-col gap-5 min-h-[calc(100vh-3.5rem)]">

      {/* Indikator koneksi */}
      <div className="flex items-center justify-end gap-1.5 shrink-0">
        <span className={`w-2 h-2 rounded-full ${connectionStatus === 'connected' ? 'bg-emerald-500' : 'bg-rose-500'}`} />
        <span className="text-xs text-slate-500 dark:text-slate-400">{connectionStatus}</span>
      </div>

      {/* Kartu Statistik */}
      <div className="grid grid-cols-3 gap-4 shrink-0">
        <div className="bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-xl p-4 flex items-center gap-4 shadow-sm transition-colors">
          <div className="w-10 h-10 rounded-lg bg-emerald-500 flex items-center justify-center">
            <span className="text-xl text-white">✓</span>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wider text-emerald-600 dark:text-emerald-400">Hadir</p>
            <p className="text-2xl font-semibold text-emerald-700 dark:text-emerald-300">{stats.hadir}</p>
          </div>
        </div>
        <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-xl p-4 flex items-center gap-4 shadow-sm transition-colors">
          <div className="w-10 h-10 rounded-lg bg-amber-500 flex items-center justify-center">
            <span className="text-xl text-white">○</span>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wider text-amber-600 dark:text-amber-400">Belum Hadir</p>
            <p className="text-2xl font-semibold text-amber-700 dark:text-amber-300">{stats.belumHadir}</p>
          </div>
        </div>
        <div className="bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 rounded-xl p-4 flex items-center gap-4 shadow-sm transition-colors">
          <div className="w-10 h-10 rounded-lg bg-indigo-500 flex items-center justify-center">
            <span className="text-xl text-white">#</span>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wider text-indigo-600 dark:text-indigo-400">Total</p>
            <p className="text-2xl font-semibold text-indigo-700 dark:text-indigo-300">{stats.total}</p>
          </div>
        </div>
      </div>

      {/* Grid utama */}
      <div className="flex-1 grid grid-cols-3 gap-5 min-h-0">

        {/* Kolom kiri: Input + Status */}
        <div className="col-span-2 flex flex-col gap-4 min-h-0">

          {/* Input manual */}
          <form onSubmit={(e) => {
            e.preventDefault()
            if (manualInput.trim()) {
              handleScan(manualInput.trim())
              setManualInput('')
            }
          }} className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-3 shadow-sm shrink-0 transition-colors">
            <label className="block text-xs font-semibold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider mb-1.5">Input Manual</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={manualInput}
                onChange={(e) => setManualInput(e.target.value)}
                placeholder="Ketik kode undangan atau scan QR..."
                className="flex-1 px-4 py-2 text-base font-mono rounded-lg border border-slate-200 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:placeholder-slate-500 focus:border-indigo-500 focus:dark:border-indigo-500 focus:ring-2 focus:ring-indigo-100 dark:focus:ring-indigo-900/50 outline-none transition"
              />
              <button
                type="submit"
                className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2 rounded-lg font-medium transition"
              >
                Scan
              </button>
            </div>
          </form>

          {/* Kotak Status */}
          {cfg ? (
            <div
              key={lastResult?.scanned_at}
              className={`flex-1 rounded-xl border-2 flex flex-col items-center justify-center p-6 min-h-0 animate-pop-in transition-colors ${
                cfg === 'success'
                  ? 'bg-gradient-to-br from-emerald-50 to-emerald-100 dark:from-emerald-950/50 dark:to-emerald-900/30 border-emerald-500 dark:border-emerald-700'
                  : cfg === 'duplicate'
                  ? 'bg-gradient-to-br from-amber-50 to-amber-100 dark:from-amber-950/50 dark:to-amber-900/30 border-amber-500 dark:border-amber-700'
                  : 'bg-gradient-to-br from-rose-50 to-rose-100 dark:from-rose-950/50 dark:to-rose-900/30 border-rose-500 dark:border-rose-700'
              }`}
            >
              {cfg === 'success' && (
                <>
                  <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-900/50 flex items-center justify-center mb-3">
                    <span className="text-4xl text-emerald-600 dark:text-emerald-300 font-bold">✓</span>
                  </div>
                  <div className="text-4xl font-bold tracking-wide text-emerald-700 dark:text-emerald-300">HADIR</div>
                  {lastResult?.name && <div className="text-2xl font-semibold text-emerald-900 dark:text-emerald-100 mt-2">{lastResult.name}</div>}
                  {lastResult?.scanned_at && <div className="text-sm text-emerald-600 dark:text-emerald-400 mt-1">{new Date(lastResult.scanned_at).toLocaleTimeString('id-ID')}</div>}
                </>
              )}
              {cfg === 'duplicate' && (
                <>
                  <div className="w-16 h-16 rounded-full bg-amber-100 dark:bg-amber-900/50 flex items-center justify-center mb-3">
                    <span className="text-4xl text-amber-600 dark:text-amber-300">⚠</span>
                  </div>
                  <div className="text-3xl font-bold text-amber-700 dark:text-amber-300">SUDAH HADIR</div>
                  {lastResult?.name && <div className="text-2xl font-semibold text-amber-900 dark:text-amber-100 mt-2">{lastResult.name}</div>}
                  {lastResult?.scanned_at && <div className="text-sm text-amber-600 dark:text-amber-400 mt-1">{new Date(lastResult.scanned_at).toLocaleTimeString('id-ID')}</div>}
                </>
              )}
              {cfg === 'not_found' && (
                <>
                  <div className="w-16 h-16 rounded-full bg-rose-100 dark:bg-rose-900/50 flex items-center justify-center mb-3">
                    <span className="text-4xl text-rose-600 dark:text-rose-300">✗</span>
                  </div>
                  <div className="text-3xl font-bold text-rose-700 dark:text-rose-300">QR TIDAK VALID</div>
                  <div className="text-sm text-rose-500 dark:text-rose-400 font-mono mt-2">{lastResult?.qr_code}</div>
                </>
              )}
            </div>
          ) : (
            <div className="flex-1 rounded-xl border-2 border-dashed border-indigo-200 dark:border-indigo-900/50 bg-gradient-to-br from-slate-50 to-indigo-50/40 dark:from-slate-800 dark:to-slate-900/50 flex flex-col items-center justify-center min-h-0 p-6 transition-colors">
              <div className="text-6xl mb-3 text-indigo-300 dark:text-indigo-700">📷</div>
              <div className="text-lg font-semibold text-slate-600 dark:text-slate-400">Siap menerima scan</div>
              <div className="text-sm text-slate-400 dark:text-slate-500 mt-1">Arahkan QR code ke alat scanner</div>
            </div>
          )}
        </div>

        {/* Kolom kanan: Sidebar */}
        <div className="flex flex-col gap-4 min-h-0">

          {/* Kehadiran Terakhir */}
          <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl flex flex-col min-h-0 flex-1 shadow-sm overflow-hidden transition-colors">
            <div className="bg-slate-50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-700 px-4 py-3 flex justify-between items-center shrink-0">
              <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-200">Kehadiran Terakhir</h2>
              {attendances.length > 0 && (
                <span className="bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-300 text-xs font-semibold px-2 py-0.5 rounded-full">{attendances.length}</span>
              )}
            </div>
            <div className="flex-1 overflow-y-auto p-3 bg-white dark:bg-slate-800 space-y-1 min-h-0">
              {attendances.map((a, i) => (
                <div key={i} className="flex justify-between items-center py-2 px-2 rounded-lg hover:bg-indigo-50/50 dark:hover:bg-slate-700/50 text-sm transition">
                  <span className="font-medium text-slate-800 dark:text-slate-200">{a.name}</span>
                  <span className="text-xs text-slate-400 dark:text-slate-500">
                    {new Date(a.scanned_at).toLocaleTimeString('id-ID')}
                  </span>
                </div>
              ))}
              {attendances.length === 0 && (
                <div className="text-center py-8">
                  <div className="text-4xl text-slate-300 dark:text-slate-600 mb-2">👥</div>
                  <p className="text-sm text-slate-400 dark:text-slate-500">Belum ada kehadiran</p>
                </div>
              )}
            </div>
          </div>

          {/* Info Sistem */}
          <div className="bg-indigo-50/50 dark:bg-slate-800/50 border border-indigo-100 dark:border-slate-700 rounded-xl p-3 text-xs space-y-1 shrink-0 transition-colors">
            <div className="flex justify-between">
              <span className="text-indigo-600 dark:text-indigo-400 font-medium">Server</span>
              <span className="text-indigo-900/70 dark:text-slate-400">{API_URL || 'localhost:3000'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-indigo-600 dark:text-indigo-400 font-medium">Scanner ID</span>
              <span className="text-indigo-900/70 dark:text-slate-400">{localStorage.getItem('scanner_id') || 'PC-1'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-indigo-600 dark:text-indigo-400 font-medium">Terakhir update</span>
              <span className="text-indigo-900/70 dark:text-slate-400">
                {lastUpdateTime ? lastUpdateTime.toLocaleTimeString('id-ID') : '-'}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
