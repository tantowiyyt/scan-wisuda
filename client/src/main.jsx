import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App.jsx'
import { AuthProvider, installFetchInterceptor } from './auth'
import './index.css'

installFetchInterceptor()

// Service Worker (hanya build production): website tetap bisa dibuka saat offline.
// Tidak dipasang saat `npm run dev` agar tidak bentrok dengan hot reload Vite.
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(err => console.warn('[sw] gagal daftar:', err))
  })
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <BrowserRouter>
    <AuthProvider>
      <App />
    </AuthProvider>
  </BrowserRouter>
)