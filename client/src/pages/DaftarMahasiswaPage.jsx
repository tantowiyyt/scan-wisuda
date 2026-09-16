/**
 * DaftarMahasiswaPage - Menampilkan tabel semua mahasiswa wisuda
 * beserta status kehadiran dan pencarian.
 */

import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import useSocket from '../hooks/useSocket'

const API_URL = import.meta.env.VITE_SERVER_URL || ''

export default function DaftarMahasiswaPage() {
  const navigate = useNavigate()
  const currentEventId = localStorage.getItem('currentEventId')
  const currentEventName = localStorage.getItem('currentEventName')
  const [mahasiswa, setMahasiswa] = useState([])
  const [search, setSearch] = useState('')
  const [stats, setStats] = useState({ total: 0, hadir: 0, belumHadir: 0 })

  // Redirect ke pilih event jika belum ada event yang dipilih
  useEffect(() => {
    if (!currentEventId) {
      navigate('/pilih-event')
    }
  }, [currentEventId, navigate])

  // Ambil data dari server
  async function fetchData() {
    if (!currentEventId) return
    try {
      const [invRes, statsRes] = await Promise.all([
        fetch(`${API_URL}/api/events/${currentEventId}/invitations`),
        fetch(`${API_URL}/api/stats?event_id=${currentEventId}`)
      ])
      const invJson = await invRes.json()
      const statsJson = await statsRes.json()
      setMahasiswa(invJson.data)
      setStats(statsJson.data)
    } catch (err) {
      console.error('Gagal mengambil data mahasiswa:', err)
    }
  }

  useEffect(() => { fetchData() }, [currentEventId])

  // Update data setiap ada scan baru
  useSocket('attendance_update', () => { fetchData() })

  // Filter berdasarkan nama atau QR code
  const filtered = mahasiswa.filter(m =>
    m.name.toLowerCase().includes(search.toLowerCase()) ||
    m.qr_code.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="p-6 max-w-6xl mx-auto w-full">
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-2xl font-bold mb-1 dark:text-slate-100">Daftar Mahasiswa Wisuda</h2>
        {currentEventName && (
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-2">{currentEventName}</p>
        )}
        <p className="text-slate-600 dark:text-slate-400">
          Hadir: <span className="font-semibold text-green-600 dark:text-green-400">{stats.hadir}</span>
          {' / '}
          Total: <span className="font-semibold">{stats.total}</span>
        </p>
      </div>

      {/* Search box */}
      <input
        type="text"
        value={search}
        onChange={e => setSearch(e.target.value)}
        placeholder="Cari nama atau kode QR..."
        className="w-full md:w-96 px-4 py-2 border-2 border-slate-300 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:placeholder-slate-500 rounded-lg mb-4 focus:border-blue-500 focus:dark:border-blue-400 focus:outline-none bg-white transition-colors"
      />

      {/* Tabel */}
      <div className="bg-white dark:bg-slate-800 border dark:border-slate-700 rounded-2xl shadow overflow-hidden transition-colors">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-100 dark:bg-slate-900/50 text-slate-700 dark:text-slate-300">
              <tr>
                <th className="px-4 py-3 font-semibold">QR Code</th>
                <th className="px-4 py-3 font-semibold">Nama</th>
                <th className="px-4 py-3 font-semibold">Orang Tua</th>
                <th className="px-4 py-3 font-semibold">Kuota</th>
                <th className="px-4 py-3 font-semibold">Status</th>
                <th className="px-4 py-3 font-semibold">Waktu Scan</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(m => (
                <tr key={m.qr_code} className="border-t border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                  <td className="px-4 py-3 font-mono text-sm dark:text-slate-200">{m.qr_code}</td>
                  <td className="px-4 py-3 font-medium dark:text-slate-200">{m.name}</td>
                  <td className="px-4 py-3 text-slate-600 dark:text-slate-400">{m.parent_name || '-'}</td>
                  <td className="px-4 py-3 text-center dark:text-slate-200">{m.quota}</td>
                  <td className="px-4 py-3">
                    {m.status === 'hadir' ? (
                      <span className="inline-flex items-center gap-1 bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-300 px-2 py-1 rounded-full text-xs font-semibold">
                        ✓ Hadir
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400 px-2 py-1 rounded-full text-xs font-semibold">
                        Belum
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-slate-500 dark:text-slate-400 text-sm">
                    {m.scanned_at
                      ? new Date(m.scanned_at).toLocaleString('id-ID')
                      : '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {filtered.length === 0 && (
          <div className="p-8 text-center text-slate-400 dark:text-slate-500">
            Tidak ada mahasiswa yang cocok dengan pencarian.
          </div>
        )}
      </div>
    </div>
  )
}
