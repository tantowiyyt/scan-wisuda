import express from 'express'
import { findInvitation, getAttendanceByQr, recordAttendance, getAllEvents } from '../db.js'

const router = express.Router()

// Helper: dapatkan event_id default (event terbaru)
function getDefaultEventId() {
  const events = getAllEvents()
  return events.length > 0 ? events[0].id : null
}

router.post('/', (req, res) => {
  const { qr_code, scanner_id, event_id } = req.body

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
  const scanned_at = new Date().toISOString()

  if (existing) {
    recordAttendance(targetEventId, qr_code, inv.name, scanner_id || 'unknown', 'duplicate')
    io.emit('attendance_update', { status: 'duplicate', qr_code, name: inv.name, scanned_at, event_id: targetEventId })
    return res.json({ status: 'duplicate', message: 'Sudah hadir', data: { qr_code, name: inv.name, scanned_at, event_id: targetEventId } })
  }

  recordAttendance(targetEventId, qr_code, inv.name, scanner_id || 'unknown', 'success')
  io.emit('attendance_update', { status: 'success', qr_code, name: inv.name, scanned_at, event_id: targetEventId })
  return res.json({ status: 'success', data: { qr_code, name: inv.name, scanned_at, event_id: targetEventId } })
})

export default router