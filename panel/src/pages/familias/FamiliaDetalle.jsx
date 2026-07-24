import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useLocale } from '../../i18n/LocaleContext';
import { useAuth } from '../../context/AuthContext';
import { usePermisos } from '../../context/PermisosContext';
import { useConfirmarDestructivo } from '../../context/TenantSessionContext';
import { esAdminOSuperior } from '../../lib/roles';
import { linkWhatsapp } from '../../lib/telefono';
import { supabase } from '../../lib/supabaseClient';
import { Button } from '../../components/ui/Button';
import { FormField } from '../../components/ui/FormField';
import { Alert } from '../../components/ui/Alert';
import { PrestacionesPaciente } from './PrestacionesPaciente';
import { EditarPacienteModal } from './EditarPacienteModal';
import { NuevoPacienteModal } from './NuevoPacienteModal';
import { MonitoreoVitalesPaciente } from './MonitoreoVitalesPaciente';
import { InvitarCirculoModal } from './InvitarCirculoModal';

const API_URL = import.meta.env.VITE_API_URL;

export function FamiliaDetalle() {
  const { t } = useLocale();
  const { id } = useParams();
  const navigate = useNavigate();
  const { usuario } = useAuth();
  const { puede } = usePermisos();
  const confirmarDestructivo = useConfirmarDestructivo();
  const esAdmin = esAdminOSuperior(usuario?.rol);
  const puedeEditarFamilia = esAdmin || puede('editar_datos_familia');
  const puedeEditarPaciente = esAdmin || puede('editar_datos_paciente');
  const [familia, setFamilia] = useState(null);
  const [estado, setEstado] = useState('cargando');
  const [error, setError] = useState(null);
  const [pacienteSeleccionado, setPacienteSeleccionado] = useState(null);
  const [pacienteParaVitales, setPacienteParaVitales] = useState(null);
  const [pacienteAEditar, setPacienteAEditar] = useState(null);
  const [mostrarNuevoPaciente, setMostrarNuevoPaciente] = useState(false);
  const [formContacto, setFormContacto] = useState(null);
  const [guardandoContacto, setGuardandoContacto] = useState(false);
  const [errorContacto, setErrorContacto] = useState(null);
  const [contactoGuardado, setContactoGuardado] = useState(false);
  const [circulo, setCirculo] = useState(null);
  const [estadoCirculo, setEstadoCirculo] = useState('cargando');
  const [errorCirculo, setErrorCirculo] = useState(null);
  const [mostrarInvitarCirculo, setMostrarInvitarCirculo] = useState(false);
  const [quitandoUsuarioId, setQuitandoUsuarioId] = useState(null);
  const [reenviandoUsuarioId, setReenviandoUsuarioId] = useState(null);
  const [mensajeReenvio, setMensajeReenvio] = useState(null);

  const recargar = useCallback(async () => {
    setEstado('cargando');
    setError(null);
    const { data, error: errorConsulta } = await supabase
      .from('familias')
      .select('id, plan, solicitud_id, created_at, solicitudes!familias_solicitud_id_fkey(nombre, telefono, email, localidad), pacientes(*)')
      .eq('id', id)
      .single();

    if (errorConsulta) {
      setError(errorConsulta.code === 'PGRST116' ? null : errorConsulta.message);
      setEstado(errorConsulta.code === 'PGRST116' ? 'no_encontrado' : 'error');
      return;
    }

    setFamilia(data);
    setFormContacto({
      nombre: data.solicitudes?.nombre || '',
      telefono: data.solicitudes?.telefono || '',
      email: data.solicitudes?.email || '',
      localidad: data.solicitudes?.localidad || '',
      plan: data.plan || '',
    });
    setEstado('listo');
  }, [id]);

  const recargarCirculo = useCallback(async () => {
    setEstadoCirculo('cargando');
    setErrorCirculo(null);
    try {
      const { data } = await supabase.auth.getSession();
      const respuesta = await fetch(`${API_URL}/api/panel/cuentas/familia/${id}/circulo`, {
        headers: { Authorization: `Bearer ${data.session?.access_token}` },
      });
      const resultado = await respuesta.json();
      if (!respuesta.ok) {
        throw new Error(resultado.error);
      }
      setCirculo(resultado.miembros);
      setEstadoCirculo(resultado.miembros.length ? 'listo' : 'vacio');
    } catch {
      setErrorCirculo(t.comun.error_generico);
      setEstadoCirculo('error');
    }
  }, [id, t]);

  useEffect(() => {
    recargar();
    recargarCirculo();
  }, [recargar, recargarCirculo]);

  async function quitarMiembroCirculo(usuarioId) {
    if (!confirmarDestructivo(t.familias.circulo.quitar_confirmacion)) {
      return;
    }
    setQuitandoUsuarioId(usuarioId);
    try {
      const { data } = await supabase.auth.getSession();
      const respuesta = await fetch(`${API_URL}/api/panel/cuentas/familia/${id}/circulo/${usuarioId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${data.session?.access_token}` },
      });
      const resultado = await respuesta.json();
      if (!respuesta.ok) {
        throw new Error(resultado.error || t.familias.circulo.quitar_error);
      }
      recargarCirculo();
    } catch (err) {
      setErrorCirculo(err.message);
    } finally {
      setQuitandoUsuarioId(null);
    }
  }

  async function reenviarInvitacion(usuarioId) {
    setReenviandoUsuarioId(usuarioId);
    setMensajeReenvio(null);
    try {
      const { data } = await supabase.auth.getSession();
      const respuesta = await fetch(`${API_URL}/api/panel/cuentas/${usuarioId}/reenviar-activacion`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${data.session?.access_token}` },
      });
      const resultado = await respuesta.json();
      if (!respuesta.ok) {
        throw new Error(resultado.error);
      }
      setMensajeReenvio({ tipo: 'info', texto: t.comun.invitacion_reenviada });
    } catch {
      setMensajeReenvio({ tipo: 'error', texto: t.comun.reenviar_invitacion_error });
    } finally {
      setReenviandoUsuarioId(null);
    }
  }

  function setCampoContacto(campo, valor) {
    setFormContacto((f) => ({ ...f, [campo]: valor }));
    setContactoGuardado(false);
  }

  async function guardarContacto() {
    setGuardandoContacto(true);
    setErrorContacto(null);
    const { nombre, telefono, email, localidad, plan } = formContacto;
    const [{ error: errorSolicitud }, { error: errorFamilia }] = await Promise.all([
      familia.solicitud_id
        ? supabase.from('solicitudes').update({ nombre, telefono, email, localidad }).eq('id', familia.solicitud_id)
        : Promise.resolve({ error: null }),
      supabase.from('familias').update({ plan }).eq('id', familia.id),
    ]);
    setGuardandoContacto(false);
    if (errorSolicitud || errorFamilia) {
      setErrorContacto(t.comun.error_generico);
      return;
    }
    setContactoGuardado(true);
    recargar();
  }

  if (estado === 'cargando') return <p className="estado-cargando">{t.comun.cargando}</p>;
  if (estado === 'no_encontrado') return <p className="estado-vacio">{t.comun.no_encontrado}</p>;
  if (estado === 'error') return <p className="estado-vacio">{error || t.comun.error_generico}</p>;

  return (
    <div>
      <button className="link-volver" onClick={() => navigate('/familias')}><span aria-hidden="true">←</span> {t.familias.volver_a_familias}</button>
      <h1>{familia.solicitudes?.nombre || '—'}</h1>

      <h2>{t.familias.contacto}</h2>
      {errorContacto && <Alert variant="error">{errorContacto}</Alert>}
      {contactoGuardado && <Alert variant="info">{t.comun.guardar} <span aria-hidden="true">✓</span></Alert>}
      {mensajeReenvio && <Alert variant={mensajeReenvio.tipo}>{mensajeReenvio.texto}</Alert>}
      {formContacto && (
        <>
          <FormField label={t.familias.col_nombre} name="nombre_contacto" value={formContacto.nombre} onChange={(e) => setCampoContacto('nombre', e.target.value)} disabled={!puedeEditarFamilia} />
          <FormField label={t.familias.col_telefono} name="telefono_contacto" value={formContacto.telefono} onChange={(e) => setCampoContacto('telefono', e.target.value)} disabled={!puedeEditarFamilia} />
          {formContacto.telefono && (
            <p className="panel-explicacion">
              <a href={linkWhatsapp(formContacto.telefono)} target="_blank" rel="noreferrer">{t.familias.abrir_whatsapp}</a>
            </p>
          )}
          <FormField label={t.familias.col_email} name="email_contacto" type="email" value={formContacto.email} onChange={(e) => setCampoContacto('email', e.target.value)} disabled={!puedeEditarFamilia} />
          <FormField label={t.familias.col_localidad} name="localidad_contacto" value={formContacto.localidad} onChange={(e) => setCampoContacto('localidad', e.target.value)} disabled={!puedeEditarFamilia} />
          <FormField label={t.familias.plan} name="plan_contacto" value={formContacto.plan} onChange={(e) => setCampoContacto('plan', e.target.value)} disabled={!puedeEditarFamilia} />
          <dl className="panel-detalle-lista">
            <dt>{t.familias.col_fecha_alta}</dt>
            <dd>{new Date(familia.created_at).toLocaleDateString()}</dd>
          </dl>
          <Button onClick={guardarContacto} disabled={guardandoContacto || !puedeEditarFamilia}>
            {guardandoContacto ? t.comun.guardando : t.comun.guardar}
          </Button>{' '}
          {puedeEditarFamilia && (
            <Button variant="secondary" onClick={() => reenviarInvitacion(familia.id)} disabled={reenviandoUsuarioId === familia.id}>
              {reenviandoUsuarioId === familia.id ? t.comun.reenviando_invitacion : t.comun.reenviar_invitacion}
            </Button>
          )}
        </>
      )}

      <h2>{t.familias.pacientes}</h2>
      {familia.pacientes?.length ? (
        <table className="panel-tabla">
          <thead>
            <tr>
              <th>{t.familias.col_nombre}</th>
              <th>{t.familias.fecha_nacimiento}</th>
              <th>{t.familias.nivel_complejidad}</th>
              <th>{t.familias.domicilio}</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {familia.pacientes.map((p) => (
              <tr key={p.id}>
                <td>{p.nombre}</td>
                <td>{p.fecha_nacimiento || '—'}</td>
                <td>{p.nivel_complejidad || '—'}</td>
                <td>{p.domicilio || '—'}</td>
                <td>
                  {puedeEditarPaciente && (
                    <>
                      <Button variant="secondary" onClick={() => setPacienteAEditar(p)}>
                        {t.comun.editar}
                      </Button>{' '}
                    </>
                  )}
                  <Button variant="secondary" onClick={() => setPacienteSeleccionado(p)}>
                    {t.prestaciones.titulo}
                  </Button>{' '}
                  <Button variant="secondary" onClick={() => setPacienteParaVitales(p)}>
                    {t.vitales_autorizacion.titulo}
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <p className="estado-vacio">{t.familias.sin_pacientes}</p>
      )}
      {puedeEditarPaciente && (
        <Button variant="secondary" onClick={() => setMostrarNuevoPaciente(true)}>
          {t.familias.agregar_paciente}
        </Button>
      )}

      <h2>{t.familias.circulo.titulo}</h2>
      <p className="panel-explicacion">{t.familias.circulo.descripcion}</p>
      {estadoCirculo === 'cargando' && <p className="estado-cargando">{t.comun.cargando}</p>}
      {estadoCirculo === 'error' && <p className="estado-vacio">{errorCirculo || t.comun.error_generico}</p>}
      {estadoCirculo === 'vacio' && <p className="estado-vacio">{t.familias.circulo.sin_miembros}</p>}
      {estadoCirculo === 'listo' && (
        <table className="panel-tabla">
          <thead>
            <tr>
              <th>{t.familias.circulo.col_nombre}</th>
              <th>{t.familias.circulo.col_email}</th>
              <th>{t.familias.circulo.col_rol}</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {circulo.map((m) => (
              <tr key={m.usuario_id}>
                <td>{m.usuarios?.nombre || '—'}</td>
                <td>{m.email || '—'}</td>
                <td>{t.familias.circulo.rol_solo_lectura}</td>
                <td>
                  {puedeEditarFamilia && (
                    <>
                      <Button
                        variant="secondary"
                        onClick={() => reenviarInvitacion(m.usuario_id)}
                        disabled={reenviandoUsuarioId === m.usuario_id}
                      >
                        {reenviandoUsuarioId === m.usuario_id ? t.comun.reenviando_invitacion : t.comun.reenviar_invitacion}
                      </Button>{' '}
                      <Button
                        variant="secondary"
                        onClick={() => quitarMiembroCirculo(m.usuario_id)}
                        disabled={quitandoUsuarioId === m.usuario_id}
                      >
                        {t.familias.circulo.quitar}
                      </Button>
                    </>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {errorCirculo && estadoCirculo === 'listo' && <Alert variant="error">{errorCirculo}</Alert>}
      {puedeEditarFamilia && (
        <Button variant="secondary" onClick={() => setMostrarInvitarCirculo(true)}>
          {t.familias.circulo.agregar}
        </Button>
      )}

      <h2>{t.familias.guardias_activas}</h2>
      <p className="estado-vacio">{t.familias.modulo_no_disponible}</p>

      <h2>{t.familias.historial_reportes}</h2>
      <p className="estado-vacio">{t.familias.modulo_no_disponible}</p>

      <h2>{t.familias.alertas_activas}</h2>
      <p className="estado-vacio">{t.familias.modulo_no_disponible}</p>

      {pacienteSeleccionado && (
        <PrestacionesPaciente paciente={pacienteSeleccionado} onClose={() => setPacienteSeleccionado(null)} />
      )}

      {pacienteParaVitales && (
        <MonitoreoVitalesPaciente paciente={pacienteParaVitales} onClose={() => setPacienteParaVitales(null)} />
      )}

      {pacienteAEditar && (
        <EditarPacienteModal
          paciente={pacienteAEditar}
          onClose={() => setPacienteAEditar(null)}
          onGuardado={() => {
            setPacienteAEditar(null);
            recargar();
          }}
        />
      )}

      {mostrarNuevoPaciente && (
        <NuevoPacienteModal
          familiaId={familia.id}
          onClose={() => setMostrarNuevoPaciente(false)}
          onCreado={() => {
            setMostrarNuevoPaciente(false);
            recargar();
          }}
        />
      )}

      {mostrarInvitarCirculo && (
        <InvitarCirculoModal
          familiaId={familia.id}
          onClose={() => setMostrarInvitarCirculo(false)}
          onInvitado={() => {
            setMostrarInvitarCirculo(false);
            recargarCirculo();
          }}
        />
      )}
    </div>
  );
}
