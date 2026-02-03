/**
 * Storage utilities for IndexedDB and Cache Storage
 */

/**
 * Get available storage quota
 */
export async function getStorageQuota(): Promise<{
  quota: number;
  usage: number;
  available: number;
}> {
  if ('storage' in navigator && 'estimate' in navigator.storage) {
    const estimate = await navigator.storage.estimate();
    return {
      quota: estimate.quota || 0,
      usage: estimate.usage || 0,
      available: (estimate.quota || 0) - (estimate.usage || 0)
    };
  }
  
  // Fallback
  return {
    quota: 0,
    usage: 0,
    available: 0
  };
}

/**
 * Format bytes to human-readable string
 */
export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
}

/**
 * Check if IndexedDB is available
 */
export function isIndexedDBAvailable(): boolean {
  return 'indexedDB' in window;
}

/**
 * Check if Cache Storage is available
 */
export function isCacheStorageAvailable(): boolean {
  return 'caches' in window;
}
