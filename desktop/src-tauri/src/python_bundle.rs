// Resolve bundled Python and scripts from Tauri resources (for packaged app).
// When building for distribution, packagers place:
//   - resources/python/  = python-build-standalone install (bin/python3 on Unix, python.exe on Windows)
//   - resources/scripts/ = llama_helper.py, chromadb_helper.py, embeddings_helper.py
// and pre-install pip deps (llama-cpp-python, chromadb, sentence-transformers) into that Python.

use std::path::PathBuf;
use tauri::{AppHandle, Manager};

/// Name of the scripts subdir under resource dir.
const SCRIPTS_DIR: &str = "scripts";

/// Returns (python_exe_path, scripts_dir_path) if bundled Python and scripts exist; None otherwise.
/// Call this from commands that need to run Python; when Some, use these paths instead of system Python.
pub fn resolve_bundled_python(app: &AppHandle) -> Option<(PathBuf, PathBuf)> {
    let resource_dir = app.path().resource_dir().ok()?;
    let python_root = resource_dir.join("python");
    let scripts_dir = resource_dir.join(SCRIPTS_DIR);

    #[cfg(windows)]
    let python_exe = python_root.join("python.exe");
    #[cfg(not(windows))]
    let python_exe = python_root.join("bin").join("python3");

    if python_exe.exists() && python_root.is_dir() && scripts_dir.is_dir() {
        Some((python_exe, scripts_dir))
    } else {
        None
    }
}

/// Resolve path to a specific script in the bundled scripts dir.
/// Returns None if bundled Python is not present or script doesn't exist.
#[allow(dead_code)]
pub fn resolve_bundled_script(app: &AppHandle, script_name: &str) -> Option<PathBuf> {
    let (_, scripts_dir) = resolve_bundled_python(app)?;
    let script_path = scripts_dir.join(script_name);
    if script_path.exists() {
        Some(script_path)
    } else {
        None
    }
}
