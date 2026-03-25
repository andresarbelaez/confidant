# Confidant — Central Tech Stack Summary

A short reference for presentation: key technologies and why they were chosen for **privacy** and **performance**.

| Technology / framework | Privacy | Performance |
|------------------------|---------|-------------|
| **Tauri 2 + Rust** | No Electron; minimal attack surface. Backend is Rust—file I/O, process control, and data stay on the host. No bundled Chromium or cloud SDKs; app can run fully offline. | Small binary and low memory footprint vs Electron. Rust handles IPC and process lifecycle efficiently. |
| **React + TypeScript + Vite** | UI runs in a local WebView; no required network for the app shell. All orchestration (agent, RAG flow) is client-side. | Vite gives fast dev/build; React + TypeScript keep UI predictable and maintainable for streaming chat. |
| **llama.cpp + GGUF** | LLM inference is 100% on-device. No API keys, no telemetry, no data sent to any server. User conversations never leave the machine. | GGUF quantization (e.g. Q4_0) keeps model size and inference cost down. Native Metal/CPU; streaming tokens for responsive UX. |
| **ChromaDB** | Vector store is a local database in the app data directory. No cloud index, no external embedding or search APIs. | Embedded DB; fast similarity search for RAG. Runs in a Python subprocess so it doesn’t block the UI. |
| **sentence-transformers** | Embeddings are computed locally in a Python subprocess. No calls to OpenAI or other embedding APIs; text never leaves the device. | Same model for indexing and querying; precomputed embeddings for the static knowledge base reduce runtime work. |
| **Local app data only** | Models, ChromaDB, user store, and response cache live in the OS app data dir. No sync, no backup to our servers. | No network latency; optional response cache avoids re-running the LLM for repeated or similar queries. |

---

*Source: [DESKTOP_APP_ARCHITECTURE.md](./DESKTOP_APP_ARCHITECTURE.md), [README.md](../README.md), [desktop-llm-response-optimization.md](./desktop-llm-response-optimization.md).*
