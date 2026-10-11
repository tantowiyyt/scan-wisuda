/**
 * PilihEventPage - Halaman untuk memilih event wisuda sebelum masuk ke scan.
 * Event yang dipilih disimpan di localStorage dan dipakai di ScannerPage + DaftarMahasiswaPage.
 */

import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../auth'
import { eventTiming, TIMING_BADGE, formatTanggal } from '../utils/eventTiming'

const API_URL = import.meta.env.VITE_SERVER_URL || ''

// Urutan tampil: hari ini → akan datang (terdekat dulu) → selesai (terbaru dulu)
const TIMING_ORDER = { today: 0, upcoming: 1, unknown: 2, past: 3 }
function sortEvents(events) {
  return [...events].sort((a, b) => {
    const ta = eventTiming(a.event_date)
    const tb = eventTiming(b.event_date)
    if (ta !== tb) return TIMING_ORDER[ta] - TIMING_ORDER[tb]
    const da = a.event_date || ''
    const db = b.event_date || ''
    return ta === 'upcoming' ? da.localeCompare(db) : db.localeCompare(da)
  })
}

export default function PilihEventPage() {
  const { isAdmin } = useAuth()
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const navigate = useNavigate()
  const activeId = localStorage.getItem('currentEventId')

  useEffect(() => {
    async function fetchEvents() {
      try {
        const res = await fetch(`${API_URL}/api/events`)
        const json = await res.json()
        setEvents(sortEvents(json.data || []))
      } catch (err) {
        console.error('Gagal mengambil events:', err)
        setError('Gagal memuat data event')
      } finally {
        setLoading(false)
      }
    }
    fetchEvents()
  }, [])

  function handleSelectEvent(event) {
    localStorage.setItem('currentEventId', event.id)
    localStorage.setItem('currentEventName', event.name)
    window.dispatchEvent(new CustomEvent('event-changed'))
    navigate(isAdmin ? '/dashboard' : '/scan')
  }

  return (
    <div className="p-6 max-w-5xl mx-auto w-full">
      <h2 className="text-2xl font-bold mb-2 dark:text-slate-100">Pilih Event Wisuda</h2>
      <p className="text-slate-500 dark:text-slate-400 mb-6">
        {isAdmin ? 'Pilih event untuk dipantau di dashboard' : 'Pilih event untuk mulai memindai undangan'}
      </p>

      {loading ? (
        <div className="text-center py-12">
          <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
          <p className="text-slate-400">Memuat data event...</p>
        </div>
      ) : error ? (
        <div className="text-center py-12 text-rose-500">
          <div className="text-5xl mb-3">⚠️</div>
          <p>{error}</p>
        </div>
      ) : events.length === 0 ? (
        <div className="text-center py-12 text-slate-400">
          <div className="text-5xl mb-3">📅</div>
          {isAdmin ? (
            <>
              <p>Belum ada event.</p>
              <button
                onClick={() => navigate('/events')}
                className="mt-4 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg font-medium text-sm transition"
              >
                + Buat Event
              </button>
            </>
          ) : (
            <p>Belum ada event. Hubungi admin untuk membuat event.</p>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {events.map((event) => {
            const timing = eventTiming(event.event_date)
            const badge = TIMING_BADGE[timing]
            const isActive = String(event.id) === activeId
            const total = event.total_keluarga || 0
            const hadir = event.hadir_keluarga || 0
            const persen = total > 0 ? Math.round((hadir / total) * 100) : 0
            return (
              <button
                key={event.id}
                onClick={() => handleSelectEvent(event)}
                className={`text-left bg-white dark:bg-slate-800 border rounded-xl p-5 hover:shadow-md transition-all flex flex-col
                  ${isActive
                    ? 'border-indigo-500 ring-2 ring-indigo-100 dark:ring-indigo-900/50'
                    : timing === 'today'
                      ? 'border-emerald-300 dark:border-emerald-800 hover:border-emerald-500'
                      : 'border-slate-200 dark:border-slate-700 hover:border-indigo-500'}
                  ${timing === 'past' && !isActive ? 'opacity-75 hover:opacity-100' : ''}`}
              >
                <div className="flex items-center gap-2 flex-wrap mb-3">
                  {badge && (
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${badge.className}`}>{badge.label}</span>
                  )}
                  {isActive && (
                    <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700 dark:bg-indigo-900/60 dark:text-indigo-300">
                      ✓ Aktif di perangkat ini
                    </span>
                  )}
                </div>

                <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">{event.name}</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  {event.event_date ? formatTanggal(event.event_date) : `Tahun ${event.year}`}
                </p>

                <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-700 w-full">
                  {total === 0 ? (
                    <p className="text-xs text-slate-400">Belum ada undangan</p>
                  ) : (
                    <>
                      <div className="flex justify-between text-xs mb-1.5">
                        <span className="text-slate-500 dark:text-slate-400">{total} keluarga</span>
                        <span className="font-semibold text-slate-700 dark:text-slate-200">{hadir} hadir · {persen}%</span>
                      </div>
                      <div className="h-1.5 rounded-full bg-slate-100 dark:bg-slate-700 overflow-hidden">
                        <div className="h-full rounded-full bg-emerald-500" style={{ width: `${persen}%` }} />
                      </div>
                    </>
                  )}
                </div>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
