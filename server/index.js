import express from 'express'
import http from 'http'
import cors from 'cors'
import dotenv from 'dotenv'
import { Server } from 'socket.io'
import path from 'path'
import { fileURLToPath } from 'url'
import db, { getStats, getAllAttendances, getAllInvitationsWithStatus, getAllEvents } from './db.js'
import scanRouter from './routes/scan.js'
import eventsRouter from './routes/events.js'
import qrcodesRouter from './routes/qrcodes.js'

dotenv.config()

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const app = express()
const httpServer = http.createServer(app)
const io = new Server(httpServer, {
  cors: { origin: '*' }
})

app.use(cors())
app.use(express.json())

app.set('io', io)

io.on('connection', (socket) => {
  console.log('Client connected:', socket.id)
  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id)
  })
})

app.use('/api/scan', scanRouter)
app.use('/api/events/:id/qrcodes', qrcodesRouter) // HARUS SEBELUM events
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

app.get('/api/invitations', (req, res) => {
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
httpServer.listen(PORT, () => {
  console.log('Server running on port', PORT)
})