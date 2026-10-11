import express from 'express'
import { findInvitation, getAttendanceByQr, recordAttendance, getAllEvents, getScanDetail, recordScanError } from '../db.js'

const router = express.Router()

// Helper: dapatkan event_id default (event terbaru)
function getDefaultEventId() {
  const events = getAllEvents()
  return events.length > 0 ? events[0].id : null
}

router.post('/', (req, res) => {
  const { event_id } = req.body
  // Nama perangkat dari client, dibatasi agar data tetap rapi
  const scannerId = (typeof req.body.scanner_id === 'string' && req.body.scanner_id.trim().slice(0, 40)) || 'unknown'
  const qr_code = typeof req.body.qr_code === 'string' ? req.body.qr_code.trim() : ''

  if (!qr_code) {
    return res.status(400).json({ status: 'error', message: 'qr_code wajib diisi' })
  }

  const targetEventId = event_id ? parseInt(event_id) : getDefaultEventId()
  if (!targetEventId) {
    return res.status(400).json({ status: 'error', message: 'Tidak ada event tersedia' })
  }

  const io = req.app.get('io')
  const inv = findInvitation(targetEventId, qr_code)

  if (!inv) {
    recordScanError(targetEventId, qr_code.slice(0, 100), scannerId)
    // Tidak di-broadcast sebagai attendance_update; cukup sinyal untuk dashboard
    io.emit('scan_error', { event_id: targetEventId })
    return res.json({ status: 'not_found', message: 'QR tidak valid', event_id: targetEventId })
  }

  const existing = getAttendanceByQr(targetEventId, qr_code)
  const status = existing ? 'duplicate' : 'success'
  const scanned_at = new Date().toISOString()

  recordAttendance(targetEventId, qr_code, inv.name, scannerId, status)

  // Detail diambil setelah insert agar status keluarga sudah termasuk scan ini
  const data = {
    status,
    qr_code,
    name: inv.name,
    scanner_id: scannerId,
    scanned_at,
    event_id: targetEventId,
    ...getScanDetail(targetEventId, inv),
    // Scan sebelumnya (untuk info "masuk kembali")
    previous_scanned_at: existing ? existing.scanned_at.replace(' ', 'T') + 'Z' : null,
    previous_scanner_id: existing ? existing.scanner_id : null,
  }

  io.emit('attendance_update', data)
  // 'duplicate' = masuk kembali (normal, mis. habis ke WC)
  return res.json({ status, data })
})

export default router