import { supabase } from '../db/connection.js';
import { notificarCoordinador } from './whatsapp.js';

// Punto 5 de docs/PRD_06_WhatsApp_IA.md: insistencia al Coordinador según premura, con
// coordinador de respaldo si no hay reacción, parametrizado por prestadora
// (configuracion_escalada_coordinador). Corre cada pocos minutos, mismo patrón que
// ausenciaAutomatica.js — recorre TODAS las prestadoras licenciatarias por igual.
//
// "Premura" = minutos transcurridos desde que se detectó la alerta/incidente. Cada
// prestadora define sus propios tramos en umbrales_premura (más urgente = intervalo de
// insistencia más corto). Mientras no pase ultima_notificacion_at + intervalo_actual, el
// cron no vuelve a avisar — evita mandar el mismo aviso en cada corrida de 5 minutos.
export async function revisarNotificacionesCoordinador() {
  const { data: configuraciones, error } = await supabase
    .from('configuracion_escalada_coordinador')
    .select('*');

  if (error) {
    console.error('Error consultando configuracion_escalada_coordinador:', error.message);
    return;
  }
  if (!configuraciones?.length) return;

  const ahora = new Date();

  for (const config of configuraciones) {
    await revisarAlertas(config, ahora);
    await revisarIncidentes(config, ahora);
  }
}

function intervaloParaPremura(umbrales, minutosPremura) {
  const tramos = Array.isArray(umbrales) ? umbrales : [];
  for (const tramo of tramos) {
    if (tramo.maximo_minutos === null || minutosPremura <= tramo.maximo_minutos) {
      return tramo.intervalo_minutos;
    }
  }
  return 60;
}

function necesitaNotificar({ ultimaNotificacionAt, intervaloMinutos, ahora }) {
  if (!ultimaNotificacionAt) return true;
  const proxima = new Date(ultimaNotificacionAt).getTime() + intervaloMinutos * 60_000;
  return ahora.getTime() >= proxima;
}

async function revisarAlertas(config, ahora) {
  const { prestadora_id: prestadoraId, umbrales_premura: umbrales, minutos_antes_backup: minutosAntesBackup, coordinador_backup_id: backupId } = config;

  const { data: alertas, error } = await supabase
    .from('alertas_tempranas_guardia')
    .select('id, guardia_id, motivo, detectado_at, ultima_notificacion_at, veces_notificado, backup_notificado_at')
    .eq('prestadora_id', prestadoraId)
    .is('resuelto_at', null);

  if (error) {
    console.error(`Error consultando alertas_tempranas_guardia (prestadora ${prestadoraId}):`, error.message);
    return;
  }

  for (const alerta of alertas ?? []) {
    const minutosPremura = (ahora.getTime() - new Date(alerta.detectado_at).getTime()) / 60_000;
    const intervalo = intervaloParaPremura(umbrales, minutosPremura);

    if (necesitaNotificar({ ultimaNotificacionAt: alerta.ultima_notificacion_at, intervaloMinutos: intervalo, ahora })) {
      await notificarCoordinador({
        evento: 'alerta_temprana_guardia',
        prestadoraId,
        asunto: 'Alerta temprana de posible ausencia sin resolver',
        texto: `Guardia ${alerta.guardia_id}, motivo: ${alerta.motivo ?? '—'}. Sin resolver hace ${Math.round(minutosPremura)} minutos.`,
      });

      await supabase
        .from('alertas_tempranas_guardia')
        .update({ ultima_notificacion_at: ahora.toISOString(), veces_notificado: (alerta.veces_notificado ?? 0) + 1 })
        .eq('id', alerta.id);
    }

    if (backupId && !alerta.backup_notificado_at && minutosPremura >= minutosAntesBackup) {
      await notificarCoordinadorBackup({ backupId, prestadoraId, texto: `Alerta temprana de guardia ${alerta.guardia_id} sigue sin resolver hace ${Math.round(minutosPremura)} minutos.` });
      await supabase.from('alertas_tempranas_guardia').update({ backup_notificado_at: ahora.toISOString() }).eq('id', alerta.id);
    }
  }
}

async function revisarIncidentes(config, ahora) {
  const {
    prestadora_id: prestadoraId,
    umbrales_premura: umbrales,
    minutos_antes_backup: minutosAntesBackup,
    coordinador_backup_id: backupId,
    fase_automatica_activa: faseAutomaticaActiva,
    minutos_antes_fase_automatica: minutosAntesFaseAutomatica,
  } = config;

  const { data: incidentes, error } = await supabase
    .from('incidentes_relevo')
    .select('id, guardia_entrante_id, nivel_actual, iniciado_at, ultima_notificacion_at, veces_notificado, backup_notificado_at, fase_automatica_notificada_at')
    .eq('prestadora_id', prestadoraId)
    .is('resuelto_at', null);

  if (error) {
    console.error(`Error consultando incidentes_relevo (prestadora ${prestadoraId}):`, error.message);
    return;
  }

  for (const incidente of incidentes ?? []) {
    const minutosPremura = (ahora.getTime() - new Date(incidente.iniciado_at).getTime()) / 60_000;
    const intervalo = intervaloParaPremura(umbrales, minutosPremura);

    if (necesitaNotificar({ ultimaNotificacionAt: incidente.ultima_notificacion_at, intervaloMinutos: intervalo, ahora })) {
      await notificarCoordinador({
        evento: 'incidente_relevo_sin_resolver',
        prestadoraId,
        asunto: 'Incidente de continuidad de guardia sin resolver',
        texto: `Guardia ${incidente.guardia_entrante_id}, nivel de escalada actual: ${incidente.nivel_actual}. Sin resolver hace ${Math.round(minutosPremura)} minutos.`,
      });

      await supabase
        .from('incidentes_relevo')
        .update({ ultima_notificacion_at: ahora.toISOString(), veces_notificado: (incidente.veces_notificado ?? 0) + 1 })
        .eq('id', incidente.id);
    }

    if (backupId && !incidente.backup_notificado_at && minutosPremura >= minutosAntesBackup) {
      await notificarCoordinadorBackup({ backupId, prestadoraId, texto: `Incidente de relevo de guardia ${incidente.guardia_entrante_id} sigue sin resolver hace ${Math.round(minutosPremura)} minutos.` });
      await supabase.from('incidentes_relevo').update({ backup_notificado_at: ahora.toISOString() }).eq('id', incidente.id);
    }

    if (
      faseAutomaticaActiva
      && !incidente.fase_automatica_notificada_at
      && minutosPremura >= minutosAntesFaseAutomatica
    ) {
      // El envío automático del mensaje de escalada a los Asistentes (orden_prioridad de
      // configuracion_escalada_relevo) requiere plantilla de WhatsApp aprobada por Meta —
      // se completa en el test final con una prestadora real. Por ahora se avisa al
      // Coordinador de que la fase automática debería haber arrancado, sin dejarlo pasar
      // en silencio.
      await notificarCoordinador({
        evento: 'incidente_relevo_sin_resolver',
        prestadoraId,
        asunto: 'Fase automática de escalada alcanzada (envío automático pendiente de plantilla Meta)',
        texto: `Guardia ${incidente.guardia_entrante_id} superó el umbral de fase automática (${minutosAntesFaseAutomatica} minutos) sin resolverse. El envío automático a Asistentes todavía no está activo — requiere acción manual.`,
      });
      await supabase.from('incidentes_relevo').update({ fase_automatica_notificada_at: ahora.toISOString() }).eq('id', incidente.id);
    }
  }
}

async function notificarCoordinadorBackup({ backupId, prestadoraId, texto }) {
  const { data: usuario } = await supabase
    .from('usuarios')
    .select('telefono, email')
    .eq('id', backupId)
    .single();

  if (!usuario) return;

  await notificarCoordinador({
    evento: 'incidente_relevo_sin_resolver',
    prestadoraId,
    asunto: 'Escalada a Coordinador de respaldo',
    texto,
    telefono: usuario.telefono,
  });
}
