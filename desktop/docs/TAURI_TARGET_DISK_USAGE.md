# Why the Tauri `target/` directory gets so large

The `desktop/src-tauri/target/` directory can grow to **tens of GB** (e.g. 7GB → 28GB in a short time). Here’s why and what to do.

## Causes

1. **Debug + release both kept**  
   - `npm run dev` builds **debug** artifacts (`target/debug/`).  
   - `npm run build` builds **release** artifacts (`target/release/`).  
   Cargo does not remove the other profile, so both stay on disk.

2. **Incremental compilation (debug)**  
   - Rust keeps incremental compilation data under `target/debug/incremental/` to speed up rebuilds.  
   - This cache is **never** automatically pruned and can grow a lot over many edits.

3. **Bundled resources copied into every bundle**  
   - When you run `tauri build`, everything in `src-tauri/resources/` (Python env, scripts, optional `models/default_model.gguf`, etc.) is **embedded into the app** under `target/release/bundle/`.  
   - If you have a large default model (e.g. ~4.4GB) and/or the Python bundle (~hundreds of MB), **each** release build puts a full copy into the bundle output.  
   - Building multiple times or for multiple platforms (e.g. aarch64 + x86_64) multiplies that.

4. **No automatic cleanup**  
   - Cargo does not delete old artifacts. Old dependency builds and incremental data accumulate until you clean.

## What you’ll see when you run the cleanup script

Running `bash scripts/free-disk-space.sh` (dry-run) now prints a **breakdown** of `target/`:

- `debug` – dev builds + incremental cache (often the biggest over time).
- `release` – release builds.
- `release/bundle` – installer outputs (.app, .dmg, etc.); each can be several GB if resources include a large model and Python.

That breakdown shows what is using the space.

## How to reclaim space

- **Delete the whole target (safest for “I want space back”):**  
  From `desktop/`:  
  `rm -rf src-tauri/target`  
  Or run the script with `run`:  
  `bash scripts/free-disk-space.sh run`  
  and confirm the Tauri target step.  
  The next `npm run dev` or `npm run build` will recreate what it needs (slower first time).

- **Only remove debug (keep release):**  
  `rm -rf desktop/src-tauri/target/debug`  
  Saves space while keeping the last release bundle. Next `npm run dev` will rebuild debug.

- **Only remove release bundles (keep release build cache):**  
  `rm -rf desktop/src-tauri/target/release/bundle`  
  Removes the big .app/.dmg copies but keeps release build artifacts so the next `npm run build` is faster.

## Reducing future growth

- Run **release builds** only when you need an installer; use `npm run dev` for day-to-day work.  
- Periodically run **`cargo clean`** in `desktop/src-tauri/` (or delete `target/`) when disk space is tight.  
- If you use a **full bundle** (default model + Python) only for beta builds, avoid keeping many old release bundles; delete `target/release/bundle` when you no longer need those installers.
