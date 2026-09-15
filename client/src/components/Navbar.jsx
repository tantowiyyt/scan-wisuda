import { NavLink } from 'react-router-dom'
import useDarkMode from '../hooks/useDarkMode'

export default function Navbar() {
  const { dark, toggle } = useDarkMode()

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
      <NavLink to="/" end className={linkClass}>
        Scan
      </NavLink>
      <NavLink to="/mahasiswa" className={linkClass}>
        Daftar Mahasiswa
      </NavLink>
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
