import express from 'express'
import {
  roleForPassword,
  setSessionCookie,
  clearSessionCookie,
  userFromCookieHeader,
  createAttemptLimiter,
} from '../auth.js'

const router = express.Router()
const limiter = createAttemptLimiter({ maxAttempts: 5, lockMs: 60 * 1000 })

// POST /api/auth/login -> { password } → set cookie sesi
router.post('/login', (req, res) => {
  if (!process.env.ADMIN_PASSWORD) {
    return res.status(503).json({ status: 'error', message: 'ADMIN_PASSWORD belum diatur di server/.env' })
  }

  const sisa = limiter.lockedFor(req.ip)
  if (sisa) {
    return res.status(429).json({ status: 'error', message: `Terlalu banyak percobaan salah. Coba lagi dalam ${sisa} detik.` })
  }

  const role = roleForPassword(req.body?.password)
  if (!role) {
    limiter.fail(req.ip)
    return res.status(401).json({ status: 'error', message: 'Password salah' })
  }

  limiter.reset(req.ip)
  setSessionCookie(req, res, role)
  console.log(`[auth] login ${role} dari ${req.ip}`)
  res.json({ status: 'success', data: { role } })
})

// POST /api/auth/logout
router.post('/logout', (req, res) => {
  clearSessionCookie(res)
  res.json({ status: 'success' })
})

// GET /api/auth/me -> role user saat ini (null kalau belum login)
router.get('/me', (req, res) => {
  const user = userFromCookieHeader(req.headers.cookie)
  res.json({ status: 'success', data: user })
})

export default router
