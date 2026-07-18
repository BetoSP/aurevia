import { NavLink, Outlet } from 'react-router-dom';
import { useState } from 'react';
import { useLocale } from '../../i18n/LocaleContext';
import { useAuth } from '../../context/AuthContext';
import { useEmpresa } from '../../context/EmpresaContext';
import { useTenantSession } from '../../context/TenantSessionContext';
import { esAdminOSuperior } from '../../lib/roles';
import { LOCALES } from '../../i18n/translations';

const AVISO_MINUTOS_RESTANTES = 10; // aviso "a los 50 minutos" de una sesión de 60

function BannerSesionTenant() {
  const { t } = useLocale();
  const { sesion, salir, renovar } = useTenantSession();
  const [saliendo, setSaliendo] = useState(false);
  const [renovando, setRenovando] = useState(false);

  if (!sesion) return null;

  const minutosRestantes = (new Date(sesion.expira_at).getTime() - Date.now()) / 60000;
  const porVencer = minutosRestantes <= AVISO_MINUTOS_RESTANTES;
  const horaExpiracion = new Date(sesion.expira_at).toLocaleTimeString();

  async function handleSalir() {
    setSaliendo(true);
    try {
      await salir();
    } finally {
      setSaliendo(false);
    }
  }

  async function handleRenovar() {
    setRenovando(true);
    try {
      await renovar();
    } finally {
      setRenovando(false);
    }
  }

  return (
    <div className={porVencer ? 'banner-sesion-tenant banner-sesion-tenant-advertencia' : 'banner-sesion-tenant'}>
      <span>
        <strong>{porVencer ? t.prestadoras.sesion_advertencia.replace('{hora}', horaExpiracion) : t.prestadoras.sesion_activa_titulo}</strong>
        {!porVencer && (
          <>
            {': '}
            {sesion.prestadoras?.nombre_fantasia}
            {' — '}
            {t.prestadoras.sesion_activa_expira.replace('{hora}', horaExpiracion)}
          </>
        )}
      </span>
      <span className="banner-sesion-tenant-acciones">
        {porVencer && (
          <button className="banner-sesion-tenant-salir" onClick={handleRenovar} disabled={renovando}>
            {renovando ? t.prestadoras.renovando : t.prestadoras.seguir_trabajando}
          </button>
        )}
        <button className="banner-sesion-tenant-salir" onClick={handleSalir} disabled={saliendo}>
          {saliendo ? t.prestadoras.saliendo : t.prestadoras.salir}
        </button>
      </span>
    </div>
  );
}

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
          <NavLink to="/verificacion-guardias">{t.nav.verificacion_guardias}</NavLink>
          <NavLink to="/facturacion">{t.nav.facturacion}</NavLink>
          <NavLink to="/documentacion">{t.nav.documentacion}</NavLink>
          <NavLink to="/continuidad">{t.nav.continuidad}</NavLink>
          <NavLink to="/lista-precios">{t.nav.lista_precios}</NavLink>
          {esAdminOSuperior(usuario?.rol) && <NavLink to="/usuarios-panel">{t.nav.usuarios_panel}</NavLink>}
          {['admin_plataforma', 'superadmin'].includes(usuario?.rol) && <NavLink to="/prestadoras">{t.nav.prestadoras}</NavLink>}
          {usuario?.rol === 'admin_plataforma' && <NavLink to="/admin-plataforma">{t.nav.admin_plataforma}</NavLink>}
          {esAdminOSuperior(usuario?.rol) && <NavLink to="/configuracion">{t.nav.configuracion}</NavLink>}
          {['admin_prestadora', 'superadmin', 'admin_plataforma'].includes(usuario?.rol) && <NavLink to="/auditoria">{t.nav.auditoria}</NavLink>}
        </nav>
      </aside>
      <div className="panel-main">
        <BannerSesionTenant />
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
