/**
 * ScannerPage - Halaman utama yang dilihat operator scanner.
 * Menampilkan status scan, daftar kehadiran terakhir, dan statistik.
 */

import { useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import useScanner from '../hooks/useScanner'
import useSocket from '../hooks/useSocket'
import { playSuccess, playError } from '../utils/sound'

const API_URL = import.meta.env.VITE_SERVER_URL || ''
const MAX_RECENT = 20

// Label + warna badge per kategori tamu
const KATEGORI = {
  mahasiswa: { label: 'Mahasiswa', badge: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/60 dark:text-indigo-300' },
  ayah: { label: 'Ayah', badge: 'bg-sky-100 text-sky-700 dark:bg-sky-900/60 dark:text-sky-300' },
  ibu: { label: 'Ibu', badge: 'bg-pink-100 text-pink-700 dark:bg-pink-900/60 dark:text-pink-300' },
  wali: { label: 'Wali', badge: 'bg-violet-100 text-violet-700 dark:bg-violet-900/60 dark:text-violet-300' },
}

// Tema warna kotak status per hasil scan
const TONE = {
  success: {
    box: 'from-emerald-50 to-emerald-100 dark:from-emerald-950/50 dark:to-emerald-900/30 border-emerald-500 dark:border-emerald-700',
    icon: 'bg-emerald-500 text-white',
    title: 'text-emerald-700 dark:text-emerald-300',
    name: 'text-emerald-950 dark:text-emerald-50',
    muted: 'text-emerald-700/80 dark:text-emerald-300/80',
    card: 'bg-white/70 dark:bg-slate-900/40 border-emerald-200 dark:border-emerald-800/60',
  },
  duplicate: {
    box: 'from-amber-50 to-amber-100 dark:from-amber-950/50 dark:to-amber-900/30 border-amber-500 dark:border-amber-700',
    icon: 'bg-amber-500 text-white',
    title: 'text-amber-700 dark:text-amber-300',
    name: 'text-amber-950 dark:text-amber-50',
    muted: 'text-amber-700/80 dark:text-amber-300/80',
    card: 'bg-white/70 dark:bg-slate-900/40 border-amber-200 dark:border-amber-800/60',
  },
}

function fmtTime(iso) {
  return iso ? new Date(iso).toLocaleTimeString('id-ID') : '-'
}

function KategoriBadge({ kategori, className = '' }) {
  const k = KATEGORI[kategori]
  if (!k) return null
  return (
    <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold ${k.badge} ${className}`}>
      {k.label}
    </span>
  )
}

// Kotak besar hasil scan terakhir (success / duplicate)
function ScanResultCard({ result }) {
  const t = TONE[result.status]
  const isMahasiswa = result.kategori === 'mahasiswa'
  const family = result.family || []
  const familyHadir = family.filter(m => m.scanned_at).length
  const prodi = [result.prodi, result.jenjang].filter(Boolean).join(' • ')

  const info = [
    ['NIM', result.nim],
    ['Kelas', result.kelas],
    ['Prodi', prodi],
    ['Kode QR', result.qr_code],
    ['Jam Scan', fmtTime(result.scanned_at)],
    ['Scanner', result.scanner_id],
  ]

  return (
    <div
      className={`flex-1 rounded-xl border-2 bg-gradient-to-br flex flex-col p-6 min-h-0 overflow-y-auto animate-pop-in transition-colors ${t.box}`}
    >
      {/* Status + kategori */}
      <div className="flex items-center gap-3">
        <div className={`w-12 h-12 rounded-full flex items-center justify-center text-2xl font-bold shrink-0 ${t.icon}`}>
          {result.status === 'success' ? '✓' : '⚠'}
        </div>
        <div className={`text-3xl font-bold tracking-wide ${t.title}`}>
          {result.status === 'success' ? 'HADIR' : 'SUDAH HADIR'}
        </div>
        <KategoriBadge kategori={result.kategori} className="ml-auto text-sm px-3 py-1" />
      </div>

      {/* Nama */}
      <div className={`text-4xl font-bold mt-4 leading-tight ${t.name}`}>{result.name}</div>
      {!isMahasiswa && result.mahasiswa_name && (
        <div className={`text-lg mt-1 ${t.muted}`}>
          Orang tua dari <span className="font-semibold">{result.mahasiswa_name}</span>
        </div>
      )}

      {/* Peringatan duplikat: kapan pertama kali scan */}
      {result.status === 'duplicate' && (
        <div className="mt-3 rounded-lg bg-amber-200/60 dark:bg-amber-900/40 text-amber-900 dark:text-amber-200 px-3 py-2 text-sm">
          Undangan ini sudah dipakai masuk pukul <b>{fmtTime(result.first_scanned_at)}</b>.
          Periksa kembali identitas tamu.
        </div>
      )}

      {/* Detail mahasiswa & scan */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-2 mt-5">
        {info.map(([label, value]) => (
          <div key={label} className={`rounded-lg border px-3 py-2 ${t.card}`}>
            <div className="text-[11px] uppercase tracking-wider text-slate-500 dark:text-slate-400">{label}</div>
            <div className={`text-sm font-semibold truncate text-slate-800 dark:text-slate-100 ${label === 'Kode QR' ? 'font-mono' : ''}`}>
              {value || '-'}
            </div>
          </div>
        ))}
      </div>

      {/* Status kehadiran satu keluarga */}
      {family.length > 0 && (
        <div className="mt-5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs uppercase tracking-wider font-semibold text-slate-500 dark:text-slate-400">
              Kehadiran Keluarga {result.family_group && `• ${result.family_group}`}
            </span>
            <span className={`text-sm font-semibold ${t.title}`}>{familyHadir} / {family.length} hadir</span>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {family.map(m => {
              const hadir = !!m.scanned_at
              const current = m.qr_code === result.qr_code
              return (
                <div
                  key={m.qr_code}
                  className={`rounded-lg border px-3 py-2 ${
                    hadir
                      ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800'
                      : 'bg-white/60 dark:bg-slate-900/40 border-slate-200 dark:border-slate-700'
                  } ${current ? 'ring-2 ring-offset-1 ring-indigo-400 dark:ring-offset-slate-900' : ''}`}
                >
                  <div className="flex items-center justify-between gap-1">
                    <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                      {KATEGORI[m.kategori]?.label || m.kategori}
                    </span>
                    <span className={`text-sm font-bold ${hadir ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400'}`}>
                      {hadir ? '✓' : '○'}
                    </span>
                  </div>
                  <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    {hadir ? fmtTime(m.scanned_at) : 'Belum hadir'}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

export default function ScannerPage() {
  const navigate = useNavigate()
  const currentEventId = localStorage.getItem('currentEventId')
  const currentEventName = localStorage.getItem('currentEventName')
  const scannerId = localStorage.getItem('scanner_id') || 'PC-1'
  const [lastResult, setLastResult] = useState(null)
  const [attendances, setAttendances] = useState([])
  const [stats, setStats] = useState({ total: 0, hadir: 0, belumHadir: 0 })
  const [manualInput, setManualInput] = useState('')
  const [lastUpdateTime, setLastUpdateTime] = useState(null)

  // Redirect ke pilih event jika belum ada event yang dipilih
  useEffect(() => {
    if (!currentEventId) {
      navigate('/pilih-event')
    }
  }, [currentEventId, navigate])

  // Fetch statistik kehadiran
  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/api/stats?event_id=${currentEventId}`)
      const json = await res.json()
      setStats(json.data)
    } catch (err) {
      console.error('Gagal mengambil stats:', err)
    }
  }, [currentEventId])

  // Ambil data awal saat mount
  useEffect(() => {
    if (!currentEventId) return
    const fetchInitial = async () => {
      try {
        const res = await fetch(`${API_URL}/api/attendances?event_id=${currentEventId}`)
        const json = await res.json()
        setAttendances(json.data.slice(0, MAX_RECENT))
      } catch (err) {
        console.error('Gagal mengambil data kehadiran:', err)
      }
      fetchStats()
    }
    fetchInitial()
  }, [fetchStats, currentEventId])

  // Socket: dengarkan event attendance_update dari server
  const { status: connectionStatus } = useSocket('attendance_update', useCallback((data) => {
    // Server broadcast ke semua client — abaikan scan dari event lain
    if (String(data.event_id) !== String(currentEventId)) return
    setLastResult(data)
    setLastUpdateTime(new Date())
    // Hanya tampilkan di sidebar jika status success
    if (data.status === 'success') {
      setAttendances((prev) => [data, ...prev].slice(0, MAX_RECENT))
    }
    fetchStats()
    if (data.status === 'success') {
      playSuccess()
    } else {
      playError()
    }
  }, [fetchStats, currentEventId]))

  // Socket: presensi event ini di-reset dari PC lain
  useSocket('attendance_reset', useCallback((data) => {
    if (String(data.event_id) !== String(currentEventId)) return
    setLastResult(null)
    setAttendances([])
    setLastUpdateTime(new Date())
    fetchStats()
  }, [fetchStats, currentEventId]))

  // Fungsi handleScan: dikirim dari useScanner ATAU dari input manual
  async function handleScan(code) {
    try {
      const res = await fetch(`${API_URL}/api/scan`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          qr_code: code,
          scanner_id: scannerId,
          event_id: parseInt(currentEventId)
        })
      })
      const json = await res.json()
      // not_found ditangani di sini karena socket tidak emit event ini
      if (json.status === 'not_found') {
        setLastResult({ status: 'not_found', qr_code: code, scanned_at: new Date().toISOString() })
        playError()
      }
      // success/duplicate sudah di-handle via socket event
    } catch (err) {
      console.error(err)
      setLastResult({ status: 'not_found', qr_code: code, scanned_at: new Date().toISOString() })
      playError()
    }
  }

  // Scanner: kirim kode ke server saat scan terdeteksi
  useScanner(handleScan)

  const cfg = lastResult?.status
  const persen = stats.total > 0 ? Math.round((stats.hadir / stats.total) * 100) : 0

  return (
    <div className="p-6 max-w-7xl mx-auto w-full flex flex-col gap-5 min-h-[calc(100vh-3.5rem)]">

      {/* Header: nama event + koneksi */}
      <div className="flex items-center justify-between gap-4 shrink-0">
        <div>
          <p className="text-xs uppercase tracking-wider text-slate-400 dark:text-slate-500">Event aktif</p>
          <p className="text-lg font-semibold text-slate-800 dark:text-slate-100">{currentEventName || '-'}</p>
        </div>
        <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
          <span className="px-2 py-1 rounded-md bg-slate-100 dark:bg-slate-800 font-mono">{scannerId}</span>
          <span className="flex items-center gap-1.5">
            <span className={`w-2 h-2 rounded-full ${connectionStatus === 'connected' ? 'bg-emerald-500' : 'bg-rose-500 animate-pulse'}`} />
            {connectionStatus === 'connected' ? 'Terhubung' : 'Terputus'}
          </span>
        </div>
      </div>

      {/* Kartu Statistik (dihitung per keluarga) */}
      <div className="grid grid-cols-3 gap-4 shrink-0">
        <div className="bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-xl p-4 shadow-sm transition-colors">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-lg bg-emerald-500 flex items-center justify-center">
              <span className="text-xl text-white">✓</span>
            </div>
            <div className="flex-1">
              <p className="text-xs uppercase tracking-wider text-emerald-600 dark:text-emerald-400">Hadir</p>
              <p className="text-2xl font-semibold text-emerald-700 dark:text-emerald-300">
                {stats.hadir} <span className="text-sm font-medium opacity-70">({persen}%)</span>
              </p>
            </div>
          </div>
          <div className="mt-3 h-1.5 rounded-full bg-emerald-200/60 dark:bg-emerald-900/60 overflow-hidden">
            <div className="h-full bg-emerald-500 rounded-full transition-all duration-500" style={{ width: `${persen}%` }} />
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
            <p className="text-xs uppercase tracking-wider text-indigo-600 dark:text-indigo-400">Total Keluarga</p>
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
          {(cfg === 'success' || cfg === 'duplicate') && <ScanResultCard key={lastResult.scanned_at} result={lastResult} />}

          {cfg === 'not_found' && (
            <div
              key={lastResult.scanned_at}
              className="flex-1 rounded-xl border-2 flex flex-col items-center justify-center p-6 min-h-0 animate-pop-in transition-colors bg-gradient-to-br from-rose-50 to-rose-100 dark:from-rose-950/50 dark:to-rose-900/30 border-rose-500 dark:border-rose-700"
            >
              <div className="w-16 h-16 rounded-full bg-rose-500 text-white flex items-center justify-center mb-3">
                <span className="text-4xl font-bold">✗</span>
              </div>
              <div className="text-3xl font-bold text-rose-700 dark:text-rose-300">QR TIDAK VALID</div>
              <div className="text-lg text-rose-600 dark:text-rose-400 font-mono mt-2">{lastResult.qr_code}</div>
              <div className="text-sm text-rose-500 dark:text-rose-400 mt-3 text-center max-w-md">
                Kode tidak terdaftar di <b>{currentEventName}</b>. Pastikan undangan untuk event yang benar,
                atau cek kode secara manual.
              </div>
              <div className="text-xs text-rose-400 mt-2">{fmtTime(lastResult.scanned_at)}</div>
            </div>
          )}

          {!cfg && (
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
            <div className="flex-1 overflow-y-auto p-2 bg-white dark:bg-slate-800 min-h-0 divide-y divide-slate-100 dark:divide-slate-700/60">
              {attendances.map((a) => {
                const isMahasiswa = a.kategori === 'mahasiswa'
                const detail = isMahasiswa
                  ? [a.nim, a.kelas].filter(Boolean).join(' • ')
                  : a.mahasiswa_name && `Ortu dari ${a.mahasiswa_name}`
                return (
                  <div key={`${a.qr_code}-${a.scanned_at}`} className="py-2 px-2 rounded-lg hover:bg-indigo-50/50 dark:hover:bg-slate-700/50 transition">
                    <div className="flex items-start justify-between gap-2">
                      <span className="font-medium text-sm text-slate-800 dark:text-slate-200 truncate">{a.name}</span>
                      <span className="text-xs text-slate-500 dark:text-slate-400 font-mono shrink-0">{fmtTime(a.scanned_at)}</span>
                    </div>
                    <div className="flex items-center justify-between gap-2 mt-1">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <KategoriBadge kategori={a.kategori} className="shrink-0 !text-[10px] !px-1.5" />
                        <span className="text-xs text-slate-500 dark:text-slate-400 truncate">{detail || a.qr_code}</span>
                      </div>
                      {a.scanner_id && (
                        <span className="text-[10px] text-slate-400 dark:text-slate-500 shrink-0">{a.scanner_id}</span>
                      )}
                    </div>
                  </div>
                )
              })}
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
              <span className="text-indigo-900/70 dark:text-slate-400">{window.location.origin}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-indigo-600 dark:text-indigo-400 font-medium">Scanner ID</span>
              <span className="text-indigo-900/70 dark:text-slate-400">{scannerId}</span>
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
