import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'icon-192.png', 'icon-512.png', 'icon-maskable-192.png', 'icon-maskable-512.png'],
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
        icons: [
          { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: '/icon-maskable-192.png', sizes: '192x192', type: 'image/png', purpose: 'maskable' },
          { src: '/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      injectManifest: {
        // Nunca cachear llamadas a la API (datos de guardias/reportes cambian todo el
        // tiempo y son sensibles) — el precache es solo para el shell de la app.
        globPatterns: ['**/*.{js,css,html,svg}'],
      },
    }),
  ],
});
