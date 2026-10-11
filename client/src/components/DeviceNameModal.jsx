/**
 * DeviceNameModal - Atur nama perangkat scanner (mis. "Gerbang A - 1").
 * Disimpan di localStorage 'scanner_id' dan ikut terkirim di setiap scan,
 * sehingga di dashboard & laporan jelas scan berasal dari perangkat mana.
 */

import { useState } from 'react'

export function getDeviceName() {
  try {
    return localStorage.getItem('scanner_id') || ''
  } catch {
    return ''
  }
}

export function saveDeviceName(name) {
  try {
    localStorage.setItem('scanner_id', name)
  } catch {
    // localStorage diblokir: nama hanya berlaku sampai halaman ditutup
  }
}

export default function DeviceNameModal({ initial = '', required = false, onSave, onClose }) {
  const [name, setName] = useState(initial)
  const trimmed = name.trim()

  function handleSubmit(e) {
    e.preventDefault()
    if (!trimmed) return
    saveDeviceName(trimmed)
    onSave(trimmed)
  }

  return (
    <div className="fixed inset-0 bg-slate-900/60 flex items-center justify-center z-50 p-4" onClick={required ? undefined : onClose}>
      <form
        onSubmit={handleSubmit}
        onClick={e => e.stopPropagation()}
        className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-xl p-6 w-full max-w-sm"
      >
        <div className="w-12 h-12 rounded-xl bg-brand-100 dark:bg-brand-900/50 flex items-center justify-center text-2xl mb-4">🖥️</div>
        <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Nama perangkat ini</h3>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 mb-4">
          Beri nama unik per perangkat scanner agar mudah dipantau di dashboard, misalnya <b>Gerbang A - 1</b>.
        </p>
        <input
          type="text"
          autoFocus
          required
          maxLength={40}
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder="Gerbang A - 1"
          className="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:border-brand-500 focus:ring-4 focus:ring-brand-100 dark:focus:ring-brand-900/40 outline-none transition"
        />
        <div className="flex justify-end gap-2 mt-5">
          {!required && (
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition"
            >
              Batal
            </button>
          )}
          <button
            type="submit"
            disabled={!trimmed}
            className="px-5 py-2 text-sm rounded-lg bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white font-medium transition"
          >
            Simpan
          </button>
        </div>
      </form>
    </div>
  )
}
