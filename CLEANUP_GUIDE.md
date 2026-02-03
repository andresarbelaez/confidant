# Cache Cleanup Guide

## Current Disk Space Situation

- **Total Space**: 228GB
- **Used**: 17GB (93% used)
- **Available**: 1.3GB ⚠️ **CRITICAL - Not enough for Rust installation**

## Safe-to-Delete Caches Found

I've identified the following safe-to-delete cache directories:

| Cache Type | Size | Location | Safety |
|------------|------|----------|--------|
| **npm cache** | 705MB | `~/.npm` | ✅ Safe - regenerated automatically |
| **pip cache** | 633MB | `~/Library/Caches/pip` | ✅ Safe - regenerated on next pip install |
| **Google Chrome cache** | 1.2GB | `~/Library/Caches/Google` | ✅ Safe - regenerated on next browser use |
| **Homebrew cache** | 152MB | `~/Library/Caches/Homebrew` | ✅ Safe - regenerated on next brew install |
| **Xcode DerivedData** | 186MB | `~/Library/Developer/Xcode/DerivedData` | ⚠️ Only if not developing iOS apps |
| **Python __pycache__** | ~3MB | Project directories | ✅ Safe - regenerated automatically |

**Total Potential Space**: ~2.9GB

## Quick Cleanup

I've created a cleanup script for you. Run it with:

```bash
cd /Users/dres/Documents/2026/dant
./cleanup-caches.sh
```

The script will:
1. Show you what will be deleted
2. Ask for confirmation on potentially risky items (Xcode, Chrome user data)
3. Remove safe caches automatically
4. Show you how much space was freed

## Manual Cleanup (Alternative)

If you prefer to clean manually:

### 1. npm cache (705MB)
```bash
rm -rf ~/.npm
```

### 2. pip cache (633MB)
```bash
rm -rf ~/Library/Caches/pip
```

### 3. Google Chrome cache (1.2GB)
```bash
rm -rf ~/Library/Caches/Google
```

### 4. Homebrew cache (152MB)
```bash
rm -rf ~/Library/Caches/Homebrew
```

### 5. Python __pycache__ files
```bash
find /Users/dres/Documents/2026/dant -type d -name "__pycache__" -exec rm -rf {} +
```

### 6. Xcode DerivedData (186MB) - Optional
Only if you're not actively developing iOS/macOS apps:
```bash
rm -rf ~/Library/Developer/Xcode/DerivedData
```

## What NOT to Delete

**DO NOT DELETE:**
- ❌ `web/node_modules` (175MB) - Needed for web app
- ❌ `~/.cargo` (11MB) - Needed for Rust (already small)
- ❌ Any project source files
- ❌ Git repositories (`.git` folders)
- ❌ Virtual environments (unless you're sure you can recreate them)

## After Cleanup

Once you've freed up space:

1. **Verify space is available:**
   ```bash
   df -h /
   ```
   You should have at least 3-4GB free.

2. **Try installing Rust again:**
   ```bash
   curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
   ```

3. **If still having issues**, you may need to:
   - Empty Trash
   - Remove old downloads
   - Check for large files: `du -sh ~/* | sort -h | tail -10`

## Notes

- All caches will be regenerated automatically when needed
- npm will rebuild its cache on next `npm install`
- pip will rebuild its cache on next `pip install`
- Chrome will rebuild its cache on next browser use
- No functionality will be lost
