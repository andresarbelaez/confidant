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
const DEFAULT_MODEL_ID: &str = "llama-3.2-3b-instruct-q4_k_m";

/// Filename used when downloading default model from URL (last segment of HuggingFace URL).
const DEFAULT_MODEL_DOWNLOAD_FILENAME: &str = "Llama-3.2-3B-Instruct-Q4_K_M.gguf";

/// URL for the default model (same as in setup-full-bundle.sh). Used for first-run auto-download.
const DEFAULT_MODEL_URL: &str = "https://huggingface.co/bartowski/Llama-3.2-3B-Instruct-GGUF/resolve/main/Llama-3.2-3B-Instruct-Q4_K_M.gguf";

/// Relative path to bundled KB JSON in resources (same format as URL-loaded package: manifest, documents, embeddings).
const BUNDLED_KB_FILENAME: &str = "default_kb.json";

#[derive(Debug, Serialize)]
pub struct BundledDefaultsStatus {
    pub model_ready: bool,
    pub kb_ready: bool,
    /// When packaged and no model found: URL to download the default model on first run.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub default_model_download_url: Option<String>,
    /// When packaged and no model found: path where the default model should be saved (app data).
    #[serde(skip_serializing_if = "Option::is_none")]
    pub default_model_output_path: Option<String>,
}

/// Find project root (directory that contains "data" and ideally "desktop") for dev fallback.
/// Prefers the actual project root (where both data/ and desktop/ exist) over nested data/ directories.
fn find_dev_data_dir() -> Option<PathBuf> {
    let mut current = std::env::current_dir().ok()?;
    let mut candidates = Vec::new();
    
    // Collect all directories with data/models
    for _ in 0..6 {
        let data_dir = current.join("data");
        let models_dir = data_dir.join("models");
        if models_dir.exists() {
            let is_project_root = current.join("desktop").exists() && current.join("data").exists();
            candidates.push((is_project_root, data_dir));
        }
        if let Some(parent) = current.parent() {
            current = parent.to_path_buf();
        } else {
            break;
        }
    }
    
    // Prefer project root (where both data/ and desktop/ exist)
    candidates.iter()
        .find(|(is_root, _)| *is_root)
        .map(|(_, path)| path.clone())
        .or_else(|| candidates.first().map(|(_, path)| path.clone()))
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
        // Try root (map format "resources/": "") then under "resources/" (list format "resources/")
        for base in [resource_dir.clone(), resource_dir.join("resources")] {
            let p = base.join("models").join(BUNDLED_MODEL_FILENAME);
            if p.exists() {
                return Some(p);
            }
        }
    }
    // App data (e.g. after first-run auto-download or Settings download)
    if let Some(base) = app.path().app_data_dir().ok() {
        let models_dir = base.join("data").join("models");
        let id_gguf = format!("{}.gguf", DEFAULT_MODEL_ID);
        for name in [
            DEFAULT_MODEL_DOWNLOAD_FILENAME,
            BUNDLED_MODEL_FILENAME,
            id_gguf.as_str(),
        ] {
            let p = models_dir.join(name);
            if p.exists() {
                if let Ok(metadata) = fs::metadata(&p) {
                    let size_gb = metadata.len() as f64 / (1024.0 * 1024.0 * 1024.0);
                    if size_gb >= 1.0 {
                        return Some(p);
                    }
                }
            }
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
        // Skip files that are too small (likely corrupted/incomplete downloads)
        if let Ok(entries) = fs::read_dir(&models_dir) {
            for e in entries.flatten() {
                let path = e.path();
                if path.extension().map_or(false, |e| e == "gguf") {
                    // Check file size - skip files smaller than 1GB (likely incomplete)
                    if let Ok(metadata) = fs::metadata(&path) {
                        let size_gb = metadata.len() as f64 / (1024.0 * 1024.0 * 1024.0);
                        if size_gb < 1.0 {
                            eprintln!("[Bundled] Skipping model file (too small: {:.2} GB): {}", size_gb, path.display());
                            continue;
                        }
                    }
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
        for base in [resource_dir.clone(), resource_dir.join("resources")] {
            for rel in [BUNDLED_KB_FILENAME, &format!("kb/{}", BUNDLED_KB_FILENAME)] {
                let p = base.join(rel);
                if p.exists() {
                    return Some(p);
                }
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
async fn ingest_kb_from_path(app: &AppHandle, path: &Path) -> Result<(), String> {
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
        add_documents_to_collection(app.clone(), GLOBAL_KB_COLLECTION.to_string(), batch_docs)
            .await?;
    }

    Ok(())
}

/// When packaged (resource dir present) and no model exists, return (url, output_path) for first-run auto-download.
fn default_model_download_info(app: &AppHandle) -> Option<(String, PathBuf)> {
    if resolve_bundled_model_path(app).is_some() {
        return None;
    }
    let resource_dir = app.path().resource_dir().ok()?;
    if !resource_dir.exists() {
        return None;
    }
    let base = app.path().app_data_dir().ok()?;
    let models_dir = base.join("data").join("models");
    let _ = fs::create_dir_all(&models_dir);
    let output_path = models_dir.join(DEFAULT_MODEL_DOWNLOAD_FILENAME);
    Some((DEFAULT_MODEL_URL.to_string(), output_path))
}

/// Ensure the default model and global KB are initialized from bundled resources when possible.
/// Call this once after loading; then check setup status (model_ready, kb_ready).
/// When no model is found in a packaged build, returns default_model_download_url/output_path for first-run auto-download.
#[tauri::command]
pub async fn ensure_bundled_defaults_initialized(app: AppHandle) -> Result<BundledDefaultsStatus, String> {
    // 1. Model: if not loaded, try bundled model path
    if !is_model_loaded().await? {
        match resolve_bundled_model_path(&app) {
            Some(model_path) => {
                let path_str = model_path.to_string_lossy().to_string();
                #[cfg(debug_assertions)]
                eprintln!("[Bundled] Initializing model from: {}", path_str);
                if let Err(e) = initialize_model(app.clone(), path_str).await {
                    eprintln!("[Confidant] Bundled model load failed: {}", e);
                }
            }
            None => {
                #[cfg(debug_assertions)]
                if let Ok(rd) = app.path().resource_dir() {
                    let expected = rd.join("models").join(BUNDLED_MODEL_FILENAME);
                    eprintln!(
                        "[Confidant] No bundled model. Auto-download on first run or add resources/models/default_model.gguf. Expected: {}",
                        expected.display()
                    );
                }
            }
        }
    }

    // 2. Global KB: ensure collection exists
    if let Err(_e) = initialize_vector_store(app.clone(), GLOBAL_KB_COLLECTION.to_string(), None).await {
        #[cfg(debug_assertions)]
        eprintln!("[Bundled] Vector store init failed: {}", _e);
        return Ok(BundledDefaultsStatus {
            model_ready: is_model_loaded().await?,
            kb_ready: false,
            default_model_download_url: None,
            default_model_output_path: None,
        });
    }

    // 3. If collection is empty and we have bundled KB, ingest
    let stats = get_collection_stats_by_name(app.clone(), GLOBAL_KB_COLLECTION.to_string()).await;
    let doc_count: u64 = stats
        .ok()
        .and_then(|v| v["document_count"].as_u64())
        .unwrap_or(0);
    if doc_count == 0 {
        match resolve_bundled_kb_path(&app) {
            Some(kb_path) => {
                #[cfg(debug_assertions)]
                eprintln!("[Bundled] Ingesting KB from: {:?}", kb_path);
                if let Err(e) = ingest_kb_from_path(&app, &kb_path).await {
                    eprintln!("[Confidant] Bundled KB ingest failed: {}", e);
                }
            }
            None => {
                if let Ok(rd) = app.path().resource_dir() {
                    eprintln!(
                        "[Confidant] No bundled KB found. Expected {} or {} (add resources/default_kb.json and rebuild)",
                        rd.join(BUNDLED_KB_FILENAME).display(),
                        rd.join("resources").join(BUNDLED_KB_FILENAME).display()
                    );
                }
            }
        }
    }

    let model_ready = is_model_loaded().await?;
    let stats_after = get_collection_stats_by_name(app.clone(), GLOBAL_KB_COLLECTION.to_string()).await;
    let kb_ready = stats_after
        .ok()
        .and_then(|v| v["document_count"].as_u64())
        .map(|n| n > 0)
        .unwrap_or(false);

    let (default_model_download_url, default_model_output_path) = if !model_ready {
        default_model_download_info(&app)
            .map(|(url, path)| (Some(url), Some(path.to_string_lossy().to_string())))
            .unwrap_or((None, None))
    } else {
        (None, None)
    };

    Ok(BundledDefaultsStatus {
        model_ready,
        kb_ready,
        default_model_download_url,
        default_model_output_path,
    })
}
