import { Navigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useLocale } from '../../i18n/LocaleContext';
import { esAdminOSuperior } from '../../lib/roles';

export function ProtectedRoute({ children, soloAdmin = false, roles = null }) {
  const { session, usuario, cargando, mfaEstado } = useAuth();
  const { t } = useLocale();

  if (cargando) {
    return <div className="pantalla-cargando">{t.comun.cargando}</div>;
  }

  // admin_plataforma sumado acá el 2026-07-14 (pendiente #30, ítem I) — sin esta cuarta
  // opción, ese rol quedaba redirigido a /login pese a que el resto del sistema
  // (roles.js, requiereRolPanel.js) ya lo trataba como rol válido del Panel desde Fase 1.
  if (!session || !usuario || !['admin_prestadora', 'coordinador', 'superadmin', 'admin_plataforma'].includes(usuario.rol)) {
    return <Navigate to="/login" replace />;
  }

  // Ítem H del pendiente #30 — con el toggle de MFA en ON, superadmin/admin_plataforma no
  // pasa de acá hasta enrolar o verificar el segundo factor (AuthContext.evaluarMfa).
  if (mfaEstado === 'requiere_enrolamiento' || mfaEstado === 'requiere_challenge') {
    return <Navigate to="/mfa" replace />;
  }

  if (soloAdmin && !esAdminOSuperior(usuario.rol)) {
    return <Navigate to="/" replace />;
  }

  if (roles && !roles.includes(usuario.rol)) {
    return <Navigate to="/" replace />;
  }

  return children;
}
