#!/bin/bash
# Wrapper script to ensure Cargo is in PATH before running Tauri build.
# Set BUNDLE_PYTHON=1 (or use npm run build:installer) to populate resources/python
# before building so the installer includes the Python bundle for beta testers.

# Source cargo environment if it exists
if [ -f "$HOME/.cargo/env" ]; then
    source "$HOME/.cargo/env"
fi

# Ensure cargo is in PATH
export PATH="$HOME/.cargo/bin:$PATH"

# Optional: ensure Python bundle exists so the installer is self-contained (no system Python needed).
# Used by CI and when building installers for distribution. Skip if resources/python already present.
if [ -n "${BUNDLE_PYTHON-}" ] && [ "${BUNDLE_PYTHON}" != "0" ]; then
    DESKTOP_DIR="$(cd "$(dirname "$0")/.." && pwd)"
    PYTHON_DIR="$DESKTOP_DIR/src-tauri/resources/python"
    if [ ! -x "$PYTHON_DIR/bin/python3" ] && [ ! -f "$PYTHON_DIR/python.exe" ]; then
        echo "BUNDLE_PYTHON is set; running setup-python-bundle.sh ..."
        bash "$DESKTOP_DIR/scripts/setup-python-bundle.sh"
    else
        echo "BUNDLE_PYTHON is set; resources/python already present, skipping download."
    fi
fi

# Run TypeScript compilation first
npx tsc

# Run tauri build
exec npx tauri build
