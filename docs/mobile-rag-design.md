# Mobile RAG Design (Confidant)

Design for on-device RAG on mobile: **static** mental-health knowledge base + **dynamic** user-disclosed context. To be implemented in parallel to the LLM PoC and refined as we validate.

---

## Goals

- **Static KB:** Curated mental-health knowledge; same for all users; bundled or one-time load.
- **Dynamic store:** User-specific facts and preferences the user discloses in chat; updated as they use the app.
- **No user-uploaded documents** in v1 (no PDFs, files, or paste-from-outside for RAG ingestion).
- **Privacy and offline:** All processing on-device; no server; data stays on device.

---

## 1. Static knowledge base (mental health)

| Question | Options / notes |
|----------|------------------|
| **Content source** | Curated markdown/text from trusted sources (e.g. NIMH, WHO, or in-house); or licensed dataset; or generated then reviewed. |
| **Format** | Chunked text (e.g. by section or by fixed token size). Each chunk has: `id`, `text`, `source` (e.g. section title, URL), optional `category` (e.g. anxiety, sleep). |
| **Embeddings** | Precomputed embeddings for each chunk (same embedding model as runtime). Stored in app bundle or loaded once. |
| **Storage** | Option A: Precomputed vectors + metadata in a single file (e.g. SQLite or custom binary). Option B: In-memory at launch from bundled asset. Option C: SQLite with vector extension (e.g. sqlite-vec) if available on mobile. |
| **Size** | Target small footprint (e.g. &lt; 50MB for KB + embeddings) so bundling is feasible. |
| **Updates** | v1: static at ship. Later: optional in-app update of KB (still no server dependency if we use e.g. a signed asset delivered via CDN once). |

**Open decisions**

- [ ] Exact content source and license.
- [ ] Chunking strategy (semantic vs fixed-size) and max chunk length.
- [ ] Embedding model (must match runtime; small model preferred for size/speed).

---

## 2. Dynamic user context (disclosed in chat)

| Question | Options / notes |
|----------|------------------|
| **What we store** | Facts and preferences the user states in conversation (e.g. “I take medication at 8am,” “I prefer short answers”). Not full conversation history for RAG—only extracted or designated “user context” items. |
| **Extraction** | Option A: Heuristic (e.g. “Remember: …” or “My … is …”). Option B: LLM-assisted extraction (run a small model to classify/compress user statements into context items). Option C: User explicitly adds to “what the AI knows about me” (e.g. a simple form or “Add to my context” on a message). |
| **Schema** | Simple: `id`, `text` (short statement), `createdAt`, optional `category` or `key` (e.g. medication, preferences). |
| **Embeddings** | Compute embedding for each new item when added; store vector + metadata. |
| **Storage** | Same vector store as static KB, or separate table/namespace so we can search “static only,” “dynamic only,” or “both.” Prefer same store for one search API. |
| **Retention** | v1: keep until user clears or resets. Later: optional TTL or user-editable list. |

**Open decisions**

- [ ] Extraction strategy for v1 (heuristic vs LLM vs explicit-only).
- [ ] Max number of dynamic items (e.g. 50–200) to cap size and search cost.
- [ ] Whether to re-embed on app upgrade if embedding model changes (or version the store).

---

## 3. Search and retrieval

| Question | Options / notes |
|----------|------------------|
| **Query** | Embed the current user message (and optionally last N messages or a short summary). |
| **Search** | Single query over static + dynamic; or two queries (static top-k, dynamic top-k) then merge/dedup. Prefer single index with a “source” field (static vs dynamic) so we can weight or filter. |
| **Top-k** | Start with e.g. 5–10 chunks total; tune for context window and quality. |
| **Reranking** | v1: optional simple rerank (e.g. by keyword overlap or length). Later: cross-encoder or small reranker if needed. |
| **Context order** | Static first, then dynamic; or interleave by relevance. Document choice in prompts. |

**Open decisions**

- [ ] Exact top-k and max total context length for the LLM.
- [ ] Whether to include “source” (e.g. “Mental health KB” vs “What you’ve told me”) in the context string for the model.

---

## 4. Integration with chat

- **System prompt:** Instruct the model to use the provided context (static + dynamic) and to treat dynamic context as user-specific facts/preferences.
- **Orchestration:** On each user message: (1) embed query, (2) search static + dynamic, (3) build context string, (4) call LLM with system prompt + context + conversation history.
- **Performance:** Instrument search latency, embedding time, and token throughput; monitor on target devices (see mobile-on-device-plan.md “minimum device” goal).

---

## 5. Implementation order (parallel to PoC)

1. **Define schemas** — Chunk format for static KB; item format for dynamic context; vector store schema (columns/fields).
2. **Choose embedding model** — Small, on-device-friendly; same for static (precomputed) and dynamic (runtime). Verify availability on iOS (then Android).
3. **Static KB pipeline (offline)** — Script or pipeline: source content → chunk → embed → write to bundle asset (e.g. SQLite or binary). Not in the app repo necessarily; output is a file the app ships or loads.
4. **Vector store on device** — Implement or adopt a single store that supports: insert (dynamic), search by vector (static + dynamic). Option: in-memory for PoC; SQLite-based for v1.
5. **Dynamic extraction** — Implement chosen strategy (heuristic / explicit / LLM) and “add to context” flow; wire to store.
6. **RAG flow in app** — Embed query → search → build context → LLM; plug into shared orchestration once confidant-core exists.

---

## References

- **Plan:** [mobile-on-device-plan.md](mobile-on-device-plan.md) — RAG = static mental-health KB + dynamic user context; no user-uploaded documents.
- **Decisions:** Same doc, “Decisions (from Q&A)” — free, local, quality of support; RAG performance to be monitored.
