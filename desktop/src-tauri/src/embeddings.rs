// Embeddings - Generate embeddings using Python sentence-transformers

use std::process::Command;
use std::io::Write;

/// Get path to embeddings helper script
fn get_embeddings_helper_path() -> Result<std::path::PathBuf, String> {
    let exe_path = std::env::current_exe()
        .map_err(|e| format!("Failed to get executable path: {}", e))?;
    
    let script_path = exe_path
        .parent()
        .and_then(|p| p.parent())
        .and_then(|p| p.parent())
        .ok_or("Failed to find script directory")?
        .join("scripts")
        .join("embeddings_helper.py");
    
    if !script_path.exists() {
        let current_dir = std::env::current_dir()
            .map_err(|e| format!("Failed to get current directory: {}", e))?;
        let fallback_path = current_dir.join("src-tauri").join("scripts").join("embeddings_helper.py");
        if fallback_path.exists() {
            return Ok(fallback_path);
        }
        return Err(format!("Helper script not found at: {:?}", script_path));
    }
    
    Ok(script_path)
}

/// Call Python embeddings helper
fn call_embeddings_helper(command: &str, stdin_data: Option<&str>) -> Result<String, String> {
    let script_path = get_embeddings_helper_path()?;
    
    // Find Python (try venv first, then python3, then python)
    let python_cmd = {
        // Check for venv Python first
        let venv_python = std::env::current_dir()
            .ok()
            .and_then(|dir| {
                // Check for venv in project root (../../venv/bin/python3)
                let project_root = dir
                    .parent() // desktop/
                    .and_then(|p| p.parent()); // project root
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
    
    let mut cmd = Command::new(python_cmd);
    cmd.arg(&script_path);
    cmd.arg(command);
    
    if stdin_data.is_some() {
        cmd.stdin(std::process::Stdio::piped());
    }
    
    let mut child = cmd.stdout(std::process::Stdio::piped())
        .stderr(std::process::Stdio::piped())
        .spawn()
        .map_err(|e| format!("Failed to spawn Python process: {}", e))?;
    
    if let Some(ref data) = stdin_data {
        if let Some(mut stdin) = child.stdin.take() {
            stdin.write_all(data.as_bytes())
                .map_err(|e| format!("Failed to write to Python stdin: {}", e))?;
        }
    }
    
    let output = child.wait_with_output()
        .map_err(|e| format!("Failed to wait for Python process: {}", e))?;
    
    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        return Err(format!("Python script failed: {}", stderr));
    }
    
    let stdout = String::from_utf8(output.stdout)
        .map_err(|e| format!("Failed to parse Python output: {}", e))?;
    
    Ok(stdout)
}

/// Generate embedding for a single text
#[tauri::command]
pub async fn generate_embedding(text: String) -> Result<Vec<f32>, String> {
    let result_json = call_embeddings_helper("embed", Some(&text))?;
    let result: serde_json::Value = serde_json::from_str(&result_json)
        .map_err(|e| format!("Failed to parse Python response: {}", e))?;
    
    if result["status"].as_str() != Some("success") {
        let error_msg = result["message"].as_str().unwrap_or("Unknown error");
        return Err(format!("Failed to generate embedding: {}", error_msg));
    }
    
    let embedding_array = result["embedding"].as_array()
        .ok_or("Invalid response format: missing embedding")?;
    
    let embedding: Vec<f32> = embedding_array.iter()
        .map(|v| {
            v.as_f64()
                .ok_or_else(|| "Invalid number format".to_string())
                .map(|f| f as f32)
        })
        .collect::<Result<Vec<f32>, _>>()
        .map_err(|e| format!("Failed to parse embedding values: {}", e))?;
    
    Ok(embedding)
}

/// Generate embeddings for multiple texts
#[tauri::command]
pub async fn generate_embeddings_batch(texts: Vec<String>) -> Result<Vec<Vec<f32>>, String> {
    let texts_json = serde_json::to_string(&texts)
        .map_err(|e| format!("Failed to serialize texts: {}", e))?;
    
    let result_json = call_embeddings_helper("batch", Some(&texts_json))?;
    let result: serde_json::Value = serde_json::from_str(&result_json)
        .map_err(|e| format!("Failed to parse Python response: {}", e))?;
    
    if result["status"].as_str() != Some("success") {
        let error_msg = result["message"].as_str().unwrap_or("Unknown error");
        return Err(format!("Failed to generate embeddings: {}", error_msg));
    }
    
    let embeddings_array = result["embeddings"].as_array()
        .ok_or("Invalid response format: missing embeddings")?;
    
    let embeddings: Vec<Vec<f32>> = embeddings_array.iter().map(|emb| {
        emb.as_array()
            .ok_or_else(|| "Invalid embedding format".to_string())
            .and_then(|arr| {
                arr.iter()
                    .map(|v| {
                        v.as_f64()
                            .ok_or_else(|| "Invalid number format".to_string())
                            .map(|f| f as f32)
                    })
                    .collect::<Result<Vec<f32>, _>>()
            })
    }).collect::<Result<Vec<Vec<f32>>, _>>()
        .map_err(|e| format!("Failed to parse embeddings: {}", e))?;
    
    Ok(embeddings)
}
