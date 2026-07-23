import { useEffect } from 'react';
import { Outlet, NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLocale } from '../i18n/LocaleContext';
import { iniciarSincronizacionAutomatica } from '../lib/sincronizarCola';

export default function Layout() {
  const { logout } = useAuth();
  const { t } = useLocale();

  // Reintento de check-in/reporte guardados sin señal — solo con sesión activa (Fase 9).
  useEffect(() => {
    iniciarSincronizacionAutomatica();
  }, []);

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
        <NavLink to="/guardias" className={({ isActive }) => (isActive ? 'active' : '')}>
          {t.nav.guardias}
        </NavLink>
        <NavLink to="/perfil" className={({ isActive }) => (isActive ? 'active' : '')}>
          {t.nav.perfil}
        </NavLink>
      </nav>
    </div>
  );
}
