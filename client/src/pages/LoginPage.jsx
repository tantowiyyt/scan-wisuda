/**
 * LoginPage - Masuk dengan password admin atau operator scanner.
 * Role ditentukan server dari password yang cocok.
 */

import { useState } from 'react'
import { useAuth } from '../auth'
import PasswordInput from '../components/PasswordInput'
import useDarkMode from '../hooks/useDarkMode'
import Logo from '../components/Logo'

const FITUR = [
  { icon: '⚡', title: 'Scan cepat', desc: 'Arahkan scanner ke QR undangan, kehadiran langsung tercatat.' },
  { icon: '🔄', title: 'Realtime', desc: 'Semua perangkat scanner tersinkron otomatis.' },
  { icon: '👨‍👩‍👦', title: 'Per keluarga', desc: 'Pantau kehadiran mahasiswa beserta orang tua.' },
]

export default function LoginPage() {
  const { login } = useAuth()
  const { dark, toggle } = useDarkMode()
  const [password, setPassword] = useState('')
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      await login(password)
    } catch (err) {
      setError(err.message || 'Gagal login')
      setPassword('')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex bg-slate-50 dark:bg-slate-950 transition-colors">

      {/* Panel kiri: identitas aplikasi (desktop) */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden bg-gradient-to-br from-brand-700 via-brand-900 to-brand-950 text-white">
        {/* Garis emas di tepi kanan panel */}
        <div className="absolute inset-y-0 right-0 w-1 bg-gradient-to-b from-gold-300 via-gold-400 to-gold-600" />
        {/* Dekorasi lingkaran blur */}
        <div className="absolute -top-24 -left-24 w-96 h-96 rounded-full bg-white/10 blur-3xl" />
        <div className="absolute bottom-0 right-0 w-[28rem] h-[28rem] rounded-full bg-gold-400/15 blur-3xl translate-x-1/3 translate-y-1/3" />
        {/* Pola titik halus */}
        <div
          className="absolute inset-0 opacity-[0.07]"
          style={{ backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)', backgroundSize: '22px 22px' }}
        />

        <div className="relative z-10 flex flex-col justify-between p-12 w-full">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-white flex items-center justify-center p-1.5 shadow-lg shadow-black/10">
              <Logo className="w-full h-full" fallbackClassName="text-3xl" />
            </div>
            <div>
              <p className="text-lg font-semibold tracking-wide leading-tight">Scan Wisuda</p>
              <p className="text-sm text-brand-100/80">Politeknik Negeri Indramayu</p>
            </div>
          </div>

          <div className="max-w-md">
            <h1 className="text-4xl font-extrabold leading-tight tracking-tight">
              Presensi wisuda,<br /><span className="text-gold-300">cepat &amp; tanpa antre.</span>
            </h1>
            <p className="mt-4 text-brand-100/90 text-base leading-relaxed">
              Sistem absensi digital berbasis QR code untuk mencatat kehadiran wisudawan dan keluarga secara realtime.
            </p>

            <div className="mt-10 space-y-4">
              {FITUR.map(f => (
                <div key={f.title} className="flex items-start gap-4">
                  <div className="w-10 h-10 shrink-0 rounded-lg bg-gold-400/15 ring-1 ring-gold-300/30 flex items-center justify-center text-lg">
                    {f.icon}
                  </div>
                  <div>
                    <p className="font-semibold">{f.title}</p>
                    <p className="text-sm text-brand-100/80">{f.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <p className="text-xs text-brand-200/70">© {new Date().getFullYear()} Politeknik Negeri Indramayu</p>
        </div>
      </div>

      {/* Panel kanan: form login */}
      <div className="flex-1 flex flex-col">
        <div className="flex justify-end p-4">
          <button
            type="button"
            onClick={toggle}
            className="w-9 h-9 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center justify-center transition"
            title={dark ? 'Mode terang' : 'Mode gelap'}
          >
            {dark ? '☀️' : '🌙'}
          </button>
        </div>

        <div className="flex-1 flex items-center justify-center px-6 pb-12">
          <div className="w-full max-w-sm">

            {/* Logo (mobile) */}
            <div className="lg:hidden flex flex-col items-center mb-8">
              <div className="w-20 h-20 rounded-2xl bg-white flex items-center justify-center p-2 shadow-lg shadow-brand-500/20 ring-1 ring-slate-200 dark:ring-slate-700">
                <Logo className="w-full h-full" fallbackClassName="text-4xl" />
              </div>
              <p className="mt-3 text-lg font-bold text-slate-900 dark:text-slate-100">Scan Wisuda</p>
              <p className="text-sm text-slate-500 dark:text-slate-400">Politeknik Negeri Indramayu</p>
            </div>

            <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Selamat datang 👋</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1.5">
              Masuk untuk mulai memindai undangan wisuda.
            </p>

            <form onSubmit={handleSubmit} className="mt-8">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Password
              </label>
              <PasswordInput
                autoFocus
                required
                value={password}
                onChange={e => { setPassword(e.target.value); setError(null) }}
                placeholder="Masukkan password"
                className={`w-full px-4 py-3 rounded-xl border bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 outline-none transition focus:ring-4 ${
                  error
                    ? 'border-rose-400 dark:border-rose-700 focus:border-rose-500 focus:ring-rose-100 dark:focus:ring-rose-900/40'
                    : 'border-slate-300 dark:border-slate-700 focus:border-brand-500 focus:ring-brand-100 dark:focus:ring-brand-900/40'
                }`}
              />

              {error && (
                <div className="mt-3 flex items-start gap-2 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 px-3 py-2 text-sm text-rose-700 dark:text-rose-300">
                  <span className="shrink-0">⚠</span>
                  <span>{error}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={loading || !password}
                className="w-full mt-6 inline-flex items-center justify-center gap-2 bg-gradient-to-r from-brand-700 to-brand-900 hover:from-brand-600 hover:to-brand-800 disabled:opacity-50 disabled:cursor-not-allowed text-white py-3 rounded-xl font-semibold shadow-lg shadow-brand-500/25 transition"
              >
                {loading ? (
                  <>
                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Memeriksa...
                  </>
                ) : (
                  <>
                    Masuk
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                    </svg>
                  </>
                )}
              </button>
            </form>

            {/* Keterangan role */}
            <div className="mt-8 grid grid-cols-2 gap-3">
              <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3">
                <p className="text-xs font-semibold text-brand-600 dark:text-brand-400">Admin</p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Kelola event, import, laporan</p>
              </div>
              <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3">
                <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">Operator</p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Scan &amp; pantau kehadiran</p>
              </div>
            </div>

            <p className="mt-6 text-center text-xs text-slate-400 dark:text-slate-500">
              Lupa password? Hubungi panitia / admin sistem.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
