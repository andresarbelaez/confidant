// Cache Management - File-based response cache

use std::fs;
use std::path::PathBuf;
use tauri::{AppHandle, Manager};

/// Get cache directory path. Uses Tauri's writable app data dir so the packaged app can write when run from DMG.
fn get_cache_dir(app: &AppHandle) -> Result<PathBuf, String> {
    let base_dir = app
        .path()
        .app_data_dir()
        .map_err(|e| format!("Failed to get app data dir: {}", e))?;
    let cache_dir = base_dir.join("data").join("cache");
    fs::create_dir_all(&cache_dir)
        .map_err(|e| format!("Failed to create cache directory: {}", e))?;
    Ok(cache_dir)
}

/// Get cache file path for a language
fn get_cache_file_path(app: &AppHandle, language: &str) -> Result<PathBuf, String> {
    let cache_dir = get_cache_dir(app)?;
    Ok(cache_dir.join(format!("responses_{}.json", language)))
}

/// Read cache file
#[tauri::command]
pub async fn read_cache_file(app: AppHandle, language: String) -> Result<Option<String>, String> {
    let cache_path = get_cache_file_path(&app, &language)?;
    
    if !cache_path.exists() {
        return Ok(None);
    }
    
    let content = fs::read_to_string(&cache_path)
        .map_err(|e| format!("Failed to read cache file: {}", e))?;
    
    Ok(Some(content))
}

/// Write cache file
#[tauri::command]
pub async fn write_cache_file(app: AppHandle, language: String, content: String) -> Result<(), String> {
    let cache_path = get_cache_file_path(&app, &language)?;
    
    // Ensure cache directory exists
    if let Some(parent) = cache_path.parent() {
        fs::create_dir_all(parent)
            .map_err(|e| format!("Failed to create cache directory: {}", e))?;
    }
    
    fs::write(&cache_path, content)
        .map_err(|e| format!("Failed to write cache file: {}", e))?;
    
    Ok(())
}
