# Freeing disk space (dant repo)

Tools like CleanMyMac may report large files under this repo. Here’s what is safe to remove.

## Summary

| Location | Size (approx) | Safe to remove? | Notes |
|----------|----------------|-----------------|--------|
| `desktop/src-tauri/target/` | ~9+ GB | **Yes** | Build artifacts. Next `npm run dev` or `cargo build` recreates it; the app will use `data/models/` in dev if no model is in target. |
| `desktop/src-tauri/target/debug/models/` | ~4.4 GB | **Yes** | Same as above (part of target). |
| `desktop/src-tauri/target/release/models/` | ~4.4 GB | **Yes** | Same as above (part of target). |
| `desktop/src-tauri/resources/models/default_model.gguf` | ~4.4 GB | **Yes** if you have a model in `data/models/` | In dev the app falls back to `data/models/`. Keep this only if you need a bundled model for release builds. |
| `data/models/` (two .gguf files) | ~4 GB total | **Keep one, remove the other** | The app uses any single `.gguf` in `data/models/`. Keep e.g. `Llama-3.2-3B-Instruct-Q4_K_M.gguf` (default), delete `llama-3.2-3b-instruct-q4_0.gguf` to save ~1.9 GB. |

All of these paths are ignored by git (`.gitignore`: `data/`, `*.gguf`, `target` in src-tauri), so nothing tracked by the repo is deleted.

## Script

From the repo root:

```bash
# See what would be removed and sizes
bash desktop/scripts/free-disk-space.sh dry-run

# Actually remove target and (optionally) resources/models/*.gguf when data/models has a model
bash desktop/scripts/free-disk-space.sh run
```

To remove one of the two models in `data/models/`, delete the file manually (e.g. remove `llama-3.2-3b-instruct-q4_0.gguf` and keep `Llama-3.2-3B-Instruct-Q4_K_M.gguf`).

## After cleanup

- Run `npm run dev` from `desktop/` as usual. The app will find the model in `data/models/` and run.
- If you later run a release build, the bundle will embed whatever is in `desktop/src-tauri/resources/` at build time; add a model back to `resources/models/` only if you need a zero-config installer.
