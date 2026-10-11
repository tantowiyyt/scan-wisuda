import express from 'express'
import { findInvitation, recordScan, findScanByClientId, getAllEvents, getScanDetail, recordScanError } from '../db.js'

const router = express.Router()

// Scan offline yang terkirim belakangan tetap pakai jam aslinya, maksimal 48 jam ke belakang
const MAX_BACKDATE_MS = 48 * 60 * 60 * 1000

// Helper: dapatkan event_id default (event terbaru)
function getDefaultEventId() {
  const events = getAllEvents()
  return events.length > 0 ? events[0].id : null
}

// Jam scan dari perangkat (ISO) → dibatasi [sekarang - 48 jam, sekarang]
function resolveScanTime(input) {
  const now = Date.now()
  let t = Date.parse(input)
  if (!Number.isFinite(t) || t > now) t = now
  if (t < now - MAX_BACKDATE_MS) t = now - MAX_BACKDATE_MS
  const iso = new Date(Math.floor(t / 1000) * 1000).toISOString().replace('.000Z', 'Z')
  // Format SQLite sama dengan CURRENT_TIMESTAMP: 'YYYY-MM-DD HH:MM:SS' (UTC)
  return { iso, sql: iso.slice(0, 19).replace('T', ' ') }
}

const toIso = (sqlTime) => (sqlTime ? sqlTime.replace(' ', 'T') + 'Z' : null)

function buildData(eventId, inv, row) {
  return {
    status: row.status,
    qr_code: inv.qr_code,
    name: inv.name,
    scanner_id: row.scanner_id,
    scanned_at: toIso(row.scanned_at),
    event_id: eventId,
    ...getScanDetail(eventId, inv),
  }
}

router.post('/', (req, res) => {
  const { event_id } = req.body
  // Nama perangkat dari client, dibatasi agar data tetap rapi
  const scannerId = (typeof req.body.scanner_id === 'string' && req.body.scanner_id.trim().slice(0, 40)) || 'unknown'
  const qr_code = typeof req.body.qr_code === 'string' ? req.body.qr_code.trim() : ''
  // ID unik scan dari perangkat (untuk mencegah dobel saat kirim ulang)
  const clientScanId = typeof req.body.client_scan_id === 'string' && /^[\w-]{8,64}$/.test(req.body.client_scan_id)
    ? req.body.client_scan_id
    : null
  const time = resolveScanTime(req.body.scanned_at)
  const offline = req.body.offline === true

  if (!qr_code) {
    return res.status(400).json({ status: 'error', message: 'qr_code wajib diisi' })
  }

  const targetEventId = event_id ? parseInt(event_id) : getDefaultEventId()
  if (!targetEventId) {
    return res.status(400).json({ status: 'error', message: 'Tidak ada event tersedia' })
  }

  const io = req.app.get('io')
  const inv = findInvitation(targetEventId, qr_code)

  // Scan ini sudah pernah diterima (kirim ulang dari antrean offline) → balas hasil yang sama
  const replay = findScanByClientId(clientScanId)
  if (replay) {
    if (replay.type === 'error' || !inv) {
      return res.json({ status: 'not_found', message: 'QR tidak valid', event_id: targetEventId, replay: true })
    }
    const data = buildData(targetEventId, inv, replay.row)
    return res.json({ status: data.status, data, replay: true })
  }

  if (!inv) {
    recordScanError(targetEventId, qr_code.slice(0, 100), scannerId, time.sql, clientScanId)
    // Tidak di-broadcast sebagai attendance_update; cukup sinyal untuk dashboard
    io.emit('scan_error', { event_id: targetEventId })
    return res.json({ status: 'not_found', message: 'QR tidak valid', event_id: targetEventId })
  }

  const { status, previous } = recordScan(targetEventId, inv, scannerId, time.sql, clientScanId)

  // Detail diambil setelah insert agar status keluarga sudah termasuk scan ini
  const data = {
    ...buildData(targetEventId, inv, { status, scanner_id: scannerId, scanned_at: time.sql }),
    // Scan sebelumnya (untuk info "masuk kembali")
    previous_scanned_at: previous ? toIso(previous.scanned_at) : null,
    previous_scanner_id: previous ? previous.scanner_id : null,
    offline,
    client_scan_id: clientScanId,
  }

  io.emit('attendance_update', data)
  // 'duplicate' = masuk kembali (normal, mis. habis ke WC)
  return res.json({ status, data })
})

export default router
