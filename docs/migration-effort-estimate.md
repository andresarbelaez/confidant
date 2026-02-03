# Desktop App Migration Effort Estimate

## Overview

This document provides detailed effort estimates for migrating dant from web app (PWA) to desktop app using Tauri 2.0 or Electron.

## Current Codebase Size

**Total Lines of Code**: ~5,200 lines
- React Components: ~2,500 lines
- LLM Engine: ~250 lines
- Vector Store: ~500 lines
- Agent/RAG: ~450 lines
- Knowledge System: ~400 lines
- Utils/Helpers: ~200 lines
- Service Worker: ~200 lines
- Config/Setup: ~700 lines

## Tauri 2.0 Migration

### Phase 1: Project Setup (3-5 days)

**Tasks:**
- Install Tauri CLI and dependencies
- Create new `desktop/` directory structure
- Set up Tauri + React + TypeScript + Vite
- Configure build system
- Set up development environment

**Effort**: 3-5 days
**Risk**: Low

### Phase 2: Frontend Migration (5-7 days)

**Tasks:**
- Move React components from `web/src/components/` to `desktop/src/components/`
- Update imports and paths
- Adapt to Tauri command system (replace direct API calls)
- Update `App.tsx` and routing
- Test all UI components

**Files to Move:**
- `components/ChatInterface.tsx` → `desktop/src/components/`
- `components/ModelDownloader.tsx` → `desktop/src/components/`
- `components/KnowledgeBaseManager.tsx` → `desktop/src/components/`
- `components/NetworkMonitor.tsx` → `desktop/src/components/` (adapt for desktop)
- All CSS files

**Files to Adapt:**
- `App.tsx` - Update to use Tauri commands
- `agent/dant-agent.ts` - Update to use Tauri backend
- Remove Service Worker references

**Effort**: 5-7 days
**Risk**: Low (React code mostly portable)

### Phase 3: LLM Engine Backend (7-10 days)

**Tasks:**
- Choose backend approach (Rust vs Node.js)
- If Rust: Learn basics, implement llama.cpp bindings
- If Node.js: Set up node-llama-cpp integration
- Create Tauri commands for model initialization
- Create Tauri commands for text generation
- Implement progress callbacks via Tauri events
- Handle model file downloads (native file system)
- Test model loading and inference

**New Files:**
- `desktop/src-tauri/src/llm.rs` (Rust) or `desktop/src-tauri/src/llm.ts` (Node.js)
- `desktop/src/llm/desktop-llm-engine.ts` (TypeScript wrapper)

**Effort**: 7-10 days
**Risk**: Medium (new technology, different APIs)

### Phase 4: Vector Store Backend (5-7 days)

**Tasks:**
- Choose approach (SQLite+HNSW Rust vs ChromaDB Python)
- Implement vector storage backend
- Implement HNSW search
- Create Tauri commands for vector operations
- Migrate data format (if needed)
- Test vector search performance

**New Files:**
- `desktop/src-tauri/src/vector_store.rs` (Rust) or Python integration
- `desktop/src/knowledge/desktop-vector-store.ts` (TypeScript wrapper)

**Effort**: 5-7 days
**Risk**: Medium (different storage backend)

### Phase 5: Knowledge Base System (3-5 days)

**Tasks:**
- Adapt knowledge loader for native file system
- Update file paths and storage locations
- Implement ZSTD decompression (if using Rust)
- Update KnowledgeBaseManager component
- Test knowledge base loading

**Files to Adapt:**
- `knowledge/knowledge-loader.ts` - Update file system paths
- `components/KnowledgeBaseManager.tsx` - Update UI for desktop

**Effort**: 3-5 days
**Risk**: Low (mostly path changes)

### Phase 6: Remove Browser-Specific Code (2-3 days)

**Tasks:**
- Remove Service Worker entirely
- Remove Cache Storage references
- Remove IndexedDB references (replace with backend)
- Remove browser-specific utilities
- Update Network Monitor (adapt for desktop)
- Clean up unused dependencies

**Files to Remove:**
- `service-worker.ts`
- Browser-specific utils

**Effort**: 2-3 days
**Risk**: Low

### Phase 7: Integration & Testing (5-7 days)

**Tasks:**
- Connect all frontend to backend
- Test end-to-end workflows
- Fix integration issues
- Performance optimization
- Error handling
- User experience polish

**Effort**: 5-7 days
**Risk**: Medium (integration issues)

### Phase 8: Packaging & Distribution (3-5 days)

**Tasks:**
- Create macOS app bundle
- Create Windows installer
- Create Linux package (AppImage/DEB)
- Code signing (macOS/Windows)
- Auto-updater setup
- Test installations

**Effort**: 3-5 days
**Risk**: Low-Medium (platform-specific issues)

## Total Effort Estimate: Tauri

**Minimum**: 33 days (6.6 weeks)
**Realistic**: 40 days (8 weeks)
**Maximum**: 50 days (10 weeks) with learning curve

**Breakdown:**
- Setup: 3-5 days
- Frontend: 5-7 days
- LLM Backend: 7-10 days
- Vector Store: 5-7 days
- Knowledge System: 3-5 days
- Cleanup: 2-3 days
- Integration: 5-7 days
- Packaging: 3-5 days

## Electron Migration (Faster Alternative)

### Phase 1: Project Setup (2-3 days)
- Install Electron Forge
- Set up Electron + React + TypeScript
- Configure build system

### Phase 2: Frontend Migration (3-5 days)
- Move React components (easier, more similar)
- Adapt to Electron IPC
- Update imports

### Phase 3: LLM Engine Backend (4-6 days)
- Set up node-llama-cpp
- Create Electron IPC handlers
- Implement model management
- **Faster**: Can reuse more concepts from web app

### Phase 4: Vector Store Backend (3-5 days)
- Set up ChromaDB (can reuse Python code via child_process)
- Or implement SQLite + HNSW in Node.js
- Create IPC handlers

### Phase 5: Knowledge System (2-4 days)
- Adapt for Electron file system
- Update paths

### Phase 6: Cleanup (1-2 days)
- Remove Service Worker
- Remove browser APIs

### Phase 7: Integration (3-5 days)
- Connect everything
- Test

### Phase 8: Packaging (2-4 days)
- Electron Builder setup
- Platform packages

## Total Effort Estimate: Electron

**Minimum**: 20 days (4 weeks)
**Realistic**: 25 days (5 weeks)
**Maximum**: 35 days (7 weeks)

**Why Faster:**
- Node.js familiarity (if team knows it)
- Can reuse Python code more easily
- More similar to web app structure
- Larger ecosystem = more examples

## Risk Factors

### High Risk Items
1. **Learning Rust** (if choosing Tauri with Rust backend)
   - Mitigation: Use Node.js backend option
   - Or allocate extra time for learning

2. **Platform-Specific Issues**
   - Different behaviors on macOS/Windows/Linux
   - Mitigation: Test on all platforms early

3. **Performance Issues**
   - First implementation might be slow
   - Mitigation: Profile and optimize

### Medium Risk Items
1. **Model Format Differences**
   - WebLLM uses MLC format
   - llama.cpp uses GGUF
   - Mitigation: Re-download models in GGUF format

2. **Vector Store Performance**
   - Different implementations might be slower
   - Mitigation: Benchmark and optimize

### Low Risk Items
1. **Frontend Migration**
   - React code is portable
   - Well-documented process

2. **UI/UX**
   - Same design, just different platform
   - Mostly straightforward

## Code Reuse Summary

### Tauri Migration
- **Reusable**: ~3,150 lines (60%)
- **New Code**: ~1,500-2,000 lines (Rust/Node.js backend)
- **Total New Codebase**: ~5,000-5,500 lines

### Electron Migration
- **Reusable**: ~3,150 lines (60%)
- **New Code**: ~1,000-1,500 lines (Node.js backend)
- **Total New Codebase**: ~4,500-5,000 lines

## Timeline Comparison

| Framework | Minimum | Realistic | Maximum |
|-----------|---------|-----------|---------|
| **Tauri** | 6.6 weeks | 8 weeks | 10 weeks |
| **Electron** | 4 weeks | 5 weeks | 7 weeks |
| **Native** | 12+ weeks | 16+ weeks | 20+ weeks |

## Recommendation

**For MVP**: **Electron** (faster migration, 4-5 weeks)
- Lower risk
- Faster to market
- Can optimize later

**For Long-term**: **Tauri** (better UX, 6-8 weeks)
- Better user experience
- Aligns with privacy values
- Future mobile support

**Not Recommended**: **Native** (too long, 12+ weeks)
- Only if performance is absolutely critical
- Better as Phase 2 optimization
