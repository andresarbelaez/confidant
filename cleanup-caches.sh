#!/bin/bash
# Safe Cache Cleanup Script for macOS
# This script removes cache files that can be safely deleted and regenerated

set -e

echo "=========================================="
echo "Safe Cache Cleanup Script"
echo "=========================================="
echo ""

# Calculate space before
echo "Checking disk space before cleanup..."
df -h / | tail -1
echo ""

TOTAL_FREED=0

# Function to safely remove directory and report size
clean_dir() {
    local dir=$1
    local name=$2
    
    if [ -d "$dir" ]; then
        SIZE=$(du -sh "$dir" 2>/dev/null | cut -f1)
        SIZE_BYTES=$(du -sk "$dir" 2>/dev/null | cut -f1)
        echo "Removing $name: $SIZE ($dir)"
        rm -rf "$dir"
        echo "  ✓ Freed: $SIZE"
        TOTAL_FREED=$((TOTAL_FREED + SIZE_BYTES))
    else
        echo "  (Not found: $dir)"
    fi
}

echo "Starting cleanup..."
echo ""

# 1. npm cache (705MB)
clean_dir "$HOME/.npm" "npm cache"

# 2. pip cache (633MB)
clean_dir "$HOME/Library/Caches/pip" "pip cache"

# 3. Google Chrome cache (1.2GB)
clean_dir "$HOME/Library/Caches/Google" "Google Chrome cache"

# 4. Homebrew cache (152MB)
clean_dir "$HOME/Library/Caches/Homebrew" "Homebrew cache"

# 5. Xcode DerivedData (186MB) - only if not actively developing iOS apps
read -p "Remove Xcode DerivedData? (y/N): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    clean_dir "$HOME/Library/Developer/Xcode/DerivedData" "Xcode DerivedData"
fi

# 6. Python __pycache__ files in project
echo ""
echo "Removing Python __pycache__ files..."
find /Users/dres/Documents/2026/dant -type d -name "__pycache__" -exec rm -rf {} + 2>/dev/null || true
echo "  ✓ Removed Python cache files"

# 7. Browser caches (additional)
echo ""
echo "Cleaning additional browser caches..."

# Safari cache
clean_dir "$HOME/Library/Caches/com.apple.Safari" "Safari cache"

# Firefox cache (if exists)
clean_dir "$HOME/Library/Caches/Firefox" "Firefox cache"

# Chrome user data cache (additional)
if [ -d "$HOME/Library/Application Support/Google/Chrome" ]; then
    echo "Chrome Application Support found (contains bookmarks, history, etc.)"
    read -p "Remove Chrome cache only (not bookmarks/history)? (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        clean_dir "$HOME/Library/Application Support/Google/Chrome/Default/Cache" "Chrome Default Cache"
        clean_dir "$HOME/Library/Application Support/Google/Chrome/Default/Code Cache" "Chrome Code Cache"
    fi
fi

# 8. System caches (be more careful here)
echo ""
read -p "Remove system caches (com.apple.*)? This is usually safe. (y/N): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    # Remove specific safe system caches
    for cache_dir in "$HOME/Library/Caches/com.apple.Safari" \
                     "$HOME/Library/Caches/com.apple.dt.Xcode" \
                     "$HOME/Library/Caches/com.apple.helpd"; do
        if [ -d "$cache_dir" ]; then
            clean_dir "$cache_dir" "System cache: $(basename $cache_dir)"
        fi
    done
fi

echo ""
echo "=========================================="
echo "Cleanup Complete!"
echo "=========================================="
echo ""
echo "Disk space after cleanup:"
df -h / | tail -1
echo ""
echo "Total space freed: ~$((TOTAL_FREED / 1024))MB"
echo ""
echo "Note: These caches will be regenerated as needed."
echo "You can now try installing Rust again."
