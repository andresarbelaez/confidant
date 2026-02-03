/**
 * Utility to check and unregister any existing service workers
 * Useful for debugging when service workers are interfering
 */

export async function checkAndUnregisterServiceWorkers(): Promise<void> {
  if ('serviceWorker' in navigator) {
    try {
      const registrations = await navigator.serviceWorker.getRegistrations();
      
      if (registrations.length > 0) {
        console.warn(`[SW Check] Found ${registrations.length} active service worker(s)`);
        
        for (const registration of registrations) {
          console.warn('[SW Check] Unregistering service worker:', registration.scope);
          
          // Try to update the service worker first to stop it
          if (registration.active) {
            registration.update();
          }
          
          const unregistered = await registration.unregister();
          console.log('[SW Check] Unregistration result:', unregistered);
        }
        
        // Force reload to ensure service worker is completely gone
        console.warn('[SW Check] Service workers unregistered. Reload page to ensure they are inactive.');
        console.warn('[SW Check] You may need to manually reload the page for changes to take effect.');
        
        // Don't auto-reload, but warn the user
      } else {
        console.log('[SW Check] No active service workers found');
      }
    } catch (error) {
      console.error('[SW Check] Failed to check service workers:', error);
    }
  }
}
