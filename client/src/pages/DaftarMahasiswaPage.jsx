/**
 * DaftarMahasiswaPage - Menampilkan daftar keluarga wisuda
 * dengan status kehadiran per anggota keluarga (nested grouping).
 */

import { useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import useSocket from '../hooks/useSocket'

const API_URL = import.meta.env.VITE_SERVER_URL || ''

export default function DaftarMahasiswaPage() {
  const navigate = useNavigate()
  const currentEventId = localStorage.getItem('currentEventId')
  const currentEventName = localStorage.getItem('currentEventName')
  const [families, setFamilies] = useState([])
  const [search, setSearch] = useState('')
  const [stats, setStats] = useState({ total: 0, hadir: 0, belumHadir: 0 })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // Redirect ke pilih event jika belum ada event yang dipilih
  useEffect(() => {
    if (!currentEventId) {
      navigate('/pilih-event')
    }
  }, [currentEventId, navigate])

  // Ambil data keluarga + statistik dari server
  const fetchData = useCallback(async () => {
    if (!currentEventId) return
    setLoading(true)
    setError(null)
    try {
      const [invRes, statsRes] = await Promise.all([
        fetch(`${API_URL}/api/events/${currentEventId}/invitations`).then(r => r.json()),
        fetch(`${API_URL}/api/stats?event_id=${currentEventId}`).then(r => r.json()),
      ])
      if (invRes.status === 'success') setFamilies(invRes.data)
      if (statsRes.status === 'success') setStats(statsRes.data)
    } catch (err) {
      setError(err.message || 'Gagal memuat')
    } finally {
      setLoading(false)
    }
  }, [currentEventId, API_URL])

  useEffect(() => { fetchData() }, [fetchData])

  // Socket listener stabil — tidak buat fungsi baru tiap render
  const handleAttendanceUpdate = useCallback(() => { fetchData() }, [fetchData])
  useSocket('attendance_update', handleAttendanceUpdate)

  // Filter berdasarkan search (case-insensitive)
  const filtered = families.filter(f => {
    if (!search.trim()) return true
    const q = search.toLowerCase()
    return (
      f.family_group.toLowerCase().includes(q) ||
      (f.mahasiswa?.name || '').toLowerCase().includes(q) ||
      (f.mahasiswa?.prodi || '').toLowerCase().includes(q) ||
      (f.mahasiswa?.qr_code || '').toLowerCase().includes(q)
    )
  })

  return (
    <div className="p-6 max-w-6xl mx-auto w-full">
      {/* Header */}
      <div className="flex justify-between items-start mb-6">
        <div>
          <h2 className="text-2xl font-bold dark:text-slate-100">Daftar Mahasiswa Wisuda</h2>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
            {currentEventName} • Hadir {stats.hadir} / Total {stats.total} keluarga
          </p>
        </div>
        <a
          href={`${API_URL}/api/events/${currentEventId}/report.csv`}
          className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 
                     text-white px-4 py-2 rounded-lg font-medium text-sm transition 
                     shadow-sm"
          download
        >
          <span>📥</span>
          <span>Download Laporan CSV</span>
        </a>
      </div>

      {/* Search box */}
      <input
        type="text"
        value={search}
        onChange={e => setSearch(e.target.value)}
        placeholder="Cari nama mahasiswa, prodi, atau kode QR..."
        className="w-full md:w-96 px-4 py-2 border-2 border-slate-300 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:placeholder-slate-500 rounded-lg mb-4 focus:border-blue-500 focus:dark:border-blue-400 focus:outline-none bg-white transition-colors"
      />

      {/* Loading state */}
      {loading && (
        <div className="flex items-center justify-center py-16">
          <div className="flex items-center gap-3 text-slate-500 dark:text-slate-400">
            <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            <span>Memuat...</span>
          </div>
        </div>
      )}

      {/* Error state */}
      {!loading && error && (
        <div className="bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-xl p-6 text-center">
          <p className="text-rose-700 dark:text-rose-300 font-medium mb-3">
            Gagal memuat data: {error}
          </p>
          <button
            onClick={fetchData}
            className="bg-rose-600 hover:bg-rose-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition"
          >
            Coba Lagi
          </button>
        </div>
      )}

      {/* Daftar keluarga */}
      {!loading && !error && (
        <div className="space-y-3">
          {filtered.map(f => {
            const familyHadir = f.mahasiswa?.status === 'hadir'
            return (
              <div key={f.family_group}
                className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden">

                {/* Header keluarga */}
                <div className="flex items-center gap-3 p-4 border-b border-slate-100 dark:border-slate-700">
                  <div className={`w-12 h-12 rounded-lg flex items-center justify-center text-xl flex-shrink-0 ${
                    familyHadir
                      ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400'
                      : 'bg-slate-100 dark:bg-slate-700 text-slate-400'
                  }`}>
                    {familyHadir ? '✓' : '○'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-slate-900 dark:text-slate-100 truncate">
                      {f.mahasiswa?.name || '—'}
                    </p>
                    <p className="text-sm text-slate-500 dark:text-slate-400 truncate">
                      {f.mahasiswa?.prodi}
                      {f.mahasiswa?.jenjang && ` • ${f.mahasiswa.jenjang}`}
                    </p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-xs text-slate-400 dark:text-slate-500">
                      {f.family_group}
                    </p>
                    <p className="text-xs font-medium mt-0.5 text-slate-600 dark:text-slate-300">
                      {f.hadir_count} / {f.total_count} hadir
                    </p>
                  </div>
                </div>

                {/* Baris anggota keluarga */}
                <div className="divide-y divide-slate-100 dark:divide-slate-700">
                  {[
                    { label: 'Mahasiswa', data: f.mahasiswa },
                    { label: 'Ayah', data: f.ayah },
                    { label: 'Ibu', data: f.ibu },
                  ].map(({ label, data }) => data && (
                    <div key={label} className="flex items-center gap-3 px-4 py-2.5">
                      <div className="w-20 text-xs uppercase tracking-wider text-slate-400 dark:text-slate-500 font-medium">
                        {label}
                      </div>
                      <div className="flex-1 min-w-0 text-sm text-slate-700 dark:text-slate-300 truncate">
                        {data.name}
                      </div>
                      <div className="flex-shrink-0">
                        {data.status === 'hadir' ? (
                          <span className="inline-flex items-center gap-1 bg-emerald-100 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400 px-2 py-0.5 rounded-full text-xs font-medium">
                            ✓ Hadir
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 px-2 py-0.5 rounded-full text-xs">
                            Belum
                          </span>
                        )}
                      </div>
                      <div className="w-16 text-right text-xs font-mono text-slate-400">
                        {data.qr_code?.slice(-1)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )
          })}

          {/* Empty state */}
          {filtered.length === 0 && (
            <div className="p-8 text-center text-slate-400 dark:text-slate-500">
              {search.trim()
                ? 'Tidak ada mahasiswa yang cocok dengan pencarian'
                : 'Belum ada data mahasiswa'}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
