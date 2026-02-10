#!/bin/bash
# Commands to free disk space on macOS. Run from anywhere.
# Usage: bash scripts/free-disk-space.sh [dry-run|run]
#   dry-run (default): only report sizes and what would be deleted
#   run: actually delete (use after reviewing dry-run)

MODE="${1:-dry-run}"
DESKTOP_DIR="$(cd "$(dirname "$0")/.." && pwd)"

echo "Mode: $MODE (use 'run' to actually delete)"
echo ""

# --- 1. Report current space ---
echo "=== Current disk space ==="
df -h / | tail -1
echo ""

# --- 2. Show size of common large dirs (read-only) ---
echo "=== Large directories (sizes only) ==="
for dir in \
  "$HOME/Library/Developer/Xcode/DerivedData" \
  "$HOME/Library/Developer/CoreSimulator" \
  "$HOME/.cache/pip" \
  "$HOME/.npm" \
  "$HOME/.cargo/registry" \
  "$HOME/Library/Caches" \
  "$HOME/Downloads" \
  "$DESKTOP_DIR/src-tauri/target" \
  "$DESKTOP_DIR/node_modules" \
  ; do
  if [ -d "$dir" ]; then
    size=$(du -sh "$dir" 2>/dev/null | cut -f1)
    echo "  $size  $dir"
  fi
done
echo ""

# --- 3. Actions (dry-run: print; run: execute) ---
freed=0

# Xcode DerivedData (safe: Xcode regenerates)
if [ -d "$HOME/Library/Developer/Xcode/DerivedData" ]; then
  size=$(du -sm "$HOME/Library/Developer/Xcode/DerivedData" 2>/dev/null | cut -f1)
  echo "=== Xcode DerivedData (~${size} MB) ==="
  if [ "$MODE" = "run" ]; then
    rm -rf "$HOME/Library/Developer/Xcode/DerivedData"/*
    echo "  Deleted."
  else
    echo "  Would run: rm -rf ~/Library/Developer/Xcode/DerivedData/*"
  fi
  echo ""
fi

# Unavailable iOS simulators
echo "=== Unavailable iOS simulators ==="
if [ "$MODE" = "run" ]; then
  xcrun simctl delete unavailable 2>/dev/null && echo "  Deleted." || echo "  (none or error)"
else
  echo "  Would run: xcrun simctl delete unavailable"
fi
echo ""

# pip cache
if [ -d "$HOME/.cache/pip" ]; then
  echo "=== pip cache ==="
  if [ "$MODE" = "run" ]; then
    rm -rf "$HOME/.cache/pip"
    echo "  Deleted."
  else
    echo "  Would run: rm -rf ~/.cache/pip"
  fi
  echo ""
fi

# npm cache
echo "=== npm cache ==="
if [ "$MODE" = "run" ]; then
  npm cache clean --force 2>/dev/null && echo "  Cleaned." || echo "  (skip or error)"
else
  echo "  Would run: npm cache clean --force"
fi
echo ""

# User Caches (broad but safe)
if [ -d "$HOME/Library/Caches" ]; then
  echo "=== User Library/Caches ==="
  if [ "$MODE" = "run" ]; then
    rm -rf "$HOME/Library/Caches"/*
    echo "  Deleted."
  else
    echo "  Would run: rm -rf ~/Library/Caches/*"
  fi
  echo ""
fi

# Cargo/rust build artifacts for this project only (optional; rebuilds on next build)
if [ -d "$DESKTOP_DIR/src-tauri/target" ]; then
  size=$(du -sm "$DESKTOP_DIR/src-tauri/target" 2>/dev/null | cut -f1)
  echo "=== Tauri target (this project, ~${size} MB) ==="
  if [ "$MODE" = "run" ]; then
    rm -rf "$DESKTOP_DIR/src-tauri/target"
    echo "  Deleted. Run 'npm run build' again when needed."
  else
    echo "  Would run: rm -rf desktop/src-tauri/target"
  fi
  echo ""
fi

# Trash
echo "=== Empty Trash ==="
if [ "$MODE" = "run" ]; then
  rm -rf "$HOME/.Trash"/*
  echo "  Emptied."
else
  echo "  Would run: rm -rf ~/.Trash/*"
fi
echo ""

if [ "$MODE" = "run" ]; then
  echo "=== Space after cleanup ==="
  df -h / | tail -1
fi
echo "Done. Run with 'run' to apply deletions, or run individual commands below manually."
