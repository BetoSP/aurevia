import { Navigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useLocale } from '../../i18n/LocaleContext';
import { esAdminOSuperior } from '../../lib/roles';

export function ProtectedRoute({ children, soloAdmin = false }) {
  const { session, usuario, cargando } = useAuth();
  const { t } = useLocale();

  if (cargando) {
    return <div className="pantalla-cargando">{t.comun.cargando}</div>;
  }

  if (!session || !usuario || !['admin', 'coordinador', 'superadmin'].includes(usuario.rol)) {
    return <Navigate to="/login" replace />;
  }

  if (soloAdmin && !esAdminOSuperior(usuario.rol)) {
    return <Navigate to="/" replace />;
  }

  return children;
}
