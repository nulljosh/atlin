import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  // `npm run dev` talks to the live functions, so local QA sees real listings.
  server: { proxy: { '/api': { target: 'https://atlin.jaybulb.com', changeOrigin: true } } },
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      // The page itself always comes from the network when there is one, so a deploy shows on the
      // next load instead of the one after; the precached copy is only the offline fallback.
      workbox: {
        navigateFallback: null,
        globIgnores: ['**/index.html'],
        runtimeCaching: [{
          urlPattern: ({ request }) => request.mode === 'navigate',
          handler: 'NetworkFirst',
          options: { cacheName: 'pages', networkTimeoutSeconds: 3 }
        }]
      },
      manifest: {
        name: 'Atlin',
        short_name: 'Atlin',
        description: 'Homes for sale and for rent, anywhere on earth',
        theme_color: '#1A1A1A',
        background_color: '#1A1A1A',
        display: 'standalone',
        icons: [
          { src: '/icon.svg', sizes: 'any', type: 'image/svg+xml' },
          { src: '/icon-1024.png', sizes: '1024x1024', type: 'image/png', purpose: 'any' },
          { src: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' }
        ]
      }
    })
  ]
})
