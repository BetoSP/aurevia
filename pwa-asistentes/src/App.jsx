import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { LocaleProvider } from './i18n/LocaleContext';
import Layout from './components/Layout';
import Login from './pages/Login';
import ActivarCuenta from './pages/ActivarCuenta';
import MisGuardias from './pages/MisGuardias';
import GuardiaActiva from './pages/GuardiaActiva';
import ReporteDiario from './pages/ReporteDiario';
import MiPerfil from './pages/MiPerfil';

function RutaPrivada({ children }) {
  const { session, cargando } = useAuth();
  if (cargando) return <div className="pantalla-cargando estado-cargando">Cargando…</div>;
  if (!session) return <Navigate to="/login" replace />;
  return children;
}

function Rutas() {
  const { session, cargando } = useAuth();

  return (
    <Routes>
      <Route
        path="/login"
        element={cargando ? <div className="estado-cargando">Cargando…</div> : session ? <Navigate to="/guardias" replace /> : <Login />}
      />
      <Route path="/activar-cuenta" element={<ActivarCuenta />} />
      <Route
        path="/"
        element={
          <RutaPrivada>
            <Layout />
          </RutaPrivada>
        }
      >
        <Route index element={<Navigate to="/guardias" replace />} />
        <Route path="guardias" element={<MisGuardias />} />
        <Route path="guardias/:id" element={<GuardiaActiva />} />
        <Route path="guardias/:id/reporte" element={<ReporteDiario />} />
        <Route path="perfil" element={<MiPerfil />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <LocaleProvider>
      <AuthProvider>
        <BrowserRouter>
          <Rutas />
        </BrowserRouter>
      </AuthProvider>
    </LocaleProvider>
  );
}
