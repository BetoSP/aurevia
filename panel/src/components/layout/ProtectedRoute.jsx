import { Navigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useLocale } from '../../i18n/LocaleContext';

export function ProtectedRoute({ children }) {
  const { session, usuario, cargando } = useAuth();
  const { t } = useLocale();

  if (cargando) {
    return <div className="pantalla-cargando">{t.comun.cargando}</div>;
  }

  if (!session || !usuario || !['admin', 'coordinador'].includes(usuario.rol)) {
    return <Navigate to="/login" replace />;
  }

  return children;
}
