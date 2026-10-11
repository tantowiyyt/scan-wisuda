/**
 * Logo - Logo Politeknik Negeri Indramayu dari client/public/logo-polindra.png.
 * Kalau file belum ada / gagal dimuat, tampil ikon 🎓 sebagai cadangan.
 */

import { useState } from 'react'

export const LOGO_SRC = '/logo-polindra.png'

export default function Logo({ className = 'w-10 h-10', fallbackClassName = '' }) {
  const [failed, setFailed] = useState(false)

  if (failed) {
    return (
      <div className={`${className} ${fallbackClassName} rounded-lg bg-indigo-600 text-white flex items-center justify-center`}>
        🎓
      </div>
    )
  }

  return (
    <img
      src={LOGO_SRC}
      alt="Logo Politeknik Negeri Indramayu"
      className={`${className} object-contain`}
      onError={() => setFailed(true)}
    />
  )
}
