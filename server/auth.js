/**
 * auth.js - Login berbasis password dari server/.env (tanpa tabel user).
 *
 * Role:
 *   admin    -> ADMIN_PASSWORD   : akses penuh
 *   operator -> SCANNER_PASSWORD : pilih event, scan, lihat daftar
 *
 * Sesi disimpan di cookie httpOnly yang ditandatangani HMAC. Mengganti
 * password di .env lalu restart server otomatis me-logout semua sesi role itu.
 */

import crypto from 'crypto'
import { join } from 'path'
import { fileURLToPath } from 'url'
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'fs'

const __dirname = join(fileURLToPath(import.meta.url), '..')

export const COOKIE_NAME = 'wisuda_session'
const SESSION_MS = 7 * 24 * 60 * 60 * 1000

// Secret penanda tangan cookie: dari .env, atau dibuat sekali lalu disimpan
// di server/data agar sesi tetap valid walau server restart
function loadSecret() {
  if (process.env.SESSION_SECRET) return process.env.SESSION_SECRET
  const dataDir = join(__dirname, 'data')
  const file = join(dataDir, 'session-secret')
  if (existsSync(file)) return readFileSync(file, 'utf8').trim()
  if (!existsSync(dataDir)) mkdirSync(dataDir, { recursive: true })
  const secret = crypto.randomBytes(32).toString('hex')
  writeFileSync(file, secret)
  return secret
}
const SECRET = loadSecret()

function rolePassword(role) {
  if (role === 'admin') return process.env.ADMIN_PASSWORD || ''
  if (role === 'operator') return process.env.SCANNER_PASSWORD || ''
  return ''
}

// Sidik jari password: sesi lama tidak berlaku lagi kalau password diganti
function passwordVersion(role) {
  return crypto.createHash('sha256').update(rolePassword(role)).digest('hex').slice(0, 12)
}

function sign(data) {
  return crypto.createHmac('sha256', SECRET).update(data).digest('base64url')
}

export function safeEqual(input, expected) {
  // Bandingkan hash agar panjang sama & waktu konstan (anti timing attack)
  const a = crypto.createHash('sha256').update(String(input ?? '')).digest()
  const b = crypto.createHash('sha256').update(String(expected)).digest()
  return crypto.timingSafeEqual(a, b)
}

// Cocokkan password ke role. Admin dicek lebih dulu.
export function roleForPassword(password) {
  for (const role of ['admin', 'operator']) {
    const expected = rolePassword(role)
    if (expected && safeEqual(password, expected)) return role
  }
  return null
}

export function createToken(role) {
  const payload = Buffer.from(JSON.stringify({
    role,
    v: passwordVersion(role),
    exp: Date.now() + SESSION_MS,
  })).toString('base64url')
  return `${payload}.${sign(payload)}`
}

export function verifyToken(token) {
  if (!token || typeof token !== 'string') return null
  const [payload, sig] = token.split('.')
  if (!payload || !sig || !safeEqual(sig, sign(payload))) return null
  try {
    const data = JSON.parse(Buffer.from(payload, 'base64url').toString())
    if (data.exp < Date.now()) return null
    if (!rolePassword(data.role) || data.v !== passwordVersion(data.role)) return null
    return { role: data.role }
  } catch {
    return null
  }
}

export function parseCookies(header = '') {
  const out = {}
  for (const part of header.split(';')) {
    const idx = part.indexOf('=')
    if (idx === -1) continue
    out[part.slice(0, idx).trim()] = decodeURIComponent(part.slice(idx + 1).trim())
  }
  return out
}

export function userFromCookieHeader(header) {
  return verifyToken(parseCookies(header)[COOKIE_NAME])
}

export function setSessionCookie(req, res, role) {
  res.cookie(COOKIE_NAME, createToken(role), {
    httpOnly: true,
    sameSite: 'lax',
    secure: req.secure, // true otomatis di balik HTTPS (nginx + trust proxy)
    maxAge: SESSION_MS,
    path: '/',
  })
}

export function clearSessionCookie(res) {
  res.clearCookie(COOKIE_NAME, { path: '/' })
}

// Middleware: wajib login (role apa pun)
export function requireAuth(req, res, next) {
  const user = userFromCookieHeader(req.headers.cookie)
  if (!user) {
    return res.status(401).json({ status: 'error', message: 'Silakan login terlebih dahulu' })
  }
  req.user = user
  next()
}

// Middleware: khusus admin (dipasang setelah requireAuth)
export function requireAdmin(req, res, next) {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ status: 'error', message: 'Hanya admin yang boleh melakukan ini' })
  }
  next()
}

/**
 * Pembatas percobaan password per IP: MAX_ATTEMPTS kali salah → dikunci LOCK_MS.
 * Dipakai untuk login dan reset presensi.
 */
export function createAttemptLimiter({ maxAttempts = 5, lockMs = 60 * 1000 } = {}) {
  const attempts = new Map()
  return {
    // Kembalikan sisa detik kunci, atau 0 kalau boleh mencoba
    lockedFor(ip) {
      const rec = attempts.get(ip)
      if (!rec || rec.lockedUntil <= Date.now()) return 0
      return Math.ceil((rec.lockedUntil - Date.now()) / 1000)
    },
    fail(ip) {
      const rec = attempts.get(ip) || { count: 0, lockedUntil: 0 }
      rec.count++
      if (rec.count >= maxAttempts) {
        rec.count = 0
        rec.lockedUntil = Date.now() + lockMs
      }
      attempts.set(ip, rec)
    },
    reset(ip) {
      attempts.delete(ip)
    },
  }
}
