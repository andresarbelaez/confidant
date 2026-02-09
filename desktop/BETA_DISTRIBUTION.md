# Getting Confidant to beta testers

## Next steps (Option A) — do these in order

1. **Open a terminal** and go to the desktop app directory:
   ```bash
   cd /Users/dres/Documents/2026/dant/desktop
   ```

2. **Set up the Python bundle** (downloads ~50MB, installs pip packages; needs network):
   ```bash
   bash scripts/setup-python-bundle.sh
   ```
   Wait until it prints "Done. You can run: npm run build". If it errors, see [BUNDLE_PYTHON.md](./BUNDLE_PYTHON.md) for manual steps.

3. **Build the installers**:
   ```bash
   npm run build
   ```
   First build can take several minutes (Rust + frontend). When it finishes, installers are in:
   ```text
   desktop/src-tauri/target/release/bundle/
   ```

4. **Find your installer** in that folder:
   - **macOS (Apple Silicon):** `dmg/Confidant_0.1.0_aarch64.dmg` — double‑click to open, drag Confidant to Applications.
   - **macOS (Intel):** `dmg/Confidant_0.1.0_x86_64.dmg`.
   - **Windows:** `msi/Confidant_0.1.0_x64_en-US.msi` or `nsis/Confidant_0.1.0_x64-setup.exe`.

5. **Test the installer** on your machine: install and run the app, confirm chat/LLM and knowledge base work without installing Python.

6. **Ship to beta testers:** upload the same `.dmg` (Mac) or `.msi`/`.exe` (Windows) and tell them they do **not** need Python. Optionally bump version first (step 7).

7. **(Optional) Set a beta version** before building:
   - In `desktop/package.json`: `"version": "0.2.0-beta.1"`.
   - In `desktop/src-tauri/tauri.conf.json`: `"version": "0.2.0-beta.1"`.
   Then run step 3 again; the installer filename will include the new version.

---

## Option A: Full bundle (no Python required for testers)

Testers get a single installer; LLM, embeddings, and ChromaDB run via bundled Python.

### 1. Populate the Python bundle (once per platform)

**From `desktop/`, run:**

```bash
bash scripts/setup-python-bundle.sh
```

This will: copy helper scripts to `resources/scripts/`, download the matching [python-build-standalone](https://github.com/astral-sh/python-build-standalone/releases) **install_only** tarball for your OS/arch, extract it to `resources/python/`, and install `llama-cpp-python`, `chromadb`, and `sentence-transformers`. Requires network and `curl` (and `jq` optional, for robust parsing).

**Manual alternative:** follow **[BUNDLE_PYTHON.md](./BUNDLE_PYTHON.md)** (download tarball, extract, copy scripts, run pip install by hand).

### 2. Build installers

From `desktop/`:

```bash
npm run build
```

Tauri will produce platform-specific artifacts under `desktop/src-tauri/target/release/bundle/`:

- **macOS**: `.dmg` and/or `.app`
- **Windows**: `.msi` and/or `.exe`
- **Linux**: `.deb`, `.AppImage`, etc. (depending on config)

### 3. Ship to testers

- **macOS**: Send the `.dmg` (or zip the `.app`). They drag to Applications and run.
- **Windows**: Send the `.msi` or `.exe`; they install and run.
- **Linux**: Send the `.deb` or `.AppImage` per your chosen format.

Tell testers they do **not** need to install Python or any pip packages.

---

## Option B: Lightweight build (testers install Python)

If you skip the Python bundle, the app still builds and runs, but it will use **system Python** at runtime. In that case:

1. Build from `desktop/`: `npm run build`.
2. Give testers the same installers from `src-tauri/target/release/bundle/`.
3. Provide **[PYTHON_SETUP.md](./PYTHON_SETUP.md)** (or equivalent) so they install Python and the required pip packages.

---

## Checklist before first beta

- [ ] **Icons / branding**: `tauri.conf.json` has `productName` "Confidant" and bundle metadata; confirm icons in `src-tauri/icons/` are correct.
- [ ] **Version**: Set or bump `version` in both `package.json` and `tauri.conf.json` (e.g. `0.2.0-beta.1`).
- [ ] **Default model/KB**: If you use bundled defaults, ensure `resources/` (or the paths in `bundled_defaults.rs`) contain the intended model and knowledge-base assets for the packaged app.
- [ ] **One platform at a time**: Build and test the full Python bundle on one OS (e.g. macOS) before doing Windows/Linux.
- [ ] **.gitignore**: If `resources/` is large, keep `desktop/src-tauri/resources/` in `.gitignore` and document the one-time bundle steps in BUNDLE_PYTHON.md for anyone building installers.

---

## CI (optional)

To automate installer builds (e.g. for GitHub Actions):

1. Add a job that installs Node, Rust, and system deps for the target OS.
2. For Option A: fetch the matching python-build-standalone tarball, extract, copy scripts, run pip install, then run `npm run build` from `desktop/`.
3. Upload the artifacts from `desktop/src-tauri/target/release/bundle/` as build outputs or release assets.

Once the first installer runs successfully on your machine, repeat the same steps in CI for each target platform.
