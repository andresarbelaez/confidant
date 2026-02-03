import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import { optionalDeps } from './vite-plugin-optional-deps'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    optionalDeps(), // Handle optional dependencies
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'mask-icon.svg'],
      manifest: {
        name: 'dant - Offline AI Assistant',
        short_name: 'dant',
        description: 'Privacy-first offline AI assistant for health consultation',
        theme_color: '#ffffff',
        start_url: '/',
        display: 'standalone',
        icons: [
          {
            src: 'pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png'
          }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg}']
      },
      // Use custom service worker with injectManifest strategy
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'service-worker.ts',
      injectManifest: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg}']
      },
      // Dev options - completely disable in dev mode
      // Service worker only works in production build with injectManifest
      devOptions: {
        enabled: false, // Disable in dev - injectManifest needs build step
        type: 'module',
        suppressWarnings: true // Suppress warnings about missing service worker in dev
      },
      // Manifest configuration
      manifestFilename: 'manifest.webmanifest'
    })
  ],
  optimizeDeps: {
    exclude: ['hnswlib-wasm'] // Exclude from pre-bundling since it's dynamically imported
  }
})
