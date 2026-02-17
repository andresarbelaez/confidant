# Cross-Platform Mobile (On-Device) Plan: Confidant

This document outlines the plan for adding a **cross-platform mobile version** of Confidant that runs **fully on-device** (no server): chat and RAG on iOS and Android.

---

## Scope and constraints (decided)

| Item | Decision |
|------|----------|
| **Scope** | Chat + RAG (retrieval-augmented generation). |
| **Network** | No server connection or communication; app must work without any backend. |
| **Offline** | Must work completely offline after models and data are on device. |
| **App size** | Optimize for smaller app size (e.g. optional model download, small default or no bundled model, efficient assets). |
| **Development** | Emphasis on cross-platform compatibility: shared logic and minimal platform-specific code where possible. |

---

## Questions to define next steps

Answer these to lock scope, unblock Phase 1–2, and prioritize work. You can add your answers under each heading or in a separate doc and then update the plan checkboxes.

### Scope (v1)

1. For v1, should the app support **one conversation at a time** or **multiple conversations** (with list and switching)?
2. For RAG in v1: should users **add documents/files** inside the app only, or also **paste text** or **import from elsewhere** (e.g. share sheet)?
3. What **minimum device** are you targeting (e.g. iPhone 11+, Android 10+, or “last 3 years”)?
4. Is **chat-only** (no RAG) an acceptable v1 fallback if RAG takes longer, or must v1 ship with RAG?

### Out of scope for v1

5. What is **explicitly out of scope** for v1? (e.g. sync across devices, cloud backup, multiple user accounts, sharing conversations, widgets, Siri/Assistant integration.)
6. Are **in-app purchases or subscriptions** (e.g. for premium models or features) in scope later, or should the app stay free and fully local forever?

### Repo and tooling

7. Should the mobile app live **in this repo** (e.g. `apps/confidant-mobile`) or in a **separate repo**? Any reason (e.g. team, CI, release cycle)?
8. Do you prefer **Expo** (easier setup, some constraints) or **bare React Native** (more control, more native setup) for the mobile project?
9. Who will do the **native work** (iOS/Android)? (Solo, contractor, or “learn as we go” affects how much we lean on existing bindings like react-native-llama.cpp vs custom modules.)

### Platform order and tech

10. Which platform do you want to **build first**: iOS or Android? (Often iOS first for on-device ML tooling.)
11. For the **LLM runtime**, do you have a preference: **llama.cpp on both**, or **MLX on iOS + llama.cpp on Android**? (Affects PoC and shared API design.)
12. For **models**: do you want a **small default model bundled** in the app (simpler UX, larger download), **download-only** (smaller app, requires network once), or **both** (e.g. tiny bundled + optional larger download)?

### Priorities and timeline

13. What is the **main goal** for the next 4–8 weeks: “validate that on-device is feasible” (PoC only), “ship a minimal chat on one platform,” or “shared package + desktop refactor only”?
14. Any **hard deadlines** (e.g. conference, funding, beta) that should shape the order of steps?
15. Are there **existing mobile apps or codebases** (yours or open-source) you want to reuse or align with (e.g. UI patterns, naming)?

---

## Decisions (from Q&A)

| # | Topic | Decision |
|---|--------|----------|
| 1 | Conversations | One conversation at a time; passcode to lock/unlock the chat. |
| 2 | RAG | **Static** database of mental health knowledge + **dynamic** database for user-specific information disclosed to the AI as the user uses the app (no user-uploaded documents). |
| 3 | Minimum device | Maximize accessibility (e.g. 5–10 years old devices); to be validated in Phase 1 (LLM/embedding requirements on older hardware). |
| 4 | Fallback | Focus on implementing RAG and monitoring performance of search, bindings, etc.; no chat-only fallback as target. |
| 5 | Out of scope | Sync across devices, cloud backup, multiple user accounts. No conversation sharing except copy-paste of single AI messages (like desktop). |
| 6 | Monetization | No in-app purchases or subscriptions. Free and fully local; quality of support is a top priority. |
| 7 | Repo | Mobile app lives in this repo (e.g. `apps/confidant-mobile` or `mobile/`). |
| 8 | Expo vs bare RN | See [Expo vs bare React Native](#expo-vs-bare-react-native) below. |
| 9 | Native work | Learn as we go; prefer existing bindings (e.g. react-native-llama.cpp) where possible. |
| 10 | First platform | iOS first. |
| 11 | LLM runtime | No preference; choose whatever prioritizes performance, app size, and true cross-platform (suggests **llama.cpp on both** for one code path). |
| 12 | Models | Small default model **bundled** in the app for now. |
| 13 | Next 4–8 weeks | Main goal: **validate that on-device is feasible** (PoC). |
| 14 | Deadlines | No hard deadlines. |
| 15 | Existing code | No existing mobile apps or codebases to reuse. |

### Expo vs bare React Native

| | Expo | Bare React Native |
|---|-----|-------------------|
| **What it is** | Managed workflow: Expo manages native build config, OTA updates, and a curated set of native modules. You can eject to a “prebuild” for custom native code. | You create and own the iOS/Android projects; you add and link native modules and edit `Podfile` / `build.gradle` yourself. |
| **Pros** | Faster setup (no Xcode/Android Studio required to start). OTA updates for JS-only changes. Consistent tooling (EAS Build, EAS Submit). Large ecosystem of Expo modules; many things “just work.” Good for “learn as we go” because less native surface. | Full control over native code, build flags, and third-party native libs. No Expo SDK constraints. Easier to integrate arbitrary native C/C++ (e.g. llama.cpp) without going through Expo’s compatibility layer. |
| **Cons** | Some native modules or custom native code require “development builds” or ejection; on-device ML (llama.cpp, Core ML) often needs custom native code. Expo’s compatibility list may lag for cutting-edge native libs. | More setup and maintenance; you own upgrades to React Native and native toolchains. Steeper learning curve if you’re new to Xcode/Android Studio. |
| **For Confidant** | **Expo** is viable if we use **development builds** and add a config plugin or custom native module for llama.cpp/embeddings; we get easier onboarding and OTA. **Bare RN** gives the simplest path to shipping a small app with custom C++ (llama.cpp) and no Expo dependency; better if we want to minimize app size and avoid any Expo runtime overhead. **Recommendation:** Start with **Expo (development builds)** for faster iteration and use a community binding (e.g. react-native-llama.cpp) if it works with Expo; if we hit limits, we can prebuild/eject and trim to bare RN. |

**Decision:** Expo first accepted. RAG design runs in parallel to PoC (see [RAG design](mobile-rag-design.md)).

### llama.cpp + React Native (quick check)

- **llama.cpp on both:** Confirmed for one code path, performance, and app size.
- **Options:** (1) **@runanywhere/llamacpp** — Expo-friendly, `expo-build-properties` for iOS/GPU; GGUF, Metal on iOS, streaming; React Native 0.74+, iOS 15.1+, Android API 24+. (2) **llama.rn** — React Native binding, Metal (iOS) and Hexagon NPU (Android), New Architecture. Both support Expo development builds.
- **Next:** Use **@runanywhere/llamacpp** or **llama.rn** for iOS PoC; add to app when scaffolding is done.

---

## Phase 1: Validate and decide

### Step 1: Clarify scope and constraints

- [x] **Scope:** Chat + RAG (see table above).
- [x] **Constraints:** No server, fully offline, optimize app size, cross-platform emphasis.
- [x] **v1 feature list:** Single conversation; passcode lock/unlock; RAG from static mental-health KB + dynamic user-disclosed context; small default model bundled; settings (e.g. passcode, RAG on/off). See Decisions table.
- [x] **Out of scope for v1:** Sync across devices, cloud backup, multiple user accounts; no conversation sharing except copy-paste of single AI messages (like desktop). No in-app purchases.

### Step 2: Check ecosystem and feasibility

- [x] **On-device LLM:** llama.cpp on both confirmed. Options for Expo: @runanywhere/llamacpp or llama.rn (see “llama.cpp + React Native” above). Verify GGUF performance on older devices during PoC.
- [ ] **On-device embeddings:** Identify a small embedding model and runtime path (Core ML / TFLite / custom) that fits size and latency goals.
- [ ] **Vector store:** Choose approach for v1 (in-memory vs SQLite with vector extension) for both static KB and dynamic user context; confirm libraries or implementation path on both platforms.
- [ ] **Minimum device:** Research or spike what “absolute minimum” device is feasible (RAM, OS version) for small GGUF + embeddings; document for accessibility goal.
- [ ] **App store policies:** Skim Apple and Google policies for on-device ML, model downloads, and data storage; note any restrictions or disclosure requirements.
- [ ] **Risks and blockers:** Document any technical or policy blockers and mitigation.

---

## Phase 2: Foundation (shared code + one-platform PoC)

### Step 3: Repo and structure

- [x] **Location:** Mobile app lives in this repo (e.g. `apps/confidant-mobile` or `mobile/`). See Decisions.
- [x] **Scaffold:** Expo app created at `apps/confidant-mobile` (TypeScript, React Navigation). Run `npm install` and `npm start` in that directory; add `assets/icon.png` and `assets/adaptive-icon.png` for production builds.

### Step 4: Shared package

- [ ] **Create package:** Add a shared package (e.g. `packages/confidant-core`) that contains:
  - **Types:** Message, conversation, config, RAG context, and any other shared interfaces (no DOM/Node dependencies).
  - **Prompts:** System prompts and templates used by the agent (plain strings or simple functions).
  - **Orchestration interface:** Logic that, given messages and retrieved RAG chunks, produces the payload for the model (same flow as desktop, but callable from both desktop and mobile).
- [ ] **Wire desktop:** Refactor the desktop app to depend on this package and use it for types and prompts; keep using the existing Python stack for LLM and embeddings. Validate that desktop behavior is unchanged.

### Step 5: Minimal mobile UI

- [x] **Screens:** Minimal chat UI (message list, input, “Generate (mock)” placeholder). Lock screen (passcode placeholder) and Settings stub (Passcode, RAG placeholders). Shared package not yet wired—use local types for now.
- [x] **Navigation and settings placeholder:** React Navigation stack: Lock, Chat, Settings. Chat header has Settings button.

### Step 6: One-platform LLM proof-of-concept

- [x] **Pick first platform:** iOS first. See Decisions.
- [ ] **Integrate LLM runtime:** Build and integrate llama.cpp (or MLX on iOS) for that platform:
  - Native module or bridge exposing e.g. `loadModel(path)` and `generate(prompt, options, onToken)`.
  - Use a small GGUF model (bundled for PoC or from a fixed path).
- [ ] **Wire to UI:** “Generate” in the app calls the native LLM and displays streamed tokens. Goal: real on-device completion with no server.

### Step 7: Optional – Embeddings + vector search spike

- [ ] **Spike:** Implement a minimal path for on-device embeddings (small model + native or JS-side inference) and simple in-memory vector search (e.g. cosine similarity over an array). Goal: validate that “embed query → get top-k chunks” is feasible before full RAG implementation.

---

## Phase 3: RAG, second platform, and ship

### Step 8: On-device embeddings and vector store

- [ ] **Embedding model:** Select and integrate the chosen embedding model and runtime on the first platform; expose an `embed(text)` (or equivalent) API to the app layer.
- [ ] **Vector store:** Two RAG sources: (1) **static** mental-health knowledge base (bundled or one-time load), (2) **dynamic** store for user-disclosed information (updated as the user chats). Implement store(s) (in-memory and/or SQLite-based) and expose search (e.g. by query embedding, return top-k chunks).
- [ ] **RAG flow:** In the shared layer (or app), implement: embed user query → search both static + dynamic stores → build context string → call on-device LLM with context. Monitor search and binding performance. Verify end-to-end RAG on the first platform.

### Step 9: Second platform

- [ ] **Port LLM:** Bring the same LLM integration (llama.cpp or equivalent) to the other platform; reuse the same GGUF and API shape where possible.
- [ ] **Port embeddings and store:** Port the embedding runtime and vector store to the second platform; keep the same interface so the shared RAG flow works on both.
- [ ] **Shared package and UI:** Ensure the React Native app and shared package work on both iOS and Android with minimal platform branches.

### Step 10: Model distribution and app size

- [ ] **Model delivery:** Small default model bundled in app for v1 (see Decisions). Optional: later add in-app download for larger model; ensure clear storage usage.
- [ ] **Size and UX:** Optimize asset and binary size; consider on-demand download of models to keep initial install small. Document storage requirements for users.

### Step 11: Polish and release

- [ ] **Settings:** Model selection, RAG on/off, context length or other limits, and any privacy-related toggles.
- [ ] **Error handling and offline:** Graceful behavior when no model is present, when storage is full, or when the device is underpowered; clear messaging.
- [ ] **Store submission:** Finalize store listings, privacy/disclosure for on-device ML, and any required permissions (storage, etc.); submit to App Store and Play Store.

---

## Summary

| Phase | Focus |
|-------|--------|
| **Phase 1** | Lock scope (chat + RAG, no server, offline, small size, cross-platform) and validate ecosystem and feasibility. |
| **Phase 2** | Shared package, minimal mobile UI, and one-platform on-device LLM PoC; optional embeddings/RAG spike. |
| **Phase 3** | Full RAG on first platform, port to second platform, model distribution and size optimization, then polish and release. |

This plan assumes **Option B** (full on-device): no server dependency, with privacy and offline behavior as core constraints. The shared package keeps desktop and mobile aligned on types, prompts, and RAG orchestration while each platform uses its own native inference stack.
