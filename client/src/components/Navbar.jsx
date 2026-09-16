import { NavLink } from 'react-router-dom'
import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import useDarkMode from '../hooks/useDarkMode'

const API_URL = import.meta.env.VITE_SERVER_URL || ''

export default function Navbar() {
  const { dark, toggle } = useDarkMode()
  const navigate = useNavigate()
  const [events, setEvents] = useState([])
  const [open, setOpen] = useState(false)
  const [currentId, setCurrentId] = useState(() =>
    parseInt(localStorage.getItem('currentEventId')) || null
  )
  const dropdownRef = useRef(null)

  // Ambil daftar events saat mount
  useEffect(() => {
    fetch(`${API_URL}/api/events`)
      .then(r => r.json())
      .then(j => { if (j.status === 'success') setEvents(j.data) })
      .catch(err => console.error('[navbar]', err))
  }, [])

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
    window.location.reload()
  }

  const linkClass = ({ isActive }) =>
    isActive
      ? 'text-indigo-600 dark:text-indigo-400 font-semibold pb-1 border-b-2 border-indigo-600 dark:border-indigo-400'
      : 'text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-slate-100 pb-1 transition'

  return (
    <nav className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 shadow-sm px-6 py-3 flex items-center gap-6 transition-colors">
      <div className="flex items-center gap-3 mr-auto">
        <div className="w-9 h-9 rounded-lg bg-indigo-600 flex items-center justify-center text-white text-lg">
          🎓
        </div>
        <h1 className="text-lg font-bold text-slate-900 dark:text-slate-100">Scan Wisuda</h1>
      </div>
      <NavLink to="/pilih-event" className={linkClass}>
        Pilih Event
      </NavLink>
      <NavLink to="/scan" className={linkClass}>
        Scan
      </NavLink>
      <NavLink to="/mahasiswa" className={linkClass}>
        Daftar Mahasiswa
      </NavLink>
      <NavLink to="/events" className={linkClass}>
        Events
      </NavLink>
      <div ref={dropdownRef} className="relative">
        <button
          onClick={() => setOpen(!open)}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs
                     bg-indigo-50 dark:bg-indigo-950/50
                     text-indigo-700 dark:text-indigo-300
                     rounded-lg font-medium hover:bg-indigo-100
                     dark:hover:bg-indigo-900/50 transition"
        >
          <span className="w-1.5 h-1.5 rounded-full bg-indigo-500"></span>
          <span>{events.find(e => e.id === currentId)?.name || 'Pilih Event'}</span>
          <svg className={`w-3 h-3 transition-transform ${open ? 'rotate-180' : ''}`}
               fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {open && (
          <div className="absolute right-0 top-full mt-2 w-56
                          bg-white dark:bg-slate-800
                          border border-slate-200 dark:border-slate-700
                          rounded-xl shadow-lg py-1 z-50 max-h-80 overflow-y-auto">
            <div className="px-3 py-2 text-xs text-slate-500 dark:text-slate-400
                            border-b border-slate-100 dark:border-slate-700">
              Pilih Event Aktif
            </div>
            {events.length === 0 && (
              <div className="px-3 py-3 text-xs text-slate-400 text-center">
                Belum ada event
              </div>
            )}
            {events.map(ev => (
              <button
                key={ev.id}
                onClick={() => pilihEvent(ev)}
                className={`w-full text-left px-3 py-2 text-sm
                            flex items-center justify-between gap-2
                            hover:bg-slate-50 dark:hover:bg-slate-700/50 transition
                            ${ev.id === currentId
                              ? 'text-indigo-600 dark:text-indigo-400 font-semibold'
                              : 'text-slate-700 dark:text-slate-300'}`}
              >
                <span className="truncate">
                  {ev.name}
                  <span className="text-xs text-slate-400 ml-1.5">({ev.year})</span>
                </span>
                {ev.id === currentId && <span className="text-indigo-500">✓</span>}
              </button>
            ))}
          </div>
        )}
      </div>
      <button
        onClick={toggle}
        className="w-9 h-9 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 flex items-center justify-center text-lg transition"
        title={dark ? 'Mode terang' : 'Mode gelap'}
      >
        {dark ? '☀️' : '🌙'}
      </button>
      <span className="text-xs text-slate-500 dark:text-slate-400">{dark ? 'Dark' : 'Light'}</span>
    </nav>
  )
}