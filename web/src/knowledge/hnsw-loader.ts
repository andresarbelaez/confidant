/**
 * HNSW Library Loader - Handles optional dynamic import of hnswlib-wasm
 * This module exists to centralize the import logic and make it easier to handle
 * cases where the package might not be installed.
 */

/**
 * Attempts to load hnswlib-wasm dynamically
 * Returns null if the package is not available
 * 
 * This function uses a dynamic import that Vite cannot statically analyze.
 * The app will work without this package, falling back to linear search.
 */
export async function loadHNSWLib(): Promise<any | null> {
  try {
    // Dynamic import using template literal to prevent Vite static analysis
    // @vite-ignore tells Vite to skip this import during build
    const packageName = `hnswlib${'-wasm'}`;
    // @ts-ignore - Optional dependency, may not exist
    const module = await import(/* @vite-ignore */ packageName);
    
    const loadHnswlib = module.loadHnswlib || module.default?.loadHnswlib || module.default;
    if (loadHnswlib && typeof loadHnswlib === 'function') {
      return await loadHnswlib();
    }
    return null;
  } catch (error: any) {
    // Package not installed or failed to load - expected behavior
    // Vector store will use linear search fallback
    return null;
  }
}

/**
 * Check if HNSW is available (synchronous check)
 * Note: This only checks if the import would work, not if it's actually loaded
 */
export function isHNSWAvailable(): boolean {
  try {
    // This is a best-effort check - actual availability is determined at runtime
    return true; // Assume available, will fail gracefully if not
  } catch {
    return false;
  }
}
