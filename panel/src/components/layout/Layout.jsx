import { NavLink, Outlet } from 'react-router-dom';
import { useLocale } from '../../i18n/LocaleContext';
import { useAuth } from '../../context/AuthContext';
import { useEmpresa } from '../../context/EmpresaContext';
import { esAdminOSuperior } from '../../lib/roles';
import { LOCALES } from '../../i18n/translations';

export function Layout() {
  const { t, locale, setLocale } = useLocale();
  const { usuario, logout } = useAuth();
  const { empresa } = useEmpresa();

  return (
    <div className="panel-layout">
      <aside className="panel-sidebar">
        <div className="panel-logo">{empresa?.nombre ?? ''}</div>
        <nav>
          <NavLink to="/" end>
            {t.nav.dashboard}
          </NavLink>
          <NavLink to="/postulaciones">{t.nav.postulaciones}</NavLink>
          <NavLink to="/solicitudes">{t.nav.solicitudes}</NavLink>
          <NavLink to="/asistentes">{t.nav.asistentes}</NavLink>
          <NavLink to="/familias">{t.nav.familias}</NavLink>
          <NavLink to="/guardias">{t.nav.guardias}</NavLink>
          <NavLink to="/continuidad">{t.nav.continuidad}</NavLink>
          <NavLink to="/lista-precios">{t.nav.lista_precios}</NavLink>
          {esAdminOSuperior(usuario?.rol) && <NavLink to="/usuarios-panel">{t.nav.usuarios_panel}</NavLink>}
          {['admin_plataforma', 'superadmin'].includes(usuario?.rol) && <NavLink to="/prestadoras">{t.nav.prestadoras}</NavLink>}
          {esAdminOSuperior(usuario?.rol) && <NavLink to="/configuracion">{t.nav.configuracion}</NavLink>}
        </nav>
      </aside>
      <div className="panel-main">
        <header className="panel-header">
          <span className="panel-usuario">{usuario?.nombre}</span>
          <select value={locale} onChange={(e) => setLocale(e.target.value)}>
            {LOCALES.map((l) => (
              <option key={l} value={l}>
                {l}
              </option>
            ))}
          </select>
          <button className="panel-logout" onClick={logout}>
            {t.nav.cerrar_sesion}
          </button>
        </header>
        <main className="panel-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
