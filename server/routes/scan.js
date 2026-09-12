import express from 'express'
import { findInvitation, getAttendanceByQr, recordAttendance } from '../db.js'

const router = express.Router()

router.post('/', (req, res) => {
  const { qr_code, scanner_id } = req.body

  if (!qr_code) {
    return res.status(400).json({ status: 'error', message: 'qr_code wajib diisi' })
  }

  const io = req.app.get('io')
  const inv = findInvitation(qr_code)

  if (!inv) {
    return res.json({ status: 'not_found', message: 'QR tidak valid' })
  }

  const existing = getAttendanceByQr(qr_code)
  const scanned_at = new Date().toISOString()

  if (existing) {
    recordAttendance(qr_code, inv.name, scanner_id || 'unknown', 'duplicate')
    io.emit('attendance_update', { status: 'duplicate', qr_code, name: inv.name, scanned_at })
    return res.json({ status: 'duplicate', message: 'Sudah hadir', data: { qr_code, name: inv.name, scanned_at } })
  }

  recordAttendance(qr_code, inv.name, scanner_id || 'unknown', 'success')
  io.emit('attendance_update', { status: 'success', qr_code, name: inv.name, scanned_at })
  return res.json({ status: 'success', data: { qr_code, name: inv.name, scanned_at } })
})

export default router