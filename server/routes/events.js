import express from 'express'
import multer from 'multer'
import * as XLSX from 'xlsx'
import {
  getAllEvents,
  getEventById,
  createEvent,
  updateEvent,
  deleteEvent,
  createInvitation,
  getFamiliesWithStatus
} from '../db.js'

const router = express.Router()

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
      createInvitation(eventId, qrBase, `${qrBase}-A`, namaMhs, prodi || null, jenjangNorm, 'mahasiswa')
      createInvitation(eventId, qrBase, `${qrBase}-B`, namaAyah, null, null, 'ayah')
      createInvitation(eventId, qrBase, `${qrBase}-C`, namaIbu, null, null, 'ibu')
      
      imported += 3
      families++
    }

    res.json({ status: 'success', data: { imported, skipped, total: rows.length, families } })
  } catch (err) {
    console.error('Import error:', err)
    res.status(500).json({ status: 'error', message: 'Gagal memproses file Excel' })
  }
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