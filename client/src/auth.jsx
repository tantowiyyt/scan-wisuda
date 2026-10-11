/**
 * auth.jsx - State login (role: 'admin' | 'operator') untuk seluruh aplikasi.
 * Sesi disimpan server di cookie httpOnly; client hanya tahu role-nya.
 */

import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { getQueue, clearAllEventCaches } from './offline/offlineStore'

const API_URL = import.meta.env.VITE_SERVER_URL || ''
const AuthContext = createContext(null)
// Role terakhir yang sah, dipakai saat halaman dibuka ulang tanpa internet
const USER_KEY = 'auth:user'

function readCachedUser() {
  try {
    return JSON.parse(localStorage.getItem(USER_KEY)) || null
  } catch {
    return null
  }
}

function writeCachedUser(user) {
  try {
    if (user) localStorage.setItem(USER_KEY, JSON.stringify(user))
    else localStorage.removeItem(USER_KEY)
  } catch {
    // abaikan
  }
}

/**
 * Pasang sekali di main.jsx: setiap response 401 dari /api (selain /api/auth)
 * berarti sesi habis → kirim event 'auth-expired' agar app kembali ke login.
 */
export function installFetchInterceptor() {
  const originalFetch = window.fetch.bind(window)
  window.fetch = async (input, init) => {
    const res = await originalFetch(input, init)
    const url = typeof input === 'string' ? input : input.url
    if (res.status === 401 && url.includes('/api/') && !url.includes('/api/auth/')) {
      window.dispatchEvent(new CustomEvent('auth-expired'))
    }
    return res
  }
}

export function AuthProvider({ children }) {
  // undefined = sedang cek, null = belum login, { role } = sudah login
  const [user, setUser] = useState(undefined)

  useEffect(() => {
    fetch(`${API_URL}/api/auth/me`)
      .then(r => {
        // Server tak terjangkau (nginx 502-504) diperlakukan sama dengan offline
        if (r.status >= 502 && r.status <= 504) throw new Error('offline')
        return r.json()
      })
      .then(j => {
        writeCachedUser(j.data || null)
        setUser(j.data || null)
      })
      // Offline: pakai role terakhir agar halaman Scan tetap bisa dibuka;
      // server tetap memeriksa cookie saat antrean scan dikirim nanti
      .catch(() => setUser(readCachedUser()))
  }, [])

  // Sesi habis/password diganti: reload agar socket & state lama ikut bersih
  useEffect(() => {
    const handler = () => window.location.reload()
    window.addEventListener('auth-expired', handler)
    return () => window.removeEventListener('auth-expired', handler)
  }, [])

  const login = useCallback(async (password) => {
    const res = await fetch(`${API_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
    })
    const json = await res.json()
    if (!res.ok || json.status !== 'success') {
      throw new Error(json.message || `HTTP ${res.status}`)
    }
    writeCachedUser(json.data)
    setUser(json.data)
    return json.data
  }, [])

  const logout = useCallback(async () => {
    const pending = getQueue().length
    if (pending > 0 && !window.confirm(
      `Masih ada ${pending} scan offline yang belum terkirim ke server.\n` +
      'Scan tersebut tetap disimpan dan dikirim setelah login lagi di perangkat ini.\n\nTetap keluar?'
    )) return
    writeCachedUser(null)
    // Hapus salinan daftar undangan (nama, NIM) dari perangkat
    clearAllEventCaches()
    try {
      await fetch(`${API_URL}/api/auth/logout`, { method: 'POST' })
    } finally {
      window.location.href = '/'
    }
  }, [])

  return (
    <AuthContext.Provider value={{ user, isAdmin: user?.role === 'admin', login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
