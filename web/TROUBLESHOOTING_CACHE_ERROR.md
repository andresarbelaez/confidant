# Troubleshooting Cache.add() Network Error

## Error: `net::ERR_FAILED 200 (OK)`

This error occurs when WebLLM tries to cache model files from HuggingFace CDN. The HTTP request returns `200 OK`, but Chrome's network layer reports it as failed, causing `Cache.add()` to fail.

## Root Causes

### 1. Browser Extensions (Most Common)
Browser extensions (ad blockers, privacy tools, security extensions) can modify or block network responses, causing this error.

**Solution:**
- Try in **incognito/private window** (extensions are disabled)
- If it works in incognito, disable extensions one by one to find the culprit
- Common culprits: Ad blockers, privacy extensions, security tools

### 2. CORS/Security Policies
Some CDN responses may not have proper CORS headers, or browser security policies block them.

**Solution:**
- Check Network tab for CORS errors
- Try a different browser
- Check browser security settings

### 3. Network-Level Issues
Corporate firewalls, VPNs, or network security tools can interfere.

**Solution:**
- Try a different network
- Disable VPN temporarily
- Check firewall settings

### 4. CDN Response Format
The HuggingFace CDN might return responses in a format that Chrome's Cache API can't handle.

**Solution:**
- This is a known WebLLM issue (see GitHub issues)
- Try a different model
- Wait and retry (may be temporary CDN issue)

## Diagnostic Steps

1. **Check Network Tab:**
   - Open DevTools → Network
   - Look for requests to `huggingface.co` or `cas-bridge.xethub.hf.co`
   - Check if they show `ERR_FAILED` status
   - Check response headers for CORS issues

2. **Try Incognito Mode:**
   - Open incognito/private window
   - Navigate to the app
   - Try initializing the model
   - If it works, an extension is the cause

3. **Check Browser Extensions:**
   - Go to browser extensions settings
   - Disable all extensions
   - Try again
   - Re-enable one by one to find the culprit

4. **Check Storage:**
   - DevTools → Application → Storage
   - Ensure you have enough space (models need ~2GB)
   - Clear old cache if needed

## Known Issues

This is a known issue with WebLLM:
- GitHub Issue #313: Cache.add() network error
- GitHub Issue #688: Failed to execute 'add' on 'Cache'
- GitHub Issue #590: Chrome extensions causing issues

## Workarounds

1. **Use Incognito Mode** (if extensions are the issue)
2. **Disable Extensions** (temporarily)
3. **Try Different Browser** (Edge, Firefox)
4. **Retry Multiple Times** (may be intermittent)
5. **Use Smaller Model** (if available, to test)

## If Nothing Works

This may be a limitation of WebLLM with certain network configurations. Consider:
- Using a production build (service worker may handle it differently)
- Reporting the issue to WebLLM GitHub
- Using an alternative model loading approach
