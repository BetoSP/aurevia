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

const TABS = ['empresa', 'zonas', 'servicios', 'documentos', 'notificaciones', 'whatsapp'];
const ROLES_RELEVO = ['suplente', 'franquero', 'emergencia', 'familiar'];
const TIPOS_PERSONAL_EMERGENCIA = ['franquero', 'emergencia'];

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
        {tab === 'servicios' && <TabServicios />}
        {tab === 'documentos' && <TabDocumentos />}
        {tab === 'notificaciones' && <TabNotificaciones />}
        {tab === 'whatsapp' && <TabWhatsapp />}
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
      {estado === 'listo' && error && <Alert variant="error">{error}</Alert>}
      <div className="panel-filtros">
        <Button onClick={() => setCreandoNueva(true)}>{t.configuracion.zonas_nueva}</Button>
      </div>
      <EstadoLista estado={estado} error={error} vacio={estado === 'listo' && zonas.length === 0} recargar={recargar}>
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

function TabServicios() {
  const { t } = useLocale();
  const [niveles, setNiveles] = useState([]);
  const [estado, setEstado] = useState('cargando');
  const [error, setError] = useState(null);
  const [creandoNuevo, setCreandoNuevo] = useState(false);
  const [actualizandoId, setActualizandoId] = useState(null);

  const recargar = useCallback(async () => {
    setEstado('cargando');
    setError(null);
    try {
      const { niveles: filas } = await llamarApi('/escalada-relevo');
      setNiveles(filas);
      setEstado('listo');
    } catch (err) {
      setError(err.message);
      setEstado('error');
    }
  }, []);

  useEffect(() => {
    recargar();
  }, [recargar]);

  async function borrar(fila) {
    if (!window.confirm(t.configuracion.escalada_confirmar_borrar)) return;
    setActualizandoId(fila.id);
    try {
      await llamarApi(`/escalada-relevo/${fila.id}`, { method: 'DELETE' });
      recargar();
    } catch (err) {
      setError(err.message);
    } finally {
      setActualizandoId(null);
    }
  }

  return (
    <div>
      <h2>{t.configuracion.servicios_escalada_titulo}</h2>
      <p className="panel-explicacion">{t.configuracion.servicios_escalada_explicacion}</p>
      {estado === 'listo' && error && <Alert variant="error">{error}</Alert>}
      <div className="panel-filtros">
        <Button onClick={() => setCreandoNuevo(true)}>{t.configuracion.escalada_nuevo_nivel}</Button>
      </div>
      <EstadoLista estado={estado} error={error} vacio={estado === 'listo' && niveles.length === 0} recargar={recargar} mensajeVacio={t.configuracion.escalada_vacio}>
        <table className="panel-tabla">
          <thead>
            <tr>
              <th>{t.configuracion.escalada_col_nivel}</th>
              <th>{t.configuracion.escalada_col_minutos}</th>
              <th>{t.configuracion.escalada_col_orden}</th>
              <th>{t.configuracion.escalada_col_mensaje}</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {niveles.map((n) => (
              <tr key={n.id}>
                <td>{n.nivel}</td>
                <td>{n.minutos_demora ?? '—'}</td>
                <td>{(n.orden_prioridad || []).map((r) => t.configuracion[`escalada_rol_${r}`]).join(' → ') || '—'}</td>
                <td>{n.plantilla_mensaje}</td>
                <td>
                  <button onClick={() => borrar(n)} disabled={actualizandoId === n.id}>{t.comun.borrar}</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </EstadoLista>

      {creandoNuevo && (
        <NuevoNivelEscalada onClose={() => setCreandoNuevo(false)} onCreado={() => { setCreandoNuevo(false); recargar(); }} />
      )}

      <TabServiciosPersonalEmergencia />
    </div>
  );
}

function TabServiciosPersonalEmergencia() {
  const { t } = useLocale();
  const [personal, setPersonal] = useState([]);
  const [asistentes, setAsistentes] = useState([]);
  const [estado, setEstado] = useState('cargando');
  const [error, setError] = useState(null);
  const [creandoNuevo, setCreandoNuevo] = useState(false);
  const [actualizandoId, setActualizandoId] = useState(null);

  const recargar = useCallback(async () => {
    setEstado('cargando');
    setError(null);
    try {
      const [{ personal: filas }, { data: asistentesData, error: errorAsistentes }] = await Promise.all([
        llamarApi('/personal-emergencia'),
        supabase.from('asistentes').select('id, nombre').order('nombre'),
      ]);
      if (errorAsistentes) throw errorAsistentes;
      setPersonal(filas);
      setAsistentes(asistentesData ?? []);
      setEstado('listo');
    } catch (err) {
      setError(err.message);
      setEstado('error');
    }
  }, []);

  useEffect(() => {
    recargar();
  }, [recargar]);

  async function toggleActivo(fila) {
    setActualizandoId(fila.id);
    try {
      await llamarApi(`/personal-emergencia/${fila.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ activo: !fila.activo }),
      });
      recargar();
    } catch (err) {
      setError(err.message);
    } finally {
      setActualizandoId(null);
    }
  }

  async function borrar(fila) {
    if (!window.confirm(t.configuracion.personal_emergencia_confirmar_borrar)) return;
    setActualizandoId(fila.id);
    try {
      await llamarApi(`/personal-emergencia/${fila.id}`, { method: 'DELETE' });
      recargar();
    } catch (err) {
      setError(err.message);
    } finally {
      setActualizandoId(null);
    }
  }

  return (
    <div>
      <h2>{t.configuracion.personal_emergencia_titulo}</h2>
      <p className="panel-explicacion">{t.configuracion.personal_emergencia_explicacion}</p>
      {estado === 'listo' && error && <Alert variant="error">{error}</Alert>}
      <div className="panel-filtros">
        <Button onClick={() => setCreandoNuevo(true)}>{t.configuracion.personal_emergencia_nuevo}</Button>
      </div>
      <EstadoLista
        estado={estado}
        error={error}
        vacio={estado === 'listo' && personal.length === 0}
        recargar={recargar}
        mensajeVacio={t.configuracion.personal_emergencia_vacio}
      >
        <table className="panel-tabla">
          <thead>
            <tr>
              <th>{t.configuracion.personal_emergencia_col_asistente}</th>
              <th>{t.configuracion.personal_emergencia_col_tipo}</th>
              <th>{t.configuracion.personal_emergencia_col_activo}</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {personal.map((fila) => (
              <tr key={fila.id}>
                <td>{fila.asistentes?.nombre || '—'}</td>
                <td>{t.configuracion[`personal_emergencia_tipo_${fila.tipo}`]}</td>
                <td>
                  <input type="checkbox" checked={fila.activo} onChange={() => toggleActivo(fila)} disabled={actualizandoId === fila.id} />
                </td>
                <td>
                  <button onClick={() => borrar(fila)} disabled={actualizandoId === fila.id}>{t.comun.borrar}</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </EstadoLista>

      {creandoNuevo && (
        <NuevoPersonalEmergencia
          asistentes={asistentes}
          onClose={() => setCreandoNuevo(false)}
          onCreado={() => { setCreandoNuevo(false); recargar(); }}
        />
      )}
    </div>
  );
}

function NuevoPersonalEmergencia({ asistentes, onClose, onCreado }) {
  const { t } = useLocale();
  const [asistenteId, setAsistenteId] = useState('');
  const [tipo, setTipo] = useState('franquero');
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState(null);

  async function handleGuardar() {
    setGuardando(true);
    setError(null);
    try {
      await llamarApi('/personal-emergencia', {
        method: 'POST',
        body: JSON.stringify({ asistente_id: asistenteId, tipo }),
      });
      onCreado();
    } catch (err) {
      setError(err.message);
    } finally {
      setGuardando(false);
    }
  }

  return (
    <div className="panel-modal-fondo" onClick={onClose}>
      <div className="panel-modal" onClick={(e) => e.stopPropagation()}>
        <h2>{t.configuracion.personal_emergencia_nuevo}</h2>
        {error && <Alert variant="error">{error}</Alert>}
        <FormField
          label={t.configuracion.personal_emergencia_col_asistente}
          name="asistente_id"
          type="select"
          value={asistenteId}
          onChange={(e) => setAsistenteId(e.target.value)}
          required
        >
          <option value="">{t.configuracion.escalada_prioridad_vacio}</option>
          {asistentes.map((a) => (
            <option key={a.id} value={a.id}>{a.nombre}</option>
          ))}
        </FormField>
        <FormField
          label={t.configuracion.personal_emergencia_col_tipo}
          name="tipo"
          type="select"
          value={tipo}
          onChange={(e) => setTipo(e.target.value)}
        >
          {TIPOS_PERSONAL_EMERGENCIA.map((tipoOpcion) => (
            <option key={tipoOpcion} value={tipoOpcion}>{t.configuracion[`personal_emergencia_tipo_${tipoOpcion}`]}</option>
          ))}
        </FormField>
        <div className="panel-modal-acciones">
          <Button variant="secondary" onClick={onClose} disabled={guardando}>{t.comun.cancelar}</Button>
          <Button onClick={handleGuardar} disabled={guardando || !asistenteId}>
            {guardando ? t.comun.guardando : t.comun.guardar}
          </Button>
        </div>
      </div>
    </div>
  );
}

function NuevoNivelEscalada({ onClose, onCreado }) {
  const { t } = useLocale();
  const [nivel, setNivel] = useState('');
  const [minutosDemora, setMinutosDemora] = useState('');
  const [ordenPrioridad, setOrdenPrioridad] = useState(['', '', '', '']);
  const [plantillaMensaje, setPlantillaMensaje] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState(null);

  function setPrioridad(indice, valor) {
    setOrdenPrioridad((actual) => actual.map((v, i) => (i === indice ? valor : v)));
  }

  async function handleGuardar() {
    setGuardando(true);
    setError(null);
    try {
      await llamarApi('/escalada-relevo', {
        method: 'POST',
        body: JSON.stringify({
          nivel: Number(nivel),
          minutos_demora: minutosDemora === '' ? null : Number(minutosDemora),
          orden_prioridad: ordenPrioridad.filter(Boolean),
          plantilla_mensaje: plantillaMensaje,
        }),
      });
      onCreado();
    } catch (err) {
      setError(err.message);
    } finally {
      setGuardando(false);
    }
  }

  return (
    <div className="panel-modal-fondo" onClick={onClose}>
      <div className="panel-modal" onClick={(e) => e.stopPropagation()}>
        <h2>{t.configuracion.escalada_nuevo_nivel}</h2>
        {error && <Alert variant="error">{error}</Alert>}
        <FormField label={t.configuracion.escalada_col_nivel} name="nivel" type="number" value={nivel} onChange={(e) => setNivel(e.target.value)} required />
        <FormField label={t.configuracion.escalada_minutos_label} name="minutos_demora" type="number" value={minutosDemora} onChange={(e) => setMinutosDemora(e.target.value)} />
        {ordenPrioridad.map((valor, indice) => (
          <FormField
            key={indice}
            label={`${t.configuracion.escalada_prioridad_label} ${indice + 1}`}
            name={`prioridad_${indice}`}
            type="select"
            value={valor}
            onChange={(e) => setPrioridad(indice, e.target.value)}
          >
            <option value="">{t.configuracion.escalada_prioridad_vacio}</option>
            {ROLES_RELEVO.map((rol) => (
              <option key={rol} value={rol}>{t.configuracion[`escalada_rol_${rol}`]}</option>
            ))}
          </FormField>
        ))}
        <FormField
          label={t.configuracion.escalada_col_mensaje}
          name="plantilla_mensaje"
          type="textarea"
          value={plantillaMensaje}
          onChange={(e) => setPlantillaMensaje(e.target.value)}
          required
        />
        <div className="panel-modal-acciones">
          <Button variant="secondary" onClick={onClose} disabled={guardando}>{t.comun.cancelar}</Button>
          <Button onClick={handleGuardar} disabled={guardando || !nivel || !plantillaMensaje}>
            {guardando ? t.comun.guardando : t.comun.guardar}
          </Button>
        </div>
      </div>
    </div>
  );
}

function TabDocumentos() {
  const { t } = useLocale();
  const [tipos, setTipos] = useState([]);
  const [diasAviso, setDiasAviso] = useState('');
  const [estado, setEstado] = useState('cargando');
  const [error, setError] = useState(null);
  const [creandoNuevo, setCreandoNuevo] = useState(false);
  const [actualizandoId, setActualizandoId] = useState(null);
  const [guardandoPlazo, setGuardandoPlazo] = useState(false);
  const [plazoGuardado, setPlazoGuardado] = useState(false);

  const recargar = useCallback(async () => {
    setEstado('cargando');
    setError(null);
    try {
      const { tipos: filas, dias_aviso_vencimiento_documentos } = await llamarApi('/documentos-tipo');
      setTipos(filas);
      setDiasAviso(String(dias_aviso_vencimiento_documentos));
      setEstado('listo');
    } catch (err) {
      setError(err.message);
      setEstado('error');
    }
  }, []);

  useEffect(() => {
    recargar();
  }, [recargar]);

  async function toggleActivo(fila) {
    setActualizandoId(fila.id);
    try {
      await llamarApi(`/documentos-tipo/${fila.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ nombre: fila.nombre, requiere_vencimiento: fila.requiere_vencimiento, activo: !fila.activo }),
      });
      recargar();
    } catch (err) {
      setError(err.message);
    } finally {
      setActualizandoId(null);
    }
  }

  async function guardarPlazo() {
    setGuardandoPlazo(true);
    setError(null);
    setPlazoGuardado(false);
    try {
      await llamarApi('/documentos-tipo/plazo-aviso', {
        method: 'PATCH',
        body: JSON.stringify({ dias: Number(diasAviso) }),
      });
      setPlazoGuardado(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setGuardandoPlazo(false);
    }
  }

  return (
    <div>
      <h2>{t.configuracion.documentos_plazo_titulo}</h2>
      <p className="panel-explicacion">{t.configuracion.documentos_plazo_explicacion}</p>
      {error && <Alert variant="error">{error}</Alert>}
      {plazoGuardado && <Alert variant="info">{t.comun.guardar} ✓</Alert>}
      <FormField
        label={t.configuracion.documentos_plazo_dias}
        name="dias_aviso"
        type="number"
        value={diasAviso}
        onChange={(e) => { setDiasAviso(e.target.value); setPlazoGuardado(false); }}
      />
      <Button onClick={guardarPlazo} disabled={guardandoPlazo || !diasAviso}>
        {guardandoPlazo ? t.comun.guardando : t.comun.guardar}
      </Button>

      <h2>{t.configuracion.documentos_tipos_titulo}</h2>
      <p className="panel-explicacion">{t.configuracion.documentos_tipos_explicacion}</p>
      <div className="panel-filtros">
        <Button onClick={() => setCreandoNuevo(true)}>{t.configuracion.documentos_tipos_nuevo}</Button>
      </div>
      <EstadoLista estado={estado} error={error} vacio={estado === 'listo' && tipos.length === 0} recargar={recargar}>
        <table className="panel-tabla">
          <thead>
            <tr>
              <th>{t.configuracion.documentos_tipos_col_nombre}</th>
              <th>{t.configuracion.documentos_tipos_col_requiere_vencimiento}</th>
              <th>{t.configuracion.documentos_tipos_col_activo}</th>
            </tr>
          </thead>
          <tbody>
            {tipos.map((tipo) => (
              <tr key={tipo.id}>
                <td>{tipo.nombre}</td>
                <td>{tipo.requiere_vencimiento ? t.comun.si : t.comun.no}</td>
                <td>
                  <input type="checkbox" checked={tipo.activo} onChange={() => toggleActivo(tipo)} disabled={actualizandoId === tipo.id} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </EstadoLista>

      {creandoNuevo && (
        <NuevoTipoDocumento onClose={() => setCreandoNuevo(false)} onCreado={() => { setCreandoNuevo(false); recargar(); }} />
      )}
    </div>
  );
}

function NuevoTipoDocumento({ onClose, onCreado }) {
  const { t } = useLocale();
  const [nombre, setNombre] = useState('');
  const [requiereVencimiento, setRequiereVencimiento] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState(null);

  async function handleGuardar() {
    setGuardando(true);
    setError(null);
    try {
      await llamarApi('/documentos-tipo', {
        method: 'POST',
        body: JSON.stringify({ nombre, requiere_vencimiento: requiereVencimiento }),
      });
      onCreado();
    } catch (err) {
      setError(err.message);
    } finally {
      setGuardando(false);
    }
  }

  return (
    <div className="panel-modal-fondo" onClick={onClose}>
      <div className="panel-modal" onClick={(e) => e.stopPropagation()}>
        <h2>{t.configuracion.documentos_tipos_nuevo}</h2>
        {error && <Alert variant="error">{error}</Alert>}
        <FormField label={t.configuracion.documentos_tipos_col_nombre} name="nombre" value={nombre} onChange={(e) => setNombre(e.target.value)} required />
        <FormField
          label={t.configuracion.documentos_tipos_col_requiere_vencimiento}
          name="requiere_vencimiento"
          type="checkbox"
          checked={requiereVencimiento}
          onChange={(e) => setRequiereVencimiento(e.target.checked)}
        />
        <div className="panel-modal-acciones">
          <Button variant="secondary" onClick={onClose} disabled={guardando}>{t.comun.cancelar}</Button>
          <Button onClick={handleGuardar} disabled={guardando || !nombre}>
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
        body: JSON.stringify({ emails: fila.emails, activo: fila.activo, whatsapp_activo: fila.whatsapp_activo }),
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
            <th>{t.configuracion.notificaciones_col_whatsapp_activo}</th>
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
                <input type="checkbox" checked={fila.whatsapp_activo || false} onChange={(e) => set(fila.evento, 'whatsapp_activo', e.target.checked)} />
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

const CATEGORIAS_PLANTILLA = ['utility', 'marketing', 'authentication'];

function TabWhatsapp() {
  return (
    <div>
      <TabWhatsappCredenciales />
      <TabWhatsappPlantillas />
      <TabWhatsappEscaladaCoordinador />
    </div>
  );
}

function TabWhatsappCredenciales() {
  const { t } = useLocale();
  const [form, setForm] = useState(null);
  const [token, setToken] = useState('');
  const [estado, setEstado] = useState('cargando');
  const [error, setError] = useState(null);
  const [guardando, setGuardando] = useState(false);
  const [guardado, setGuardado] = useState(false);

  const recargar = useCallback(async () => {
    setEstado('cargando');
    setError(null);
    try {
      const { whatsapp } = await llamarApi('/whatsapp');
      setForm(whatsapp);
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
      await llamarApi('/whatsapp', {
        method: 'PATCH',
        body: JSON.stringify({
          activo: form.activo,
          numero_telefono: form.numero_telefono,
          waba_id: form.waba_id,
          phone_number_id: form.phone_number_id,
          token: token || undefined,
        }),
      });
      setToken('');
      setGuardado(true);
      recargar();
    } catch (err) {
      setError(err.message);
    } finally {
      setGuardando(false);
    }
  }

  return (
    <div>
      <h2>{t.configuracion.whatsapp_credenciales_titulo}</h2>
      <p className="panel-explicacion">{t.configuracion.whatsapp_credenciales_explicacion}</p>
      <EstadoLista estado={estado} error={error} vacio={false} recargar={recargar}>
        {form && (
          <div>
            {error && <Alert variant="error">{error}</Alert>}
            {guardado && <Alert variant="info">{t.comun.guardar} ✓</Alert>}
            <FormField
              label={t.configuracion.whatsapp_activo}
              name="activo"
              type="checkbox"
              checked={form.activo || false}
              onChange={(e) => set('activo', e.target.checked)}
            />
            <FormField label={t.configuracion.whatsapp_numero} name="numero_telefono" value={form.numero_telefono || ''} onChange={(e) => set('numero_telefono', e.target.value)} />
            <FormField label={t.configuracion.whatsapp_waba_id} name="waba_id" value={form.waba_id || ''} onChange={(e) => set('waba_id', e.target.value)} />
            <FormField label={t.configuracion.whatsapp_phone_number_id} name="phone_number_id" value={form.phone_number_id || ''} onChange={(e) => set('phone_number_id', e.target.value)} />
            <FormField
              label={form.token_cargado ? t.configuracion.whatsapp_token_reemplazar : t.configuracion.whatsapp_token_cargar}
              name="token"
              type="password"
              value={token}
              onChange={(e) => setToken(e.target.value)}
            />
            <Button onClick={guardar} disabled={guardando}>{guardando ? t.comun.guardando : t.comun.guardar}</Button>
          </div>
        )}
      </EstadoLista>
    </div>
  );
}

function TabWhatsappPlantillas() {
  const { t } = useLocale();
  const [plantillas, setPlantillas] = useState([]);
  const [estado, setEstado] = useState('cargando');
  const [error, setError] = useState(null);
  const [creandoNueva, setCreandoNueva] = useState(false);
  const [actualizandoId, setActualizandoId] = useState(null);

  const recargar = useCallback(async () => {
    setEstado('cargando');
    setError(null);
    try {
      const { plantillas: filas } = await llamarApi('/whatsapp/plantillas');
      setPlantillas(filas);
      setEstado('listo');
    } catch (err) {
      setError(err.message);
      setEstado('error');
    }
  }, []);

  useEffect(() => {
    recargar();
  }, [recargar]);

  async function marcarEnviadaMeta(fila) {
    setActualizandoId(fila.id);
    try {
      await llamarApi(`/whatsapp/plantillas/${fila.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ estado: 'enviada_meta' }),
      });
      recargar();
    } catch (err) {
      setError(err.message);
    } finally {
      setActualizandoId(null);
    }
  }

  async function borrar(fila) {
    if (!window.confirm(t.configuracion.whatsapp_plantillas_confirmar_borrar)) return;
    setActualizandoId(fila.id);
    try {
      await llamarApi(`/whatsapp/plantillas/${fila.id}`, { method: 'DELETE' });
      recargar();
    } catch (err) {
      setError(err.message);
    } finally {
      setActualizandoId(null);
    }
  }

  return (
    <div>
      <h2>{t.configuracion.whatsapp_plantillas_titulo}</h2>
      <p className="panel-explicacion">{t.configuracion.whatsapp_plantillas_explicacion}</p>
      {estado === 'listo' && error && <Alert variant="error">{error}</Alert>}
      <div className="panel-filtros">
        <Button onClick={() => setCreandoNueva(true)}>{t.configuracion.whatsapp_plantillas_nueva}</Button>
      </div>
      <EstadoLista
        estado={estado}
        error={error}
        vacio={estado === 'listo' && plantillas.length === 0}
        recargar={recargar}
        mensajeVacio={t.configuracion.whatsapp_plantillas_vacio}
      >
        <table className="panel-tabla">
          <thead>
            <tr>
              <th>{t.configuracion.whatsapp_plantillas_col_nombre}</th>
              <th>{t.configuracion.whatsapp_plantillas_col_categoria}</th>
              <th>{t.configuracion.whatsapp_plantillas_col_estado}</th>
              <th>{t.configuracion.whatsapp_plantillas_col_cuerpo}</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {plantillas.map((p) => (
              <tr key={p.id}>
                <td>{p.nombre_interno}</td>
                <td>{p.categoria}</td>
                <td>{t.configuracion[`whatsapp_plantillas_estado_${p.estado}`]}</td>
                <td>{p.cuerpo_texto}</td>
                <td>
                  {p.estado === 'borrador' && (
                    <button onClick={() => marcarEnviadaMeta(p)} disabled={actualizandoId === p.id}>
                      {t.configuracion.whatsapp_plantillas_enviar_meta}
                    </button>
                  )}
                  <button onClick={() => borrar(p)} disabled={actualizandoId === p.id}>{t.comun.borrar}</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </EstadoLista>

      {creandoNueva && (
        <NuevaPlantillaWhatsapp onClose={() => setCreandoNueva(false)} onCreada={() => { setCreandoNueva(false); recargar(); }} />
      )}
    </div>
  );
}

function NuevaPlantillaWhatsapp({ onClose, onCreada }) {
  const { t } = useLocale();
  const [nombreInterno, setNombreInterno] = useState('');
  const [categoria, setCategoria] = useState('utility');
  const [cuerpoTexto, setCuerpoTexto] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState(null);

  async function handleGuardar() {
    setGuardando(true);
    setError(null);
    try {
      await llamarApi('/whatsapp/plantillas', {
        method: 'POST',
        body: JSON.stringify({ nombre_interno: nombreInterno, categoria, cuerpo_texto: cuerpoTexto }),
      });
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
        <h2>{t.configuracion.whatsapp_plantillas_nueva}</h2>
        {error && <Alert variant="error">{error}</Alert>}
        <FormField label={t.configuracion.whatsapp_plantillas_col_nombre} name="nombre_interno" value={nombreInterno} onChange={(e) => setNombreInterno(e.target.value)} required />
        <FormField label={t.configuracion.whatsapp_plantillas_col_categoria} name="categoria" type="select" value={categoria} onChange={(e) => setCategoria(e.target.value)}>
          {CATEGORIAS_PLANTILLA.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </FormField>
        <FormField label={t.configuracion.whatsapp_plantillas_col_cuerpo} name="cuerpo_texto" type="textarea" value={cuerpoTexto} onChange={(e) => setCuerpoTexto(e.target.value)} required />
        <div className="panel-modal-acciones">
          <Button variant="secondary" onClick={onClose} disabled={guardando}>{t.comun.cancelar}</Button>
          <Button onClick={handleGuardar} disabled={guardando || !nombreInterno || !cuerpoTexto}>
            {guardando ? t.comun.guardando : t.comun.guardar}
          </Button>
        </div>
      </div>
    </div>
  );
}

function TabWhatsappEscaladaCoordinador() {
  const { t } = useLocale();
  const [form, setForm] = useState(null);
  const [coordinadores, setCoordinadores] = useState([]);
  const [estado, setEstado] = useState('cargando');
  const [error, setError] = useState(null);
  const [guardando, setGuardando] = useState(false);
  const [guardado, setGuardado] = useState(false);

  const recargar = useCallback(async () => {
    setEstado('cargando');
    setError(null);
    try {
      const [{ escalada }, { data: usuariosData, error: errorUsuarios }] = await Promise.all([
        llamarApi('/escalada-coordinador'),
        supabase.from('usuarios').select('id, nombre').eq('rol', 'coordinador').order('nombre'),
      ]);
      if (errorUsuarios) throw errorUsuarios;
      setForm(escalada);
      setCoordinadores(usuariosData ?? []);
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
      await llamarApi('/escalada-coordinador', {
        method: 'PATCH',
        body: JSON.stringify({
          coordinador_backup_id: form.coordinador_backup_id || null,
          minutos_antes_backup: Number(form.minutos_antes_backup),
          umbrales_premura: form.umbrales_premura,
          fase_automatica_activa: form.fase_automatica_activa,
          minutos_antes_fase_automatica: Number(form.minutos_antes_fase_automatica),
        }),
      });
      setGuardado(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setGuardando(false);
    }
  }

  return (
    <div>
      <h2>{t.configuracion.whatsapp_escalada_titulo}</h2>
      <p className="panel-explicacion">{t.configuracion.whatsapp_escalada_explicacion}</p>
      <EstadoLista estado={estado} error={error} vacio={false} recargar={recargar}>
        {form && (
          <div>
            {error && <Alert variant="error">{error}</Alert>}
            {guardado && <Alert variant="info">{t.comun.guardar} ✓</Alert>}
            <FormField
              label={t.configuracion.whatsapp_escalada_backup}
              name="coordinador_backup_id"
              type="select"
              value={form.coordinador_backup_id || ''}
              onChange={(e) => set('coordinador_backup_id', e.target.value)}
            >
              <option value="">{t.configuracion.escalada_prioridad_vacio}</option>
              {coordinadores.map((c) => (
                <option key={c.id} value={c.id}>{c.nombre}</option>
              ))}
            </FormField>
            <FormField
              label={t.configuracion.whatsapp_escalada_minutos_backup}
              name="minutos_antes_backup"
              type="number"
              value={form.minutos_antes_backup ?? ''}
              onChange={(e) => set('minutos_antes_backup', e.target.value)}
            />
            <FormField
              label={t.configuracion.whatsapp_escalada_fase_automatica}
              name="fase_automatica_activa"
              type="checkbox"
              checked={form.fase_automatica_activa || false}
              onChange={(e) => set('fase_automatica_activa', e.target.checked)}
            />
            <FormField
              label={t.configuracion.whatsapp_escalada_minutos_fase_automatica}
              name="minutos_antes_fase_automatica"
              type="number"
              value={form.minutos_antes_fase_automatica ?? ''}
              onChange={(e) => set('minutos_antes_fase_automatica', e.target.value)}
            />
            <Button onClick={guardar} disabled={guardando}>{guardando ? t.comun.guardando : t.comun.guardar}</Button>
          </div>
        )}
      </EstadoLista>
    </div>
  );
}
