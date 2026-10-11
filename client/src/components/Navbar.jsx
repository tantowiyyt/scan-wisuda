import { NavLink } from 'react-router-dom'
import { useEffect, useRef, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import useDarkMode from '../hooks/useDarkMode'
import { useAuth } from '../auth'
import Logo from './Logo'

const API_URL = import.meta.env.VITE_SERVER_URL || ''

export default function Navbar() {
  const { dark, toggle } = useDarkMode()
  const { user, isAdmin, logout } = useAuth()
  const navigate = useNavigate()
  const [events, setEvents] = useState([])
  const [open, setOpen] = useState(false)
  const [currentId, setCurrentId] = useState(() =>
    parseInt(localStorage.getItem('currentEventId')) || null
  )
  const dropdownRef = useRef(null)

  // Fetch events - useCallback untuk dipakai di multiple useEffect
  const fetchEvents = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/api/events`)
      const j = await res.json()
      if (j.status === 'success') setEvents(j.data)
    } catch (err) {
      console.error('[navbar]', err)
    }
  }, [API_URL])

  // Fetch saat mount
  useEffect(() => {
    fetchEvents()
  }, [fetchEvents])

  // Fetch ulang setiap kali dropdown dibuka
  useEffect(() => {
    if (open) fetchEvents()
  }, [open, fetchEvents])

  // Listen ke event kustom 'event-changed'
  useEffect(() => {
    const handler = () => {
      fetchEvents()
      const id = parseInt(localStorage.getItem('currentEventId'))
      setCurrentId(isNaN(id) ? null : id)
    }
    window.addEventListener('event-changed', handler)
    return () => window.removeEventListener('event-changed', handler)
  }, [fetchEvents])

  // Close dropdown saat klik di luar
  useEffect(() => {
    function handleClick(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  function pilihEvent(ev) {
    localStorage.setItem('currentEventId', ev.id)
    localStorage.setItem('currentEventName', ev.name)
    setCurrentId(ev.id)
    setOpen(false)
    window.dispatchEvent(new CustomEvent('event-changed'))
    window.location.reload()
  }

  const linkClass = ({ isActive }) =>
    `px-3 py-1.5 rounded-lg text-sm transition ${isActive
      ? 'bg-white/15 text-white font-semibold shadow-inner ring-1 ring-white/10'
      : 'text-brand-100/80 hover:text-white hover:bg-white/10'}`

  const currentName = events.find(e => e.id === currentId)?.name

  return (
    <nav className="relative bg-gradient-to-r from-brand-950 via-brand-900 to-brand-800 dark:from-[#05061a] dark:via-brand-950 dark:to-brand-950 text-white shadow-lg shadow-brand-950/20 transition-colors">
      <div className="px-6 py-3 flex items-center gap-2">
        {/* Identitas */}
        <div className="flex items-center gap-3 mr-auto">
          <div className="w-11 h-11 rounded-xl bg-white flex items-center justify-center p-1 shadow-md ring-2 ring-gold-400/70">
            <Logo className="w-full h-full" fallbackClassName="text-lg" />
          </div>
          <div className="leading-tight">
            <h1 className="text-lg font-extrabold tracking-tight">
              Scan <span className="text-gold-300">Wisuda</span>
            </h1>
            <p className="text-[11px] text-brand-200/80">Politeknik Negeri Indramayu</p>
          </div>
        </div>

        {/* Menu */}
        {isAdmin && <NavLink to="/dashboard" className={linkClass}>Dashboard</NavLink>}
        <NavLink to="/pilih-event" className={linkClass}>Pilih Event</NavLink>
        <NavLink to="/scan" className={linkClass}>Scan</NavLink>
        <NavLink to="/mahasiswa" className={linkClass}>Daftar Mahasiswa</NavLink>
        {isAdmin && <NavLink to="/events" className={linkClass}>Events</NavLink>}

        {/* Event aktif */}
        <div ref={dropdownRef} className="relative ml-3">
          <button
            onClick={() => setOpen(!open)}
            className="flex items-center gap-2 pl-2.5 pr-2 py-1.5 text-xs rounded-lg font-semibold
                       bg-gold-400 text-brand-950 hover:bg-gold-300 shadow-sm transition"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-brand-900 animate-pulse"></span>
            <span className="max-w-[10rem] truncate">{currentName || 'Pilih Event'}</span>
            <svg className={`w-3 h-3 transition-transform ${open ? 'rotate-180' : ''}`}
              fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {open && (
            <div className="absolute right-0 top-full mt-2 w-60
                            bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200
                            border border-slate-200 dark:border-slate-700
                            rounded-xl shadow-xl py-1 z-50 max-h-80 overflow-y-auto">
              <div className="px-3 py-2 text-[11px] uppercase tracking-wider font-semibold text-slate-400
                              border-b border-slate-100 dark:border-slate-700">
                Pilih Event Aktif
              </div>
              {events.length === 0 && (
                <div className="px-3 py-3 text-xs text-slate-400 text-center">Belum ada event</div>
              )}
              {events.map(ev => (
                <button
                  key={ev.id}
                  onClick={() => pilihEvent(ev)}
                  className={`w-full text-left px-3 py-2 text-sm flex items-center justify-between gap-2
                              hover:bg-brand-50 dark:hover:bg-slate-700/50 transition
                              ${ev.id === currentId ? 'text-brand-700 dark:text-brand-300 font-semibold' : ''}`}
                >
                  <span className="truncate">
                    {ev.name}
                    <span className="text-xs text-slate-400 ml-1.5">({ev.year})</span>
                  </span>
                  {ev.id === currentId && <span className="text-gold-600">✓</span>}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Mode gelap */}
        <button
          onClick={toggle}
          className="w-9 h-9 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center text-base transition"
          title={dark ? 'Mode terang' : 'Mode gelap'}
        >
          {dark ? '☀️' : '🌙'}
        </button>

        {/* Akun */}
        <div className="flex items-center gap-2 pl-3 ml-1 border-l border-white/15">
          <span className={`text-xs font-semibold px-2 py-1 rounded-md ${isAdmin
            ? 'bg-gold-400/15 text-gold-200 ring-1 ring-gold-300/40'
            : 'bg-white/10 text-brand-100'}`}>
            {user?.role === 'admin' ? 'Admin' : 'Operator'}
          </span>
          <button
            onClick={logout}
            className="flex items-center gap-1 text-xs text-brand-200 hover:text-white px-2 py-1 rounded-md hover:bg-white/10 transition"
            title="Keluar"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9" />
            </svg>
            Keluar
          </button>
        </div>
      </div>
      {/* Garis aksen emas */}
      <div className="h-1 bg-gradient-to-r from-gold-500 via-gold-300 to-gold-500" />
    </nav>
  )
}
