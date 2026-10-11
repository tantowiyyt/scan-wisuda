/**
 * auth.jsx - State login (role: 'admin' | 'operator') untuk seluruh aplikasi.
 * Sesi disimpan server di cookie httpOnly; client hanya tahu role-nya.
 */

import { createContext, useCallback, useContext, useEffect, useState } from 'react'

const API_URL = import.meta.env.VITE_SERVER_URL || ''
const AuthContext = createContext(null)

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
      .then(r => r.json())
      .then(j => setUser(j.data || null))
      .catch(() => setUser(null))
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
    setUser(json.data)
    return json.data
  }, [])

  const logout = useCallback(async () => {
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
