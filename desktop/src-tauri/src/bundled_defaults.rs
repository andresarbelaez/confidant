// Bundled defaults: resolve and initialize default model and global KB from bundled resources.

use serde::Serialize;
use std::path::{Path, PathBuf};
use std::fs;
use tauri::{AppHandle, Manager};

use crate::llm::{initialize_model, is_model_loaded};
use crate::vector_store::{
    initialize_vector_store,
    add_documents_to_collection,
    get_collection_stats_by_name,
};
use crate::vector_store::VectorDocument;

/// Default global KB collection name (must match frontend).
const GLOBAL_KB_COLLECTION: &str = "dant_knowledge_global";

/// Default model filename in bundled resources (packager places the default .gguf here).
const BUNDLED_MODEL_FILENAME: &str = "default_model.gguf";

/// Default model ID from frontend config (used for dev fallback path).
const DEFAULT_MODEL_ID: &str = "mistral-7b-instruct-v0.2-q4_k_m";

/// Filename used when downloading default model from URL (last segment of HuggingFace URL).
const DEFAULT_MODEL_DOWNLOAD_FILENAME: &str = "mistral-7b-instruct-v0.2.Q4_K_M.gguf";

/// Relative path to bundled KB JSON in resources (same format as URL-loaded package: manifest, documents, embeddings).
const BUNDLED_KB_FILENAME: &str = "default_kb.json";

#[derive(Debug, Serialize)]
pub struct BundledDefaultsStatus {
    pub model_ready: bool,
    pub kb_ready: bool,
}

/// Find project root (directory that contains "data" and ideally "desktop") for dev fallback.
fn find_dev_data_dir() -> Option<PathBuf> {
    let mut current = std::env::current_dir().ok()?;
    for _ in 0..6 {
        let data_dir = current.join("data");
        let models_dir = data_dir.join("models");
        if models_dir.exists() {
            return Some(data_dir);
        }
        if let Some(parent) = current.parent() {
            current = parent.to_path_buf();
        } else {
            break;
        }
    }
    None
}

/// Resolve the path to the bundled default model file.
/// Tries: (1) env CONFIDANT_BUNDLED_MODEL_PATH, (2) resource dir, (3) dev data/models (same as Settings download).
fn resolve_bundled_model_path(app: &AppHandle) -> Option<PathBuf> {
    if let Ok(env_path) = std::env::var("CONFIDANT_BUNDLED_MODEL_PATH") {
        let p = PathBuf::from(&env_path);
        if p.exists() {
            return Some(p);
        }
    }
    if let Some(resource_dir) = app.path().resource_dir().ok() {
        let p = resource_dir.join("models").join(BUNDLED_MODEL_FILENAME);
        if p.exists() {
            return Some(p);
        }
    }
    // Dev fallback: use same location as Settings download (project data/models/)
    if let Some(data_dir) = find_dev_data_dir() {
        let models_dir = data_dir.join("models");
        // Try exact filenames used by frontend (id.gguf or URL basename)
        for name in [
            format!("{}.gguf", DEFAULT_MODEL_ID),
            DEFAULT_MODEL_DOWNLOAD_FILENAME.to_string(),
            BUNDLED_MODEL_FILENAME.to_string(),
        ] {
            let p = models_dir.join(&name);
            if p.exists() {
                return Some(p);
            }
        }
        // Any .gguf in models (e.g. after one-time download via Settings)
        if let Ok(entries) = fs::read_dir(&models_dir) {
            for e in entries.flatten() {
                let path = e.path();
                if path.extension().map_or(false, |e| e == "gguf") {
                    return Some(path);
                }
            }
        }
    }
    None
}

/// Resolve the path to the bundled default KB JSON file.
/// Tries: (1) env, (2) resource dir, (3) dev: desktop/test_knowledge_base.json or project data/default_kb.json.
fn resolve_bundled_kb_path(app: &AppHandle) -> Option<PathBuf> {
    if let Ok(env_path) = std::env::var("CONFIDANT_BUNDLED_KB_PATH") {
        let p = PathBuf::from(&env_path);
        if p.exists() {
            return Some(p);
        }
    }
    if let Some(resource_dir) = app.path().resource_dir().ok() {
        for rel in [BUNDLED_KB_FILENAME, &format!("kb/{}", BUNDLED_KB_FILENAME)] {
            let p = resource_dir.join(rel);
            if p.exists() {
                return Some(p);
            }
        }
    }
    // Dev fallback: desktop/test_knowledge_base.json or data/default_kb.json
    if let Some(mut current) = std::env::current_dir().ok() {
        for _ in 0..6 {
            let p = current.join("test_knowledge_base.json");
            if p.exists() {
                return Some(p);
            }
            let p = current.join("data").join("default_kb.json");
            if p.exists() {
                return Some(p);
            }
            let p = current.join("desktop").join("test_knowledge_base.json");
            if p.exists() {
                return Some(p);
            }
            if let Some(parent) = current.parent() {
                current = parent.to_path_buf();
            } else {
                break;
            }
        }
    }
    None
}

/// Load bundled KB JSON and ingest into global collection.
/// Expects same format as frontend KnowledgeBasePackage: { manifest, documents: [{ id, text, metadata }], embeddings: number[][] }.
async fn ingest_kb_from_path(path: &Path) -> Result<(), String> {
    let content = fs::read_to_string(path)
        .map_err(|e| format!("Failed to read bundled KB file: {}", e))?;
    let data: serde_json::Value = serde_json::from_str(&content)
        .map_err(|e| format!("Invalid bundled KB JSON: {}", e))?;

    let documents = data["documents"]
        .as_array()
        .ok_or("Bundled KB: missing 'documents' array")?;
    let embeddings = data["embeddings"]
        .as_array()
        .ok_or("Bundled KB: missing 'embeddings' array")?;
    if documents.len() != embeddings.len() {
        return Err(format!(
            "Bundled KB: documents length {} != embeddings length {}",
            documents.len(),
            embeddings.len()
        ));
    }

    const BATCH_SIZE: usize = 50;
    for chunk_start in (0..documents.len()).step_by(BATCH_SIZE) {
        let chunk_end = (chunk_start + BATCH_SIZE).min(documents.len());
        let batch_docs: Vec<VectorDocument> = documents[chunk_start..chunk_end]
            .iter()
            .zip(embeddings[chunk_start..chunk_end].iter())
            .map(|(doc, emb)| {
                let id = doc["id"].as_str().unwrap_or("").to_string();
                let text = doc["text"].as_str().unwrap_or("").to_string();
                let metadata = doc.get("metadata").cloned().unwrap_or(serde_json::json!({}));
                let embedding: Vec<f32> = emb
                    .as_array()
                    .map(|arr| {
                        arr.iter()
                            .filter_map(|v| v.as_f64().map(|f| f as f32))
                            .collect()
                    })
                    .unwrap_or_default();
                VectorDocument {
                    id,
                    text,
                    embedding,
                    metadata,
                }
            })
            .collect();
        add_documents_to_collection(GLOBAL_KB_COLLECTION.to_string(), batch_docs).await?;
    }

    Ok(())
}

/// Ensure the default model and global KB are initialized from bundled resources when possible.
/// Call this once after loading; then check setup status (model_ready, kb_ready).
#[tauri::command]
pub async fn ensure_bundled_defaults_initialized(app: AppHandle) -> Result<BundledDefaultsStatus, String> {
    // 1. Model: if not loaded, try bundled model path
    if !is_model_loaded().await? {
        if let Some(model_path) = resolve_bundled_model_path(&app) {
            let path_str = model_path.to_string_lossy().to_string();
            #[cfg(debug_assertions)]
            eprintln!("[Bundled] Initializing model from: {}", path_str);
            if let Err(e) = initialize_model(path_str).await {
                #[cfg(debug_assertions)]
                eprintln!("[Bundled] Model init failed: {}", e);
            }
        }
    }

    // 2. Global KB: ensure collection exists
    if let Err(e) = initialize_vector_store(GLOBAL_KB_COLLECTION.to_string(), None).await {
        #[cfg(debug_assertions)]
        eprintln!("[Bundled] Vector store init failed: {}", e);
        return Ok(BundledDefaultsStatus {
            model_ready: is_model_loaded().await?,
            kb_ready: false,
        });
    }

    // 3. If collection is empty and we have bundled KB, ingest
    let stats = get_collection_stats_by_name(GLOBAL_KB_COLLECTION.to_string()).await;
    let doc_count: u64 = stats
        .ok()
        .and_then(|v| v["document_count"].as_u64())
        .unwrap_or(0);
    if doc_count == 0 {
        if let Some(kb_path) = resolve_bundled_kb_path(&app) {
            #[cfg(debug_assertions)]
            eprintln!("[Bundled] Ingesting KB from: {:?}", kb_path);
            if let Err(e) = ingest_kb_from_path(&kb_path).await {
                #[cfg(debug_assertions)]
                eprintln!("[Bundled] KB ingest failed: {}", e);
            }
        }
    }

    let model_ready = is_model_loaded().await?;
    let stats_after = get_collection_stats_by_name(GLOBAL_KB_COLLECTION.to_string()).await;
    let kb_ready = stats_after
        .ok()
        .and_then(|v| v["document_count"].as_u64())
        .map(|n| n > 0)
        .unwrap_or(false);

    Ok(BundledDefaultsStatus {
        model_ready,
        kb_ready,
    })
}
