import { useCallback, useEffect, useState } from 'react';
import { useLocale } from '../i18n/LocaleContext';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabaseClient';
import { EstadoLista } from '../components/layout/EstadoLista';
import { Button } from '../components/ui/Button';
import { FormField } from '../components/ui/FormField';
import { Alert } from '../components/ui/Alert';

const TIPOS_RESOLUCION = ['suplente', 'franquero', 'emergencia', 'familiar'];

export function Continuidad() {
  const { t } = useLocale();
  const { usuario } = useAuth();
  const [incidentes, setIncidentes] = useState([]);
  const [alertas, setAlertas] = useState([]);
  const [notificacionesCierre, setNotificacionesCierre] = useState([]);
  const [estado, setEstado] = useState('cargando');
  const [error, setError] = useState(null);
  const [incidenteResolviendo, setIncidenteResolviendo] = useState(null);
  const [actualizandoId, setActualizandoId] = useState(null);
  const [asistentesDisponibles, setAsistentesDisponibles] = useState([]);

  const recargar = useCallback(async () => {
    setEstado('cargando');
    setError(null);
    try {
      const [
        { data: incidentesData, error: errorIncidentes },
        { data: alertasData, error: errorAlertas },
        { data: notificacionesData, error: errorNotificaciones },
      ] = await Promise.all([
        supabase.from('incidentes_relevo').select('*').is('resuelto_at', null).order('iniciado_at', { ascending: true }),
        supabase.from('alertas_tempranas_guardia').select('*').is('resuelto_at', null).order('detectado_at', { ascending: true }),
        supabase.from('notificaciones_cierre_servicio').select('*').is('visto_at', null).order('created_at', { ascending: true }),
      ]);
      if (errorIncidentes) throw errorIncidentes;
      if (errorAlertas) throw errorAlertas;
      if (errorNotificaciones) throw errorNotificaciones;

      const idsGuardias = Array.from(
        new Set([
          ...(incidentesData ?? []).flatMap((i) => [i.guardia_entrante_id, i.guardia_saliente_id].filter(Boolean)),
          ...(alertasData ?? []).map((a) => a.guardia_id),
        ]),
      );

      const [{ data: guardiasData }, { data: nivelesData }] = await Promise.all([
        idsGuardias.length
          ? supabase.from('guardias').select('id, paciente_id, asistente_id, fecha, hora_inicio, hora_fin').in('id', idsGuardias)
          : Promise.resolve({ data: [] }),
        supabase.from('configuracion_escalada_relevo').select('*').order('nivel'),
      ]);

      const idsPacientesGuardias = Array.from(new Set((guardiasData ?? []).map((g) => g.paciente_id)));
      const idsPacientesNotificaciones = (notificacionesData ?? []).map((n) => n.paciente_id);
      const idsPacientes = Array.from(new Set([...idsPacientesGuardias, ...idsPacientesNotificaciones]));
      const idsCoordinadores = Array.from(new Set((notificacionesData ?? []).map((n) => n.cerrado_por)));

      const [{ data: pacientesData }, { data: asistentesData }, { data: coordinadoresData }] = await Promise.all([
        idsPacientes.length ? supabase.from('pacientes').select('id, nombre').in('id', idsPacientes) : Promise.resolve({ data: [] }),
        supabase.from('asistentes').select('id, nombre').order('nombre'),
        idsCoordinadores.length ? supabase.from('usuarios').select('id, nombre').in('id', idsCoordinadores) : Promise.resolve({ data: [] }),
      ]);

      const guardiasPorId = Object.fromEntries((guardiasData ?? []).map((g) => [g.id, g]));
      const pacientesPorId = Object.fromEntries((pacientesData ?? []).map((p) => [p.id, p.nombre]));
      const asistentesPorId = Object.fromEntries((asistentesData ?? []).map((a) => [a.id, a.nombre]));
      const coordinadoresPorId = Object.fromEntries((coordinadoresData ?? []).map((c) => [c.id, c.nombre]));
      const nivelesPorNumero = Object.fromEntries((nivelesData ?? []).map((n) => [n.nivel, n]));

      const filasNotificaciones = (notificacionesData ?? []).map((n) => ({
        ...n,
        paciente_nombre: pacientesPorId[n.paciente_id] || '—',
        asistente_nombre: asistentesPorId[n.asistente_id] || '—',
        cerrado_por_nombre: coordinadoresPorId[n.cerrado_por] || '—',
      }));

      const filas = (incidentesData ?? []).map((i) => {
        const gEntrante = guardiasPorId[i.guardia_entrante_id];
        const gSaliente = i.guardia_saliente_id ? guardiasPorId[i.guardia_saliente_id] : null;
        return {
          ...i,
          paciente_nombre: gEntrante ? pacientesPorId[gEntrante.paciente_id] || '—' : '—',
          asistente_ausente_nombre: gEntrante ? asistentesPorId[gEntrante.asistente_id] || '—' : '—',
          asistente_saliente_nombre: gSaliente ? asistentesPorId[gSaliente.asistente_id] || '—' : null,
          fecha: gEntrante?.fecha,
          horario: gEntrante ? `${gEntrante.hora_inicio} – ${gEntrante.hora_fin}` : '—',
          nivel_config: nivelesPorNumero[i.nivel_actual],
          hay_nivel_siguiente: Boolean(nivelesPorNumero[i.nivel_actual + 1]),
        };
      });

      const filasAlertas = (alertasData ?? []).map((a) => {
        const g = guardiasPorId[a.guardia_id];
        return {
          ...a,
          paciente_nombre: g ? pacientesPorId[g.paciente_id] || '—' : '—',
          asistente_nombre: g ? asistentesPorId[g.asistente_id] || '—' : '—',
          fecha: g?.fecha,
          horario: g ? `${g.hora_inicio} – ${g.hora_fin}` : '—',
        };
      });

      setIncidentes(filas);
      setAlertas(filasAlertas);
      setNotificacionesCierre(filasNotificaciones);
      setAsistentesDisponibles(asistentesData ?? []);
      setEstado('listo');
    } catch (err) {
      setError(err.message);
      setEstado('error');
    }
  }, []);

  async function resolverAlerta(alerta) {
    if (!window.confirm(t.continuidad.confirmar_resolver_alerta)) return;
    setActualizandoId(alerta.id);
    try {
      const { error: errorUpdate } = await supabase
        .from('alertas_tempranas_guardia')
        .update({ resuelto_at: new Date().toISOString() })
        .eq('id', alerta.id);
      if (errorUpdate) throw errorUpdate;
      recargar();
    } catch (err) {
      setError(err.message);
    } finally {
      setActualizandoId(null);
    }
  }

  useEffect(() => {
    recargar();
  }, [recargar]);

  async function marcarVistaNotificacion(notificacion) {
    setActualizandoId(notificacion.id);
    try {
      const { error: errorUpdate } = await supabase
        .from('notificaciones_cierre_servicio')
        .update({ visto_at: new Date().toISOString(), visto_por: usuario.id })
        .eq('id', notificacion.id);
      if (errorUpdate) throw errorUpdate;
      recargar();
    } catch (err) {
      setError(err.message);
    } finally {
      setActualizandoId(null);
    }
  }

  async function avanzarNivel(incidente) {
    setActualizandoId(incidente.id);
    try {
      const { error: errorUpdate } = await supabase
        .from('incidentes_relevo')
        .update({ nivel_actual: incidente.nivel_actual + 1 })
        .eq('id', incidente.id);
      if (errorUpdate) throw errorUpdate;
      recargar();
    } catch (err) {
      setError(err.message);
    } finally {
      setActualizandoId(null);
    }
  }

  return (
    <div>
      <h1>{t.continuidad.titulo}</h1>
      <p className="panel-explicacion">{t.continuidad.explicacion}</p>

      {estado === 'listo' && error && <Alert variant="error">{error}</Alert>}

      <EstadoLista
        estado={estado}
        error={error}
        vacio={estado === 'listo' && incidentes.length === 0}
        recargar={recargar}
        mensajeVacio={t.continuidad.vacio}
      >
        {incidentes.map((i) => (
          <div key={i.id} className="panel-guardia-card guardia-ausente">
            <div>
              <strong>{i.fecha} · {i.horario}</strong> · {t.continuidad.col_paciente}: {i.paciente_nombre}
              <div>{t.continuidad.col_ausente}: {i.asistente_ausente_nombre}</div>
              {i.asistente_saliente_nombre ? (
                <div>{t.continuidad.col_saliente}: {i.asistente_saliente_nombre}</div>
              ) : (
                <div className="panel-guardia-alerta">{t.continuidad.badge_sin_relevo_previo}</div>
              )}
              <div>{t.continuidad.col_nivel}: {i.nivel_actual}</div>
              {i.nivel_config ? (
                <div className="panel-resultado-calculo">
                  <div>{t.continuidad.orden_prioridad}: {(i.nivel_config.orden_prioridad || []).map((r) => t.configuracion[`escalada_rol_${r}`]).join(' → ') || '—'}</div>
                  <div>{t.continuidad.mensaje_sugerido}:</div>
                  <p>{i.nivel_config.plantilla_mensaje}</p>
                </div>
              ) : (
                <div className="panel-guardia-alerta">{t.continuidad.sin_configuracion_nivel}</div>
              )}
            </div>
            <div className="panel-modal-acciones">
              {i.hay_nivel_siguiente && (
                <Button variant="secondary" onClick={() => avanzarNivel(i)} disabled={actualizandoId === i.id}>
                  {t.continuidad.avanzar_nivel}
                </Button>
              )}
              <Button onClick={() => setIncidenteResolviendo(i)} disabled={actualizandoId === i.id}>
                {t.continuidad.resolver}
              </Button>
            </div>
          </div>
        ))}
      </EstadoLista>

      <h2>{t.continuidad.alertas_tempranas_titulo}</h2>
      <p className="panel-explicacion">{t.continuidad.alertas_tempranas_explicacion}</p>

      <EstadoLista
        estado={estado}
        error={null}
        vacio={estado === 'listo' && alertas.length === 0}
        recargar={recargar}
        mensajeVacio={t.continuidad.alertas_tempranas_vacio}
      >
        {alertas.map((a) => (
          <div key={a.id} className="panel-guardia-card guardia-ausente">
            <div>
              <strong>{a.fecha} · {a.horario}</strong> · {t.continuidad.col_paciente}: {a.paciente_nombre}
              <div>{t.continuidad.col_ausente}: {a.asistente_nombre}</div>
              <div>{t.continuidad.fuente_aviso_telefonico}</div>
              {a.motivo && <div>{t.continuidad.col_motivo}: {t.guardias.detalle[`aviso_previo_motivo_${a.motivo}`] || a.motivo}</div>}
            </div>
            <div className="panel-modal-acciones">
              <Button onClick={() => resolverAlerta(a)} disabled={actualizandoId === a.id}>
                {t.continuidad.resolver_alerta}
              </Button>
            </div>
          </div>
        ))}
      </EstadoLista>

      <h2>{t.continuidad.notificaciones_cierre_titulo}</h2>
      <p className="panel-explicacion">{t.continuidad.notificaciones_cierre_explicacion}</p>

      <EstadoLista
        estado={estado}
        error={null}
        vacio={estado === 'listo' && notificacionesCierre.length === 0}
        recargar={recargar}
        mensajeVacio={t.continuidad.notificaciones_cierre_vacio}
      >
        {notificacionesCierre.map((n) => (
          <div key={n.id} className="panel-guardia-card guardia-ausente">
            <div>
              <strong>{t.continuidad.col_paciente}: {n.paciente_nombre}</strong>
              <div>{t.continuidad.col_ausente}: {n.asistente_nombre}</div>
              <div>{t.continuidad.notificaciones_cierre_cerrado_por}: {n.cerrado_por_nombre}</div>
              <div>{t.continuidad.col_motivo}: {t.prestaciones[`cierre_servicio_motivo_${n.motivo}`] || n.motivo}</div>
              {n.motivo_detalle && <div>{n.motivo_detalle}</div>}
            </div>
            <div className="panel-modal-acciones">
              <Button onClick={() => marcarVistaNotificacion(n)} disabled={actualizandoId === n.id}>
                {t.continuidad.notificaciones_cierre_marcar_visto}
              </Button>
            </div>
          </div>
        ))}
      </EstadoLista>

      {incidenteResolviendo && (
        <ResolverIncidente
          incidente={incidenteResolviendo}
          asistentes={asistentesDisponibles}
          usuario={usuario}
          onClose={() => setIncidenteResolviendo(null)}
          onResuelto={() => { setIncidenteResolviendo(null); recargar(); }}
        />
      )}
    </div>
  );
}

function ResolverIncidente({ incidente, asistentes, usuario, onClose, onResuelto }) {
  const { t } = useLocale();
  const [tipo, setTipo] = useState('suplente');
  const [asistenteId, setAsistenteId] = useState('');
  const [familiarNombre, setFamiliarNombre] = useState('');
  const [motivo, setMotivo] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState(null);

  const esFamiliar = tipo === 'familiar';

  async function handleResolver() {
    if (!window.confirm(t.continuidad.confirmar_resolver)) return;
    setGuardando(true);
    setError(null);
    try {
      const ahora = new Date().toISOString();

      if (esFamiliar) {
        const { error: errorExcepcion } = await supabase.from('excepciones_familiar_relevo').insert({
          prestadora_id: usuario.prestadora_id,
          incidente_id: incidente.id,
          familiar_nombre: familiarNombre,
          autorizado_por: usuario.id,
          motivo,
          desde_at: ahora,
        });
        if (errorExcepcion) throw errorExcepcion;
      }

      const { error: errorIncidente } = await supabase
        .from('incidentes_relevo')
        .update({
          resuelto_at: ahora,
          resuelto_por_tipo: tipo,
          resuelto_por_id: esFamiliar ? null : asistenteId,
        })
        .eq('id', incidente.id);
      if (errorIncidente) throw errorIncidente;

      onResuelto();
    } catch (err) {
      setError(err.message);
    } finally {
      setGuardando(false);
    }
  }

  const puedeGuardar = esFamiliar ? familiarNombre && motivo : Boolean(asistenteId);

  return (
    <div className="panel-modal-fondo" onClick={onClose}>
      <div className="panel-modal" onClick={(e) => e.stopPropagation()}>
        <h2>{t.continuidad.resolver}</h2>
        {error && <Alert variant="error">{error}</Alert>}

        <FormField label={t.continuidad.resolver_tipo} name="tipo" type="select" value={tipo} onChange={(e) => setTipo(e.target.value)}>
          {TIPOS_RESOLUCION.map((opcion) => (
            <option key={opcion} value={opcion}>{t.configuracion[`escalada_rol_${opcion}`]}</option>
          ))}
        </FormField>

        {esFamiliar ? (
          <>
            <FormField label={t.continuidad.resolver_familiar_nombre} name="familiar_nombre" value={familiarNombre} onChange={(e) => setFamiliarNombre(e.target.value)} required />
            <FormField label={t.continuidad.resolver_familiar_motivo} name="motivo" type="textarea" value={motivo} onChange={(e) => setMotivo(e.target.value)} required />
          </>
        ) : (
          <FormField label={t.continuidad.resolver_asistente} name="asistente_id" type="select" value={asistenteId} onChange={(e) => setAsistenteId(e.target.value)} required>
            <option value="">{t.configuracion.escalada_prioridad_vacio}</option>
            {asistentes.map((a) => (
              <option key={a.id} value={a.id}>{a.nombre}</option>
            ))}
          </FormField>
        )}

        <div className="panel-modal-acciones">
          <Button variant="secondary" onClick={onClose} disabled={guardando}>{t.comun.cancelar}</Button>
          <Button onClick={handleResolver} disabled={guardando || !puedeGuardar}>
            {guardando ? t.comun.guardando : t.comun.guardar}
          </Button>
        </div>
      </div>
    </div>
  );
}
