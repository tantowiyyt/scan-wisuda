import express from 'express'
import { findInvitation, getAttendanceByQr, recordAttendance, getAllEvents, getScanDetail } from '../db.js'

const router = express.Router()

// Helper: dapatkan event_id default (event terbaru)
function getDefaultEventId() {
  const events = getAllEvents()
  return events.length > 0 ? events[0].id : null
}

router.post('/', (req, res) => {
  const { scanner_id, event_id } = req.body
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
    return res.json({ status: 'not_found', message: 'QR tidak valid', event_id: targetEventId })
  }

  const existing = getAttendanceByQr(targetEventId, qr_code)
  const status = existing ? 'duplicate' : 'success'
  const scannerId = scanner_id || 'unknown'
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
  }

  io.emit('attendance_update', data)
  if (status === 'duplicate') {
    return res.json({ status, message: 'Sudah hadir', data })
  }
  return res.json({ status, data })
})

export default router