import { NavLink } from 'react-router-dom'

export default function Navbar() {
  const linkClass = ({ isActive }) =>
    isActive
      ? 'text-indigo-600 font-semibold pb-1 border-b-2 border-indigo-600'
      : 'text-slate-500 hover:text-indigo-600 pb-1 transition'

  return (
    <nav className="bg-white border-b border-slate-200 shadow-sm px-6 py-3 flex items-center gap-6">
      <div className="flex items-center gap-3 mr-auto">
        <div className="w-9 h-9 rounded-lg bg-indigo-600 flex items-center justify-center text-white text-lg">
          🎓
        </div>
        <h1 className="text-lg font-bold text-slate-900">Scan Wisuda</h1>
      </div>
      <NavLink to="/" end className={linkClass}>
        Scan
      </NavLink>
      <NavLink to="/mahasiswa" className={linkClass}>
        Daftar Mahasiswa
      </NavLink>
    </nav>
  )
}
