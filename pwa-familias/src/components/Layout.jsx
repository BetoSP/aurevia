import { Outlet, NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLocale } from '../i18n/LocaleContext';

export default function Layout() {
  const { logout } = useAuth();
  const { t } = useLocale();

  return (
    <div className="app-layout">
      <header className="app-header">
        <h1>Aurevia</h1>
        <button className="btn btn-secondary" onClick={logout} style={{ padding: '0.4rem 1rem', fontSize: '0.8rem' }}>
          {t.nav.cerrar_sesion}
        </button>
      </header>
      <main className="app-content">
        <Outlet />
      </main>
      <nav className="app-nav-inferior">
        <NavLink to="/pacientes" className={({ isActive }) => (isActive ? 'active' : '')}>
          {t.nav.pacientes}
        </NavLink>
        <NavLink to="/perfil" className={({ isActive }) => (isActive ? 'active' : '')}>
          {t.nav.perfil}
        </NavLink>
      </nav>
    </div>
  );
}
