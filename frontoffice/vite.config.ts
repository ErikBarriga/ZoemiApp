import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// Front office (app de los niños) · puerto de desarrollo 5173
export default defineConfig({
  // allowedHosts: permite abrir el servidor local a través de un túnel de Cloudflare (ver README, "Probar en el celular").
  server: { port: 5173, strictPort: true, allowedHosts: ['.trycloudflare.com'] },
  build: { sourcemap: true },
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'apple-touch-icon.png'],
      manifest: {
        name: 'ZoemiApp',
        short_name: 'ZoemiApp',
        description: 'Actividades para aprender y practicar la voz',
        lang: 'es-MX',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        background_color: '#F3F8FF',
        theme_color: '#1D4ED8',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icon-512-maskable.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' }
        ]
      },
      workbox: {
        navigateFallback: '/index.html',
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
        runtimeCaching: [
          {
            // Audios e imágenes del bucket "media" de Supabase: se guardan en el
            // dispositivo para que funcionen sin conexión.
            urlPattern: ({ url }) => url.pathname.startsWith('/storage/v1/object/public/media/'),
            handler: 'CacheFirst',
            options: {
              cacheName: 'zoemi-media',
              expiration: { maxEntries: 400, maxAgeSeconds: 60 * 60 * 24 * 60 },
              cacheableResponse: { statuses: [0, 200] },
              rangeRequests: true
            }
          }
        ]
      }
    })
  ]
})
