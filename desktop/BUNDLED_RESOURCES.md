# Bundled default model and knowledge base

The app uses an **opinionated default** setup: it expects a default LLM and a default knowledge base to be available (either already on disk or from bundled resources). The initial flow no longer shows a setup screen; it goes from the loading screen (title + language) to the user selector. If the default model or KB are missing, the app shows an error and the user can open **Settings** to choose a model or KB manually.

## Where the app looks for bundled resources

The backend command `ensure_bundled_defaults_initialized` runs once after loading. It resolves paths in this order:

### Default model

1. **Environment (dev):** `CONFIDANT_BUNDLED_MODEL_PATH` — if set and the path exists, that file is used.
2. **Bundled resource:** `models/default_model.gguf` under the Tauri resource directory.

The packager/installer should place the default GGUF model file so it is available at one of these locations. For Tauri 2, add the file to `bundle.resources` in `src-tauri/tauri.conf.json` so it is shipped as `models/default_model.gguf` in the app’s resource directory.

### Default knowledge base

1. **Environment (dev):** `CONFIDANT_BUNDLED_KB_PATH` — if set and the path exists, that file is used.
2. **Bundled resource:** `default_kb.json` or `kb/default_kb.json` under the Tauri resource directory.

The KB file must be JSON in the same format as the URL-loaded package:

- `manifest`: object (version, name, description, documentCount, etc.)
- `documents`: array of `{ id, text, metadata }`
- `embeddings`: array of arrays of numbers (same length as `documents`)

The app will create the global collection `dant_knowledge_global` and ingest these documents (with precomputed embeddings) when the collection is empty and a bundled KB file is found.

## Config alignment

- **Default model:** [src/config/model-options.ts](src/config/model-options.ts) — the option with `default: true` (e.g. Mistral 7B) is the intended default. The bundled file can be that model renamed to `default_model.gguf`, or any compatible GGUF that the packager chooses.
- **Default KB:** [src/config/kb-options.ts](src/config/kb-options.ts) — the option with `default: true` (e.g. Lightweight Health KB) is the intended default. The `url` in that config is still used by **Settings** for “Download” when the user chooses to download a KB; for the initial bundled path, the app uses the resource paths above, not `url`.

## Example: adding resources in tauri.conf.json

To ship the default model and KB with the app, add them to the bundle resources so they appear under the resource directory:

```json
{
  "bundle": {
    "resources": [
      "path/to/default_model.gguf",
      "path/to/default_kb.json"
    ]
  }
}
```

Then configure the path so they are exposed as `models/default_model.gguf` and `default_kb.json` (or `kb/default_kb.json`). See [Tauri 2 resources](https://v2.tauri.app/develop/resources) for exact path mapping.

## Development without bundling

- Set `CONFIDANT_BUNDLED_MODEL_PATH` to an existing GGUF path (e.g. in `data/models/`).
- Set `CONFIDANT_BUNDLED_KB_PATH` to an existing JSON package path (e.g. `test_knowledge_base.json` or a similar file with `manifest`, `documents`, and `embeddings`).

If neither is set and no bundled resources exist, the app will show the error screen and the user can open Settings to download/select a model and KB.
