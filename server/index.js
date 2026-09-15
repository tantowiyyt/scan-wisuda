import express from 'express'
import http from 'http'
import cors from 'cors'
import dotenv from 'dotenv'
import { Server } from 'socket.io'
import path from 'path'
import { fileURLToPath } from 'url'
import db, { getStats, getAllAttendances, getAllInvitationsWithStatus } from './db.js'
import scanRouter from './routes/scan.js'

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

app.get('/api/attendances', (req, res) => {
  res.json({ status: 'success', data: getAllAttendances() })
})

app.get('/api/stats', (req, res) => {
  res.json({ status: 'success', data: getStats() })
})

app.get('/api/invitations', (req, res) => {
  res.json({ status: 'success', data: getAllInvitationsWithStatus() })
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