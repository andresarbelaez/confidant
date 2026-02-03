# How to Clear Browser Storage for Model Download

## Problem

You're getting a "Quota exceeded" error because your browser storage is full. The model requires ~2GB of free space.

## Solution: Clear Cache Storage

### Chrome/Edge

1. **Open DevTools** (F12 or Cmd+Option+I / Ctrl+Shift+I)
2. **Go to Application tab**
3. **In the left sidebar, expand "Cache Storage"**
4. **Right-click on any cache entries** → **Delete**
   - Or click "Clear site data" button at the top
5. **Also check "Storage" section:**
   - Clear IndexedDB if there's old data
   - Clear Local Storage if needed
6. **Refresh the page** and try again

### Firefox

1. **Open DevTools** (F12)
2. **Go to Storage tab**
3. **Expand "Cache"**
4. **Right-click → Delete All**
5. **Refresh the page** and try again

### Safari

1. **Open DevTools** (Cmd+Option+I)
2. **Go to Storage tab**
3. **Select "Cache"**
4. **Click "Clear"**
5. **Refresh the page** and try again

## Quick Method: Clear All Site Data

### Chrome/Edge

1. **Click the lock icon** in the address bar
2. **Click "Site settings"**
3. **Click "Clear data"**
4. **Refresh the page**

Or:

1. **DevTools → Application → Storage**
2. **Click "Clear site data" button** (top right)
3. **Refresh the page**

## Important Notes

### Incognito Mode Limitations

**Incognito/Private windows have much lower storage quotas** (typically ~100-500MB). 

- ✅ **Use regular window** for model downloads
- ✅ **Disable extensions** in regular window instead
- ✅ **Or use extension management** to disable only problematic ones

### Storage Requirements

- **Model size**: ~2GB (Llama 3.2 3B Q4F16)
- **Cache Storage**: Used by WebLLM to cache model files
- **IndexedDB**: Used for knowledge base (if loaded)

### After Clearing

1. **Refresh the page**
2. **Try initializing the model again**
3. **The download will start fresh**

## If Quota Still Exceeded

1. **Check other tabs** - Close tabs with cached data
2. **Clear other site data** - Free up space from other sites
3. **Restart browser** - Sometimes helps clear stuck caches
4. **Check browser settings** - Some browsers limit storage per site

## Prevention

- **Regular window** has higher storage limits than incognito
- **Clear Cache Storage** periodically if you download multiple models
- **Monitor storage usage** in DevTools → Application → Storage
