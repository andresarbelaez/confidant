// Service Worker for dant - Offline Privacy Enforcement
// This worker intercepts network requests and blocks query-related traffic

declare const self: ServiceWorkerGlobalScope;

const CACHE_NAME = 'dant-v1';
const STATIC_ASSETS = [
  '/',
  '/index.html',
];

// Install event - cache static assets
self.addEventListener('install', (event) => {
  console.log('[Service Worker] Installing...');
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[Service Worker] Caching static assets');
      return cache.addAll(STATIC_ASSETS);
    })
  );
  self.skipWaiting();
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('[Service Worker] Activating...');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      );
    })
  );
  return self.clients.claim();
});

// Network activity tracking
let networkStats = {
  bytesTransmitted: 0,
  requestsBlocked: 0,
  requestsAllowed: 0,
};

// Helper function to check if request is query-related
function isQueryRequest(request: Request): boolean {
  const url = new URL(request.url);
  
  // Block API calls that might be query-related
  // Allow only knowledge base downloads and model downloads
  const blockedPatterns = [
    /\/api\/query/,
    /\/api\/chat/,
    /\/api\/generate/,
    /openai\.com/,
    /anthropic\.com/,
    /googleapis\.com\/.*generative/,
  ];
  
  // Allow model/knowledge base downloads (check hostname first for reliability)
  const allowedHosts = [
    'huggingface.co',
    'huggingface.io',
    'mlc-ai.github.io',
    'github.com',
    'githubusercontent.com',
  ];
  
  if (allowedHosts.some(host => url.hostname.toLowerCase().includes(host))) {
    return false; // Not a query request, it's allowed
  }
  
  const allowedPatterns = [
    /\/knowledge-base\//,  // Knowledge base downloads
    /\/models\//,           // Model downloads
    /github\.com\/.*releases/, // GitHub releases for downloads
    /.*wasm$/i,             // WASM files (needed for WebLLM)
    /.*\.bin$/i,            // Binary model files
    /.*\.params$/i,         // Model parameter files
    /.*\.ndarray-cache/i,   // NDArray cache files
  ];
  
  // Check if it's an allowed pattern
  if (allowedPatterns.some(pattern => pattern.test(url.pathname) || pattern.test(url.hostname))) {
    return false; // Not a query request, it's allowed
  }
  
  // Check if it's a blocked pattern
  return blockedPatterns.some(pattern => pattern.test(url.pathname) || pattern.test(url.hostname));
}

// Helper function to check if request is knowledge base or model download
function isDownloadRequest(url: URL): boolean {
  const hostname = url.hostname.toLowerCase();
  const pathname = url.pathname.toLowerCase();
  const href = url.href.toLowerCase();
  
  // Check hostname first (most reliable)
  const allowedHosts = [
    'huggingface.co',
    'huggingface.io',
    'mlc-ai.github.io',
    'github.com',
    'githubusercontent.com',
    'cdn.jsdelivr.net',
    'unpkg.com',
  ];
  
  if (allowedHosts.some(host => hostname.includes(host))) {
    return true;
  }
  
  // Check file extensions and paths
  const downloadPatterns = [
    /\/knowledge-base\//,
    /\/models\//,
    /\.zst$/i,
    /\.gguf$/i,
    /\.wasm$/i,             // All WASM files
    /tvmjs_runtime/i,       // TVM runtime
    /\.bin$/i,              // Binary files
    /\.params$/i,           // Parameter files
    /\.ndarray-cache/i,     // NDArray cache
    /model.*\.json$/i,      // Model JSON files
    /.*releases.*/i,        // GitHub releases
  ];
  
  return downloadPatterns.some(pattern => 
    pattern.test(pathname) || 
    pattern.test(href)
  );
}

// Fetch event - intercept and block query requests
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  const requestUrl = event.request.url;
  
  // IMPORTANT: Allow model downloads FIRST (before any blocking)
  // WebLLM downloads models from HuggingFace and uses Cache API
  // These requests MUST be allowed for model initialization to work
  
  // Check if it's a model download request (most permissive check first)
  if (isDownloadRequest(url)) {
    console.log('[Service Worker] ✅ Allowing download (pass-through):', requestUrl);
    networkStats.requestsAllowed++;
    
    // CRITICAL: For Cache.add() to work, we must NOT call event.respondWith()
    // Instead, let the request pass through natively without interception
    // This allows WebLLM's Cache API operations to work properly
    // If we intercept, the response may not be cacheable by Cache.add()
    
    // Don't intercept - let the browser handle it natively
    // This ensures the response is properly cacheable for Cache.add()
    return; // Let the fetch proceed without service worker interception
  }
  
  // Allow same-origin requests for static assets
  if (url.origin === self.location.origin) {
    // Cache-first strategy for static assets
    if (STATIC_ASSETS.some(asset => url.pathname.includes(asset))) {
      event.respondWith(
        caches.match(event.request).then((response) => {
          return response || fetch(event.request);
        })
      );
      return;
    }
  }
  
  // Block query-related requests (API calls to external LLM services)
  // Only block AFTER checking for downloads
  if (isQueryRequest(event.request)) {
    console.log('[Service Worker] 🚫 Blocked query request:', requestUrl);
    networkStats.requestsBlocked++;
    event.respondWith(
      new Response('Blocked: Offline mode - queries must be processed locally', {
        status: 403,
        statusText: 'Forbidden',
        headers: { 'Content-Type': 'text/plain' }
      })
    );
    return;
  }
  
  // For all other requests, allow through
  // This includes any requests we haven't explicitly blocked
  // This is important for WebLLM's Cache API operations
  event.respondWith(
    fetch(event.request).catch((error) => {
      console.warn('[Service Worker] ⚠️ Request failed, trying cache:', requestUrl, error);
      return caches.match(event.request);
    })
  );
});

// Message handler for network activity monitoring
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'GET_NETWORK_ACTIVITY') {
    // Return network activity stats
    event.ports[0].postMessage({
      bytesTransmitted: networkStats.bytesTransmitted,
      requestsBlocked: networkStats.requestsBlocked,
      requestsAllowed: networkStats.requestsAllowed
    });
  }
  
  if (event.data && event.data.type === 'RESET_NETWORK_STATS') {
    networkStats = {
      bytesTransmitted: 0,
      requestsBlocked: 0,
      requestsAllowed: 0,
    };
  }
});
