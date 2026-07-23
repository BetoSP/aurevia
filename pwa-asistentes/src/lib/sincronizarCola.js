// Procesa la cola offline en orden de creación: un check-in encolado antes que su Reporte
// Diario se envía primero, así el backend nunca rechaza el Reporte por falta de check-in
// previo (backend/src/routes/appAsistentes.js). Si un ítem falla por un motivo real (no de
// red), se corta el procesamiento ahí — los siguientes ítems de esa misma guardia podrían
// depender del que falló.
import { api } from './api';
import { listarCola, quitarDeCola, marcarError } from './colaOffline';

function esErrorDeRed(error) {
  // fetch rechaza con TypeError cuando no hay red (a diferencia de una respuesta HTTP de error).
  return error instanceof TypeError;
}

let sincronizando = false;
const oyentes = new Set();

export function suscribirseASincronizacion(fn) {
  oyentes.add(fn);
  return () => oyentes.delete(fn);
}

function avisar() {
  oyentes.forEach((fn) => fn());
}

export async function sincronizarCola() {
  if (sincronizando || !navigator.onLine) return;
  sincronizando = true;
  try {
    const cola = await listarCola();
    for (const item of cola) {
      try {
        if (item.tipo === 'checkin') {
          await api.checkin(item.guardiaId, item.payload);
        } else if (item.tipo === 'reporte') {
          await api.confirmarReporte(item.guardiaId, item.payload);
        }
        await quitarDeCola(item.id);
        avisar();
      } catch (error) {
        if (esErrorDeRed(error)) {
          break; // se cortó la conexión de nuevo, se reintenta en el próximo evento
        }
        if (error.yaRegistrado) {
          // El servidor ya tiene esta acción registrada (mismo check-in/reporte que se
          // había enviado antes de perder la respuesta) — se da por sincronizada.
          await quitarDeCola(item.id);
          avisar();
          continue;
        }
        await marcarError(item.id, error.message || 'Error al sincronizar');
        avisar();
        break;
      }
    }
  } finally {
    sincronizando = false;
  }
}

let inicializado = false;
export function iniciarSincronizacionAutomatica() {
  if (inicializado) return;
  inicializado = true;
  window.addEventListener('online', sincronizarCola);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') sincronizarCola();
  });
  sincronizarCola();
}
