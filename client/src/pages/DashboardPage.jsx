/**
 * DashboardPage - Pemantauan event aktif untuk admin: kehadiran per keluarga &
 * kategori, grafik kedatangan per 15 menit, status tiap perangkat scanner,
 * dan scan bermasalah terbaru. Diperbarui realtime lewat socket.
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import useSocket from '../hooks/useSocket'
import { eventTiming, TIMING_BADGE, formatTanggal } from '../utils/eventTiming'

const API_URL = import.meta.env.VITE_SERVER_URL || ''
const BUCKET_MS = 15 * 60 * 1000
const MAX_BUCKETS = 48 // 12 jam terakhir

const KATEGORI_LABEL = { mahasiswa: 'Mahasiswa', ayah: 'Ayah', ibu: 'Ibu', wali: 'Wali' }

function fmtJam(iso) {
  return new Date(iso).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
}

function fmtRelatif(iso, now) {
  const menit = Math.floor((now - new Date(iso).getTime()) / 60000)
  if (menit < 1) return 'baru saja'
  if (menit < 60) return `${menit} mnt lalu`
  return `${Math.floor(menit / 60)} jam lalu`
}

// Status perangkat dari waktu aktivitas terakhir (selalu dengan label, bukan warna saja)
function deviceStatus(lastAt, now) {
  const menit = (now - new Date(lastAt).getTime()) / 60000
  if (menit < 3) return { label: 'Aktif', dot: 'bg-emerald-500', text: 'text-emerald-700 dark:text-emerald-400' }
  if (menit < 15) return { label: 'Diam', dot: 'bg-amber-500', text: 'text-amber-700 dark:text-amber-400' }
  return { label: 'Tidak aktif', dot: 'bg-slate-400', text: 'text-slate-500 dark:text-slate-400' }
}

// Isi bucket kosong agar jeda tanpa kedatangan tetap terlihat di grafik
function fillTimeline(rows, extendToNow) {
  if (rows.length === 0) return []
  const counts = new Map(rows.map(r => [new Date(r.bucket).getTime(), r.total]))
  const first = Math.min(...counts.keys())
  let last = Math.max(...counts.keys())
  if (extendToNow) last = Math.max(last, Math.floor(Date.now() / BUCKET_MS) * BUCKET_MS)
  const start = Math.max(first, last - (MAX_BUCKETS - 1) * BUCKET_MS)
  const out = []
  for (let t = start; t <= last; t += BUCKET_MS) out.push({ t, total: counts.get(t) || 0 })
  return out
}

function Card({ title, right, children, className = '' }) {
  return (
    <div className={`bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-sm ${className}`}>
      {title && (
        <div className="flex items-center justify-between px-5 pt-4">
          <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200">{title}</h3>
          {right}
        </div>
      )}
      <div className="p-5">{children}</div>
    </div>
  )
}

function ArrivalChart({ data }) {
  const [hover, setHover] = useState(null)
  if (data.length === 0) {
    return <p className="text-sm text-slate-400 py-10 text-center">Belum ada kedatangan tercatat.</p>
  }
  const max = Math.max(...data.map(d => d.total), 1)
  const peak = data.reduce((a, b) => (b.total > a.total ? b : a))

  return (
    <div>
      <div className="flex gap-3">
        {/* Sumbu Y: cukup nilai maksimum & nol */}
        <div className="flex flex-col justify-between text-[10px] text-slate-400 h-40 py-px text-right w-6 shrink-0">
          <span>{max}</span>
          <span>0</span>
        </div>
        <div className="relative flex-1 h-40 border-b border-slate-200 dark:border-slate-700" onMouseLeave={() => setHover(null)}>
          {/* Garis bantu tengah */}
          <div className="absolute inset-x-0 top-1/2 border-t border-dashed border-slate-100 dark:border-slate-700/60" />
          <div className="absolute inset-0 flex items-end gap-0.5">
            {data.map((d, i) => (
              // Area hover setinggi grafik (lebih besar dari batangnya)
              <div
                key={d.t}
                className="flex-1 h-full flex items-end cursor-default"
                onMouseEnter={() => setHover(i)}
              >
                <div
                  className={`w-full rounded-t ${hover === i ? 'bg-indigo-600 dark:bg-indigo-400' : 'bg-indigo-500 dark:bg-indigo-500'} transition-colors`}
                  style={{ height: `${(d.total / max) * 100}%`, minHeight: d.total > 0 ? 3 : 0 }}
                />
              </div>
            ))}
          </div>
          {hover !== null && (
            <div
              className="absolute -top-2 -translate-y-full -translate-x-1/2 pointer-events-none z-10 whitespace-nowrap rounded-lg bg-slate-900 text-white text-xs px-2.5 py-1.5 shadow-lg dark:bg-slate-100 dark:text-slate-900"
              style={{ left: `${((hover + 0.5) / data.length) * 100}%` }}
            >
              <span className="font-semibold">{data[hover].total} kedatangan</span>
              <span className="opacity-70"> · {fmtJam(data[hover].t)}–{fmtJam(data[hover].t + BUCKET_MS)}</span>
            </div>
          )}
        </div>
      </div>
      {/* Sumbu X: label tiap jam */}
      <div className="flex gap-0.5 ml-9 mt-1.5">
        {data.map(d => (
          <div key={d.t} className="flex-1 text-[10px] text-slate-400 text-center overflow-visible whitespace-nowrap">
            {new Date(d.t).getMinutes() === 0 ? fmtJam(d.t) : ''}
          </div>
        ))}
      </div>
      <p className="text-xs text-slate-500 dark:text-slate-400 mt-3">
        Puncak: <b className="text-slate-700 dark:text-slate-200">{peak.total} kedatangan</b> pukul {fmtJam(peak.t)}–{fmtJam(peak.t + BUCKET_MS)}
      </p>
    </div>
  )
}

export default function DashboardPage() {
  const navigate = useNavigate()
  const eventId = localStorage.getItem('currentEventId')
  const [data, setData] = useState(null)
  const [error, setError] = useState(null)
  const [now, setNow] = useState(Date.now())
  const [updatedAt, setUpdatedAt] = useState(null)
  const pending = useRef(null)

  useEffect(() => {
    if (!eventId) navigate('/pilih-event')
  }, [eventId, navigate])

  const fetchDashboard = useCallback(async () => {
    if (!eventId) return
    try {
      const res = await fetch(`${API_URL}/api/events/${eventId}/dashboard`)
      const json = await res.json()
      if (!res.ok || json.status !== 'success') throw new Error(json.message || `HTTP ${res.status}`)
      setData(json.data)
      setError(null)
      setUpdatedAt(new Date())
    } catch (err) {
      setError(err.message || 'Gagal memuat dashboard')
    }
  }, [eventId])

  useEffect(() => { fetchDashboard() }, [fetchDashboard])

  // Saat antrean padat banyak scan beruntun: gabungkan jadi satu fetch per detik
  const scheduleFetch = useCallback((payload) => {
    if (payload && String(payload.event_id) !== String(eventId)) return
    if (pending.current) return
    pending.current = setTimeout(() => {
      pending.current = null
      fetchDashboard()
    }, 1000)
  }, [eventId, fetchDashboard])

  useEffect(() => () => clearTimeout(pending.current), [])

  const { status: connectionStatus } = useSocket('attendance_update', scheduleFetch)
  useSocket('attendance_reset', scheduleFetch)
  useSocket('scan_error', scheduleFetch)
  useSocket('invitations_changed', scheduleFetch)

  // Perbarui "x mnt lalu" & status perangkat, plus refresh berkala sebagai cadangan
  useEffect(() => {
    const tick = setInterval(() => setNow(Date.now()), 15000)
    const refresh = setInterval(fetchDashboard, 60000)
    return () => { clearInterval(tick); clearInterval(refresh) }
  }, [fetchDashboard])

  if (error && !data) {
    return (
      <div className="p-6 max-w-6xl mx-auto w-full">
        <div className="bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-xl p-6 text-center">
          <p className="text-rose-700 dark:text-rose-300 font-medium mb-3">Gagal memuat dashboard: {error}</p>
          <button onClick={fetchDashboard} className="bg-rose-600 hover:bg-rose-700 text-white px-4 py-2 rounded-lg text-sm font-medium">Coba Lagi</button>
        </div>
      </div>
    )
  }

  if (!data) {
    return <div className="p-6 text-center text-slate-400">Memuat dashboard...</div>
  }

  const { event, keluarga, kategori, scans, devices, issues } = data
  const timing = eventTiming(event.event_date)
  const badge = TIMING_BADGE[timing]
  const persen = keluarga.total > 0 ? Math.round((keluarga.hadir / keluarga.total) * 100) : 0
  const timeline = fillTimeline(data.timeline, timing === 'today')
  const kategoriList = ['mahasiswa', 'ayah', 'ibu', 'wali'].filter(k => kategori[k])

  return (
    <div className="p-6 max-w-7xl mx-auto w-full space-y-5">

      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            {badge && <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${badge.className}`}>{badge.label}</span>}
            <span className="text-sm text-slate-500 dark:text-slate-400">
              {event.event_date ? formatTanggal(event.event_date) : `Tahun ${event.year}`}
            </span>
          </div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">{event.name}</h2>
        </div>
        <div className="flex items-center gap-4 text-xs text-slate-500 dark:text-slate-400">
          <span className="flex items-center gap-1.5">
            <span className={`w-2 h-2 rounded-full ${connectionStatus === 'connected' ? 'bg-emerald-500' : 'bg-rose-500 animate-pulse'}`} />
            {connectionStatus === 'connected' ? 'Live' : 'Terputus'}
          </span>
          {updatedAt && <span>Diperbarui {updatedAt.toLocaleTimeString('id-ID')}</span>}
          <Link to="/pilih-event" className="text-indigo-600 dark:text-indigo-400 hover:underline">Ganti event</Link>
        </div>
      </div>

      {/* Ringkasan */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Hero: kehadiran keluarga */}
        <Card className="lg:col-span-1">
          <p className="text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400">Keluarga hadir</p>
          <p className="mt-1">
            <span className="text-5xl font-bold text-slate-900 dark:text-slate-50">{keluarga.hadir}</span>
            <span className="text-xl text-slate-400"> / {keluarga.total}</span>
          </p>
          <div className="mt-4 h-2 rounded-full bg-slate-100 dark:bg-slate-700 overflow-hidden">
            <div className="h-full rounded-full bg-emerald-500 transition-all duration-500" style={{ width: `${persen}%` }} />
          </div>
          <div className="flex justify-between text-xs mt-2 text-slate-500 dark:text-slate-400">
            <span><b className="text-slate-700 dark:text-slate-200">{persen}%</b> hadir</span>
            <span>{keluarga.belumHadir} belum hadir</span>
          </div>
        </Card>

        {/* Per kategori */}
        <Card title="Kehadiran per kategori" className="lg:col-span-1">
          <div className="space-y-3.5 -mt-1">
            {kategoriList.length === 0 && <p className="text-sm text-slate-400">Belum ada undangan.</p>}
            {kategoriList.map(k => {
              const { total, hadir } = kategori[k]
              const p = total > 0 ? Math.round((hadir / total) * 100) : 0
              return (
                <div key={k}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-slate-600 dark:text-slate-300">{KATEGORI_LABEL[k] || k}</span>
                    <span className="text-slate-500 dark:text-slate-400">
                      <b className="text-slate-800 dark:text-slate-100">{hadir}</b> / {total} · {p}%
                    </span>
                  </div>
                  <div className="h-1.5 rounded-full bg-slate-100 dark:bg-slate-700 overflow-hidden">
                    <div className="h-full rounded-full bg-indigo-500" style={{ width: `${p}%` }} />
                  </div>
                </div>
              )
            })}
          </div>
        </Card>

        {/* Total scan */}
        <Card title="Total scan" className="lg:col-span-1">
          <div className="grid grid-cols-3 gap-3 -mt-1">
            <div className="rounded-lg bg-emerald-50 dark:bg-emerald-950/40 p-3">
              <p className="text-xs text-emerald-700 dark:text-emerald-400">✓ Hadir</p>
              <p className="text-2xl font-semibold text-slate-900 dark:text-slate-100 mt-1">{scans.success}</p>
            </div>
            <div className="rounded-lg bg-sky-50 dark:bg-sky-950/40 p-3">
              <p className="text-xs text-sky-700 dark:text-sky-400">↻ Masuk kembali</p>
              <p className="text-2xl font-semibold text-slate-900 dark:text-slate-100 mt-1">{scans.reentry}</p>
            </div>
            <div className="rounded-lg bg-rose-50 dark:bg-rose-950/40 p-3">
              <p className="text-xs text-rose-700 dark:text-rose-400">✗ Tidak valid</p>
              <p className="text-2xl font-semibold text-slate-900 dark:text-slate-100 mt-1">{scans.invalid}</p>
            </div>
          </div>
          <p className="text-xs text-slate-400 mt-3">Masuk kembali = tamu keluar-masuk (mis. ke WC), normal. Tidak valid yang tinggi bisa menandakan undangan salah event.</p>
        </Card>
      </div>

      {/* Grafik + perangkat */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
        <Card title="Kedatangan per 15 menit" className="lg:col-span-3">
          <ArrivalChart data={timeline} />
        </Card>

        <Card
          title="Perangkat scanner"
          right={<span className="text-xs text-slate-400">{devices.length} perangkat</span>}
          className="lg:col-span-2"
        >
          {devices.length === 0 ? (
            <p className="text-sm text-slate-400 py-6 text-center">Belum ada perangkat yang melakukan scan.</p>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-700 -my-2">
              {devices.map(d => {
                const st = deviceStatus(d.last_at, now)
                return (
                  <div key={d.scanner_id} className="py-2.5 flex items-center gap-3">
                    <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${st.dot}`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-800 dark:text-slate-100 truncate">{d.scanner_id}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        {d.success} hadir
                        {d.reentry > 0 && ` · ${d.reentry} masuk kembali`}
                        {d.invalid > 0 && ` · ${d.invalid} tidak valid`}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className={`text-xs font-semibold ${st.text}`}>{st.label}</p>
                      <p className="text-[11px] text-slate-400">{fmtRelatif(d.last_at, now)}</p>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </Card>
      </div>

      {/* Masalah terbaru + aksi cepat */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
        <Card title="QR tidak valid terbaru" className="lg:col-span-3">
          {issues.length === 0 ? (
            <p className="text-sm text-slate-400 py-4 text-center">Tidak ada scan QR tidak valid. 👍</p>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-700 -my-2">
              {issues.map((it, i) => (
                <div key={`${it.qr_code}-${it.scanned_at}-${i}`} className="py-2 flex items-center gap-3 text-sm">
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-full shrink-0 bg-rose-100 text-rose-700 dark:bg-rose-900/50 dark:text-rose-300">
                    ✗ Tidak valid
                  </span>
                  <span className="flex-1 min-w-0 truncate font-mono text-slate-700 dark:text-slate-200">{it.qr_code || '—'}</span>
                  <span className="text-xs text-slate-400 shrink-0">{it.scanner_id} · {fmtJam(it.scanned_at)}</span>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card title="Aksi cepat" className="lg:col-span-2">
          <div className="grid grid-cols-2 gap-2 -mt-1">
            {[
              { label: 'Scan', icon: '📷', onClick: () => navigate('/scan') },
              { label: 'Daftar Mahasiswa', icon: '👥', onClick: () => navigate('/mahasiswa') },
              { label: 'Cetak QR', icon: '🖨️', onClick: () => navigate(`/events/${eventId}/cetak-qr`) },
              { label: 'Kelola Events', icon: '⚙️', onClick: () => navigate('/events') },
            ].map(a => (
              <button
                key={a.label}
                onClick={a.onClick}
                className="flex items-center gap-2 px-3 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:border-indigo-400 hover:bg-indigo-50/50 dark:hover:bg-slate-700/50 text-sm text-slate-700 dark:text-slate-200 transition"
              >
                <span>{a.icon}</span>{a.label}
              </button>
            ))}
            <a
              href={`${API_URL}/api/events/${eventId}/report.csv`}
              className="col-span-2 flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium transition"
              download
            >
              📥 Download Laporan CSV
            </a>
          </div>
        </Card>
      </div>
    </div>
  )
}
