import './env.js'
import express from 'express'
import http from 'http'
import { Server } from 'socket.io'
import path from 'path'
import { fileURLToPath } from 'url'
import db, { getStats, getAllAttendances, getAllInvitationsWithStatus, getAllEvents } from './db.js'
import scanRouter from './routes/scan.js'
import eventsRouter from './routes/events.js'
import qrcodesRouter from './routes/qrcodes.js'
import authRouter from './routes/auth.js'
import { requireAuth, requireAdmin, userFromCookieHeader } from './auth.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const app = express()
const httpServer = http.createServer(app)
// Client & API selalu satu origin (dev lewat proxy Vite), jadi tanpa CORS
const io = new Server(httpServer)

// Di VPS di belakang nginx: TRUST_PROXY=1 agar req.ip & cookie Secure (HTTPS) benar
if (process.env.TRUST_PROXY) {
  app.set('trust proxy', parseInt(process.env.TRUST_PROXY) || process.env.TRUST_PROXY)
}

app.use(express.json())

app.set('io', io)

// Socket.IO hanya untuk client yang sudah login
io.use((socket, next) => {
  const user = userFromCookieHeader(socket.handshake.headers.cookie)
  if (!user) return next(new Error('unauthorized'))
  socket.data.user = user
  next()
})

io.on('connection', (socket) => {
  console.log('Client connected:', socket.id)
  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id)
  })
})

// Login/logout terbuka; semua /api lain wajib login
app.use('/api/auth', authRouter)
app.use('/api', requireAuth)

app.use('/api/scan', scanRouter)
app.use('/api/events/:id/qrcodes', requireAdmin, qrcodesRouter) // HARUS SEBELUM events
app.use('/api/events', eventsRouter)

function getDefaultEventId() {
  const events = getAllEvents()
  return events.length > 0 ? events[0].id : null
}

app.get('/api/attendances', (req, res) => {
  const eventId = req.query.event_id ? parseInt(req.query.event_id) : getDefaultEventId()
  if (!eventId) return res.json({ status: 'success', data: [] })
  res.json({ status: 'success', data: getAllAttendances(eventId) })
})

app.get('/api/stats', (req, res) => {
  const eventId = req.query.event_id ? parseInt(req.query.event_id) : getDefaultEventId()
  if (!eventId) return res.json({ status: 'success', data: { total: 0, hadir: 0, belumHadir: 0 } })
  res.json({ status: 'success', data: getStats(eventId) })
})

app.get('/api/invitations', requireAdmin, (req, res) => {
  const eventId = req.query.event_id ? parseInt(req.query.event_id) : getDefaultEventId()
  if (!eventId) return res.json({ status: 'success', data: [] })
  res.json({ status: 'success', data: getAllInvitationsWithStatus(eventId) })
})

const clientDist = path.join(__dirname, '..', 'client', 'dist')
app.use(express.static(clientDist))

app.get(/^\/(?!api).*/, (req, res) => {
  res.sendFile(path.join(clientDist, 'index.html'))
})

app.use((err, req, res, next) => {
  console.error(err)
  res.status(500).json({ status: 'error', message: err.message })
})

const PORT = process.env.PORT || 3000
// Di VPS isi HOST=127.0.0.1 agar port 3000 hanya bisa diakses lewat nginx (HTTPS)
const HOST = process.env.HOST || '0.0.0.0'
httpServer.listen(PORT, HOST, () => {
  console.log(`Server running on ${HOST}:${PORT}`)
  if (!process.env.ADMIN_PASSWORD) {
    console.warn('[auth] PERINGATAN: ADMIN_PASSWORD belum diisi di server/.env — tidak ada yang bisa login')
  }
})