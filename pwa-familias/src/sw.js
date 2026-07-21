import { precacheAndRoute } from 'workbox-precaching';

precacheAndRoute(self.__WB_MANIFEST);

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

// Notificaciones push a Familias — docs/PRD_04_05_App_Servicio.md:58,76 (Asistente llegó al
// domicilio, reporte confirmado, alerta ROJA). El payload lo arma el backend
// (backend/src/utils/push.js) como { titulo, cuerpo, url }.
self.addEventListener('push', (event) => {
  let datos = { titulo: 'Aurevia', cuerpo: '' };
  try {
    datos = event.data.json();
  } catch {
    // payload no vino en formato JSON, se usa el título/cuerpo por defecto
  }

  event.waitUntil(
    self.registration.showNotification(datos.titulo || 'Aurevia', {
      body: datos.cuerpo || '',
      icon: '/favicon.svg',
      data: { url: datos.url || '/' },
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = event.notification.data?.url || '/';
  event.waitUntil(
    self.clients.matchAll({ type: 'window' }).then((clientes) => {
      const clienteAbierto = clientes.find((cliente) => cliente.url.includes(self.location.origin));
      if (clienteAbierto) {
        clienteAbierto.focus();
        clienteAbierto.navigate(url);
        return;
      }
      self.clients.openWindow(url);
    })
  );
});
