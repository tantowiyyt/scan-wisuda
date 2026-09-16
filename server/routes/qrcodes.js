/**
 * qrcodes.js - Endpoint untuk generate QR code PNG, ZIP, dan CSV
 * untuk cetak stiker undangan dan mail merge.
 */

import express from 'express'
import QRCode from 'qrcode'
import JSZip from 'jszip'
import db, { getEventById, findInvitation, getInvitationsForQRCodes } from '../db.js'

const router = express.Router({ mergeParams: true })

// Helper: escape CSV value
function escapeCsv(val) {
  if (val === null || val === undefined) return ''
  const str = String(val)
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return '"' + str.replace(/"/g, '""') + '"'
  }
  return str
}

// A. GET /zip - Download semua QR code sebagai ZIP (PALING ATAS)
router.get('/zip', async (req, res) => {
  try {
    const eventId = parseInt(req.params.id)
    const event = getEventById(eventId)
    if (!event) {
      return res.status(404).json({ status: 'error', message: 'Event tidak ditemukan' })
    }
    const list = getInvitationsForQRCodes(eventId)
    if (list.length === 0) {
      return res.status(400).json({ status: 'error', message: 'Belum ada undangan' })
    }

    const zip = new JSZip()
    for (const inv of list) {
      const buffer = await QRCode.toBuffer(inv.qr_code, {
        type: 'png',
        width: 400,
        margin: 1,
        errorCorrectionLevel: 'M',
      })
      zip.file(`${inv.qr_code}.png`, buffer)
    }

    const zipBuffer = await zip.generateAsync({
      type: 'nodebuffer',
      compression: 'DEFLATE',
      compressionOptions: { level: 9 },
    })

    console.log(`[zip] ${list.length} QR, ${zipBuffer.length} bytes`)

    const safeEventName = event.name.replace(/[^a-zA-Z0-9]/g, '-')
    const filename = `qrcodes-${safeEventName}.zip`
    res.setHeader('Content-Type', 'application/zip')
    res.setHeader('Content-Length', zipBuffer.length)
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`)
    res.send(zipBuffer)
  } catch (err) {
    console.error('[zip] error:', err)
    if (!res.headersSent) {
      res.status(500).json({ status: 'error', message: err.message })
    }
  }
})

// B. GET /csv - Download CSV untuk mail merge
router.get('/csv', (req, res) => {
  try {
    const eventId = parseInt(req.params.id)
    const event = getEventById(eventId)
    if (!event) {
      return res.status(404).json({ status: 'error', message: 'Event tidak ditemukan' })
    }

    const list = getInvitationsForQRCodes(eventId)

    // Generate CSV dengan header
    const header = 'nama,prodi,jenjang,file_qr,qr_code'
    const rows = list.map(inv => {
      return `${escapeCsv(inv.name)},${escapeCsv(inv.prodi)},${escapeCsv(inv.jenjang)},${inv.qr_code}.png,${inv.qr_code}`
    })
    const csvContent = [header, ...rows].join('\n')

    // Response
    const safeEventName = event.name.replace(/[^a-zA-Z0-9]/g, '-')
    res.setHeader('Content-Type', 'text/csv; charset=utf-8')
    res.setHeader('Content-Disposition', `attachment; filename="mailmerge-${safeEventName}.csv"`)
    res.send('\uFEFF' + csvContent) // BOM untuk Excel UTF-8
  } catch (err) {
    console.error('[qrcodes] Error generate CSV:', err)
    res.status(500).json({ status: 'error', message: 'Gagal generate CSV' })
  }
})

// C. GET /preview - Preview data undangan untuk QR code
router.get('/preview', (req, res) => {
  try {
    const eventId = parseInt(req.params.id)
    const list = getInvitationsForQRCodes(eventId)
    res.json({ status: 'success', data: list })
  } catch (err) {
    console.error('[qrcodes] Error preview:', err)
    res.status(500).json({ status: 'error', message: 'Gagal load preview' })
  }
})

// D. GET /:qr_code.png - Generate QR code PNG (PALING AKHIR)
router.get('/:qr_code.png', async (req, res) => {
  try {
    const eventId = parseInt(req.params.id)
    const qrCode = req.params.qr_code

    // Cek event ada
    const event = getEventById(eventId)
    if (!event) {
      return res.status(404).json({ status: 'error', message: 'Event tidak ditemukan' })
    }

    // Cek invitation ada
    const inv = findInvitation(eventId, qrCode)
    if (!inv) {
      return res.status(404).json({ status: 'error', message: 'QR tidak ditemukan' })
    }

    // Generate PNG
    const buffer = await QRCode.toBuffer(qrCode, {
      type: 'png',
      width: 400,
      margin: 1,
      errorCorrectionLevel: 'M',
      color: { dark: '#000000', light: '#FFFFFF' }
    })

    res.type('png')
    res.setHeader('Content-Disposition', `inline; filename="${qrCode}.png"`)
    res.send(buffer)
  } catch (err) {
    console.error('[qrcodes] Error generate PNG:', err)
    res.status(500).json({ status: 'error', message: 'Gagal generate QR code' })
  }
})

export default router
