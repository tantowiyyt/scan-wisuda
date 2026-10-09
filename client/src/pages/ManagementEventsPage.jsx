/**
 * ManagementEventsPage - Halaman manajemen event wisuda.
 * List event, buat event baru, hapus event, import Excel undangan.
 */

import { useEffect, useState, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'

const API_URL = import.meta.env.VITE_SERVER_URL || ''

export default function ManagementEventsPage() {
  const navigate = useNavigate()
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(true)
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    year: new Date().getFullYear(),
    event_date: ''
  })
  const [importResult, setImportResult] = useState(null)
  const [error, setError] = useState(null)
  const [activeEventId, setActiveEventId] = useState(() =>
    parseInt(localStorage.getItem('currentEventId')) || null
  )
  const fileInputRefs = useRef({})

  const fetchEvents = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`${API_URL}/api/events`)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const json = await res.json()
      if (json.status === 'success' && Array.isArray(json.data)) {
        setEvents(json.data)
      } else {
        throw new Error('Response format tidak valid')
      }
    } catch (err) {
      console.error('[fetchEvents]', err)
      setError(err.message || 'Gagal memuat events')
      setEvents([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchEvents()
  }, [fetchEvents])

  async function handleCreate(e) {
    e.preventDefault()
    try {
      await fetch(`${API_URL}/api/events`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })
      setFormData({ name: '', year: new Date().getFullYear(), event_date: '' })
      setShowCreateForm(false)
      fetchEvents()
    } catch (err) {
      console.error('Gagal membuat event:', err)
      setError('Gagal membuat event')
    }
  }

  async function handleDelete(id, name) {
    if (!confirm(`Hapus event "${name}"? Semua undangan dan data scan akan ikut terhapus.`)) return
    try {
      await fetch(`${API_URL}/api/events/${id}`, { method: 'DELETE' })
      fetchEvents()
    } catch (err) {
      console.error('Gagal menghapus event:', err)
      setError('Gagal menghapus event')
    }
  }

  async function handleImport(eventId, file) {
    try {
      setImportResult({ status: 'loading', message: `Mengimport ${file.name}...` })

      const fd = new FormData()
      fd.append('file', file)

      const res = await fetch(`${API_URL}/api/events/${eventId}/import`, {
        method: 'POST',
        body: fd,
      })

      const json = await res.json()

      if (!res.ok || json.status !== 'success') {
        throw new Error(json.message || `HTTP ${res.status}`)
      }

      setImportResult({
        status: 'success',
        imported: json.data.imported,
        skipped: json.data.skipped,
        total: json.data.total,
        message: `Import selesai: ${json.data.imported} berhasil, ${json.data.skipped} dilewati`
      })
      fetchEvents()
      setActiveEventId(parseInt(localStorage.getItem('currentEventId')) || null)
      setTimeout(() => setImportResult(null), 6000)
    } catch (err) {
      console.error('[import]', err)
      setImportResult({
        status: 'error',
        message: `Gagal import: ${err.message}`
      })
      setTimeout(() => setImportResult(null), 8000)
    }
  }

  return (
    <div className="p-6 max-w-6xl mx-auto w-full">

      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold dark:text-slate-100">Management Events</h2>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
            Kelola event wisuda dan import daftar undangan
          </p>
        </div>
        <button
          onClick={() => setShowCreateForm(!showCreateForm)}
          className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg font-medium"
        >
          {showCreateForm ? 'Batal' : '+ Event Baru'}
        </button>
      </div>

      {/* Info template Excel */}
      {/* Info template Excel */}
      <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-4 mb-6">
        <p className="font-semibold text-slate-900 dark:text-slate-100 mb-3 text-sm">
          📋 Format Excel yang Dibutuhkan
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-2 text-sm mb-3">
          <div className="flex items-start gap-2">
            <span className="font-mono text-xs bg-slate-100 dark:bg-slate-700 text-slate-800 dark:text-slate-200 px-2 py-0.5 rounded">qr_code</span>
            <span className="text-slate-600 dark:text-slate-400">wajib, kode unik (contoh: WSD-001)</span>
          </div>
          <div className="flex items-start gap-2">
            <span className="font-mono text-xs bg-slate-100 dark:bg-slate-700 text-slate-800 dark:text-slate-200 px-2 py-0.5 rounded">name</span>
            <span className="text-slate-600 dark:text-slate-400">wajib, nama lengkap mahasiswa</span>
          </div>
          <div className="flex items-start gap-2">
            <span className="font-mono text-xs bg-slate-100 dark:bg-slate-700 text-slate-800 dark:text-slate-200 px-2 py-0.5 rounded">prodi</span>
            <span className="text-slate-600 dark:text-slate-400">opsional, program studi</span>
          </div>
          <div className="flex items-start gap-2">
            <span className="font-mono text-xs bg-slate-100 dark:bg-slate-700 text-slate-800 dark:text-slate-200 px-2 py-0.5 rounded">jenjang</span>
            <span className="text-slate-600 dark:text-slate-400">opsional, D3 / D4</span>
          </div>
          <div className="flex items-start gap-2">
            <span className="font-mono text-xs bg-slate-100 dark:bg-slate-700 text-slate-800 dark:text-slate-200 px-2 py-0.5 rounded">nim</span>
            <span className="text-slate-600 dark:text-slate-400">opsional, NIM mahasiswa</span>
          </div>
          <div className="flex items-start gap-2">
            <span className="font-mono text-xs bg-slate-100 dark:bg-slate-700 text-slate-800 dark:text-slate-200 px-2 py-0.5 rounded">kelas</span>
            <span className="text-slate-600 dark:text-slate-400">opsional, kelas mahasiswa</span>
          </div>
        </div>

        <div className="bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/50 rounded-lg p-3 text-xs">
          <p className="font-semibold text-indigo-900 dark:text-indigo-300 mb-1">
            💡 Auto-generate QR Orang Tua
          </p>
          <p className="text-indigo-800 dark:text-indigo-400/80 mb-2">
            Sistem otomatis membuat 3 QR per mahasiswa saat import:
          </p>
          <ul className="text-indigo-800 dark:text-indigo-400/80 space-y-0.5 ml-3">
            <li>• <span className="font-mono bg-white dark:bg-slate-900 px-1 rounded">{'{qr_code}-A'}</span> → mahasiswa</li>
            <li>• <span className="font-mono bg-white dark:bg-slate-900 px-1 rounded">{'{qr_code}-B'}</span> → Bapak sdr. {'{name}'}</li>
            <li>• <span className="font-mono bg-white dark:bg-slate-900 px-1 rounded">{'{qr_code}-C'}</span> → Ibu sdr. {'{name}'}</li>
          </ul>
        </div>

        <p className="mt-3 text-xs text-slate-500 dark:text-slate-500">
          Header di baris pertama. Format file: .xlsx, .xls, atau .csv
        </p>

        <button
          onClick={() => {
            const csv = 'qr_code,name,prodi,jenjang,nim,kelas\nWSD-001,Michael Arsil,Teknik Informatika,D3,2201001,TI-3A\nWSD-002,Siti Nurhaliza,Rekayasa Perangkat Lunak,D4,2202002,RPL-4B\n';
            const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'template-import-wisudawan.csv';
            a.click();
            URL.revokeObjectURL(url);
          }}
          className="mt-3 inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 rounded-lg text-xs font-medium transition"
        >
          📥 Download Template CSV
        </button>
      </div>

      {/* Form buat event */}
      {showCreateForm && (
        <form onSubmit={handleCreate} className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-5 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                Nama Event
              </label>
              <input
                type="text"
                required
                placeholder="Mis. Wisuda 2031"
                value={formData.name}
                onChange={e => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 dark:focus:ring-indigo-900/50 outline-none transition"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                Tahun
              </label>
              <input
                type="number"
                required
                placeholder="2031"
                value={formData.year}
                onChange={e => setFormData({ ...formData, year: parseInt(e.target.value) || '' })}
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 dark:focus:ring-indigo-900/50 outline-none transition"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                Tanggal Event
              </label>
              <input
                type="date"
                value={formData.event_date}
                onChange={e => setFormData({ ...formData, event_date: e.target.value })}
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 dark:focus:ring-indigo-900/50 outline-none transition"
              />
            </div>
          </div>
          <button
            type="submit"
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2 text-sm rounded-lg font-medium transition shadow-sm"
          >
            Simpan Event
          </button>
        </form>
      )}

      {/* Loading */}
      {loading && (
        <div className="text-center py-12">
          <div className="inline-block animate-spin text-3xl text-indigo-500">⟳</div>
          <p className="text-slate-500 dark:text-slate-400 mt-2">Memuat events...</p>
        </div>
      )}

      {/* Error state */}
      {error && !loading && (
        <div className="bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-xl p-4 mb-6">
          <p className="text-rose-800 dark:text-rose-300 font-medium">⚠ Gagal memuat events</p>
          <p className="text-rose-700 dark:text-rose-400 text-sm mt-1">{error}</p>
          <button
            onClick={fetchEvents}
            className="mt-3 bg-rose-600 hover:bg-rose-700 text-white px-4 py-1.5 rounded-lg text-sm font-medium"
          >
            Coba Lagi
          </button>
        </div>
      )}

      {/* Empty state */}
      {!loading && !error && events.length === 0 && (
        <div className="text-center py-12 text-slate-400">
          <div className="text-5xl mb-3">📅</div>
          <p>Belum ada event. Klik "+ Event Baru" untuk membuat.</p>
        </div>
      )}

      {/* List event */}
      {!loading && events.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {events.map((event) => (
            <div key={event.id} className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-5">
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-lg bg-indigo-50 dark:bg-indigo-950 flex items-center justify-center text-lg">🎓</div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="text-lg font-semibold dark:text-slate-100">{event.name}</h3>
                      {event.id === activeEventId && (
                        <span className="text-xs bg-emerald-100 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400 px-2 py-0.5 rounded-full font-medium">
                          ● Aktif
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                      Tahun {event.year}
                      {event.event_date && ` • ${event.event_date}`}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => handleDelete(event.id, event.name)}
                  className="text-rose-500 hover:text-rose-700 text-sm transition"
                  title="Hapus event"
                >
                  🗑️
                </button>
              </div>
              <div className="flex gap-2 pt-4 border-t border-slate-100 dark:border-slate-700">
                <button
                  type="button"
                  onClick={() => fileInputRefs.current[event.id]?.click()}
                  className="flex-1 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-lg px-3 py-2 text-center text-emerald-700 dark:text-emerald-400 text-sm font-medium hover:bg-emerald-100 transition"
                >
                  📥 Import Excel
                </button>
                <input
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  style={{ display: 'none' }}
                  ref={el => fileInputRefs.current[event.id] = el}
                  onChange={(e) => {
                    const file = e.target.files?.[0]
                    if (file) handleImport(event.id, file)
                    e.target.value = ''
                  }}
                />
                <button
                  onClick={() => navigate(`/events/${event.id}/cetak-qr`)}
                  className="flex-1 bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 rounded-lg px-3 py-2 text-center text-indigo-700 dark:text-indigo-400 text-sm font-medium hover:bg-indigo-100 transition"
                >
                  🖨️ Cetak QR
                </button>
                {event.id !== activeEventId && (
                  <button
                    onClick={() => {
                      localStorage.setItem('currentEventId', event.id)
                      localStorage.setItem('currentEventName', event.name)
                      setActiveEventId(event.id)
                      window.dispatchEvent(new CustomEvent('event-changed'))
                    }}
                    className="flex-1 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-lg px-3 py-2 text-center text-amber-700 dark:text-amber-400 text-sm font-medium hover:bg-amber-100 transition"
                  >
                    ⭐ Pilih
                  </button>
                )}
                {event.id === activeEventId && (
                  <button
                    disabled
                    className="flex-1 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-lg px-3 py-2 text-center text-emerald-700 dark:text-emerald-400 text-sm font-medium cursor-default opacity-70"
                  >
                    ✓ Aktif
                  </button>
                )}
                <button
                  onClick={() => navigate(`/mahasiswa?event=${event.id}`)}
                  className="flex-1 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-center text-slate-700 dark:text-slate-300 text-sm font-medium hover:bg-slate-100 transition"
                >
                  👥 Lihat Undangan
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Import result notification */}
      {importResult && (
        <div className={`fixed bottom-4 right-4 rounded-xl shadow-lg p-4 max-w-md z-50 border ${importResult.status === 'success'
          ? 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-300 dark:border-emerald-800'
          : importResult.status === 'error'
            ? 'bg-rose-50 dark:bg-rose-950/60 border-rose-300 dark:border-rose-800'
            : 'bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-700'
          }`}>
          <div className="flex items-start gap-3">
            <div className="text-2xl">
              {importResult.status === 'success' ? '✓'
                : importResult.status === 'error' ? '✗'
                  : '⏳'}
            </div>
            <div className="flex-1">
              <p className={`font-semibold ${importResult.status === 'success' ? 'text-emerald-900 dark:text-emerald-200'
                : importResult.status === 'error' ? 'text-rose-900 dark:text-rose-200'
                  : 'text-slate-900 dark:text-slate-100'
                }`}>
                {importResult.status === 'success' ? 'Import Berhasil'
                  : importResult.status === 'error' ? 'Import Gagal'
                    : 'Sedang Mengimport...'}
              </p>
              <p className={`text-sm mt-0.5 ${importResult.status === 'success' ? 'text-emerald-700 dark:text-emerald-400'
                : importResult.status === 'error' ? 'text-rose-700 dark:text-rose-400'
                  : 'text-slate-600 dark:text-slate-400'
                }`}>
                {importResult.message}
              </p>
            </div>
            <button
              onClick={() => setImportResult(null)}
              className="text-slate-400 hover:text-slate-600 text-lg leading-none"
            >×</button>
          </div>
        </div>
      )}
    </div>
  )
}
