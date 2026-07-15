import { useCallback, useEffect, useState } from 'react';
import { useLocale } from '../i18n/LocaleContext';
import { useAuth } from '../context/AuthContext';
import { useConfirmarDestructivo } from '../context/TenantSessionContext';
import { supabase } from '../lib/supabaseClient';
import { Button } from '../components/ui/Button';
import { FormField } from '../components/ui/FormField';
import { Alert } from '../components/ui/Alert';
import { EstadoLista } from '../components/layout/EstadoLista';

const API_URL = import.meta.env.VITE_API_URL;

async function llamarApi(path, opciones = {}) {
  const { data } = await supabase.auth.getSession();
  const respuesta = await fetch(`${API_URL}/api/panel/usuarios${path}`, {
    ...opciones,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${data.session?.access_token}`,
      ...opciones.headers,
    },
  });
  const resultado = await respuesta.json();
  if (!respuesta.ok) throw new Error(resultado.error);
  return resultado;
}

async function listarPrestadoras() {
  const { data } = await supabase.auth.getSession();
  const respuesta = await fetch(`${API_URL}/api/panel/prestadoras`, {
    headers: { Authorization: `Bearer ${data.session?.access_token}` },
  });
  const resultado = await respuesta.json();
  if (!respuesta.ok) throw new Error(resultado.error);
  return resultado.prestadoras;
}

export function UsuariosPanel() {
  const { t } = useLocale();
  const { usuario } = useAuth();
  const esSuperadmin = usuario?.rol === 'superadmin';
  const [usuarios, setUsuarios] = useState([]);
  const [estado, setEstado] = useState('cargando');
  const [error, setError] = useState(null);
  const [editando, setEditando] = useState(null);
  const [creandoNuevo, setCreandoNuevo] = useState(false);

  const recargar = useCallback(async () => {
    setEstado('cargando');
    setError(null);
    try {
      const { usuarios: filas } = await llamarApi('');
      setUsuarios(filas);
      setEstado('listo');
    } catch (err) {
      setError(err.message);
      setEstado('error');
    }
  }, []);

  useEffect(() => {
    recargar();
  }, [recargar]);

  const puedeEditar = (fila) => esSuperadmin || fila.rol === 'coordinador';

  return (
    <div>
      <h1>{t.usuarios_panel.titulo}</h1>
      <p className="panel-explicacion">{t.usuarios_panel.explicacion}</p>

      <div className="panel-filtros">
        <Button onClick={() => setCreandoNuevo(true)}>
          {esSuperadmin ? t.usuarios_panel.nuevo_usuario : t.usuarios_panel.nuevo_coordinador}
        </Button>
      </div>

      <EstadoLista estado={estado} error={error} vacio={estado === 'listo' && usuarios.length === 0} recargar={recargar}>
        <table className="panel-tabla">
          <thead>
            <tr>
              <th>{t.usuarios_panel.col_nombre}</th>
              <th>{t.usuarios_panel.col_rol}</th>
              <th>{t.usuarios_panel.col_telefono}</th>
              <th>{t.usuarios_panel.col_zonas}</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {usuarios.map((u) => (
              <tr key={u.id}>
                <td>{u.nombre}</td>
                <td>{t.usuarios_panel[`rol_${u.rol}`]}</td>
                <td>{u.telefono || '—'}</td>
                <td>{(u.zonas || []).join(', ') || '—'}</td>
                <td>
                  {puedeEditar(u) && (
                    <button onClick={() => setEditando(u)}>{t.comun.editar}</button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </EstadoLista>

      {creandoNuevo && (
        <NuevoUsuarioPanel
          esSuperadmin={esSuperadmin}
          onClose={() => setCreandoNuevo(false)}
          onCreado={() => {
            recargar();
          }}
        />
      )}

      {editando && (
        <EditarUsuarioPanel
          usuario={editando}
          onClose={() => setEditando(null)}
          onActualizado={() => {
            setEditando(null);
            recargar();
          }}
        />
      )}
    </div>
  );
}

function NuevoUsuarioPanel({ esSuperadmin, onClose, onCreado }) {
  const { t } = useLocale();
  const [email, setEmail] = useState('');
  const [nombre, setNombre] = useState('');
  const [telefono, setTelefono] = useState('');
  const [zonas, setZonas] = useState('');
  const [rol, setRol] = useState('coordinador');
  const [prestadoraId, setPrestadoraId] = useState('');
  const [prestadoras, setPrestadoras] = useState([]);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState(null);
  const [creado, setCreado] = useState(null);

  useEffect(() => {
    if (!esSuperadmin) return;
    listarPrestadoras().then(setPrestadoras).catch((err) => setError(err.message));
  }, [esSuperadmin]);

  async function handleGuardar() {
    setGuardando(true);
    setError(null);
    try {
      const rolFinal = esSuperadmin ? rol : 'coordinador';
      const resultado = await llamarApi('', {
        method: 'POST',
        body: JSON.stringify({
          email,
          nombre,
          telefono,
          rol: rolFinal,
          // prestadora_id solo tiene sentido para admin_prestadora/coordinador — una
          // cuenta superadmin nueva siempre nace en la sandbox, el backend ignora este
          // campo en ese caso (backend/src/routes/panelUsuarios.js).
          prestadora_id: esSuperadmin && rolFinal !== 'superadmin' ? prestadoraId || undefined : undefined,
          zonas: zonas.split(',').map((z) => z.trim()).filter(Boolean),
        }),
      });
      setCreado({ email, passwordTemporal: resultado.passwordTemporal });
      onCreado();
    } catch (err) {
      setError(err.message);
    } finally {
      setGuardando(false);
    }
  }

  if (creado) {
    return (
      <div className="panel-modal-fondo" onClick={onClose}>
        <div className="panel-modal" onClick={(e) => e.stopPropagation()}>
          <h2>{t.usuarios_panel.cuenta_creada_titulo}</h2>
          <p className="panel-explicacion">{t.usuarios_panel.cuenta_creada_explicacion}</p>
          <dl className="panel-detalle-lista">
            <dt>{t.usuarios_panel.col_email}</dt>
            <dd>{creado.email}</dd>
            <dt>{t.usuarios_panel.password_temporal}</dt>
            <dd><code>{creado.passwordTemporal}</code></dd>
          </dl>
          <div className="panel-modal-acciones">
            <Button onClick={onClose}>{t.comun.cerrar}</Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="panel-modal-fondo" onClick={onClose}>
      <div className="panel-modal" onClick={(e) => e.stopPropagation()}>
        <h2>{esSuperadmin ? t.usuarios_panel.nuevo_usuario : t.usuarios_panel.nuevo_coordinador}</h2>
        {error && <Alert variant="error">{error}</Alert>}
        <FormField label={t.usuarios_panel.col_nombre} name="nombre" value={nombre} onChange={(e) => setNombre(e.target.value)} required />
        <FormField label={t.usuarios_panel.col_email} name="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        {esSuperadmin && (
          <FormField label={t.usuarios_panel.campo_rol} name="rol" type="select" value={rol} onChange={(e) => setRol(e.target.value)}>
            <option value="coordinador">{t.usuarios_panel.rol_coordinador}</option>
            <option value="admin_prestadora">{t.usuarios_panel.rol_admin_prestadora}</option>
            <option value="superadmin">{t.usuarios_panel.rol_superadmin}</option>
          </FormField>
        )}
        {esSuperadmin && rol === 'admin_prestadora' && (
          <FormField label={t.usuarios_panel.campo_prestadora} name="prestadora_id" type="select" value={prestadoraId} onChange={(e) => setPrestadoraId(e.target.value)} required>
            <option value="">{t.usuarios_panel.prestadora_placeholder}</option>
            {prestadoras.map((p) => (
              <option key={p.id} value={p.id}>{p.nombre_fantasia} ({p.estado})</option>
            ))}
          </FormField>
        )}
        <FormField label={t.usuarios_panel.col_telefono} name="telefono" value={telefono} onChange={(e) => setTelefono(e.target.value)} />
        <FormField label={t.usuarios_panel.col_zonas} name="zonas" value={zonas} onChange={(e) => setZonas(e.target.value)} placeholder={t.usuarios_panel.zonas_placeholder} />
        <p className="panel-explicacion">{t.usuarios_panel.aviso_password_temporal}</p>
        <div className="panel-modal-acciones">
          <Button variant="secondary" onClick={onClose} disabled={guardando}>{t.comun.cancelar}</Button>
          <Button onClick={handleGuardar} disabled={guardando || !email || !nombre || (esSuperadmin && rol === 'admin_prestadora' && !prestadoraId)}>
            {guardando ? t.comun.guardando : t.comun.guardar}
          </Button>
        </div>
      </div>
    </div>
  );
}

function EditarUsuarioPanel({ usuario, onClose, onActualizado }) {
  const { t } = useLocale();
  const confirmarDestructivo = useConfirmarDestructivo();
  const [nombre, setNombre] = useState(usuario.nombre);
  const [telefono, setTelefono] = useState(usuario.telefono || '');
  const [zonas, setZonas] = useState((usuario.zonas || []).join(', '));
  const [guardando, setGuardando] = useState(false);
  const [borrando, setBorrando] = useState(false);
  const [error, setError] = useState(null);

  async function handleGuardar() {
    setGuardando(true);
    setError(null);
    try {
      await llamarApi(`/${usuario.id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          nombre,
          telefono,
          zonas: zonas.split(',').map((z) => z.trim()).filter(Boolean),
        }),
      });
      onActualizado();
    } catch (err) {
      setError(err.message);
      setGuardando(false);
    }
  }

  async function handleDarDeBaja() {
    const confirmado = confirmarDestructivo(t.usuarios_panel.confirmar_baja);
    if (!confirmado) return;

    setBorrando(true);
    setError(null);
    try {
      await llamarApi(`/${usuario.id}`, { method: 'DELETE' });
      onActualizado();
    } catch (err) {
      setError(err.message);
      setBorrando(false);
    }
  }

  return (
    <div className="panel-modal-fondo" onClick={onClose}>
      <div className="panel-modal" onClick={(e) => e.stopPropagation()}>
        <h2>{usuario.nombre}</h2>
        {error && <Alert variant="error">{error}</Alert>}
        <FormField label={t.usuarios_panel.col_nombre} name="nombre" value={nombre} onChange={(e) => setNombre(e.target.value)} required />
        <FormField label={t.usuarios_panel.col_telefono} name="telefono" value={telefono} onChange={(e) => setTelefono(e.target.value)} />
        <FormField label={t.usuarios_panel.col_zonas} name="zonas" value={zonas} onChange={(e) => setZonas(e.target.value)} placeholder={t.usuarios_panel.zonas_placeholder} />
        <div className="panel-modal-acciones">
          <Button variant="secondary" onClick={handleDarDeBaja} disabled={guardando || borrando}>
            {borrando ? t.comun.guardando : t.usuarios_panel.dar_de_baja}
          </Button>
          <Button variant="secondary" onClick={onClose} disabled={guardando || borrando}>{t.comun.cancelar}</Button>
          <Button onClick={handleGuardar} disabled={guardando || borrando}>
            {guardando ? t.comun.guardando : t.comun.guardar}
          </Button>
        </div>
      </div>
    </div>
  );
}
