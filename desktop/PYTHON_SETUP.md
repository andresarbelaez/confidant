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

3. **Verify Installation**:
   ```bash
   python3 -c "import chromadb; import sentence_transformers; import llama_cpp; print('All packages installed!')"
   ```

4. **Restart the Desktop App**:
   - The app will automatically use `venv/bin/python3` if it exists
   - If not found, it will fall back to system Python (which may not have packages)

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
