import { supabase } from '../db/connection.js';
import { enviarPushAsistente } from './push.js';

// Recorre los 3 eventos de push a Asistentes listados en
// docs/PRD_04_05_App_Servicio.md:115 ("Nueva guardia asignada, mensajes del coordinador,
// recordatorios"). Mismo patrón de "ya notificado" que revisarNotificacionesCoordinador.js:
// cada evento tiene su propia columna *_enviado_at, se manda una sola vez, y el cron corre
// cada pocos minutos recorriendo TODAS las prestadoras por igual.

const MINUTOS_ANTES_RECORDATORIO = 60;

export async function revisarRecordatoriosPush() {
  await revisarGuardiasAsignadas();
  await revisarMensajesCoordinador();
  await revisarRecordatoriosGuardiaProxima();
}

async function revisarGuardiasAsignadas() {
  const { data: guardias, error } = await supabase
    .from('guardias')
    .select('id, asistente_id, fecha, hora_inicio')
    .is('push_asignacion_enviado_at', null)
    .not('asistente_id', 'is', null);

  if (error) {
    console.error('Error consultando guardias para push de asignación:', error.message);
    return;
  }

  for (const guardia of guardias ?? []) {
    await enviarPushAsistente(guardia.asistente_id, {
      titulo: 'Nueva guardia asignada',
      cuerpo: `Tenés una guardia asignada el ${guardia.fecha} a las ${guardia.hora_inicio}.`,
      url: `/guardias/${guardia.id}`,
    });

    await supabase
      .from('guardias')
      .update({ push_asignacion_enviado_at: new Date().toISOString() })
      .eq('id', guardia.id);
  }
}

async function revisarMensajesCoordinador() {
  const { data: mensajes, error } = await supabase
    .from('mensajes_asistente')
    .select('id, asistente_id, mensaje')
    .is('push_enviado_at', null);

  if (error) {
    console.error('Error consultando mensajes_asistente para push:', error.message);
    return;
  }

  for (const mensaje of mensajes ?? []) {
    await enviarPushAsistente(mensaje.asistente_id, {
      titulo: 'Nuevo mensaje del coordinador',
      cuerpo: mensaje.mensaje,
      url: '/perfil',
    });

    await supabase
      .from('mensajes_asistente')
      .update({ push_enviado_at: new Date().toISOString() })
      .eq('id', mensaje.id);
  }
}

async function revisarRecordatoriosGuardiaProxima() {
  const ahora = new Date();
  const limite = new Date(ahora.getTime() + MINUTOS_ANTES_RECORDATORIO * 60_000);

  const { data: guardias, error } = await supabase
    .from('guardias')
    .select('id, asistente_id, fecha, hora_inicio')
    .is('push_recordatorio_enviado_at', null)
    .is('checkin_at', null)
    .eq('estado', 'programada')
    .not('asistente_id', 'is', null);

  if (error) {
    console.error('Error consultando guardias para recordatorio push:', error.message);
    return;
  }

  for (const guardia of guardias ?? []) {
    const inicio = new Date(`${guardia.fecha}T${guardia.hora_inicio}`);
    if (inicio.getTime() > limite.getTime() || inicio.getTime() < ahora.getTime()) continue;

    await enviarPushAsistente(guardia.asistente_id, {
      titulo: 'Recordatorio de guardia',
      cuerpo: `Tu guardia del ${guardia.fecha} empieza a las ${guardia.hora_inicio}.`,
      url: `/guardias/${guardia.id}`,
    });

    await supabase
      .from('guardias')
      .update({ push_recordatorio_enviado_at: new Date().toISOString() })
      .eq('id', guardia.id);
  }
}
