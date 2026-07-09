import { useCallback, useEffect, useState } from 'react';
import { useLocale } from '../i18n/LocaleContext';
import { supabase } from '../lib/supabaseClient';
import { Button } from '../components/ui/Button';
import { FormField } from '../components/ui/FormField';
import { Alert } from '../components/ui/Alert';
import { EstadoLista } from '../components/layout/EstadoLista';

const API_URL = import.meta.env.VITE_API_URL;

async function llamarApi(path, opciones = {}) {
  const { data } = await supabase.auth.getSession();
  const respuesta = await fetch(`${API_URL}/api/panel/configuracion${path}`, {
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

const TABS = ['empresa', 'zonas', 'notificaciones'];

export function Configuracion() {
  const { t } = useLocale();
  const [tab, setTab] = useState('empresa');

  return (
    <div>
      <h1>{t.configuracion.titulo}</h1>
      <p className="panel-explicacion">{t.configuracion.explicacion}</p>

      <div className="panel-tabs">
        {TABS.map((tabId) => (
          <button
            key={tabId}
            className={`panel-tab ${tab === tabId ? 'panel-tab-activo' : ''}`}
            onClick={() => setTab(tabId)}
          >
            {t.configuracion[`tab_${tabId}`]}
          </button>
        ))}
      </div>

      <div className="panel-tab-contenido">
        {tab === 'empresa' && <TabEmpresa />}
        {tab === 'zonas' && <TabZonas />}
        {tab === 'notificaciones' && <TabNotificaciones />}
      </div>
    </div>
  );
}

function TabEmpresa() {
  const { t } = useLocale();
  const [form, setForm] = useState(null);
  const [estado, setEstado] = useState('cargando');
  const [error, setError] = useState(null);
  const [guardando, setGuardando] = useState(false);
  const [guardado, setGuardado] = useState(false);

  const recargar = useCallback(async () => {
    setEstado('cargando');
    setError(null);
    try {
      const { empresa } = await llamarApi('/empresa');
      setForm(empresa);
      setEstado('listo');
    } catch (err) {
      setError(err.message);
      setEstado('error');
    }
  }, []);

  useEffect(() => {
    recargar();
  }, [recargar]);

  function set(campo, valor) {
    setForm((f) => ({ ...f, [campo]: valor }));
    setGuardado(false);
  }

  async function guardar() {
    setGuardando(true);
    setError(null);
    try {
      await llamarApi('/empresa', { method: 'PATCH', body: JSON.stringify(form) });
      setGuardado(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setGuardando(false);
    }
  }

  return (
    <EstadoLista estado={estado} error={error} vacio={false} recargar={recargar}>
      {form && (
        <div>
          {error && <Alert variant="error">{error}</Alert>}
          {guardado && <Alert variant="info">{t.comun.guardar} ✓</Alert>}
          <FormField label={t.configuracion.empresa_nombre} name="nombre" value={form.nombre || ''} onChange={(e) => set('nombre', e.target.value)} />
          <FormField label={t.configuracion.empresa_telefono} name="telefono" value={form.telefono || ''} onChange={(e) => set('telefono', e.target.value)} />
          <FormField label={t.configuracion.empresa_whatsapp} name="whatsapp_numero" value={form.whatsapp_numero || ''} onChange={(e) => set('whatsapp_numero', e.target.value)} />
          <FormField label={t.configuracion.empresa_email} name="email" type="email" value={form.email || ''} onChange={(e) => set('email', e.target.value)} />
          <FormField label={t.configuracion.empresa_dominio} name="dominio" value={form.dominio || ''} onChange={(e) => set('dominio', e.target.value)} />
          <FormField label={t.configuracion.empresa_zona_texto} name="zona_cobertura_texto" value={form.zona_cobertura_texto || ''} onChange={(e) => set('zona_cobertura_texto', e.target.value)} />
          <Button onClick={guardar} disabled={guardando}>{guardando ? t.comun.guardando : t.comun.guardar}</Button>
        </div>
      )}
    </EstadoLista>
  );
}

function TabZonas() {
  const { t } = useLocale();
  const [zonas, setZonas] = useState([]);
  const [estado, setEstado] = useState('cargando');
  const [error, setError] = useState(null);
  const [creandoNueva, setCreandoNueva] = useState(false);
  const [actualizandoZona, setActualizandoZona] = useState(null);

  const recargar = useCallback(async () => {
    setEstado('cargando');
    setError(null);
    try {
      const { zonas: filas } = await llamarApi('/zonas');
      setZonas(filas);
      setEstado('listo');
    } catch (err) {
      setError(err.message);
      setEstado('error');
    }
  }, []);

  useEffect(() => {
    recargar();
  }, [recargar]);

  async function toggleActiva(zona) {
    setActualizandoZona(zona.id);
    try {
      await llamarApi(`/zonas/${zona.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ nombre: zona.nombre, categoria: zona.categoria, orden: zona.orden, activa: !zona.activa }),
      });
      recargar();
    } catch (err) {
      setError(err.message);
    } finally {
      setActualizandoZona(null);
    }
  }

  async function borrar(zona) {
    if (!window.confirm(t.configuracion.zonas_confirmar_borrar)) return;
    setActualizandoZona(zona.id);
    try {
      await llamarApi(`/zonas/${zona.id}`, { method: 'DELETE' });
      recargar();
    } catch (err) {
      setError(err.message);
    } finally {
      setActualizandoZona(null);
    }
  }

  return (
    <div>
      {error && <Alert variant="error">{error}</Alert>}
      <div className="panel-filtros">
        <Button onClick={() => setCreandoNueva(true)}>{t.configuracion.zonas_nueva}</Button>
      </div>
      <EstadoLista estado={estado} error={null} vacio={estado === 'listo' && zonas.length === 0} recargar={recargar}>
        <table className="panel-tabla">
          <thead>
            <tr>
              <th>{t.configuracion.zonas_col_codigo}</th>
              <th>{t.configuracion.zonas_col_nombre}</th>
              <th>{t.configuracion.zonas_col_categoria}</th>
              <th>{t.configuracion.zonas_col_activa}</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {zonas.map((z) => (
              <tr key={z.id}>
                <td>{z.codigo}</td>
                <td>{z.nombre}</td>
                <td>{t.configuracion[`zonas_categoria_${z.categoria}`]}</td>
                <td>
                  <input type="checkbox" checked={z.activa} onChange={() => toggleActiva(z)} disabled={actualizandoZona === z.id} />
                </td>
                <td>
                  <button onClick={() => borrar(z)} disabled={actualizandoZona === z.id}>{t.comun.borrar}</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </EstadoLista>

      {creandoNueva && (
        <NuevaZona onClose={() => setCreandoNueva(false)} onCreada={() => { setCreandoNueva(false); recargar(); }} />
      )}
    </div>
  );
}

function NuevaZona({ onClose, onCreada }) {
  const { t } = useLocale();
  const [codigo, setCodigo] = useState('');
  const [nombre, setNombre] = useState('');
  const [categoria, setCategoria] = useState('caba');
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState(null);

  async function handleGuardar() {
    setGuardando(true);
    setError(null);
    try {
      await llamarApi('/zonas', { method: 'POST', body: JSON.stringify({ codigo, nombre, categoria }) });
      onCreada();
    } catch (err) {
      setError(err.message);
    } finally {
      setGuardando(false);
    }
  }

  return (
    <div className="panel-modal-fondo" onClick={onClose}>
      <div className="panel-modal" onClick={(e) => e.stopPropagation()}>
        <h2>{t.configuracion.zonas_nueva}</h2>
        {error && <Alert variant="error">{error}</Alert>}
        <FormField label={t.configuracion.zonas_col_codigo} name="codigo" value={codigo} onChange={(e) => setCodigo(e.target.value)} required />
        <FormField label={t.configuracion.zonas_col_nombre} name="nombre" value={nombre} onChange={(e) => setNombre(e.target.value)} required />
        <FormField label={t.configuracion.zonas_col_categoria} name="categoria" type="select" value={categoria} onChange={(e) => setCategoria(e.target.value)}>
          <option value="caba">{t.configuracion.zonas_categoria_caba}</option>
          <option value="gba">{t.configuracion.zonas_categoria_gba}</option>
          <option value="otras">{t.configuracion.zonas_categoria_otras}</option>
        </FormField>
        <div className="panel-modal-acciones">
          <Button variant="secondary" onClick={onClose} disabled={guardando}>{t.comun.cancelar}</Button>
          <Button onClick={handleGuardar} disabled={guardando || !codigo || !nombre}>
            {guardando ? t.comun.guardando : t.comun.guardar}
          </Button>
        </div>
      </div>
    </div>
  );
}

function TabNotificaciones() {
  const { t } = useLocale();
  const [notificaciones, setNotificaciones] = useState([]);
  const [estado, setEstado] = useState('cargando');
  const [error, setError] = useState(null);
  const [guardandoEvento, setGuardandoEvento] = useState(null);

  const recargar = useCallback(async () => {
    setEstado('cargando');
    setError(null);
    try {
      const { notificaciones: filas } = await llamarApi('/notificaciones');
      setNotificaciones(filas);
      setEstado('listo');
    } catch (err) {
      setError(err.message);
      setEstado('error');
    }
  }, []);

  useEffect(() => {
    recargar();
  }, [recargar]);

  function set(evento, campo, valor) {
    setNotificaciones((filas) => filas.map((f) => (f.evento === evento ? { ...f, [campo]: valor } : f)));
  }

  async function guardar(fila) {
    setGuardandoEvento(fila.evento);
    setError(null);
    try {
      await llamarApi(`/notificaciones/${fila.evento}`, {
        method: 'PATCH',
        body: JSON.stringify({ emails: fila.emails, activo: fila.activo }),
      });
    } catch (err) {
      setError(err.message);
    } finally {
      setGuardandoEvento(null);
    }
  }

  return (
    <EstadoLista estado={estado} error={error} vacio={estado === 'listo' && notificaciones.length === 0} recargar={recargar}>
      <table className="panel-tabla">
        <thead>
          <tr>
            <th>{t.configuracion.notificaciones_col_evento}</th>
            <th>{t.configuracion.notificaciones_col_emails}</th>
            <th>{t.configuracion.notificaciones_col_activo}</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {notificaciones.map((fila) => (
            <tr key={fila.evento}>
              <td>{t.configuracion[`notificaciones_evento_${fila.evento}`] || fila.descripcion}</td>
              <td>
                <input
                  type="text"
                  placeholder={t.configuracion.notificaciones_emails_placeholder}
                  value={(fila.emails || []).join(', ')}
                  onChange={(e) => set(fila.evento, 'emails', e.target.value.split(',').map((s) => s.trim()).filter(Boolean))}
                />
              </td>
              <td>
                <input type="checkbox" checked={fila.activo} onChange={(e) => set(fila.evento, 'activo', e.target.checked)} />
              </td>
              <td>
                <button onClick={() => guardar(fila)} disabled={guardandoEvento === fila.evento}>
                  {guardandoEvento === fila.evento ? t.comun.guardando : t.comun.guardar}
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </EstadoLista>
  );
}
