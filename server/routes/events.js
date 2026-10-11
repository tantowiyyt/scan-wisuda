import express from 'express'
import multer from 'multer'
import crypto from 'crypto'
import * as XLSX from 'xlsx'
import {
  getAllEvents,
  getEventById,
  createEvent,
  updateEvent,
  deleteEvent,
  createInvitation,
  getFamiliesWithStatus,
  countInvitationsByEvent,
  deleteAttendancesByEvent
} from '../db.js'

const router = express.Router()

// Helper: escape CSV value
function escapeCsv(val) {
  if (val === null || val === undefined || val === '') return ''
  const str = String(val)
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return '"' + str.replace(/"/g, '""') + '"'
  }
  return str
}

// Helper: format timestamp to Indonesia locale
function fmtTime(iso) {
  if (!iso) return '-'
  try {
    const d = new Date(iso)
    // Format manual tanpa koma: DD/MM/YYYY HH:MM:SS
    const pad = (n) => String(n).padStart(2, '0')
    return [
      pad(d.getDate()),
      pad(d.getMonth() + 1),
      d.getFullYear()
    ].join('/') + ' ' + [
      pad(d.getHours()),
      pad(d.getMinutes()),
      pad(d.getSeconds())
    ].join(':')
  } catch { return iso }
}

// H. GET /api/events/:id/report.csv -> download laporan kehadiran CSV
// HARUS didaftarkan SEBELUM route lain yang pakai /:id/*
router.get('/:id/report.csv', (req, res) => {
  try {
    const eventId = parseInt(req.params.id)
    const event = getEventById(eventId)
    if (!event) {
      return res.status(404).json({ status: 'error', message: 'Event tidak ditemukan' })
    }

    const families = getFamiliesWithStatus(eventId)

    const header = [
      'family_group',
      'nim',
      'kelas',
      'nama_mahasiswa',
      'prodi',
      'jenjang',
      'status_mahasiswa',
      'scan_mahasiswa',
      'status_ayah',
      'scan_ayah',
      'status_ibu',
      'scan_ibu',
      'total_hadir',
    ].join(',')

    const rows = families.map(f => {
      const mhs = f.mahasiswa || {}
      const ayah = f.ayah || {}
      const ibu = f.ibu || {}
      return [
        escapeCsv(f.family_group),
        escapeCsv(mhs.nim),
        escapeCsv(mhs.kelas),
        escapeCsv(mhs.name),
        escapeCsv(mhs.prodi),
        escapeCsv(mhs.jenjang),
        mhs.status || 'belum',
        fmtTime(mhs.scanned_at),
        ayah.status || '-',
        fmtTime(ayah.scanned_at),
        ibu.status || '-',
        fmtTime(ibu.scanned_at),
        f.hadir_count || 0,
      ].join(',')
    })

    const csv = [header, ...rows].join('\n')

    const safeName = event.name.replace(/[^a-zA-Z0-9]/g, '-')
    const filename = `laporan-${safeName}-${new Date().toISOString().slice(0, 10)}.csv`

    res.setHeader('Content-Type', 'text/csv; charset=utf-8')
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`)
    res.send('\uFEFF' + csv)  // BOM untuk Excel UTF-8
  } catch (err) {
    console.error('[report.csv]', err)
    res.status(500).json({ status: 'error', message: err.message })
  }
})

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }
})

// Helper: ambil nilai dari row dengan key case-insensitive
function getVal(row, keys) {
  const lowerKeys = Object.keys(row).map(k => k.toLowerCase().trim())
  for (const key of keys) {
    const idx = lowerKeys.indexOf(key.toLowerCase())
    if (idx !== -1) {
      const originalKey = Object.keys(row)[idx]
      return row[originalKey]
    }
  }
  return ''
}

// A. GET /api/events -> list semua event
router.get('/', (req, res) => {
  res.json({ status: 'success', data: getAllEvents() })
})

// B. GET /api/events/:id -> detail satu event
router.get('/:id', (req, res) => {
  const event = getEventById(req.params.id)
  if (!event) {
    return res.status(404).json({ status: 'error', message: 'Event tidak ditemukan' })
  }
  res.json({ status: 'success', data: event })
})

// C. POST /api/events -> buat event baru
router.post('/', (req, res) => {
  const { name, year, event_date } = req.body
  if (!name || !year) {
    return res.status(400).json({ status: 'error', message: 'name dan year wajib diisi' })
  }
  const yearNum = parseInt(year)
  if (isNaN(yearNum)) {
    return res.status(400).json({ status: 'error', message: 'year harus berupa integer' })
  }
  const result = createEvent(name, yearNum, event_date)
  res.json({ status: 'success', data: { id: result.lastInsertRowid, name, year: yearNum, event_date } })
})

// D. PUT /api/events/:id -> update event
router.put('/:id', (req, res) => {
  const { name, year, event_date } = req.body
  const event = getEventById(req.params.id)
  if (!event) {
    return res.status(404).json({ status: 'error', message: 'Event tidak ditemukan' })
  }
  const yearNum = year !== undefined ? parseInt(year) : event.year
  if (isNaN(yearNum)) {
    return res.status(400).json({ status: 'error', message: 'year harus berupa integer' })
  }
  updateEvent(req.params.id, name ?? event.name, yearNum, event_date ?? event.event_date)
  res.json({ status: 'success' })
})

// E. DELETE /api/events/:id -> hapus event (cascade)
router.delete('/:id', (req, res) => {
  const event = getEventById(req.params.id)
  if (!event) {
    return res.status(404).json({ status: 'error', message: 'Event tidak ditemukan' })
  }
  deleteEvent(req.params.id)
  res.json({ status: 'success' })
})

// F. POST /api/events/:id/import -> import Excel
router.post('/:id/import', upload.single('file'), (req, res) => {
  const eventId = parseInt(req.params.id)
  const event = getEventById(eventId)
  if (!event) {
    return res.status(404).json({ status: 'error', message: 'Event tidak ditemukan' })
  }
  if (!req.file) {
    return res.status(400).json({ status: 'error', message: 'File tidak ditemukan' })
  }

  try {
    const workbook = XLSX.read(req.file.buffer, { type: 'buffer' })
    const sheet = workbook.Sheets[workbook.SheetNames[0]]
    const rows = XLSX.utils.sheet_to_json(sheet, { defval: '' })

    let imported = 0
    let skipped = 0
    let families = 0

    for (const row of rows) {
      const qrBase = String(getVal(row, ['qr_code', 'qrcode', 'qr'])).trim()
      const namaMhs = String(getVal(row, ['name', 'nama'])).trim()
      const prodi = String(getVal(row, ['prodi', 'program_studi', 'program studi', 'jurusan']) || '').trim()
      const jenjang = String(getVal(row, ['jenjang', 'program', 'strata']) || '').trim().toUpperCase()
      const nim = String(getVal(row, ['nim', 'NIM', 'nomor_induk']) || '').trim()
      const kelas = String(getVal(row, ['kelas', 'class', 'rombel']) || '').trim()
      
      // Normalisasi jenjang
      const jenjangNorm = jenjang.match(/^D\d$/) ? jenjang 
        : jenjang.toLowerCase().includes('diploma 3') ? 'D3'
        : jenjang.toLowerCase().includes('diploma 4') ? 'D4'
        : jenjang.toLowerCase().includes('sarjana terapan') ? 'D4'
        : jenjang || null

      if (!qrBase || !namaMhs) {
        skipped++
        continue
      }

      // Generate nama orang tua dari nama lengkap mahasiswa
      const namaAyah = `Bapak sdr. ${namaMhs}`
      const namaIbu = `Ibu sdr. ${namaMhs}`

      // Insert 3 rows: mahasiswa (A), ayah (B), ibu (C)
      const inserted = [
        createInvitation(eventId, qrBase, `${qrBase}-A`, namaMhs, prodi || null, jenjangNorm, 'mahasiswa', nim || null, kelas || null),
        createInvitation(eventId, qrBase, `${qrBase}-B`, namaAyah, null, null, 'ayah', null, null),
        createInvitation(eventId, qrBase, `${qrBase}-C`, namaIbu, null, null, 'ibu', null, null),
      ].reduce((sum, r) => sum + r.changes, 0)

      // Baris yang QR-nya sudah ada di-IGNORE, jadi tidak dihitung sebagai imported
      if (inserted === 0) {
        skipped++
        continue
      }
      imported += inserted
      families++
    }

    res.json({ status: 'success', data: { imported, skipped, total: rows.length, families } })
  } catch (err) {
    console.error('Import error:', err)
    res.status(500).json({ status: 'error', message: 'Gagal memproses file Excel' })
  }
})

// Batas percobaan password reset (in-memory, per IP): 5x salah → kunci 1 menit
const MAX_ATTEMPTS = 5
const LOCK_MS = 60 * 1000
const resetAttempts = new Map()

function checkPassword(input, expected) {
  // Bandingkan hash agar panjang sama & waktu konstan (anti timing attack)
  const a = crypto.createHash('sha256').update(String(input ?? '')).digest()
  const b = crypto.createHash('sha256').update(expected).digest()
  return crypto.timingSafeEqual(a, b)
}

// I. DELETE /api/events/:id/attendances -> reset presensi (butuh RESET_PASSWORD)
router.delete('/:id/attendances', (req, res) => {
  const expected = process.env.RESET_PASSWORD
  if (!expected) {
    return res.status(403).json({ status: 'error', message: 'Fitur reset nonaktif. Isi RESET_PASSWORD di server/.env lalu restart server.' })
  }

  const ip = req.ip
  const now = Date.now()
  const rec = resetAttempts.get(ip) || { count: 0, lockedUntil: 0 }
  if (rec.lockedUntil > now) {
    const sisa = Math.ceil((rec.lockedUntil - now) / 1000)
    return res.status(429).json({ status: 'error', message: `Terlalu banyak percobaan salah. Coba lagi dalam ${sisa} detik.` })
  }

  if (!checkPassword(req.body?.password, expected)) {
    rec.count++
    if (rec.count >= MAX_ATTEMPTS) {
      rec.count = 0
      rec.lockedUntil = now + LOCK_MS
    }
    resetAttempts.set(ip, rec)
    return res.status(401).json({ status: 'error', message: 'Password salah' })
  }
  resetAttempts.delete(ip)

  const eventId = parseInt(req.params.id)
  const event = getEventById(eventId)
  if (!event) {
    return res.status(404).json({ status: 'error', message: 'Event tidak ditemukan' })
  }

  const deleted = deleteAttendancesByEvent(eventId)
  console.log(`[reset] ${deleted} data scan dihapus dari event "${event.name}" oleh ${ip}`)
  req.app.get('io').emit('attendance_reset', { event_id: eventId })
  res.json({ status: 'success', data: { deleted } })
})

// G. GET /api/events/:id/invitations -> list undangan per event (kelompok per keluarga)
router.get('/:id/invitations', (req, res) => {
  const eventId = parseInt(req.params.id)
  const event = getEventById(eventId)
  if (!event) {
    return res.status(404).json({ status: 'error', message: 'Event tidak ditemukan' })
  }
  res.json({ status: 'success', data: getFamiliesWithStatus(eventId) })
})

export default router
