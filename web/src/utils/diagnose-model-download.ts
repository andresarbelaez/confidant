/**
 * Diagnostic tool for model download issues
 */

export async function diagnoseModelDownload(): Promise<void> {
  console.log('=== Model Download Diagnostics ===');
  
  // Check service worker (this is often the cause of Cache.add() errors)
  if ('serviceWorker' in navigator) {
    const registrations = await navigator.serviceWorker.getRegistrations();
    const hasController = !!navigator.serviceWorker.controller;
    
    if (registrations.length > 0 || hasController) {
      console.error('❌ SERVICE WORKER ISSUE DETECTED!');
      console.error('   Found', registrations.length, 'registered service worker(s)');
      console.error('   Controller active:', hasController);
      console.error('');
      console.error('   ⚠️ This is likely causing the Cache.add() error!');
      console.error('');
      console.error('   FIX:');
      console.error('   1. Open DevTools (F12)');
      console.error('   2. Go to Application → Service Workers');
      console.error('   3. Click "Unregister" for ALL service workers');
      console.error('   4. Close DevTools');
      console.error('   5. Hard refresh: Cmd+Shift+R (Mac) or Ctrl+Shift+R (Windows)');
      console.error('   6. Try initializing the model again');
    } else {
      console.log('✅ Service Worker: No active service workers');
    }
  }
  
  // Check network
  console.log('Network Status:', navigator.onLine ? 'Online' : 'Offline');
  
  // Check storage
  if ('storage' in navigator && 'estimate' in navigator.storage) {
    try {
      const estimate = await navigator.storage.estimate();
      const used = estimate.usage || 0;
      const quota = estimate.quota || 0;
      const available = quota - used;
      const usedMB = (used / 1024 / 1024).toFixed(2);
      const availableMB = (available / 1024 / 1024).toFixed(2);
      const quotaMB = (quota / 1024 / 1024).toFixed(2);
      
      console.log('Storage:', {
        used: `${usedMB} MB`,
        available: `${availableMB} MB`,
        quota: `${quotaMB} MB`,
        percentUsed: ((used / quota) * 100).toFixed(1) + '%'
      });
      
      if (available < 2 * 1024 * 1024 * 1024) { // Less than 2GB
        if (available < 100 * 1024 * 1024) { // Less than 100MB
          console.error('❌ CRITICAL: Less than 100MB available!');
          console.error('   Model download requires ~2GB free space');
          console.error('');
          console.error('   ACTION REQUIRED:');
          console.error('   1. Clear Cache Storage: DevTools → Application → Cache Storage → Delete all');
          console.error('   2. Clear site data: DevTools → Application → Storage → Clear site data');
          console.error('   3. If in incognito mode, use regular window (incognito has lower limits)');
        } else {
          console.warn('⚠️ Storage Warning: Less than 2GB available');
          console.warn('   Model download requires ~2GB free space');
          console.warn('   Consider clearing Cache Storage to free up space');
        }
      }
    } catch (error) {
      console.warn('Could not check storage:', error);
    }
  }
  
  // Test HuggingFace connectivity
  try {
    console.log('Testing HuggingFace connectivity...');
    const testUrl = 'https://huggingface.co/favicon.ico';
    const response = await fetch(testUrl, { method: 'HEAD' });
    if (response.ok) {
      console.log('✅ HuggingFace: Reachable');
    } else {
      console.warn('⚠️ HuggingFace: Response status', response.status);
    }
  } catch (error) {
    console.error('❌ HuggingFace: Connection failed', error);
    console.error('   Check your internet connection');
  }
  
  // Check for browser extensions that might interfere
  console.log('');
  console.log('💡 Troubleshooting Tips:');
  console.log('   1. Try in incognito/private window (disables extensions)');
  console.log('   2. Disable browser extensions one by one');
  console.log('   3. Check Network tab for requests with ERR_FAILED status');
  console.log('   4. The error "net::ERR_FAILED 200 (OK)" suggests:');
  console.log('      - Extension modifying responses');
  console.log('      - CORS/security policy blocking');
  console.log('      - CDN response format issue');
  console.log('');
  
  // Check Cache API support
  if ('caches' in window) {
    console.log('✅ Cache API: Supported');
    try {
      const testCache = await caches.open('test-cache');
      await testCache.delete('test');
      console.log('✅ Cache API: Functional');
    } catch (error) {
      console.error('❌ Cache API: Error', error);
    }
  } else {
    console.error('❌ Cache API: Not supported');
  }
  
  console.log('=== End Diagnostics ===');
}
