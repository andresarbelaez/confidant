// Cache Management - File-based response cache

use std::fs;
use std::path::PathBuf;

/// Get cache directory path
fn get_cache_dir() -> Result<PathBuf, String> {
    // Reuse the app data directory pattern from user_management
    let mut current = std::env::current_dir()
        .map_err(|e| format!("Failed to get current directory: {}", e))?;
    
    let mut project_root = None;
    
    // Try current directory first
    if current.join("data").exists() {
        project_root = Some(current.clone());
    } else {
        // Try going up multiple levels (up to 5 levels)
        for _ in 0..5 {
            if let Some(parent) = current.parent() {
                if parent.join("data").exists() {
                    project_root = Some(parent.to_path_buf());
                    break;
                }
                current = parent.to_path_buf();
            } else {
                break;
            }
        }
    }
    
    let base_dir = project_root.unwrap_or_else(|| {
        std::env::current_dir()
            .unwrap_or_else(|_| PathBuf::from("."))
    });
    
    let cache_dir = base_dir.join("data").join("cache");
    fs::create_dir_all(&cache_dir)
        .map_err(|e| format!("Failed to create cache directory: {}", e))?;
    
    Ok(cache_dir)
}

/// Get cache file path for a language
fn get_cache_file_path(language: &str) -> Result<PathBuf, String> {
    let cache_dir = get_cache_dir()?;
    Ok(cache_dir.join(format!("responses_{}.json", language)))
}

/// Read cache file
#[tauri::command]
pub async fn read_cache_file(language: String) -> Result<Option<String>, String> {
    let cache_path = get_cache_file_path(&language)?;
    
    if !cache_path.exists() {
        return Ok(None);
    }
    
    let content = fs::read_to_string(&cache_path)
        .map_err(|e| format!("Failed to read cache file: {}", e))?;
    
    Ok(Some(content))
}

/// Write cache file
#[tauri::command]
pub async fn write_cache_file(language: String, content: String) -> Result<(), String> {
    let cache_path = get_cache_file_path(&language)?;
    
    // Ensure cache directory exists
    if let Some(parent) = cache_path.parent() {
        fs::create_dir_all(parent)
            .map_err(|e| format!("Failed to create cache directory: {}", e))?;
    }
    
    fs::write(&cache_path, content)
        .map_err(|e| format!("Failed to write cache file: {}", e))?;
    
    Ok(())
}
