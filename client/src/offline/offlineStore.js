/**
 * offlineStore - Penyimpanan untuk mode offline halaman Scan.
 *
 * 1. Cache event: salinan daftar undangan + QR yang sudah hadir, agar scan tetap
 *    bisa divalidasi (nama, kategori, masuk kembali) saat internet putus.
 * 2. Antrean: scan yang gagal terkirim disimpan di localStorage (aman walau
 *    browser di-refresh) lalu dikirim otomatis saat koneksi kembali.
 */

const API_URL = import.meta.env.VITE_SERVER_URL || ''
const QUEUE_KEY = 'offline:queue'
const CACHE_PREFIX = 'offline:event:'
export const QUEUE_EVENT = 'offline-queue-changed'
export const SYNCED_EVENT = 'offline-synced'

function read(key, fallback) {
  try {
    const raw = localStorage.getItem(key)
    return raw ? JSON.parse(raw) : fallback
  } catch {
    return fallback
  }
}

function write(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value))
    return true
  } catch {
    return false
  }
}

// crypto.randomUUID hanya ada di HTTPS/localhost; cadangan untuk akses via http://IP
export function newScanId() {
  if (window.crypto?.randomUUID) return window.crypto.randomUUID()
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`
}

// Error jaringan / server tidak terjangkau (nginx 502-504 saat Node mati)
export class OfflineError extends Error {}
export const isUnreachableStatus = (status) => status === 502 || status === 503 || status === 504

// ---------- Cache event ----------

export function loadEventCache(eventId) {
  return read(CACHE_PREFIX + eventId, null)
}

export async function refreshEventCache(eventId) {
  const res = await fetch(`${API_URL}/api/events/${eventId}/offline-data`)
  if (isUnreachableStatus(res.status)) throw new OfflineError()
  const json = await res.json()
  if (!res.ok || json.status !== 'success') throw new Error(json.message || `HTTP ${res.status}`)

  const invitations = {}
  for (const inv of json.data.invitations) invitations[inv.qr_code] = inv
  const scanned = {}
  for (const s of json.data.scanned) scanned[s.qr_code] = s.first_scanned_at

  const cache = { invitations, scanned, savedAt: new Date().toISOString() }
  write(CACHE_PREFIX + eventId, cache)
  return cache
}

// Catat QR sudah hadir di cache (dari scan sendiri atau broadcast perangkat lain)
export function markScanned(eventId, qrCode, scannedAt) {
  const cache = loadEventCache(eventId)
  if (!cache || !cache.invitations[qrCode]) return
  const prev = cache.scanned[qrCode]
  if (!prev || (scannedAt && scannedAt < prev)) {
    cache.scanned[qrCode] = scannedAt || new Date().toISOString()
    write(CACHE_PREFIX + eventId, cache)
  }
}

export function clearScanned(eventId) {
  const cache = loadEventCache(eventId)
  if (!cache) return
  cache.scanned = {}
  write(CACHE_PREFIX + eventId, cache)
}

// Dipanggil saat logout: hapus salinan data pribadi (nama, NIM) dari perangkat
export function clearAllEventCaches() {
  try {
    Object.keys(localStorage)
      .filter(k => k.startsWith(CACHE_PREFIX))
      .forEach(k => localStorage.removeItem(k))
  } catch {
    // abaikan
  }
}

/**
 * Hasil scan versi offline, dihitung dari cache. Bentuknya sama dengan data dari
 * server agar bisa ditampilkan ScanResultCard. Kembalikan null kalau QR tidak dikenal.
 */
export function buildOfflineResult(cache, { qr_code, scanned_at, scanner_id, event_id }) {
  const inv = cache.invitations[qr_code]
  if (!inv) return null

  const firstAt = cache.scanned[qr_code]
  const members = Object.values(cache.invitations).filter(m => m.family_group === inv.family_group)
  const order = { mahasiswa: 0, ayah: 1, ibu: 2, wali: 3 }
  members.sort((a, b) => (order[a.kategori] ?? 9) - (order[b.kategori] ?? 9))
  const mhs = members.find(m => m.kategori === 'mahasiswa') || {}

  return {
    status: firstAt ? 'duplicate' : 'success',
    qr_code,
    name: inv.name,
    kategori: inv.kategori,
    family_group: inv.family_group,
    mahasiswa_name: mhs.name || null,
    nim: mhs.nim || null,
    kelas: mhs.kelas || null,
    prodi: mhs.prodi || null,
    jenjang: mhs.jenjang || null,
    scanner_id,
    scanned_at,
    event_id,
    first_scanned_at: firstAt || scanned_at,
    first_scanner_id: null,
    scan_count: null,
    family: members.map(m => ({
      kategori: m.kategori,
      name: m.name,
      qr_code: m.qr_code,
      scanned_at: m.qr_code === qr_code ? (firstAt || scanned_at) : (cache.scanned[m.qr_code] || null),
    })),
    offline: true,
  }
}

// ---------- Antrean scan ----------

export function getQueue() {
  return read(QUEUE_KEY, [])
}

function setQueue(queue) {
  write(QUEUE_KEY, queue)
  window.dispatchEvent(new CustomEvent(QUEUE_EVENT, { detail: queue.length }))
}

export function enqueue(item) {
  setQueue([...getQueue(), item])
}

let flushing = null

/**
 * Kirim antrean satu per satu sesuai urutan. Berhenti saat jaringan masih putus
 * (sisa antrean dicoba lagi nanti). Scan yang ditolak server (400/404/500)
 * dibuang agar antrean tidak macet selamanya.
 * Kembalikan { sent, remaining, offline }.
 */
export function flushQueue() {
  if (flushing) return flushing
  flushing = (async () => {
    let sent = 0
    let offline = false
    try {
      while (true) {
        const queue = getQueue()
        if (queue.length === 0) break
        const item = queue[0]
        let res
        try {
          res = await fetch(`${API_URL}/api/scan`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ...item, offline: true }),
          })
        } catch {
          offline = true
          break
        }
        if (isUnreachableStatus(res.status)) {
          offline = true
          break
        }
        // 401: sesi habis — antrean disimpan, dikirim lagi setelah login
        if (res.status === 401) break
        if (res.ok) {
          const json = await res.json().catch(() => ({}))
          if (json.data) markScanned(item.event_id, item.qr_code, json.data.first_scanned_at)
          sent++
        } else {
          console.warn('[offline] scan ditolak server, dibuang:', item, res.status)
        }
        // Hapus item yang sudah diproses (ambil ulang: bisa ada scan baru masuk antrean)
        setQueue(getQueue().filter(q => q.client_scan_id !== item.client_scan_id))
      }
    } finally {
      flushing = null
    }
    if (sent > 0) window.dispatchEvent(new CustomEvent(SYNCED_EVENT, { detail: sent }))
    return { sent, remaining: getQueue().length, offline }
  })()
  return flushing
}
