#!/bin/bash
# One-time setup for zero-config DMG: Python + default model + default KB.
# Run from desktop/:  bash scripts/setup-full-bundle.sh
# Requires: curl, network. After this, run: npm run build
# The resulting DMG will open to the user selector with no Settings step.

set -e

DESKTOP_DIR="$(cd "$(dirname "$0")/.." && pwd)"
TAURI_DIR="$DESKTOP_DIR/src-tauri"
RESOURCES="$TAURI_DIR/resources"
MODELS_DIR="$RESOURCES/models"
DEFAULT_MODEL_PATH="$MODELS_DIR/default_model.gguf"
DEFAULT_MODEL_URL="https://huggingface.co/bartowski/Llama-3.2-3B-Instruct-GGUF/resolve/main/Llama-3.2-3B-Instruct-Q4_K_M.gguf"

echo "=== Confidant full bundle setup (Python + default model + KB) ==="
echo ""

# --- 1. Python bundle (scripts + python-build-standalone + pip deps) ---
echo "Step 1/3: Python and helper scripts ..."
bash "$DESKTOP_DIR/scripts/setup-python-bundle.sh"
echo ""

# --- 2. Default model into resources/models/ ---
echo "Step 2/3: Default model (for bundled DMG) ..."
mkdir -p "$MODELS_DIR"
if [ -f "$DEFAULT_MODEL_PATH" ]; then
  echo "  Model already present at $DEFAULT_MODEL_PATH"
else
  echo "  Downloading default model (~2.5 GB) to $DEFAULT_MODEL_PATH"
  echo "  This may take a while."
  if curl -# -L -o "$DEFAULT_MODEL_PATH" "$DEFAULT_MODEL_URL"; then
    echo "  Model downloaded."
  else
    echo "  Download failed. Delete any partial file and re-run, or run without model (first launch will open Settings)."
    exit 1
  fi
fi
echo ""

# --- 3. Default KB (ensure resources/default_kb.json exists) ---
echo "Step 3/3: Default knowledge base ..."
if [ -f "$RESOURCES/default_kb.json" ]; then
  echo "  default_kb.json already in resources/"
else
  if [ -f "$DESKTOP_DIR/test_knowledge_base.json" ]; then
    cp "$DESKTOP_DIR/test_knowledge_base.json" "$RESOURCES/default_kb.json"
    echo "  Copied test_knowledge_base.json to resources/default_kb.json"
  else
    echo "  No default_kb.json or test_knowledge_base.json found. Add resources/default_kb.json for zero-config KB."
  fi
fi
echo ""

echo "Full bundle ready. Run: npm run build"
echo "Installers (DMG etc.) will include the model and KB; first launch will not show Settings."
