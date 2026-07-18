import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { LocaleProvider } from './i18n/LocaleContext';
import { AuthProvider } from './context/AuthContext';
import { EmpresaProvider } from './context/EmpresaContext';
import { TenantSessionProvider } from './context/TenantSessionContext';
import { AdvertenciaLegalProvider } from './context/AdvertenciaLegalContext';
import { ProtectedRoute } from './components/layout/ProtectedRoute';
import { Layout } from './components/layout/Layout';
import { Login } from './pages/Login';
import { Mfa } from './pages/Mfa';
import { Dashboard } from './pages/Dashboard';
import { Postulaciones } from './pages/Postulaciones';
import { Solicitudes } from './pages/Solicitudes';
import { Asistentes } from './pages/Asistentes';
import { AsistenteDetalle } from './pages/asistentes/AsistenteDetalle';
import { Familias } from './pages/Familias';
import { FamiliaDetalle } from './pages/familias/FamiliaDetalle';
import { Guardias } from './pages/Guardias';
import { Evv } from './pages/Evv';
import { Continuidad } from './pages/Continuidad';
import { ListaPrecios } from './pages/ListaPrecios';
import { UsuariosPanel } from './pages/UsuariosPanel';
import { Prestadoras } from './pages/Prestadoras';
import { AdminPlataforma } from './pages/AdminPlataforma';
import { Configuracion } from './pages/Configuracion';
import { Auditoria } from './pages/Auditoria';

function App() {
  return (
    <LocaleProvider>
      <EmpresaProvider>
        <AuthProvider>
          <TenantSessionProvider>
            <AdvertenciaLegalProvider>
              <BrowserRouter>
                <Routes>
                  <Route path="/login" element={<Login />} />
                  <Route path="/mfa" element={<Mfa />} />
                  <Route
                    path="/"
                    element={
                      <ProtectedRoute>
                        <Layout />
                      </ProtectedRoute>
                    }
                  >
                    <Route index element={<Dashboard />} />
                    <Route path="postulaciones" element={<Postulaciones />} />
                    <Route path="solicitudes" element={<Solicitudes />} />
                    <Route path="asistentes" element={<Asistentes />} />
                    <Route path="asistentes/:id" element={<AsistenteDetalle />} />
                    <Route path="familias" element={<Familias />} />
                    <Route path="familias/:id" element={<FamiliaDetalle />} />
                    <Route path="guardias" element={<Guardias />} />
                    <Route path="verificacion-visitas" element={<Evv />} />
                    <Route path="continuidad" element={<Continuidad />} />
                    <Route path="lista-precios" element={<ListaPrecios />} />
                    <Route path="usuarios-panel" element={<ProtectedRoute soloAdmin><UsuariosPanel /></ProtectedRoute>} />
                    <Route path="prestadoras" element={<ProtectedRoute roles={['admin_plataforma', 'superadmin']}><Prestadoras /></ProtectedRoute>} />
                    <Route path="admin-plataforma" element={<ProtectedRoute roles={['admin_plataforma']}><AdminPlataforma /></ProtectedRoute>} />
                    <Route path="configuracion" element={<ProtectedRoute soloAdmin><Configuracion /></ProtectedRoute>} />
                    <Route path="auditoria" element={<ProtectedRoute roles={['admin_prestadora', 'superadmin', 'admin_plataforma']}><Auditoria /></ProtectedRoute>} />
                  </Route>
                </Routes>
              </BrowserRouter>
            </AdvertenciaLegalProvider>
          </TenantSessionProvider>
        </AuthProvider>
      </EmpresaProvider>
    </LocaleProvider>
  );
}

export default App;
