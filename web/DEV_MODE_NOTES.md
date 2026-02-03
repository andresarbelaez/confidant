# Development Mode Notes

## Service Worker in Dev Mode

**Important**: The service worker is **disabled in development mode** because:

1. **injectManifest strategy** requires a build step - the service worker isn't available in dev mode
2. **Model downloads work fine without it** - The service worker is only needed for blocking query requests
3. **Cache API compatibility** - Service worker interception can interfere with WebLLM's Cache.add() operations

## If You See Service Worker Errors

If you see service worker registration errors in dev mode:

1. **This is expected** - The service worker is intentionally disabled
2. **Model downloads will still work** - They don't require the service worker
3. **Ignore the errors** - They won't affect functionality

## If Model Downloads Fail

If model initialization fails with Cache.add() errors:

1. **Check network connectivity** - Initial download requires internet
2. **Check browser storage** - Ensure you have enough space (DevTools → Application → Storage)
3. **Check for active service workers** - Go to DevTools → Application → Service Workers and unregister any active ones
4. **Hard refresh** - Cmd+Shift+R / Ctrl+Shift+R to clear caches

## Production Build

In production (`npm run build`), the service worker will be:
- Built and included automatically
- Registered on page load
- Active for blocking query requests

The service worker is only needed in production for the privacy/offline enforcement feature.
