/**
 * Vite plugin to handle optional dependencies that may not be installed
 * This prevents Vite from failing when optional dependencies are missing
 */

import type { Plugin } from 'vite';

export function optionalDeps(): Plugin {
  return {
    name: 'optional-deps',
    resolveId(id) {
      // If it's hnswlib-wasm, always return a virtual module
      // This prevents Vite from trying to resolve it at build time
      // The virtual module will attempt to load the real package at runtime
      if (id === 'hnswlib-wasm') {
        return '\0virtual:hnswlib-wasm';
      }
      return null;
    },
    load(id) {
      // Return a virtual module that attempts to load the real package at runtime
      if (id === '\0virtual:hnswlib-wasm') {
        return `
          // Virtual module for optional hnswlib-wasm dependency
          // This allows the app to run even if the package isn't installed
          async function tryLoadRealPackage() {
            try {
              // Try to dynamically import the real package using a string literal
              // This bypasses Vite's static analysis
              const packageName = 'hnswlib' + '-wasm';
              const realModule = await import(packageName);
              return realModule;
            } catch (e) {
              // Package not available - return null
              return null;
            }
          }
          
          export const loadHnswlib = async () => {
            const mod = await tryLoadRealPackage();
            if (!mod) return null;
            const loader = mod.loadHnswlib || mod.default?.loadHnswlib || mod.default;
            return loader && typeof loader === 'function' ? await loader() : null;
          };
          
          export default {
            loadHnswlib: async () => {
              const mod = await tryLoadRealPackage();
              if (!mod) return null;
              const loader = mod.loadHnswlib || mod.default?.loadHnswlib || mod.default;
              return loader && typeof loader === 'function' ? await loader() : null;
            }
          };
        `;
      }
      return null;
    }
  };
}
