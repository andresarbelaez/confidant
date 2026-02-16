# Desktop LLM response time optimization

Ways to reduce time-to-first-token and total response time for the Confidant desktop app (Tauri + llama-cpp-python).

## Already in place

- **Preloaded worker**: Model is loaded once in a long-lived Python process; first user message uses it (no cold load). Saves ~2s vs one-shot.
- **Streaming**: Token-by-token streaming so the user sees output quickly.
- **Limited history**: Only last 2 exchanges (4 messages) in the prompt.
- **Warmup pass**: After the worker loads the model, one minimal forward pass warms Metal/CPU caches before the first real request.
- **n_batch=1024**: Fewer, larger prefill batches for faster first token.
- **Prefix cache (LlamaRAMCache)**: The worker sets a 512 MB RAM cache on the model. llama-cpp-python uses it to reuse the KV cache when prompts share a common prefix (e.g. the long system prompt). First request in a session does full prefill; later requests with the same system prefix only prefill the variable part (conversation + user message), reducing time-to-first-token with no effect on response quality. Requires `llama_cpp.llama_cache.LlamaRAMCache` (present in recent llama-cpp-python).

## Further options (by impact vs effort)

### High impact

1. **Shorter system prompt**  
   The system instructions are ~1.5k characters. A compact version (3–5 short bullets: tone, safety, “keep brief + one follow-up question”) can cut hundreds of tokens and noticeably speed prefill. Tradeoff: less guidance; keep safety and “not a substitute for professional care” in.

2. **Smaller or more quantized model**  
   Same hardware: Q4_0 is faster than Q8; 1.5B/3B is faster than 8B. Tradeoff: quality. Current default is 3B; already a good balance.

### Medium impact

3. **RAG context cap**  
   `buildSmartContext` already caps at 800 chars. You can lower to 400–600 for faster prefill when RAG is used, at the cost of less injected context.

4. **n_ctx**  
   If prompts rarely exceed 1024 tokens, reducing `n_ctx` from 2048 to 1024 can save memory and a bit of prefill. Only if you’re sure context fits.

### Lower impact / tuning

5. **max_tokens**  
   Already 256. Lowering to 128 would shorten total time for very short replies; may truncate longer ones.

6. **Hardware**  
   Metal is used (`n_gpu_layers=-1`). On Mac, first token is often CPU-bound for prefill; more GPU layers help when the build supports it.

7. **Quiet worker logs**  
   Draining worker stderr avoids blocking; optionally log only errors to reduce terminal noise (no latency gain).

## Metrics

- **First token**: Dominated by prefill (prompt length, batch size, model size, hardware).
- **Total time**: First token + decode (tokens × speed). `[Confidant] LLM response: … first token: Xms` in the terminal tracks first token; total and chars/s track full response.
