/**
 * CetakQRPage.jsx — Cetak stiker QR undangan dengan 3 preset ukuran.
 * Semua ukuran dalam mm agar presisi 1:1 saat print.
 */

import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { LABELS, labelsPerPage } from '../constants/labels'

export default function CetakQRPage() {
  const { id } = useParams()
  const [event, setEvent] = useState(null)
  const [invitations, setInvitations] = useState([])
  const [preset, setPreset] = useState('107')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const API_URL = import.meta.env.VITE_SERVER_URL || ''
  const cfg = LABELS[preset]
  const perPage = labelsPerPage(cfg)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    Promise.all([
      fetch(`${API_URL}/api/events/${id}`).then(r => r.json()),
      fetch(`${API_URL}/api/events/${id}/qrcodes/preview`).then(r => r.json()),
    ])
      .then(([evRes, invRes]) => {
        if (cancelled) return
        if (evRes.status === 'success') setEvent(evRes.data)
        if (invRes.status === 'success') setInvitations(invRes.data)
      })
      .catch(err => !cancelled && setError(err.message))
      .finally(() => !cancelled && setLoading(false))
    return () => { cancelled = true }
  }, [id, API_URL])

  const pages = []
  for (let i = 0; i < invitations.length; i += perPage) {
    pages.push(invitations.slice(i, i + perPage))
  }
  if (pages.length === 0) pages.push([])

  const gridStyle = {
    gridTemplateColumns: `repeat(${cfg.cols}, ${cfg.width}mm)`,
    gridTemplateRows: `repeat(${cfg.rows}, ${cfg.height}mm)`,
    columnGap: `${cfg.gapX}mm`,
    rowGap: `${cfg.gapY}mm`,
    paddingTop: `${cfg.marginTop}mm`,
    paddingBottom: `${cfg.marginTop}mm`,
    paddingLeft: `${cfg.marginLeft}mm`,
    paddingRight: `${cfg.marginLeft}mm`,
    justifyContent: 'center',
    alignContent: 'start',
  }

  if (loading) {
    return <div className="p-8 text-center text-slate-500">Memuat...</div>
  }
  if (error) {
    return <div className="p-8 text-center text-rose-500">Error: {error}</div>
  }

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-900 py-6 print:py-0">
      <div className="no-print max-w-4xl mx-auto px-4 mb-6">
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4 mb-3">
          <h2 className="text-lg font-bold dark:text-slate-100 mb-1">
            Cetak Stiker QR — {event?.name}
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {invitations.length} undangan • {pages.length} halaman A4 • {perPage} label/halaman
          </p>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4 mb-3">
          <p className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
            Pilih Ukuran Label
          </p>
          <div className="grid grid-cols-3 gap-2">
            {Object.entries(LABELS).map(([key, l]) => (
              <button
                key={key}
                onClick={() => setPreset(key)}
                className={`p-3 rounded-lg border-2 text-left transition ${
                  preset === key
                    ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-950/50'
                    : 'border-slate-200 dark:border-slate-700 hover:border-slate-300'
                }`}
              >
                <p className="font-semibold text-sm dark:text-slate-100">{l.name}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  {l.width} × {l.height} mm
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {l.cols} × {l.rows} = {l.cols * l.rows} / hal
                </p>
              </button>
            ))}
          </div>
        </div>

        <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-xl p-3 text-sm mb-3">
          <p className="font-semibold text-amber-900 dark:text-amber-300 mb-1 text-xs">
            ⚠️ SEBELUM PRINT
          </p>
          <ul className="text-amber-800 dark:text-amber-400/80 text-xs space-y-0.5 list-disc list-inside">
            <li>Setting print: Scale 100% — jangan "Fit to page"</li>
            <li>Paper: A4, Portrait, Margins: None</li>
            <li>Matikan "Headers and footers"</li>
            <li>Test 1 lembar di kertas biasa dulu, ukur pakai penggaris</li>
          </ul>
        </div>

        <button
          onClick={() => window.print()}
          className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-3 rounded-xl font-semibold text-base transition"
        >
          🖨️ Print Sekarang ({pages.length} halaman)
        </button>
      </div>

      {pages.map((pageItems, pageIdx) => (
        <div key={pageIdx} className="a4-sheet">
          <div className="a4-grid" style={gridStyle}>
            {pageItems.map(inv => (
              <div key={inv.qr_code} className="label-cell">
                <img
                  className="qr"
                  src={`${API_URL}/api/events/${id}/qrcodes/${inv.qr_code}.png`}
                  alt={inv.qr_code}
                  style={{ width: `${cfg.qrSize}mm`, height: `${cfg.qrSize}mm` }}
                />
                <div className="info">
                  <div className="nama" style={{ fontSize: `${cfg.fontNama}pt` }}>
                    {inv.name}
                  </div>
                  
                  {inv.kategori === 'mahasiswa' ? (
                    <>
                      <div className="prodi" style={{ fontSize: `${cfg.fontProdi}pt` }}>
                        {inv.prodi}{inv.jenjang ? ` • ${inv.jenjang}` : ''}
                      </div>
                      {(inv.nim || inv.kelas) && (
                        <div className="nim" style={{ 
                          fontSize: `${cfg.fontProdi - 1}pt`, 
                          color: '#666' 
                        }}>
                          {inv.nim}{inv.nim && inv.kelas ? ' • ' : ''}{inv.kelas}
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="prodi" style={{ fontSize: `${cfg.fontProdi}pt` }}>
                      {inv.kategori === 'ayah' ? 'Ayah' : inv.kategori === 'ibu' ? 'Ibu' : 'Wali'}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
