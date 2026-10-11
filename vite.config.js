import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  // `npm run dev` talks to the live functions, so local QA sees real listings.
  server: { proxy: { '/api': { target: 'https://brick.jaybulb.com', changeOrigin: true } } },
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'Brick',
        short_name: 'Brick',
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
