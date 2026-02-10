// Resolve bundled Python and scripts from Tauri resources (for packaged app).
// When building for distribution, packagers place:
//   - resources/python/  = python-build-standalone install (bin/python3 on Unix, python.exe on Windows)
//   - resources/scripts/ = llama_helper.py, chromadb_helper.py, embeddings_helper.py
// and pre-install pip deps (llama-cpp-python, chromadb, sentence-transformers) into that Python.

use std::path::{Path, PathBuf};
use tauri::{AppHandle, Manager};

/// Find venv Python for dev: env vars first, then walk up from current_dir to find venv.
/// Set CONFIDANT_PYTHON to the full path to python (e.g. /path/to/venv/bin/python3) or
/// VIRTUAL_ENV to the venv root (e.g. /path/to/venv) if auto-detect fails.
pub fn find_venv_python() -> Option<PathBuf> {
    #[cfg(windows)]
    let venv_exe = |root: &Path| root.join("Scripts").join("python.exe");
    #[cfg(not(windows))]
    let venv_exe = |root: &Path| root.join("bin").join("python3");

    if let Ok(path) = std::env::var("CONFIDANT_PYTHON") {
        let p = PathBuf::from(&path);
        if p.exists() {
            return Some(p);
        }
    }
    if let Ok(venv_root) = std::env::var("VIRTUAL_ENV") {
        let exe = venv_exe(Path::new(&venv_root));
        if exe.exists() {
            return Some(exe);
        }
    }

    let mut dir = std::env::current_dir().ok()?;
    #[cfg(windows)]
    let venv_exe_in_dir = |root: &Path| root.join("venv").join("Scripts").join("python.exe");
    #[cfg(not(windows))]
    let venv_exe_in_dir = |root: &Path| root.join("venv").join("bin").join("python3");
    loop {
        let exe = venv_exe_in_dir(dir.as_path());
        if exe.exists() {
            return Some(exe);
        }
        dir = match dir.parent() {
            Some(p) => p.to_path_buf(),
            None => return None,
        };
    }
}

/// Name of the scripts subdir under resource dir.
const SCRIPTS_DIR: &str = "scripts";

/// Returns (python_exe_path, scripts_dir_path) if bundled Python and scripts exist; None otherwise.
/// Call this from commands that need to run Python; when Some, use these paths instead of system Python.
pub fn resolve_bundled_python(app: &AppHandle) -> Option<(PathBuf, PathBuf)> {
    let resource_dir = app.path().resource_dir().ok()?;
    // Try root (map format "resources/": "") then under "resources/" (list format "resources/")
    for base in [resource_dir.clone(), resource_dir.join("resources")] {
        let python_root = base.join("python");
        let scripts_dir = base.join(SCRIPTS_DIR);

        #[cfg(windows)]
        let python_exe = python_root.join("python.exe");
        #[cfg(not(windows))]
        let python_exe = python_root.join("bin").join("python3");

        if python_exe.exists() && python_root.is_dir() && scripts_dir.is_dir() {
            return Some((python_exe, scripts_dir));
        }
    }
    None
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
