// Vector Store - ChromaDB integration
// This module handles vector database operations via Python ChromaDB subprocess

use serde::{Deserialize, Serialize};
use std::sync::Mutex;
use std::path::PathBuf;
use std::process::Command;
use std::io::Write;
use tauri::AppHandle;

// Global state for the vector store
struct VectorStoreState {
    collection_name: Option<String>,
    is_initialized: bool,
    db_path: Option<PathBuf>,
}

lazy_static::lazy_static! {
    static ref VECTOR_STORE_STATE: Mutex<VectorStoreState> = Mutex::new(VectorStoreState {
        collection_name: None,
        is_initialized: false,
        db_path: None,
    });
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct VectorDocument {
    pub id: String,
    pub text: String,
    pub embedding: Vec<f32>,
    pub metadata: serde_json::Value,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct SearchResult {
    pub id: String,
    pub text: String,
    pub score: f32,
    pub metadata: serde_json::Value,
}

/// Get the app data directory for storing ChromaDB
fn get_app_data_dir() -> Result<PathBuf, String> {
    let project_root = std::env::current_dir()
        .map_err(|e| format!("Failed to get current directory: {}", e))?;
    
    let db_path = project_root.join("data").join("chromadb");
    std::fs::create_dir_all(&db_path)
        .map_err(|e| format!("Failed to create ChromaDB directory: {}", e))?;
    
    Ok(db_path)
}

/// Get path to Python helper script
fn get_helper_script_path() -> Result<PathBuf, String> {
    // Script is in src-tauri/scripts/chromadb_helper.py
    let exe_path = std::env::current_exe()
        .map_err(|e| format!("Failed to get executable path: {}", e))?;
    
    // Go up from target/debug/dant-desktop to src-tauri/scripts/
    let script_path = exe_path
        .parent() // target/debug/
        .and_then(|p| p.parent()) // target/
        .and_then(|p| p.parent()) // src-tauri/
        .ok_or("Failed to find script directory")?
        .join("scripts")
        .join("chromadb_helper.py");
    
    if !script_path.exists() {
        // Fallback: try relative to current_dir
        let current_dir = std::env::current_dir()
            .map_err(|e| format!("Failed to get current directory: {}", e))?;
        let fallback_path = current_dir.join("src-tauri").join("scripts").join("chromadb_helper.py");
        if fallback_path.exists() {
            return Ok(fallback_path);
        }
        return Err(format!("Helper script not found at: {:?}", script_path));
    }
    
    Ok(script_path)
}

/// Call Python helper script.
/// If `bundled` is Some((python_exe, scripts_dir)), use that Python and scripts_dir/chromadb_helper.py.
fn call_python_helper(
    bundled: Option<(PathBuf, PathBuf)>,
    command: &str,
    args: &[&str],
    stdin_data: Option<&str>,
) -> Result<String, String> {
    let (python_cmd, script_path) = if let Some((python_exe, scripts_dir)) = bundled {
        let script = scripts_dir.join("chromadb_helper.py");
        if !python_exe.exists() || !script.exists() {
            return Err("Bundled Python or script not found.".to_string());
        }
        (python_exe.to_string_lossy().to_string(), script)
    } else {
        let script_path = get_helper_script_path()?;
        let python_cmd = {
            let venv_python = std::env::current_dir()
                .ok()
                .and_then(|dir| {
                    let project_root = dir.parent().and_then(|p| p.parent());
                    project_root.map(|root| root.join("venv").join("bin").join("python3"))
                })
                .filter(|p| p.exists());
            if let Some(venv_py) = venv_python {
                if Command::new(&venv_py).arg("--version").output().is_ok() {
                    venv_py.to_string_lossy().to_string()
                } else if Command::new("python3").arg("--version").output().is_ok() {
                    "python3".to_string()
                } else if Command::new("python").arg("--version").output().is_ok() {
                    "python".to_string()
                } else {
                    return Err("Python not found. Please install Python 3.".to_string());
                }
            } else if Command::new("python3").arg("--version").output().is_ok() {
                "python3".to_string()
            } else if Command::new("python").arg("--version").output().is_ok() {
                "python".to_string()
            } else {
                return Err("Python not found. Please install Python 3.".to_string());
            }
        };
        (python_cmd, script_path)
    };

    let mut cmd = Command::new(&python_cmd);
    cmd.arg(&script_path);
    cmd.arg(command);
    cmd.args(args);
    
    if stdin_data.is_some() {
        cmd.stdin(std::process::Stdio::piped());
    }
    
    let mut child = cmd.stdout(std::process::Stdio::piped())
        .stderr(std::process::Stdio::piped())
        .spawn()
        .map_err(|e| format!("Failed to spawn Python process: {}", e))?;
    
    // Write stdin data if provided
    if let Some(ref data) = stdin_data {
        if let Some(mut stdin) = child.stdin.take() {
            stdin.write_all(data.as_bytes())
                .map_err(|e| format!("Failed to write to Python stdin: {}", e))?;
        }
    }
    
    let output = child.wait_with_output()
        .map_err(|e| format!("Failed to wait for Python process: {}", e))?;
    
    #[cfg(debug_assertions)]
    if !output.stderr.is_empty() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        eprintln!("[Vector Store] Python stderr: {}", stderr);
    }
    
    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        let stdout = String::from_utf8_lossy(&output.stdout);
        return Err(format!("Python script failed (exit code: {}): stderr: {}, stdout: {}", 
            output.status.code().unwrap_or(-1), stderr, stdout));
    }
    
    let stdout = String::from_utf8(output.stdout)
        .map_err(|e| format!("Failed to parse Python output: {}", e))?;
    
    if stdout.trim().is_empty() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        return Err(format!("Python script returned empty output. stderr: {}", stderr));
    }
    
    Ok(stdout)
}

/// Initialize vector store with ChromaDB
#[tauri::command]
pub async fn initialize_vector_store(app: AppHandle, collection_name: String, db_path: Option<String>) -> Result<(), String> {
    let mut state = VECTOR_STORE_STATE.lock()
        .map_err(|e| format!("Failed to lock state: {}", e))?;

    #[cfg(debug_assertions)]
    eprintln!("[Vector Store] Initializing collection: {}", collection_name);

    // Get database path (use provided or default)
    let db_path = if let Some(path) = db_path {
        PathBuf::from(path)
    } else {
        get_app_data_dir()?
    };
    
    // Ensure db_path is set in state
    if state.db_path.is_none() {
        state.db_path = Some(db_path.clone());
    }
    
    let db_path_str = db_path.to_str()
        .ok_or("Invalid database path")?;
    
    // Call Python helper to initialize ChromaDB
    let bundled = crate::python_bundle::resolve_bundled_python(&app);
    let result_json = call_python_helper(bundled, "init", &[db_path_str, &collection_name], None)?;
    let result: serde_json::Value = serde_json::from_str(&result_json)
        .map_err(|e| format!("Failed to parse Python response: {}", e))?;
    
    if result["status"].as_str() != Some("success") {
        return Err(format!("ChromaDB initialization failed: {:?}", result));
    }
    
    state.is_initialized = true;

    Ok(())
}

/// Add documents to vector store (uses current collection from state)
#[tauri::command]
pub async fn add_documents(
    app: AppHandle,
    documents: Vec<VectorDocument>,
) -> Result<(), String> {
    let bundled = crate::python_bundle::resolve_bundled_python(&app);
    let state = VECTOR_STORE_STATE.lock()
        .map_err(|e| format!("Failed to lock state: {}", e))?;
    
    if !state.is_initialized {
        return Err("Vector store not initialized. Call initialize_vector_store first.".to_string());
    }

    let db_path = state.db_path.as_ref()
        .ok_or("Database path not set")?
        .to_str()
        .ok_or("Invalid database path")?;
    
    let collection_name = state.collection_name.as_ref()
        .ok_or("Collection name not set")?;

    #[cfg(debug_assertions)]
    eprintln!("[Vector Store] Adding {} documents", documents.len());

    // Convert to JSON for Python
    let docs_json: Vec<serde_json::Value> = documents.iter().map(|doc| {
        serde_json::json!({
            "id": doc.id,
            "text": doc.text,
            "embedding": doc.embedding,
            "metadata": doc.metadata
        })
    }).collect();
    
    let stdin_data = serde_json::to_string(&docs_json)
        .map_err(|e| format!("Failed to serialize documents: {}", e))?;
    
    // Call Python helper
    let result_json = call_python_helper(bundled, "add", &[db_path, collection_name], Some(&stdin_data))?;
    let result: serde_json::Value = serde_json::from_str(&result_json)
        .map_err(|e| format!("Failed to parse Python response: {}", e))?;
    
    if result["status"].as_str() != Some("success") {
        return Err(format!("Failed to add documents: {:?}", result));
    }
    
    Ok(())
}

/// Add documents to a specific collection
#[tauri::command]
pub async fn add_documents_to_collection(
    app: AppHandle,
    collection_name: String,
    documents: Vec<VectorDocument>,
) -> Result<(), String> {
    let state = VECTOR_STORE_STATE.lock()
        .map_err(|e| format!("Failed to lock state: {}", e))?;
    
    if !state.is_initialized {
        return Err("Vector store not initialized. Call initialize_vector_store first.".to_string());
    }

    let bundled = crate::python_bundle::resolve_bundled_python(&app);
    let db_path = state.db_path.as_ref()
        .ok_or("Database path not set")?
        .to_str()
        .ok_or("Invalid database path")?;

    #[cfg(debug_assertions)]
    eprintln!("[Vector Store] Adding {} documents to collection: {}", documents.len(), collection_name);

    // Convert to JSON for Python
    let docs_json: Vec<serde_json::Value> = documents.iter().map(|doc| {
        serde_json::json!({
            "id": doc.id,
            "text": doc.text,
            "embedding": doc.embedding,
            "metadata": doc.metadata
        })
    }).collect();
    
    let stdin_data = serde_json::to_string(&docs_json)
        .map_err(|e| format!("Failed to serialize documents: {}", e))?;
    
    // Call Python helper
    let result_json = call_python_helper(bundled, "add", &[db_path, &collection_name], Some(&stdin_data))?;
    let result: serde_json::Value = serde_json::from_str(&result_json)
        .map_err(|e| format!("Failed to parse Python response: {}", e))?;
    
    if result["status"].as_str() != Some("success") {
        return Err(format!("Failed to add documents: {:?}", result));
    }
    
    Ok(())
}

/// Search for similar documents (uses current collection from state)
#[tauri::command]
pub async fn search_similar(
    app: AppHandle,
    query_embedding: Vec<f32>,
    limit: u32,
) -> Result<Vec<SearchResult>, String> {
    let bundled = crate::python_bundle::resolve_bundled_python(&app);
    let state = VECTOR_STORE_STATE.lock()
        .map_err(|e| format!("Failed to lock state: {}", e))?;
    
    if !state.is_initialized {
        return Err("Vector store not initialized. Call initialize_vector_store first.".to_string());
    }

    let db_path = state.db_path.as_ref()
        .ok_or("Database path not set")?
        .to_str()
        .ok_or("Invalid database path")?;
    
    let collection_name = state.collection_name.as_ref()
        .ok_or("Collection name not set")?;

    #[cfg(debug_assertions)]
    eprintln!("[Vector Store] Search limit: {}", limit);

    // Convert embedding to JSON
    let embedding_json = serde_json::to_string(&query_embedding)
        .map_err(|e| format!("Failed to serialize embedding: {}", e))?;
    
    // Call Python helper
    let result_json = call_python_helper(bundled, "search", &[db_path, collection_name, &limit.to_string()], Some(&embedding_json))?;
    let result: serde_json::Value = serde_json::from_str(&result_json)
        .map_err(|e| format!("Failed to parse Python response: {}", e))?;
    
    if result["status"].as_str() != Some("success") {
        return Err(format!("Search failed: {:?}", result));
    }
    
    // Parse results
    let results_array = result["results"].as_array()
        .ok_or("Invalid search results format")?;
    
    let search_results: Result<Vec<SearchResult>, _> = results_array.iter().map(|r| {
        Ok(SearchResult {
            id: r["id"].as_str().unwrap_or("").to_string(),
            text: r["text"].as_str().unwrap_or("").to_string(),
            score: r["score"].as_f64().unwrap_or(0.0) as f32,
            metadata: r["metadata"].clone(),
        })
    }).collect();
    
    let search_results = search_results.map_err(|e: serde_json::Error| format!("Failed to parse results: {}", e))?;
    
    Ok(search_results)
}

/// Search a specific collection
#[tauri::command]
pub async fn search_collection(
    app: AppHandle,
    collection_name: String,
    query_embedding: Vec<f32>,
    limit: u32,
) -> Result<Vec<SearchResult>, String> {
    let bundled = crate::python_bundle::resolve_bundled_python(&app);
    let state = VECTOR_STORE_STATE.lock()
        .map_err(|e| format!("Failed to lock state: {}", e))?;
    
    if !state.is_initialized {
        return Err("Vector store not initialized. Call initialize_vector_store first.".to_string());
    }

    let db_path = state.db_path.as_ref()
        .ok_or("Database path not set")?
        .to_str()
        .ok_or("Invalid database path")?;

    #[cfg(debug_assertions)]
    eprintln!("[Vector Store] Searching collection: {} with limit: {}", collection_name, limit);

    // Convert embedding to JSON
    let embedding_json = serde_json::to_string(&query_embedding)
        .map_err(|e| format!("Failed to serialize embedding: {}", e))?;
    
    // Call Python helper
    let result_json = call_python_helper(bundled, "search", &[db_path, &collection_name, &limit.to_string()], Some(&embedding_json))?;
    let result: serde_json::Value = serde_json::from_str(&result_json)
        .map_err(|e| format!("Failed to parse Python response: {}", e))?;
    
    if result["status"].as_str() != Some("success") {
        return Err(format!("Search failed: {:?}", result));
    }
    
    // Parse results
    let results_array = result["results"].as_array()
        .ok_or("Invalid search results format")?;
    
    let search_results: Result<Vec<SearchResult>, _> = results_array.iter().map(|r| {
        Ok(SearchResult {
            id: r["id"].as_str().unwrap_or("").to_string(),
            text: r["text"].as_str().unwrap_or("").to_string(),
            score: r["score"].as_f64().unwrap_or(0.0) as f32,
            metadata: r["metadata"].clone(),
        })
    }).collect();
    
    let search_results = search_results.map_err(|e: serde_json::Error| format!("Failed to parse results: {}", e))?;
    
    Ok(search_results)
}

/// Get collection statistics (uses current collection from state)
#[tauri::command]
pub async fn get_collection_stats(app: AppHandle) -> Result<serde_json::Value, String> {
    let bundled = crate::python_bundle::resolve_bundled_python(&app);
    let state = VECTOR_STORE_STATE.lock()
        .map_err(|e| format!("Failed to lock state: {}", e))?;
    
    if !state.is_initialized {
        return Err("Vector store not initialized. Call initialize_vector_store first.".to_string());
    }

    let db_path = state.db_path.as_ref()
        .ok_or("Database path not set")?
        .to_str()
        .ok_or("Invalid database path")?;
    
    let collection_name = state.collection_name.as_deref()
        .unwrap_or("dant_knowledge");

    // Call Python helper
    let result_json = call_python_helper(bundled, "stats", &[db_path, collection_name], None)?;
    let result: serde_json::Value = serde_json::from_str(&result_json)
        .map_err(|e| format!("Failed to parse Python response: {}", e))?;
    
    Ok(result)
}

/// Get statistics for a specific collection
#[tauri::command]
pub async fn get_collection_stats_by_name(app: AppHandle, collection_name: String) -> Result<serde_json::Value, String> {
    let bundled = crate::python_bundle::resolve_bundled_python(&app);
    let state = VECTOR_STORE_STATE.lock()
        .map_err(|e| format!("Failed to lock state: {}", e))?;
    
    if !state.is_initialized {
        return Err("Vector store not initialized. Call initialize_vector_store first.".to_string());
    }

    let db_path = state.db_path.as_ref()
        .ok_or("Database path not set")?
        .to_str()
        .ok_or("Invalid database path")?;

    // Call Python helper
    let result_json = call_python_helper(bundled, "stats", &[db_path, &collection_name], None)?;
    let result: serde_json::Value = serde_json::from_str(&result_json)
        .map_err(|e| format!("Failed to parse Python response: {}", e))?;
    
    Ok(result)
}

/// Initialize user vector store collection
#[tauri::command]
pub async fn initialize_user_vector_store(app: AppHandle, user_id: String) -> Result<(), String> {
    let collection_name = format!("dant_knowledge_user_{}", user_id);
    initialize_vector_store(app, collection_name, None).await
}

/// Delete user knowledge base collection
#[tauri::command]
pub async fn delete_user_knowledge_base(app: AppHandle, user_id: String) -> Result<(), String> {
    let bundled = crate::python_bundle::resolve_bundled_python(&app);
    let state = VECTOR_STORE_STATE.lock()
        .map_err(|e| format!("Failed to lock state: {}", e))?;
    
    if !state.is_initialized {
        return Err("Vector store not initialized. Call initialize_vector_store first.".to_string());
    }

    let db_path = state.db_path.as_ref()
        .ok_or("Database path not set")?
        .to_str()
        .ok_or("Invalid database path")?;
    
    let collection_name = format!("dant_knowledge_user_{}", user_id);

    #[cfg(debug_assertions)]
    eprintln!("[Vector Store] Deleting user KB collection: {}", collection_name);

    // Call Python helper to delete collection
    let result_json = call_python_helper(bundled, "delete_collection", &[db_path, &collection_name], None)?;
    let result: serde_json::Value = serde_json::from_str(&result_json)
        .map_err(|e| format!("Failed to parse Python response: {}", e))?;
    
    if result["status"].as_str() != Some("success") {
        return Err(format!("Failed to delete collection: {:?}", result));
    }
    
    Ok(())
}
