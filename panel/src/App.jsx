import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { LocaleProvider } from './i18n/LocaleContext';
import { AuthProvider } from './context/AuthContext';
import { ProtectedRoute } from './components/layout/ProtectedRoute';
import { Layout } from './components/layout/Layout';
import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';
import { Postulaciones } from './pages/Postulaciones';
import { Solicitudes } from './pages/Solicitudes';
import { Asistentes } from './pages/Asistentes';
import { AsistenteDetalle } from './pages/asistentes/AsistenteDetalle';
import { Familias } from './pages/Familias';
import { FamiliaDetalle } from './pages/familias/FamiliaDetalle';
import { ListaPrecios } from './pages/ListaPrecios';
import { UsuariosPanel } from './pages/UsuariosPanel';
import { Configuracion } from './pages/Configuracion';

function App() {
  return (
    <LocaleProvider>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<Login />} />
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
              <Route path="lista-precios" element={<ListaPrecios />} />
              <Route path="usuarios-panel" element={<UsuariosPanel />} />
              <Route path="configuracion" element={<Configuracion />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </LocaleProvider>
  );
}

export default App;
