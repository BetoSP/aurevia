import { api } from './api';

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY;

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  return Uint8Array.from([...rawData].map((char) => char.charCodeAt(0)));
}

export function pushSoportado() {
  return 'serviceWorker' in navigator && 'PushManager' in window && !!VAPID_PUBLIC_KEY;
}

export async function suscripcionActual() {
  if (!pushSoportado()) return null;
  const registro = await navigator.serviceWorker.ready;
  return registro.pushManager.getSubscription();
}

export async function activarPush() {
  const registro = await navigator.serviceWorker.ready;
  const suscripcion = await registro.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
  });
  const json = suscripcion.toJSON();
  await api.suscribirPush({ endpoint: json.endpoint, keys: json.keys });
  return suscripcion;
}

export async function desactivarPush() {
  const suscripcion = await suscripcionActual();
  if (!suscripcion) return;
  await api.desuscribirPush(suscripcion.endpoint);
  await suscripcion.unsubscribe();
}
