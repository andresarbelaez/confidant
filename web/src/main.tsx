import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { registerServiceWorker } from './utils/service-worker-registration'
import { checkAndUnregisterServiceWorkers } from './utils/check-service-worker'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)

// In dev mode, ensure no service workers are active (they can interfere with model downloads)
if (import.meta.env.DEV) {
  // Unregister immediately, don't wait for load
  checkAndUnregisterServiceWorkers().then(() => {
    console.log('[SW Registration] Dev mode: Service worker disabled (not needed for model downloads)');
    
    // Force check and warn if still active
    setTimeout(() => {
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.getRegistrations().then((registrations) => {
          if (registrations.length > 0) {
            console.error('[SW Registration] ❌ Service worker still registered after unregister attempt!');
            console.error('[SW Registration] Please manually unregister in DevTools → Application → Service Workers');
            console.error('[SW Registration] Then reload the page (Cmd+Shift+R / Ctrl+Shift+R)');
          } else if (navigator.serviceWorker.controller) {
            console.warn('[SW Registration] ⚠️ Service worker controller still active (old worker)');
            console.warn('[SW Registration] Reload the page to clear it');
          } else {
            console.log('[SW Registration] ✅ No service workers active');
          }
        });
      }
    }, 2000);
  });
} else {
  // Register service worker in production
  window.addEventListener('load', () => {
    setTimeout(() => {
      registerServiceWorker().then((registration) => {
        if (registration) {
          console.log('[SW Registration] ✅ Service worker registered successfully');
        } else {
          console.warn('[SW Registration] Service worker registration returned null');
        }
      }).catch((error) => {
        console.error('[SW Registration] Failed to register service worker:', error);
      });
    }, 500);
  });
}
