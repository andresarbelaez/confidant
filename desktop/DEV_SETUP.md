# Default testing flow (dev)

This describes how to get the same “defaults ready” experience locally as a user who downloads the desktop app with bundled model and KB, **without** shipping a real bundle.

## What the app does on startup

On launch, the app calls `ensure_bundled_defaults_initialized`, which:

1. **Model** – Looks for a default model in this order:
   - `CONFIDANT_BUNDLED_MODEL_PATH` (env, full path to a `.gguf` file)
   - Bundled resource: `models/default_model.gguf` (production only)
   - **Dev fallback:** `data/models/` under the project (same place Settings uses):
     - `mistral-7b-instruct-v0.2-q4_k_m.gguf` or
     - `mistral-7b-instruct-v0.2.Q4_K_M.gguf` or
     - Any `.gguf` in `data/models/`

2. **Knowledge base** – Ensures the global KB collection exists; if it’s empty, ingests from:
   - `CONFIDANT_BUNDLED_KB_PATH` (env)
   - Bundled resource: `default_kb.json` or `kb/default_kb.json`
   - **Dev fallback:** `test_knowledge_base.json` in the project (e.g. `desktop/test_knowledge_base.json` or repo root)

So for **local testing with defaults already “there”**, you only need to put the model and (optionally) KB in those locations once.

## One-time setup (recommended)

### Option A: Use Settings once

1. Run the app: `npm run dev` (from `desktop/`).
2. You’ll see the error: “Confidant couldn’t find the default model or knowledge base…”
3. Click **Open Settings** to go to the user selector screen, then click the **Settings** (gear) button there.
4. In Settings, **download the default model** and **download the default KB** (same as a user would).
5. Close the app and run `npm run dev` again.

From the second run on, the app will find:

- The model in `data/models/` (project root is detected from cwd when running from `desktop/` or `desktop/src-tauri/`).
- The KB either already in ChromaDB (from step 4) or, if the collection were empty, from `desktop/test_knowledge_base.json` (dev fallback).

So after one run where you use Settings to download model + KB, the next runs go straight to user selector like a “defaults ready” install.

### Option B: Env vars (no UI)

Set paths to an existing model and (optional) KB file:

```bash
export CONFIDANT_BUNDLED_MODEL_PATH="/absolute/path/to/your/model.gguf"
export CONFIDANT_BUNDLED_KB_PATH="/path/to/desktop/test_knowledge_base.json"
npm run dev
```

Use this if you already have a `.gguf` and a KB JSON (e.g. `desktop/test_knowledge_base.json`) and want to skip the Settings flow.

### Option C: Seed files by hand

- **Model:** Put a default model `.gguf` in the project under `data/models/`. The app looks for that directory by walking up from the current working directory (e.g. when you run from `desktop/`, it will use `../data/models/` or the repo’s `data/models/`). Name the file e.g. `mistral-7b-instruct-v0.2-q4_k_m.gguf` or `mistral-7b-instruct-v0.2.Q4_K_M.gguf`, or any single `.gguf` in that folder.
- **KB:** Leave `desktop/test_knowledge_base.json` in place (it’s in the repo). If the global KB collection is empty, the app will ingest from that file when it finds it via the dev fallback.

## Summary

- **First run:** You may see the error screen if no model/KB is found.
- **One-time:** Use Settings to download the default model and KB (or set env vars / drop files as above).
- **Later runs:** The app finds the model in `data/models/` and either the existing ChromaDB KB or `test_knowledge_base.json`, and goes straight to the user selector, matching the “defaults ready” experience of a bundled install.
