/**
 * eventTiming - Status waktu event berdasarkan event_date (YYYY-MM-DD)
 * dibanding tanggal hari ini di perangkat (zona waktu lokal).
 */

function todayLocal() {
  const d = new Date()
  const pad = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

// 'today' | 'upcoming' | 'past' | 'unknown'
export function eventTiming(eventDate) {
  if (!eventDate) return 'unknown'
  const today = todayLocal()
  const date = eventDate.slice(0, 10)
  if (date === today) return 'today'
  return date > today ? 'upcoming' : 'past'
}

export const TIMING_BADGE = {
  today: { label: '● Hari ini', className: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/60 dark:text-emerald-300' },
  upcoming: { label: 'Akan datang', className: 'bg-sky-100 text-sky-700 dark:bg-sky-900/60 dark:text-sky-300' },
  past: { label: 'Selesai', className: 'bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-400' },
  unknown: null,
}

// "2026-09-15" → "Selasa, 15 September 2026" (tanpa geser zona waktu)
export function formatTanggal(eventDate) {
  const [y, m, d] = eventDate.slice(0, 10).split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString('id-ID', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  })
}
