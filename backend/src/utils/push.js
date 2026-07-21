import webpush from 'web-push';
import { supabase } from '../db/connection.js';

let configurado = false;

function asegurarConfiguracion() {
  if (configurado) return true;
  const publicKey = process.env.VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  if (!publicKey || !privateKey) return false;
  webpush.setVapidDetails('mailto:soporte@aurevia.app', publicKey, privateKey);
  configurado = true;
  return true;
}

// Envía un push a todas las suscripciones activas de una audiencia (Asistente o Familia,
// nunca ambas — ver CHECK push_subscriptions_una_audiencia en schema_pwa_familias_01.sql).
// Si una suscripción devuelve 404/410 (dispositivo desinstaló la app o revocó el permiso),
// se borra en el momento — mismo criterio que el resto del proyecto de no dejar basura de
// estado que ya no es válido.
async function enviarPush(columna, id, { titulo, cuerpo, url }) {
  if (!asegurarConfiguracion()) {
    console.error('Push no configurado: falta VAPID_PUBLIC_KEY/VAPID_PRIVATE_KEY');
    return;
  }

  const { data: suscripciones, error } = await supabase
    .from('push_subscriptions')
    .select('id, endpoint, p256dh, auth')
    .eq(columna, id);

  if (error || !suscripciones?.length) return;

  const payload = JSON.stringify({ titulo, cuerpo, url: url || '/' });

  await Promise.all(
    suscripciones.map(async (suscripcion) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: suscripcion.endpoint,
            keys: { p256dh: suscripcion.p256dh, auth: suscripcion.auth },
          },
          payload,
        );
      } catch (err) {
        if (err.statusCode === 404 || err.statusCode === 410) {
          await supabase.from('push_subscriptions').delete().eq('id', suscripcion.id);
        } else {
          console.error(`Error enviando push a suscripción ${suscripcion.id}:`, err.message);
        }
      }
    }),
  );
}

export function enviarPushAsistente(asistenteId, datos) {
  return enviarPush('asistente_id', asistenteId, datos);
}

export function enviarPushFamilia(familiaId, datos) {
  return enviarPush('familia_id', familiaId, datos);
}
