/**
 * sw.js - Service Worker: simpan salinan file website (HTML, JS, CSS, logo) agar
 * halaman tetap bisa dibuka/di-refresh saat internet putus.
 *
 * Data TIDAK pernah di-cache: /api dan /socket.io selalu langsung ke server.
 * - Halaman (navigasi): network-first → kalau offline pakai index.html tersimpan
 * - /assets/* (nama file ber-hash, tidak pernah berubah): cache-first
 * - File lain (logo, dsb): pakai cache, perbarui di belakang layar
 */

const CACHE = 'scan-wisuda-shell-v1'
const INDEX = '/index.html'

// Ambil daftar /assets/... yang dipakai index.html
function assetsIn(html) {
  return [...html.matchAll(/(?:src|href)="(\/assets\/[^"]+)"/g)].map(m => m[1])
}

// Simpan index.html terbaru + asset-nya, buang asset versi lama
async function cacheShell(response) {
  const cache = await caches.open(CACHE)
  const html = await response.clone().text()
  await cache.put(INDEX, response)
  const assets = assetsIn(html)
  await Promise.all(assets.map(async (url) => {
    if (!(await cache.match(url))) await cache.add(url)
  }))
  const keep = new Set(assets)
  for (const req of await cache.keys()) {
    const path = new URL(req.url).pathname
    if (path.startsWith('/assets/') && !keep.has(path)) await cache.delete(req)
  }
}

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const res = await fetch(INDEX, { cache: 'no-store' })
    if (res.ok) await cacheShell(res)
    const cache = await caches.open(CACHE)
    await cache.add('/logo-polindra.png').catch(() => {})
  })())
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    for (const key of await caches.keys()) {
      if (key !== CACHE) await caches.delete(key)
    }
    await self.clients.claim()
  })())
})

self.addEventListener('fetch', (event) => {
  const req = event.request
  if (req.method !== 'GET') return
  const url = new URL(req.url)
  if (url.origin !== self.location.origin) return
  if (url.pathname.startsWith('/api') || url.pathname.startsWith('/socket.io')) return

  // Halaman: selalu coba server dulu agar update aplikasi langsung terpakai
  if (req.mode === 'navigate') {
    event.respondWith((async () => {
      try {
        const res = await fetch(req)
        if (res.ok) event.waitUntil(cacheShell(res.clone()))
        return res
      } catch {
        const cached = await caches.match(INDEX)
        return cached || Response.error()
      }
    })())
    return
  }

  if (url.pathname.startsWith('/assets/')) {
    event.respondWith((async () => {
      const cached = await caches.match(req)
      if (cached) return cached
      const res = await fetch(req)
      if (res.ok) {
        const cache = await caches.open(CACHE)
        cache.put(req, res.clone())
      }
      return res
    })())
    return
  }

  // Lainnya (logo, favicon): cache dulu, perbarui di belakang layar
  event.respondWith((async () => {
    const cache = await caches.open(CACHE)
    const cached = await cache.match(req)
    const network = fetch(req)
      .then(res => {
        if (res.ok) cache.put(req, res.clone())
        return res
      })
      .catch(() => cached)
    return cached || network
  })())
})
