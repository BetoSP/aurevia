import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg'],
      // injectManifest (no generateSW): el service worker necesita manejar el evento 'push'
      // (notificaciones push a Asistentes) además del precache del shell de la app.
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'sw.js',
      manifest: {
        name: 'Aurevia — Familias',
        short_name: 'Aurevia',
        description: 'App para que las Familias sigan el servicio de sus Pacientes en Aurevia',
        theme_color: '#1a2744',
        background_color: '#ffffff',
        display: 'standalone',
        start_url: '/',
        // TODO (ver docs/PENDIENTES.md): íconos PNG 192/512 reales para instalación en
        // pantalla de inicio — por ahora solo el favicon SVG heredado del Panel.
        icons: [{ src: '/favicon.svg', sizes: 'any', type: 'image/svg+xml' }],
      },
      injectManifest: {
        // Nunca cachear llamadas a la API (datos de guardias/reportes cambian todo el
        // tiempo y son sensibles) — el precache es solo para el shell de la app.
        globPatterns: ['**/*.{js,css,html,svg}'],
      },
    }),
  ],
});
