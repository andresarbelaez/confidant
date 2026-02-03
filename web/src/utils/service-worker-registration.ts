/**
 * Service Worker Registration
 * Registers the service worker for offline functionality
 */

export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  // Skip service worker registration in dev mode
  // With injectManifest strategy, the SW is only built in production
  if (import.meta.env.DEV) {
    console.log('[SW Registration] Skipping service worker in dev mode (injectManifest requires build)');
    return null;
  }
  
  if ('serviceWorker' in navigator) {
    try {
      const swPath = '/sw.js';
      
      console.log('[SW Registration] Registering service worker from:', swPath);
      
      const registration = await navigator.serviceWorker.register(swPath, {
        scope: '/',
        updateViaCache: 'none' // Always check for updates
      });

      console.log('[SW Registration] Service worker registered:', registration);

      // Listen for updates
      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing;
        if (newWorker) {
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              console.log('[SW Registration] New service worker available');
              // Optionally prompt user to reload
            }
          });
        }
      });

      return registration;
    } catch (error) {
      console.error('[SW Registration] Service worker registration failed:', error);
      return null;
    }
  } else {
    console.warn('[SW Registration] Service workers not supported');
    return null;
  }
}

/**
 * Unregister service worker (for debugging)
 */
export async function unregisterServiceWorker(): Promise<boolean> {
  if ('serviceWorker' in navigator) {
    try {
      const registration = await navigator.serviceWorker.getRegistration();
      if (registration) {
        const result = await registration.unregister();
        console.log('[SW Registration] Service worker unregistered:', result);
        return result;
      }
      return false;
    } catch (error) {
      console.error('[SW Registration] Failed to unregister:', error);
      return false;
    }
  }
  return false;
}
