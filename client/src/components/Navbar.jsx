import { NavLink } from 'react-router-dom'

export default function Navbar() {
  const linkClass = ({ isActive }) =>
    isActive
      ? 'text-blue-600 border-b-2 border-blue-600 pb-1 font-medium'
      : 'text-slate-600 hover:text-slate-900 font-medium'

  return (
    <nav className="bg-white shadow px-6 py-3 flex items-center gap-6">
      <h1 className="text-xl font-bold mr-auto">Scan Wisuda</h1>
      <NavLink to="/" end className={linkClass}>
        Scan
      </NavLink>
      <NavLink to="/mahasiswa" className={linkClass}>
        Daftar Mahasiswa
      </NavLink>
    </nav>
  )
}
