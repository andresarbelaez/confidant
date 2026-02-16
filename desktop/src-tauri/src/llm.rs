// LLM Engine - llama.cpp integration
// This module handles LLM model loading and inference using Python subprocess

use serde::{Deserialize, Serialize};
use std::sync::Mutex;
use std::process::{Child, Command, Stdio};
use std::io::{BufRead, BufReader, Read, Write};
use std::process::ChildStdin;
use std::process::ChildStdout;
use std::fs;
use std::path::{Path, PathBuf};
use std::thread;
use tauri::{AppHandle, Emitter, Manager};

use crate::python_bundle;

// Global state for the LLM engine
struct LLMState {
    model_path: Option<String>,
    is_initialized: bool,
}

// Global LLM state (thread-safe)
lazy_static::lazy_static! {
    static ref LLM_STATE: Mutex<LLMState> = Mutex::new(LLMState {
        model_path: None,
        is_initialized: false,
    });
}

/// Long-lived Python process with model already loaded. Reused for each request to avoid reload time.
struct LlmWorker {
    _child: Child,
    stdin: ChildStdin,
    stdout: BufReader<ChildStdout>,
    model_path: String,
}

lazy_static::lazy_static! {
    static ref LLM_WORKER: Mutex<Option<LlmWorker>> = Mutex::new(None);
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct LLMConfig {
    pub temperature: f32,
    pub top_p: f32,
    pub max_tokens: u32,
}

impl Default for LLMConfig {
    fn default() -> Self {
        Self {
            temperature: 0.7,
            top_p: 0.9,
            max_tokens: 512,
        }
    }
}

#[derive(Debug, Serialize, Deserialize)]
pub struct LLMResponse {
    pub text: String,
    pub finish_reason: Option<String>,
}

/// Get path to Python helper script
fn get_llama_helper_path() -> Result<std::path::PathBuf, String> {
    let exe_path = std::env::current_exe()
        .map_err(|e| format!("Failed to get executable path: {}", e))?;
    
    // Go up from target/debug/dant-desktop to src-tauri/scripts/
    let script_path = exe_path
        .parent() // target/debug/
        .and_then(|p| p.parent()) // target/
        .and_then(|p| p.parent()) // src-tauri/
        .ok_or("Failed to find script directory")?
        .join("scripts")
        .join("llama_helper.py");
    
    if !script_path.exists() {
        // Fallback: try relative to current_dir
        let current_dir = std::env::current_dir()
            .map_err(|e| format!("Failed to get current directory: {}", e))?;
        let fallback_path = current_dir.join("src-tauri").join("scripts").join("llama_helper.py");
        if fallback_path.exists() {
            return Ok(fallback_path);
        }
        return Err(format!("Helper script not found at: {:?}", script_path));
    }
    
    Ok(script_path)
}

/// Resolve Python executable and llama_helper.py path.
/// Prefer venv when present; then bundled; then system Python.
fn resolve_python_and_script(bundled: Option<(PathBuf, PathBuf)>) -> Result<(String, PathBuf), String> {
    if let Some(venv_py) = crate::python_bundle::find_venv_python() {
        if Command::new(&venv_py).arg("--version").output().is_ok() {
            let dev_script = get_llama_helper_path()?;
            #[cfg(debug_assertions)]
            eprintln!("[LLM] Using venv Python: {}", venv_py.display());
            return Ok((venv_py.to_string_lossy().to_string(), dev_script));
        }
        if let Some((python_exe, scripts_dir)) = bundled {
            let script = scripts_dir.join("llama_helper.py");
            if python_exe.exists() && script.exists() {
                return Ok((python_exe.to_string_lossy().to_string(), script));
            }
        }
        let script_path = get_llama_helper_path()?;
        let python_cmd = if Command::new("python3").arg("--version").output().is_ok() {
            "python3".to_string()
        } else if Command::new("python").arg("--version").output().is_ok() {
            "python".to_string()
        } else {
            return Err("Python not found. Please install Python 3.".to_string());
        };
        return Ok((python_cmd, script_path));
    }
    if let Some((python_exe, scripts_dir)) = bundled {
        let script = scripts_dir.join("llama_helper.py");
        if python_exe.exists() && script.exists() {
            return Ok((python_exe.to_string_lossy().to_string(), script));
        }
    }
    #[cfg(debug_assertions)]
    if let Ok(cwd) = std::env::current_dir() {
        eprintln!("[LLM] No venv found (walked up from cwd: {}), using system Python", cwd.display());
    }
    let script_path = get_llama_helper_path()?;
    let python_cmd = if Command::new("python3").arg("--version").output().is_ok() {
        "python3".to_string()
    } else if Command::new("python").arg("--version").output().is_ok() {
        "python".to_string()
    } else {
        return Err("Python not found. Please install Python 3.".to_string());
    };
    Ok((python_cmd, script_path))
}

/// Call Python helper script for LLM operations.
/// If `bundled` is Some((python_exe, scripts_dir)), use that Python and scripts_dir/llama_helper.py; otherwise use system/venv Python and dev script path.
fn call_llama_helper(
    bundled: Option<(PathBuf, PathBuf)>,
    command: &str,
    args: &[&str],
    stdin_data: Option<&str>,
) -> Result<String, String> {
    let (python_cmd, script_path) = resolve_python_and_script(bundled)?;

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
        eprintln!("[LLM] Python stderr: {}", stderr);
    }
    
    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        let stdout = String::from_utf8_lossy(&output.stdout);
        return Err(format!("Python LLM script failed (exit code: {}): stderr: {}, stdout: {}", 
            output.status.code().unwrap_or(-1), stderr, stdout));
    }
    
    let stdout = String::from_utf8(output.stdout)
        .map_err(|e| format!("Failed to parse Python output: {}", e))?;
    
    if stdout.trim().is_empty() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        return Err(format!("Python LLM script returned empty output. stderr: {}", stderr));
    }
    
    Ok(stdout)
}

/// Initialize LLM model from file path (internal helper without state lock)
async fn initialize_model_internal(
    mut model_path: String,
    bundled: Option<(PathBuf, PathBuf)>,
) -> Result<(), String> {
    // Try to resolve the actual file path (handles case-insensitive matching)
    loop {
        #[cfg(debug_assertions)]
        eprintln!("[LLM] Initializing model from: {}", model_path);

        // Check if file exists
        let model_file = Path::new(&model_path);
        if model_file.exists() {
            // Check file size before proceeding
            if let Ok(metadata) = fs::metadata(&model_path) {
                let file_size = metadata.len();
                let size_gb = file_size as f64 / 1_000_000_000.0;
                
                // Q4_0 models should be at least 1.5GB, Q4_K_M should be at least 2GB
                // Files smaller than this are likely incomplete downloads
                if file_size < 1_500_000_000 {
                    println!("[LLM] Warning: Model file is too small ({} bytes, {:.2} GB). Expected at least 1.5GB.", file_size, size_gb);
                    return Err(format!(
                        "Model file appears to be too small ({} bytes, {:.2} GB). It may be corrupted or incomplete.\n\
                        Expected size: ~2GB for Q4_0, ~2.5GB for Q4_K_M\n\
                        The file might be a partial download. Please check the file or use 'Use Existing Model' to select a different file.",
                        file_size, size_gb
                    ));
                }
                #[cfg(debug_assertions)]
                eprintln!("[LLM] Model file size: {} bytes ({:.2} GB)", file_size, size_gb);
            }
            break; // Found the file, exit loop
        }
        
        // Try to find the file with different case (case-insensitive search)
        let parent = model_file.parent().ok_or("Invalid model path")?;
        let expected_name = model_file.file_name()
            .and_then(|n| n.to_str())
            .ok_or("Invalid filename")?;
        
        // Search for files with similar names (case-insensitive)
        let mut found_alternative = None;
        if parent.exists() && parent.is_dir() {
            if let Ok(entries) = fs::read_dir(parent) {
                for entry in entries {
                    if let Ok(entry) = entry {
                        let path = entry.path();
                        if path.is_file() {
                            if let Some(name) = path.file_name().and_then(|n| n.to_str()) {
                                if name.to_lowercase() == expected_name.to_lowercase() {
                                    found_alternative = Some(path.to_string_lossy().to_string());
                                    break;
                                }
                            }
                        }
                    }
                }
            }
        }
        
        if let Some(alt_path) = found_alternative {
            #[cfg(debug_assertions)]
            eprintln!("[LLM] Found model with different case, using: {}", alt_path);
            model_path = alt_path;
            continue; // Try again with the found path
        }
        
        return Err(format!(
            "Model file not found: {}\n\n\
            Please ensure the model file exists at this path.\n\
            You can use the 'Use Existing Model' option if you have a model file elsewhere.\n\
            Recommended: Llama-3.2-3B-Instruct (Q4_0 or Q4_K_M quantization)\n\
            Download from: https://huggingface.co/bartowski/Llama-3.2-3B-Instruct-GGUF",
            model_path
        ));
    }

    // Call Python helper to load model
    let result_json = call_llama_helper(bundled, "load", &[&model_path], None)?;
    let result: serde_json::Value = serde_json::from_str(&result_json)
        .map_err(|e| format!("Failed to parse Python response: {}", e))?;
    
    if result["status"].as_str() != Some("success") {
        let error_msg = result["message"].as_str().unwrap_or("Unknown error");
        return Err(format!("Failed to load model: {}", error_msg));
    }

    println!("[LLM] Model loaded successfully");
    Ok(())
}

/// Initialize LLM model from file path
#[tauri::command]
pub async fn initialize_model(app: AppHandle, model_path: String) -> Result<(), String> {
    // Check state first (lock and release immediately)
    {
        let state = LLM_STATE.lock().map_err(|e| format!("Failed to lock state: {}", e))?;
        if state.is_initialized && state.model_path.as_ref() == Some(&model_path) {
            #[cfg(debug_assertions)]
            eprintln!("[LLM] Model already initialized");
            return Ok(()); // Already initialized
        }
    } // Lock is released here
    
    let bundled = python_bundle::resolve_bundled_python(&app);
    // Initialize model (without holding the lock)
    initialize_model_internal(model_path.clone(), bundled).await?;
    
    // Update state after successful initialization
    let path_for_worker = model_path.clone();
    {
        let mut state = LLM_STATE.lock().map_err(|e| format!("Failed to lock state: {}", e))?;
        state.model_path = Some(model_path);
        state.is_initialized = true;
    }

    // Preload a long-lived worker in the background so the first user message has fast time-to-first-token
    let app_worker = app.clone();
    thread::spawn(move || {
        if let Err(e) = start_llm_worker(&app_worker, &path_for_worker) {
            #[cfg(debug_assertions)]
            eprintln!("[LLM] Worker preload failed (streaming will use one-shot): {}", e);
        } else {
            #[cfg(debug_assertions)]
            eprintln!("[LLM] Worker ready (model preloaded for fast first token)");
        }
    });

    Ok(())
}

/// Start a long-lived Python process with the model loaded. Called after initialize_model (background).
fn start_llm_worker(app: &AppHandle, model_path: &str) -> Result<(), String> {
    let bundled = python_bundle::resolve_bundled_python(app);
    let (python_cmd, script_path) = resolve_python_and_script(bundled)?;

    let mut child = Command::new(&python_cmd)
        .arg(&script_path)
        .arg("serve")
        .arg(model_path)
        .stdin(Stdio::piped())
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .spawn()
        .map_err(|e| format!("Failed to spawn Python worker: {}", e))?;

    // Drain stderr in a background thread so the worker never blocks on pipe backpressure; log for debugging.
    let stderr = child.stderr.take().ok_or("No stderr from Python worker")?;
    std::thread::spawn(move || {
        let mut r = BufReader::new(stderr);
        let mut line = String::new();
        while r.read_line(&mut line).unwrap_or(0) > 0 {
            eprintln!("[LLM Worker] {}", line.trim_end());
            line.clear();
        }
    });

    let stdout = child.stdout.take().ok_or("No stdout from Python worker")?;
    let mut reader = BufReader::new(stdout);
    // Read lines until we see {"ready": true} (llama_cpp may write other lines to stdout; skip them).
    let mut line = String::new();
    let mut ready = false;
    for _ in 0..10_000 {
        line.clear();
        let n = reader
            .read_line(&mut line)
            .map_err(|e| format!("Failed to read from worker: {}", e))?;
        if n == 0 {
            return Err("Worker stdout closed before ready.".to_string());
        }
        let trimmed = line.trim();
        if trimmed.is_empty() {
            continue;
        }
        if let Ok(v) = serde_json::from_str::<serde_json::Value>(trimmed) {
            if v.get("ready").and_then(|r| r.as_bool()) == Some(true) {
                ready = true;
                break;
            }
            if let Some(err) = v.get("error").and_then(|e| e.as_str()) {
                return Err(format!("Worker reported error: {}", err));
            }
        }
    }
    if !ready {
        return Err("Worker did not send ready in time.".to_string());
    }

    let stdin = child.stdin.take().ok_or("No stdin from Python worker")?;
    let worker = LlmWorker {
        _child: child,
        stdin,
        stdout: reader,
        model_path: model_path.to_string(),
    };

    let mut guard = LLM_WORKER.lock().map_err(|e| format!("Lock worker: {}", e))?;
    *guard = Some(worker);
    Ok(())
}

/// Run one streaming request through an existing worker. Returns the worker on success so it can be put back.
fn run_stream_via_worker(
    app: &AppHandle,
    stream_id: &str,
    prompt: &str,
    config_json: &str,
    mut worker: LlmWorker,
) -> Result<LlmWorker, String> {
    let config: serde_json::Value =
        serde_json::from_str(config_json).map_err(|e| format!("Config JSON: {}", e))?;
    let req = serde_json::json!({
        "prompt": prompt,
        "temperature": config.get("temperature").and_then(|v| v.as_f64()).unwrap_or(0.7),
        "top_p": config.get("top_p").and_then(|v| v.as_f64()).unwrap_or(0.9),
        "max_tokens": config.get("max_tokens").and_then(|v| v.as_u64()).unwrap_or(512) as u32,
    });
    let line = serde_json::to_string(&req).map_err(|e| format!("Serialize request: {}", e))?;
    worker
        .stdin
        .write_all(format!("{}\n", line).as_bytes())
        .map_err(|e| format!("Write to worker: {}", e))?;
    worker.stdin.flush().map_err(|e| format!("Flush worker: {}", e))?;

    let mut stream_done = false;
    for line in worker.stdout.by_ref().lines() {
        let line = line.map_err(|e| format!("Read from worker: {}", e))?;
        let v: serde_json::Value =
            serde_json::from_str(&line).map_err(|e| format!("Worker JSON: {}", e))?;

        if let Some(text) = v.get("text").and_then(|t| t.as_str()) {
            let _ = app.emit(
                "llm-stream-chunk",
                serde_json::json!({ "streamId": stream_id, "text": text }),
            );
        }
        if v.get("done").and_then(|d| d.as_bool()) == Some(true) {
            let full = v.get("full").and_then(|f| f.as_str()).unwrap_or("");
            let _ = app.emit(
                "llm-stream-done",
                serde_json::json!({ "streamId": stream_id, "full": full }),
            );
            stream_done = true;
            break;
        }
        if let Some(err) = v.get("error").and_then(|e| e.as_str()) {
            let _ = app.emit(
                "llm-stream-error",
                serde_json::json!({ "streamId": stream_id, "error": err }),
            );
            return Err(err.to_string());
        }
    }

    if !stream_done {
        return Err("Worker stream ended without done.".to_string());
    }
    Ok(worker)
}

/// Generate text from the LLM
#[tauri::command]
pub async fn generate_text(
    app: AppHandle,
    prompt: String,
    config: LLMConfig,
) -> Result<LLMResponse, String> {
    let state = LLM_STATE.lock().map_err(|e| format!("Failed to lock state: {}", e))?;
    
    if !state.is_initialized {
        return Err("Model not initialized. Call initialize_model first.".to_string());
    }

    #[cfg(debug_assertions)]
    eprintln!("[LLM] Generating (prompt len: {} chars)", prompt.len());

    let model_path = state.model_path.as_ref()
        .ok_or("Model path not set")?;

    // Prepare config JSON
    let config_json = serde_json::to_string(&serde_json::json!({
        "temperature": config.temperature,
        "top_p": config.top_p,
        "max_tokens": config.max_tokens
    })).map_err(|e| format!("Failed to serialize config: {}", e))?;
    
    let bundled = python_bundle::resolve_bundled_python(&app);
    // Call Python helper to generate text (pass model_path as first arg)
    let result_json = call_llama_helper(bundled, "generate", &[model_path, &config_json], Some(&prompt))?;
    let result: serde_json::Value = serde_json::from_str(&result_json)
        .map_err(|e| format!("Failed to parse Python response: {}", e))?;
    
    if result["status"].as_str() != Some("success") {
        let error_msg = result["message"].as_str().unwrap_or("Unknown error");
        return Err(format!("Failed to generate text: {}", error_msg));
    }
    
    let text = result["text"].as_str()
        .ok_or("Invalid response format: missing text")?
        .to_string();
    
    let finish_reason = result["finish_reason"].as_str().map(|s| s.to_string());
    
    #[cfg(debug_assertions)]
    eprintln!("[LLM] Generated {} chars", text.len());
    
    Ok(LLMResponse {
        text,
        finish_reason,
    })
}

/// Stream LLM response token-by-token. Returns immediately; chunks/done/error are delivered via Tauri events:
/// - `llm-stream-chunk`: { streamId, text }
/// - `llm-stream-done`: { streamId, full }
/// - `llm-stream-error`: { streamId, error }
#[tauri::command]
pub fn generate_text_stream(
    app: AppHandle,
    stream_id: String,
    prompt: String,
    config: LLMConfig,
) -> Result<(), String> {
    let model_path = {
        let state = LLM_STATE.lock().map_err(|e| format!("Failed to lock state: {}", e))?;
        if !state.is_initialized {
            return Err("Model not initialized. Call initialize_model first.".to_string());
        }
        state
            .model_path
            .as_ref()
            .ok_or("Model path not set")?
            .clone()
    };

    let config_json = serde_json::to_string(&serde_json::json!({
        "temperature": config.temperature,
        "top_p": config.top_p,
        "max_tokens": config.max_tokens
    }))
    .map_err(|e| format!("Failed to serialize config: {}", e))?;

    #[cfg(debug_assertions)]
    eprintln!("[LLM] Starting stream {} (prompt len: {} chars)", stream_id, prompt.len());

    let app = app.clone();
    let prompt = prompt.clone();
    let config_json = config_json.clone();
    thread::spawn(move || {
        let worker = { LLM_WORKER.lock().ok().and_then(|mut g| g.take()) };
        let used_worker = match worker {
            Some(w) if w.model_path == model_path => {
                match run_stream_via_worker(&app, &stream_id, &prompt, &config_json, w) {
                    Ok(restored) => {
                        if let Ok(mut guard) = LLM_WORKER.lock() {
                            *guard = Some(restored);
                        }
                        true
                    }
                    Err(e) => {
                        let _ = app.emit(
                            "llm-stream-error",
                            serde_json::json!({ "streamId": stream_id, "error": e }),
                        );
                        false
                    }
                }
            }
            other => {
                if let Some(w) = other {
                    if let Ok(mut guard) = LLM_WORKER.lock() {
                        *guard = Some(w);
                    }
                }
                false
            }
        };
        if !used_worker {
            if let Err(e) = run_stream_process(&app, &stream_id, &prompt, &model_path, &config_json) {
                let _ = app.emit(
                    "llm-stream-error",
                    serde_json::json!({ "streamId": stream_id, "error": e }),
                );
            }
        }
    });

    Ok(())
}

fn run_stream_process(
    app: &AppHandle,
    stream_id: &str,
    prompt: &str,
    model_path: &str,
    config_json: &str,
) -> Result<(), String> {
    let bundled = python_bundle::resolve_bundled_python(app);
    let (python_cmd, script_path) = resolve_python_and_script(bundled)?;

    let mut child = Command::new(&python_cmd)
        .arg(&script_path)
        .arg("generate_stream")
        .arg(model_path)
        .arg(config_json)
        .stdin(Stdio::piped())
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .spawn()
        .map_err(|e| format!("Failed to spawn Python process: {}", e))?;

    if let Some(mut stdin) = child.stdin.take() {
        stdin
            .write_all(prompt.as_bytes())
            .map_err(|e| format!("Failed to write prompt to Python stdin: {}", e))?;
    }

    let reader = BufReader::new(child.stdout.take().ok_or("No stdout from Python process")?);
    let mut stream_done = false;
    for line in reader.lines() {
        let line = line.map_err(|e| format!("Failed to read line from Python: {}", e))?;
        let v: serde_json::Value =
            serde_json::from_str(&line).map_err(|e| format!("Invalid JSON from Python: {}", e))?;

        if let Some(text) = v.get("text").and_then(|t| t.as_str()) {
            let _ = app.emit(
                "llm-stream-chunk",
                serde_json::json!({ "streamId": stream_id, "text": text }),
            );
        }
        if v.get("done").and_then(|d| d.as_bool()) == Some(true) {
            let full = v.get("full").and_then(|f| f.as_str()).unwrap_or("");
            let _ = app.emit(
                "llm-stream-done",
                serde_json::json!({ "streamId": stream_id, "full": full }),
            );
            stream_done = true;
            break;
        }
        if let Some(err) = v.get("error").and_then(|e| e.as_str()) {
            let _ = app.emit(
                "llm-stream-error",
                serde_json::json!({ "streamId": stream_id, "error": err }),
            );
            stream_done = true;
            break;
        }
    }

    let status = child.wait().map_err(|e| format!("Failed to wait for Python process: {}", e))?;
    if !stream_done {
        let mut msg = if status.success() {
            "Stream ended without a response. The model may have exited unexpectedly.".to_string()
        } else {
            "Python process failed.".to_string()
        };
        if let Some(mut stderr) = child.stderr {
            let mut err = String::new();
            if stderr.read_to_string(&mut err).is_ok() && !err.trim().is_empty() {
                let last_line = err.lines().filter(|l| !l.trim().is_empty()).last().unwrap_or("");
                if last_line.contains("llama_cpp") || last_line.contains("ModuleNotFoundError") {
                    msg = format!("Python: {} Install with: pip install llama-cpp-python", last_line.trim());
                } else {
                    msg = format!("{} Stderr: {}", msg, last_line.trim());
                }
            }
        }
        if msg == "Python process failed." {
            msg = "Python process failed. Check that the model is loaded and llama-cpp-python is installed (pip install llama-cpp-python).".to_string();
        }
        let _ = app.emit(
            "llm-stream-error",
            serde_json::json!({ "streamId": stream_id, "error": msg }),
        );
    }
    Ok(())
}

/// Check if model is loaded
#[tauri::command]
pub async fn is_model_loaded() -> Result<bool, String> {
    let state = LLM_STATE.lock().map_err(|e| format!("Failed to lock state: {}", e))?;
    Ok(state.is_initialized)
}

/// Get app data directory for storing models. Uses Tauri's writable app data dir
/// (e.g. ~/Library/Application Support/com.confidant) so the packaged app can write when run from DMG.
#[tauri::command]
pub async fn get_app_data_dir(app: AppHandle) -> Result<String, String> {
    let base_dir = app
        .path()
        .app_data_dir()
        .map_err(|e| format!("Failed to get app data dir: {}", e))?;
    let data_dir = base_dir.join("data");
    std::fs::create_dir_all(&data_dir)
        .map_err(|e| format!("Failed to create data directory: {}", e))?;
    let models_dir = data_dir.join("models");
    std::fs::create_dir_all(&models_dir)
        .map_err(|e| format!("Failed to create models directory: {}", e))?;
    #[cfg(debug_assertions)]
    eprintln!("[App Data Dir] Using data directory: {}", data_dir.display());
    Ok(data_dir.to_string_lossy().to_string())
}

/// Check if model file exists at path
#[tauri::command]
pub async fn check_model_exists(path: String) -> Result<bool, String> {
    Ok(Path::new(&path).exists())
}

/// Find existing model files in common directories
#[tauri::command]
pub async fn find_existing_models() -> Result<Vec<String>, String> {
    let mut found_models = Vec::new();
    
    // Helper to find project root
    // We want to find the actual project root (where desktop/ and data/ both exist)
    // not just any directory with data/ (like desktop/src-tauri/data/)
    let find_project_root = || -> Result<PathBuf, String> {
        let mut current = std::env::current_dir()
            .map_err(|e| format!("Failed to get current directory: {}", e))?;
        
        // Collect all directories with data/ subdirectory
        let mut candidates = Vec::new();
        
        // Search up to 6 levels
        for level in 0..6 {
            let test_path = current.join("data");
            if test_path.exists() {
                candidates.push((level, current.clone()));
            }
            
            if let Some(parent) = current.parent() {
                current = parent.to_path_buf();
            } else {
                break;
            }
        }
        
        // Prefer the directory that has both data/ and desktop/ (the actual project root)
        // or the one highest up (lowest level number)
        let project_root = candidates.iter()
            .find(|(_, path)| {
                // Check if this looks like the project root (has both data/ and desktop/)
                path.join("desktop").exists() && path.join("data").exists()
            })
            .map(|(_, path)| path.clone())
            .or_else(|| {
                // Fallback: use the highest level (most likely to be project root)
                candidates.first().map(|(_, path)| path.clone())
            });
        
        if let Some(root) = project_root {
            Ok(root)
        } else {
            // Fallback: use current directory
            Ok(std::env::current_dir()
                .map_err(|e| format!("Failed to get current directory: {}", e))?)
        }
    };
    
    let project_root = find_project_root()?;
    
    // Common directories to search
    let mut search_dirs: Vec<PathBuf> = vec![
        // Project root data/models (primary location)
        project_root.join("data").join("models"),
    ];
    
    // Also check if we're in desktop/src-tauri and need to go up
    if let Ok(current_dir) = std::env::current_dir() {
        if current_dir.to_string_lossy().contains("desktop/src-tauri") {
            // We're in desktop/src-tauri, so project root is 3 levels up
            if let Some(proj_root) = current_dir.parent()
                .and_then(|p| p.parent())
                .and_then(|p| p.parent()) {
                let alt_path = proj_root.join("data").join("models");
                if alt_path.exists() {
                    search_dirs.push(alt_path);
                }
            }
        }
    }
    
    // Desktop directory data/models (if running from desktop/src-tauri/)
    search_dirs.push(project_root.join("desktop").join("data").join("models"));
    
    // Add home directory paths
    if let Ok(home) = std::env::var("HOME").or_else(|_| std::env::var("USERPROFILE")) {
        let home_path = Path::new(&home);
        search_dirs.push(home_path.join("models"));
        search_dirs.push(home_path.join(".local").join("share").join("dant").join("models"));
    }
    
    // Search each directory
    for dir in search_dirs {
        if dir.exists() && dir.is_dir() {
            match fs::read_dir(&dir) {
                Ok(entries) => {
                    for entry in entries {
                        if let Ok(entry) = entry {
                            let path = entry.path();
                            if path.is_file() {
                                if let Some(ext) = path.extension() {
                                    if ext == "gguf" {
                                        // Check file size - must be at least 1GB to be valid
                                        if let Ok(metadata) = fs::metadata(&path) {
                                            let file_size = metadata.len();
                                            if file_size >= 1_000_000_000 {
                                                // At least 1GB - likely a valid model
                                                if let Some(path_str) = path.to_str() {
                                                    found_models.push(path_str.to_string());
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
                Err(_e) => {
                    #[cfg(debug_assertions)]
                    eprintln!("[Find Models] Error reading directory {:?}: {}", dir, _e);
                }
            }
        }
    }
    
    // Remove duplicates and sort
    found_models.sort();
    found_models.dedup();
    
    #[cfg(debug_assertions)]
    eprintln!("[Find Models] Found {} existing model files", found_models.len());
    Ok(found_models)
}

/// Download model from URL
#[tauri::command]
pub async fn download_model(url: String, output_path: String) -> Result<(), String> {
    #[cfg(debug_assertions)]
    eprintln!("[Download] Starting: {} -> {}", url, output_path);
    
    // Create parent directory if it doesn't exist
    if let Some(parent) = Path::new(&output_path).parent() {
        fs::create_dir_all(parent)
            .map_err(|e| format!("Failed to create directory: {}", e))?;
    }
    
    // Check if file already exists
    if Path::new(&output_path).exists() {
        #[cfg(debug_assertions)]
        eprintln!("[Download] File exists, skipping");
        return Ok(());
    }
    
    // Download file
    let response = reqwest::get(&url)
        .await
        .map_err(|e| format!("Failed to start download: {}", e))?;
    
    if !response.status().is_success() {
        return Err(format!("Download failed with status: {}", response.status()));
    }
    
    let total_size = response.content_length();
    let mut file = fs::File::create(&output_path)
        .map_err(|e| format!("Failed to create file: {}", e))?;
    
    let mut stream = response.bytes_stream();
    let mut downloaded: u64 = 0;
    
    use futures_util::StreamExt;
    use std::io::Write as IoWrite;
    
    while let Some(item) = stream.next().await {
        let chunk = item.map_err(|e| format!("Download error: {}", e))?;
        file.write_all(&chunk)
            .map_err(|e| format!("Failed to write to file: {}", e))?;
        downloaded += chunk.len() as u64;
        
        if let Some(total) = total_size {
            let _percent = (downloaded as f64 / total as f64 * 100.0) as u32;
            #[cfg(debug_assertions)]
            if _percent % 10 == 0 || downloaded == total {
                eprintln!("[Download] Progress: {}% ({}/{})", _percent, downloaded, total);
            }
        }
    }
    
    Ok(())
}
