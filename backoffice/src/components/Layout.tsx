import { NavLink, Outlet } from 'react-router-dom'
import { useAuth } from '../lib/auth'

const link = ({ isActive }: { isActive: boolean }) => (isActive ? 'nav-link nav-link-on' : 'nav-link')

export function Layout() {
  const { email, signOut } = useAuth()
  return (
    <div className="shell">
      <nav className="sidebar" aria-label="Secciones del panel">
        <div className="brand">
          <span className="brand-name">ZoemiApp</span>
          <span className="brand-sub">Panel de contenido</span>
        </div>

        <p className="nav-group">Escucha la Pregunta</p>
        <NavLink to="/preguntas" className={link}>Preguntas</NavLink>
        <NavLink to="/secciones" className={link}>Secciones</NavLink>

        <p className="nav-group">Practica tu Voz</p>
        <NavLink to="/ruido" className={link}>Haz ruido</NavLink>
        <NavLink to="/karaoke" className={link}>Karaoke</NavLink>

        <div className="nav-foot">
          {email && <span className="nav-email">{email}</span>}
          <button type="button" className="nav-link nav-button" onClick={() => void signOut()}>
            Cerrar sesión
          </button>
        </div>
      </nav>
      <main className="content">
        <Outlet />
      </main>
    </div>
  )
}
