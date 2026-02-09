#!/bin/bash
# One-time setup for Option A: bundle Python so beta testers don't need to install it.
# Run from desktop/:  bash scripts/setup-python-bundle.sh
# Requires: curl, (optional) jq for parsing GitHub API. Network access for download and pip.

set -e

DESKTOP_DIR="$(cd "$(dirname "$0")/.." && pwd)"
TAURI_DIR="$DESKTOP_DIR/src-tauri"
RESOURCES="$TAURI_DIR/resources"
PYTHON_DIR="$RESOURCES/python"
SCRIPTS_SRC="$TAURI_DIR/scripts"
SCRIPTS_DST="$RESOURCES/scripts"
REPO="astral-sh/python-build-standalone"

# --- 1. Copy helper scripts ---
echo "Copying helper scripts to resources/scripts/ ..."
mkdir -p "$SCRIPTS_DST"
cp "$SCRIPTS_SRC"/*.py "$SCRIPTS_DST/"
echo "  Done."

# --- 2. Detect platform (install_only asset name suffix) ---
OS="$(uname -s)"
ARCH="$(uname -m)"
case "$OS" in
  Darwin)
    case "$ARCH" in
      arm64)   TRIPLE="aarch64-apple-darwin" ;;
      x86_64)  TRIPLE="x86_64-apple-darwin" ;;
      *)       echo "Unsupported Mac arch: $ARCH"; exit 1 ;;
    esac ;;
  Linux)
    case "$ARCH" in
      x86_64)  TRIPLE="x86_64-unknown-linux-gnu" ;;
      aarch64) TRIPLE="aarch64-unknown-linux-gnu" ;;
      *)       echo "Unsupported Linux arch: $ARCH"; exit 1 ;;
    esac ;;
  MINGW*|MSYS*|CYGWIN*)
    TRIPLE="x86_64-pc-windows-msvc"
    echo "Windows: run pip install manually; see BUNDLE_PYTHON.md"
    echo "Scripts copied. Download and extract python-build-standalone install_only for $TRIPLE into $PYTHON_DIR"
    exit 0
    ;;
  *)
    echo "Unsupported OS: $OS"; exit 1 ;;
esac

# --- 3. Resolve latest install_only tarball URL ---
echo "Resolving latest python-build-standalone ($TRIPLE) ..."
API_URL="https://api.github.com/repos/$REPO/releases/latest"
if command -v jq &>/dev/null; then
  ASSET_URL=$(curl -sL "$API_URL" | jq -r --arg t "$TRIPLE" '.assets[] | select(.name | test("install_only")) | select(.name | test($t)) | .browser_download_url' | head -1)
else
  ASSET_URL=$(curl -sL "$API_URL" | grep -o '"browser_download_url": "[^"]*install_only[^"]*'"$TRIPLE"'[^"]*"' | head -1 | sed 's/.*: "\(.*\)".*/\1/')
fi
if [ -z "$ASSET_URL" ] || [ "$ASSET_URL" = "null" ]; then
  echo "Could not find install_only asset for $TRIPLE. Check https://github.com/$REPO/releases"
  exit 1
fi
echo "  URL: $ASSET_URL"

# --- 4. Download and extract ---
TARBALL="/tmp/python-build-standalone-$$.tar.gz"
echo "Downloading (this may take a minute) ..."
curl -sL -o "$TARBALL" "$ASSET_URL"
echo "Extracting to $RESOURCES/ ..."
mkdir -p "$RESOURCES"
tar -xzf "$TARBALL" -C "$RESOURCES"
rm -f "$TARBALL"
# Tarball usually has top-level "python/"; some have versioned root (e.g. cpython-3.12.x+date-triple)
if [ -x "$PYTHON_DIR/bin/python3" ]; then
  : # already correct
else
  for d in "$RESOURCES"/python "$RESOURCES"/python-* "$RESOURCES"/cpython-*; do
    if [ -d "$d" ] && [ -x "$d/bin/python3" ] 2>/dev/null; then
      if [ "$d" != "$PYTHON_DIR" ]; then
        rm -rf "$PYTHON_DIR"
        mv "$d" "$PYTHON_DIR"
      fi
      break
    fi
  done
fi
if [ ! -x "$PYTHON_DIR/bin/python3" ]; then
  echo "Expected $PYTHON_DIR/bin/python3 after extract. Check $RESOURCES layout."
  exit 1
fi
echo "  Python at $PYTHON_DIR/bin/python3"

# --- 5. Detect site-packages path ---
LIB="$PYTHON_DIR/lib"
PYVER=$(ls -d "$LIB"/python3.* 2>/dev/null | head -1)
if [ -z "$PYVER" ]; then
  echo "Could not find $LIB/python3.*"
  exit 1
fi
SITE_PACKAGES="$PYVER/site-packages"
echo "  Site-packages: $SITE_PACKAGES"

# --- 6. Install pip dependencies ---
echo "Installing pip packages (llama-cpp-python, chromadb, sentence-transformers) ..."
"$PYTHON_DIR/bin/python3" -m pip install --target "$SITE_PACKAGES" --quiet --disable-pip-version-check \
  llama-cpp-python chromadb sentence-transformers
echo "Done. You can run: npm run build"
echo "Installers will be in $TAURI_DIR/target/release/bundle/"
