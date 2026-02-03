# Troubleshooting Guide

## Model Initialization Issues

### Error: "Failed to execute 'add' on 'Cache': Cache.add() encountered a network error"

This error occurs when WebLLM tries to download and cache the model, but the Service Worker is blocking the request.

**Solution**:
1. **Check Service Worker**: The Service Worker should allow HuggingFace and MLC CDN requests
2. **Clear Cache**: Clear browser cache and service worker cache
3. **Check Network**: Ensure you have internet connection for initial model download
4. **Check Console**: Look for blocked requests in the browser console

**Steps to fix**:
1. Open DevTools → Application → Service Workers
2. Click "Unregister" to remove the old service worker
3. Hard refresh (Cmd+Shift+R / Ctrl+Shift+R)
4. Try initializing the model again

**If still failing**:
- Check browser console for specific blocked URLs
- Verify the Service Worker is allowing `huggingface.co` and `mlc-ai.github.io` domains
- Check network tab to see if requests are being made but failing

### Model Download Stuck

If the model download progress stops:

1. **Check Network**: Ensure stable internet connection
2. **Check Storage**: Ensure sufficient browser storage space
3. **Clear Cache**: Clear browser cache and try again
4. **Check Console**: Look for errors in browser console

### Service Worker Blocking Requests

If you see "Blocked: Offline mode" errors for model downloads:

1. The Service Worker should automatically allow model downloads
2. Check that the URL patterns in `service-worker.ts` include:
   - `huggingface.co`
   - `mlc-ai.github.io`
   - `.wasm` files
   - `.bin` files
   - `.json` files

## General Issues

### App Not Loading

1. Clear browser cache
2. Unregister service worker (DevTools → Application → Service Workers)
3. Hard refresh
4. Check console for errors

### HNSW Library Not Found

This is expected if `hnswlib-wasm` isn't installed. The app will use linear search as a fallback.

To install for better performance:
```bash
cd web
npm install hnswlib-wasm
```

### Network Monitor Showing Blocked Requests

This is normal for query-related requests. Model and knowledge base downloads should show as "Allowed".

## Getting Help

1. Check browser console for specific errors
2. Check Network tab in DevTools
3. Check Service Worker status in Application tab
4. Review this troubleshooting guide
5. Open an issue with:
   - Browser and version
   - Error messages
   - Steps to reproduce
   - Console logs
