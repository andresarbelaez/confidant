# Bundling Python for distribution

For **beta installers**, you can bundle a standalone Python and pip dependencies so users do not need to install Python. The app uses [python-build-standalone](https://github.com/astral-sh/python-build-standalone) (relocatable, no system Python required).

## Behavior

- **Development** (no `resources/`): The app uses system Python (or a venv) and scripts from `src-tauri/scripts/`, as before.
- **Packaged build** (with `resources/`): The app uses `resources/python/` as the interpreter and `resources/scripts/` for the helper scripts. Pip dependencies must be pre-installed into that Python.

## Bundle layout

Create these under `desktop/src-tauri/` before running `npm run build`:

```
src-tauri/
  resources/
    python/          <- python-build-standalone install (bin/python3 or python.exe, lib/, etc.)
    scripts/         <- llama_helper.py, chromadb_helper.py, embeddings_helper.py
```

- **python/**  
  Extract the **install_only** tarball for your platform from [python-build-standalone releases](https://github.com/astral-sh/python-build-standalone/releases) (e.g. `cpython-3.12.x+YYYYMMDD-aarch64-apple-darwin-install_only.tar.gz`). Extract so that `python/bin/python3` (macOS/Linux) or `python/python.exe` (Windows) exists.

- **scripts/**  
  Copy the three helper scripts from `src-tauri/scripts/` into `resources/scripts/`.

- **Pip dependencies**  
  Using the bundled Python, install into its environment:

  ```bash
  # Unix (from desktop/src-tauri)
  ./resources/python/bin/python3 -m pip install --target resources/python/lib/python3.12/site-packages llama-cpp-python chromadb sentence-transformers

  # Windows
  resources\python\python.exe -m pip install --target resources\python\lib\site-packages llama-cpp-python chromadb sentence-transformers
  ```

  Adjust `python3.12` (or `site-packages`) to match the Python version you extracted (e.g. 3.11 → `lib/python3.11/site-packages`).

## One-time setup per platform

1. **Download** the matching install_only archive:
   - macOS Apple Silicon: `cpython-3.12.*-aarch64-apple-darwin-install_only.tar.gz`
   - macOS Intel: `cpython-3.12.*-x86_64-apple-darwin-install_only.tar.gz`
   - Windows x64: `cpython-3.12.*-x86_64-pc-windows-msvc-install_only.tar.gz`

2. **Extract** into `desktop/src-tauri/resources/python/` (so that the archive’s `python/` content is directly under `resources/python/`).

3. **Copy scripts**:
   ```bash
   mkdir -p desktop/src-tauri/resources/scripts
   cp desktop/src-tauri/scripts/*.py desktop/src-tauri/resources/scripts/
   ```

4. **Install pip packages** (see command above; use the correct `lib/pythonX.Y/site-packages` path).

5. **Build**: from `desktop/`, run `npm run build`. The installers will include `resources/`.

## Letting the installer build provide the bundle

So the Python bundle is **not** stored in git, the **installer build** can populate it automatically:

- **From `desktop/`:** run `npm run build:installer` (or `BUNDLE_PYTHON=1 npm run build`).  
  This runs `scripts/setup-python-bundle.sh` if `resources/python/` is missing, then runs the Tauri build. The resulting installer will include the Python bundle so beta testers do not need to install Python.

- **In CI:** set `BUNDLE_PYTHON=1` (or use `npm run build:installer`) before `npm run build` so the packaged app includes `resources/python/` and `resources/scripts/`.

## Optional: add `resources/` to .gitignore

Because `resources/python/` is large and platform-specific, add:

```
desktop/src-tauri/resources/
```

Then each builder (or CI) generates `resources/` before `tauri build` (e.g. via `build:installer` or `BUNDLE_PYTHON=1`).

## Summary

| Item | Location |
|------|----------|
| Standalone Python | [python-build-standalone](https://github.com/astral-sh/python-build-standalone/releases) → `resources/python/` |
| Helper scripts | `src-tauri/scripts/*.py` → `resources/scripts/` |
| Pip deps | Installed into `resources/python/` so the bundled interpreter can import them |
| Tauri config | `tauri.conf.json` already has `"resources": ["resources/"]` |

When `resources/python` and `resources/scripts` exist at build time, the packaged app will use them and beta testers will not need to install Python or pip.

**Note:** The repo includes an empty `src-tauri/resources/` (with a `.gitkeep`) so that builds succeed even when the Python bundle has not been created. In that case the app uses system Python at runtime. For distribution, populate `resources/python/` and `resources/scripts/` as above, then build.
