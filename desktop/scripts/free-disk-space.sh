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
# Saves ~9+ GB (debug + release, including copies of the 4.4 GB model). Next dev/build uses data/models/ if no model in target.
TARGET_DIR="$DESKTOP_DIR/src-tauri/target"
if [ -d "$TARGET_DIR" ]; then
  size=$(du -sm "$TARGET_DIR" 2>/dev/null | cut -f1)
  echo "=== Tauri target (this project, ~${size} MB) ==="
  # Show breakdown so you can see what is using space
  for sub in debug release; do
    if [ -d "$TARGET_DIR/$sub" ]; then
      subsize=$(du -sm "$TARGET_DIR/$sub" 2>/dev/null | cut -f1)
      echo "  $sub: ~${subsize} MB"
    fi
  done
  if [ -d "$TARGET_DIR/release/bundle" ]; then
    bundlesize=$(du -sm "$TARGET_DIR/release/bundle" 2>/dev/null | cut -f1)
    echo "  release/bundle (installer outputs): ~${bundlesize} MB"
  fi
  echo "  (Target grows due to: debug + release artifacts, incremental compilation, and"
  echo "   each release bundle embedding a full copy of resources/ e.g. Python + model.)"
  if [ "$MODE" = "run" ]; then
    rm -rf "$TARGET_DIR"
    echo "  Deleted. Run 'npm run dev' or 'npm run build' again when needed; app will use data/models/ in dev."
  else
    echo "  Would run: rm -rf desktop/src-tauri/target"
  fi
  echo ""
fi

# Redundant model copies (keep one source in data/models; app uses it in dev after target is gone)
PROJECT_ROOT="$(cd "$DESKTOP_DIR/.." 2>/dev/null && pwd)"
DATA_MODELS="${PROJECT_ROOT}/data/models"
RESOURCES_MODELS="$DESKTOP_DIR/src-tauri/resources/models"
if [ -d "$DATA_MODELS" ] || [ -d "$RESOURCES_MODELS" ]; then
  echo "=== Redundant LLM model files (optional) ==="
  if [ -d "$RESOURCES_MODELS" ]; then
    for f in "$RESOURCES_MODELS"/*.gguf; do
      [ -f "$f" ] && echo "  resources: $f ($(du -sh "$f" 2>/dev/null | cut -f1))"
    done
    if [ -d "$DATA_MODELS" ] && ls "$DATA_MODELS"/*.gguf 1>/dev/null 2>&1; then
      echo "  (Safe to delete resources/models/*.gguf if data/models/ has a .gguf; dev will use data/models/.)"
      if [ "$MODE" = "run" ]; then
        rm -f "$RESOURCES_MODELS"/*.gguf 2>/dev/null && echo "  Deleted resources/models/*.gguf" || true
      else
        echo "  Would run: rm -f desktop/src-tauri/resources/models/*.gguf"
      fi
    fi
  fi
  if [ -d "$DATA_MODELS" ]; then
    count=$(ls "$DATA_MODELS"/*.gguf 2>/dev/null | wc -l)
    if [ "$count" -gt 1 ]; then
      echo "  data/models: multiple .gguf files (only one is used; keep e.g. Llama-3.2-3B-Instruct-Q4_K_M.gguf, delete the other to save ~2 GB)"
      ls -la "$DATA_MODELS"/*.gguf 2>/dev/null || true
      echo "  Manually remove the one you don't need from data/models/"
    fi
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
