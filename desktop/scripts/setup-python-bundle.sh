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
# Use GITHUB_TOKEN in CI to avoid rate limits (unauthenticated = 60/hr)
CURL_API=(curl -sL)
if [ -n "${GITHUB_TOKEN:-}" ]; then
  CURL_API+=(-H "Authorization: Bearer $GITHUB_TOKEN")
fi
if command -v jq &>/dev/null; then
  # (.assets // []) handles API errors or rate limits where .assets may be null
  ASSET_URL=$("${CURL_API[@]}" "$API_URL" | jq -r --arg t "$TRIPLE" '(.assets // [])[] | select(.name | test("install_only")) | select(.name | test($t)) | .browser_download_url' | head -1)
else
  ASSET_URL=$("${CURL_API[@]}" "$API_URL" | grep -o '"browser_download_url": "[^"]*install_only[^"]*'"$TRIPLE"'[^"]*"' | head -1 | sed 's/.*: "\(.*\)".*/\1/')
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
# Prefer pre-built CPU wheels for llama-cpp-python to avoid ARM i8mm build failures in CI.
LLAMA_EXTRA_INDEX="https://abetlen.github.io/llama-cpp-python/whl/cpu"
if [ "$OS" = "Darwin" ] && [ -n "${BUNDLE_PYTHON:-}" ]; then
  export CMAKE_ARGS="${CMAKE_ARGS:-} -DGGML_METAL=on"
  # Force +i8mm so ARM quants.c (vmmlaq_s32) compiles when CMake detects noi8mm on the runner.
  # Use a compiler wrapper so +i8mm is appended after the project's -mcpu=...noi8mm (last flag wins).
  if [ "$ARCH" = "arm64" ]; then
    WRAPPER_DIR="$TAURI_DIR/resources/build_wrappers"
    mkdir -p "$WRAPPER_DIR"
    for lang in C CXX; do
      if [ "$lang" = "C" ]; then
        REAL="/usr/bin/clang"
        W="$WRAPPER_DIR/clang_wrapper.sh"
      else
        REAL="/usr/bin/clang++"
        W="$WRAPPER_DIR/clang++_wrapper.sh"
      fi
      printf '#!/bin/sh\nexec "%s" "$@" -Xclang -target-feature -Xclang +i8mm\n' "$REAL" > "$W"
      chmod +x "$W"
    done
    export CC="$WRAPPER_DIR/clang_wrapper.sh"
    export CXX="$WRAPPER_DIR/clang++_wrapper.sh"
  fi
fi
echo "Installing pip packages (llama-cpp-python, chromadb, sentence-transformers) ..."
PIP_OPTS="--target $SITE_PACKAGES --quiet --disable-pip-version-check --prefer-binary --extra-index-url $LLAMA_EXTRA_INDEX"
if ! "$PYTHON_DIR/bin/python3" -m pip install $PIP_OPTS \
  "llama-cpp-python>=0.2.0,<0.4" chromadb sentence-transformers; then
  echo "Install failed (often ARM i8mm build error in CI). Retrying with pinned llama-cpp-python==0.3.10..."
  "$PYTHON_DIR/bin/python3" -m pip install $PIP_OPTS "llama-cpp-python==0.3.10" chromadb sentence-transformers
fi
echo "Done. You can run: npm run build"
echo "Installers will be in $TAURI_DIR/target/release/bundle/"
