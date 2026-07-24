import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { LocaleProvider } from './i18n/LocaleContext';
import Layout from './components/Layout';
import Login from './pages/Login';
import ActivarCuenta from './pages/ActivarCuenta';
import MisPacientes from './pages/MisPacientes';
import PacienteDetalle from './pages/PacienteDetalle';
import Reportes from './pages/Reportes';
import ReporteDetalle from './pages/ReporteDetalle';
import Alertas from './pages/Alertas';
import AsistenteAsignado from './pages/AsistenteAsignado';
import EscanearAsistente from './pages/EscanearAsistente';
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
        element={cargando ? <div className="estado-cargando">Cargando…</div> : session ? <Navigate to="/pacientes" replace /> : <Login />}
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
        <Route index element={<Navigate to="/pacientes" replace />} />
        <Route path="pacientes" element={<MisPacientes />} />
        <Route path="pacientes/:id" element={<PacienteDetalle />} />
        <Route path="pacientes/:id/reportes" element={<Reportes />} />
        <Route path="pacientes/:id/reportes/:reporteId" element={<ReporteDetalle />} />
        <Route path="pacientes/:id/alertas" element={<Alertas />} />
        <Route path="pacientes/:id/asistente" element={<AsistenteAsignado />} />
        <Route path="pacientes/:id/escanear-asistente" element={<EscanearAsistente />} />
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
