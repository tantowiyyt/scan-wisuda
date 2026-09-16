/**
 * PilihEventPage - Halaman untuk memilih event wisuda sebelum masuk ke scan.
 * Event yang dipilih disimpan di localStorage dan dipakai di ScannerPage + DaftarMahasiswaPage.
 */

import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'

const API_URL = import.meta.env.VITE_SERVER_URL || ''

export default function PilihEventPage() {
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const navigate = useNavigate()

  useEffect(() => {
    async function fetchEvents() {
      try {
        const res = await fetch(`${API_URL}/api/events`)
        const json = await res.json()
        setEvents(json.data || [])
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
    navigate('/scan')
  }

  return (
    <div className="p-6 max-w-5xl mx-auto w-full">
      <h2 className="text-2xl font-bold mb-2 dark:text-slate-100">Pilih Event Wisuda</h2>
      <p className="text-slate-500 dark:text-slate-400 mb-6">Pilih event untuk masuk ke halaman scan</p>

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
          <p>Belum ada event. Buat event dulu di halaman Management.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {events.map((event) => (
            <button
              key={event.id}
              onClick={() => handleSelectEvent(event)}
              className="text-left bg-white dark:bg-slate-800 border border-slate-200 
                         dark:border-slate-700 rounded-xl p-5 hover:border-indigo-500 
                         hover:shadow-md transition-all"
            >
              <div className="flex items-start gap-3">
                <div className="w-12 h-12 rounded-lg bg-indigo-50 dark:bg-indigo-950 
                                flex items-center justify-center text-2xl">🎓</div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                    {event.name}
                  </h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    Tahun {event.year}
                  </p>
                  {event.event_date && (
                    <p className="text-xs text-slate-400 mt-1">
                      {new Date(event.event_date).toLocaleDateString('id-ID', { 
                        day: 'numeric', month: 'long', year: 'numeric' 
                      })}
                    </p>
                  )}
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}