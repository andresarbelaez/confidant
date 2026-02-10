# Python Setup for Desktop App

## Issue: Python Dependencies Not Found

The desktop app uses Python scripts for:
- **LLM**: `llama-cpp-python`
- **ChromaDB**: `chromadb`
- **Embeddings**: `sentence-transformers`

## Solution: Use Virtual Environment

The app will automatically detect and use a virtual environment at the project root (`venv/`).

### Setup Steps

1. **Create/Activate Virtual Environment** (if not already done):
   ```bash
   cd /Users/dres/Documents/2026/dant
   python3 -m venv venv
   source venv/bin/activate
   ```

2. **Install Dependencies**:
   ```bash
   pip install chromadb sentence-transformers llama-cpp-python
   ```

   **macOS – faster LLM with Metal GPU:** Install a Metal-built `llama-cpp-python` so the app can use the GPU:
   ```bash
   CMAKE_ARGS="-DGGML_METAL=on" pip install llama-cpp-python --no-cache-dir --force-reinstall
   pip install chromadb sentence-transformers
   ```

3. **Verify Installation**:
   ```bash
   python3 -c "import chromadb; import sentence_transformers; import llama_cpp; print('All packages installed!')"
   ```

4. **Run the app from the repo** so it can find the venv:
   ```bash
   cd /Users/dres/Documents/2026/dant/desktop
   npm run dev
   ```
   The app looks for `venv/` by walking up from the current working directory (e.g. `desktop/` → `dant/`), so it will use `dant/venv/bin/python3` if the venv is at repo root.

5. **If the app still reports "Python setup issue"**, point it at your venv explicitly:
   - From the same terminal where you run `npm run dev`, set one of:
     - `export VIRTUAL_ENV=/path/to/dant/venv`
     - or `export CONFIDANT_PYTHON=/path/to/dant/venv/bin/python3`
   - Then run `npm run dev` again. The app will use that Python instead of auto-detecting.

## Alternative: Install System-Wide

If you prefer not to use a virtual environment:

```bash
# Install system-wide (requires sudo on some systems)
pip3 install --user chromadb sentence-transformers llama-cpp-python
```

**Note**: System-wide installation may require additional permissions and can conflict with system Python packages.

## Troubleshooting

### Error: "Python script failed: ERROR: chromadb not installed"

**Cause**: The Python being used doesn't have the required packages.

**Solution**:
1. Check which Python is being used:
   ```bash
   which python3
   ```
2. Install packages in that Python:
   ```bash
   python3 -m pip install chromadb sentence-transformers llama-cpp-python
   ```
3. Or use virtual environment (recommended)

### Error: "externally-managed-environment" (Homebrew Python)

**Cause**: Homebrew’s Python blocks `pip install` into the system environment.

**Solution**: Use a virtual environment (see setup steps above). From the repo root:
```bash
cd /path/to/dant
python3 -m venv venv
source venv/bin/activate
pip install chromadb sentence-transformers llama-cpp-python
# macOS Metal build for faster LLM:
# CMAKE_ARGS="-DGGML_METAL=on" pip install llama-cpp-python --no-cache-dir --force-reinstall
```

### Error: "Python not found"

**Cause**: Python 3 is not in PATH.

**Solution**:
1. Install Python 3 from python.org or Homebrew
2. Ensure it's in your PATH

### Check Current Setup

To see which Python the app will use:
```bash
cd /Users/dres/Documents/2026/dant
if [ -f "venv/bin/python3" ]; then
    echo "Using venv Python: $(venv/bin/python3 --version)"
    venv/bin/python3 -c "import chromadb; print('ChromaDB: OK')"
else
    echo "Using system Python: $(python3 --version)"
    python3 -c "import chromadb; print('ChromaDB: OK')" 2>&1 || echo "ChromaDB: NOT INSTALLED"
fi
```
