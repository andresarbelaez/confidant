// User Management - User profiles, password hashing, and chat persistence

use serde::{Deserialize, Serialize};
use std::sync::Mutex;
use std::fs;
use std::path::PathBuf;
use bcrypt::{hash, verify, DEFAULT_COST};
use uuid::Uuid;
use chrono::Utc;

// Global state for user management
struct UserManagementState {
    app_data_dir: Option<PathBuf>,
}

lazy_static::lazy_static! {
    static ref USER_MANAGEMENT_STATE: Mutex<UserManagementState> = Mutex::new(UserManagementState {
        app_data_dir: None,
    });
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct User {
    pub id: String,
    pub name: String,
    #[serde(default)]
    password_hash: String, // Defaults to empty string if missing (for backward compatibility)
    #[serde(default = "default_language")]
    pub language: String, // Language code (e.g., "en", "es", "fr")
    pub created_at: String,
}

fn default_language() -> String {
    "en".to_string()
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct UserPublic {
    pub id: String,
    pub name: String,
    pub created_at: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ChatMessage {
    pub role: String, // "user" | "assistant"
    pub content: String,
    pub timestamp: String,
}

/// Get app data directory (reuse from llm module pattern)
fn get_app_data_dir() -> Result<PathBuf, String> {
    let mut state = USER_MANAGEMENT_STATE.lock()
        .map_err(|e| format!("Failed to lock state: {}", e))?;
    
    if let Some(ref dir) = state.app_data_dir {
        return Ok(dir.clone());
    }
    
    // Try to find project root by going up from current directory
    let mut current = std::env::current_dir()
        .map_err(|e| format!("Failed to get current directory: {}", e))?;
    
    let mut project_root = None;
    
    // First, try current directory
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
    
    let data_dir = base_dir.join("data");
    fs::create_dir_all(&data_dir)
        .map_err(|e| format!("Failed to create data directory: {}", e))?;
    
    state.app_data_dir = Some(data_dir.clone());
    Ok(data_dir)
}

/// Get users file path
fn get_users_file_path() -> Result<PathBuf, String> {
    let data_dir = get_app_data_dir()?;
    Ok(data_dir.join("users.json"))
}

/// Get current user file path
fn get_current_user_file_path() -> Result<PathBuf, String> {
    let data_dir = get_app_data_dir()?;
    Ok(data_dir.join("current_user.json"))
}

/// Get user directory path
fn get_user_dir_path(user_id: &str) -> Result<PathBuf, String> {
    let data_dir = get_app_data_dir()?;
    let users_dir = data_dir.join("users");
    fs::create_dir_all(&users_dir)
        .map_err(|e| format!("Failed to create users directory: {}", e))?;
    Ok(users_dir.join(user_id))
}

/// Get chat history file path for a user
fn get_chat_history_path(user_id: &str) -> Result<PathBuf, String> {
    let user_dir = get_user_dir_path(user_id)?;
    Ok(user_dir.join("chats.json"))
}

/// Load users from file
fn load_users() -> Result<Vec<User>, String> {
    let users_file = get_users_file_path()?;
    
    if !users_file.exists() {
        return Ok(Vec::new());
    }
    
    let content = fs::read_to_string(&users_file)
        .map_err(|e| format!("Failed to read users file: {}", e))?;
    
    let users: Vec<User> = serde_json::from_str(&content)
        .map_err(|e| format!("Failed to parse users file: {}", e))?;
    
    // Filter out users with empty password_hash (old format) - they need to be recreated
    // This handles migration from old users.json format
    let original_count = users.len();
    let valid_users: Vec<User> = users.into_iter()
        .filter(|u| !u.password_hash.is_empty())
        .collect();
    
    // If we filtered out any users, save the cleaned list
    if valid_users.len() < original_count {
        #[cfg(debug_assertions)]
        eprintln!("[User Management] Filtered out {} users with missing password_hash (old format). These users need to be recreated.", 
                  original_count - valid_users.len());
        // Save the cleaned list back to prevent future parsing errors
        if !valid_users.is_empty() {
            save_users(&valid_users)?;
        } else {
            // If all users were invalid, delete the file
            let _ = fs::remove_file(&users_file);
        }
    }
    
    Ok(valid_users)
}

/// Save users to file
fn save_users(users: &[User]) -> Result<(), String> {
    let users_file = get_users_file_path()?;
    
    #[cfg(debug_assertions)]
    eprintln!("[User Management] Saving {} users to: {:?}", users.len(), users_file);
    
    let content = serde_json::to_string_pretty(users)
        .map_err(|e| {
            #[cfg(debug_assertions)]
            eprintln!("[User Management] Serialization failed: {}", e);
            format!("Failed to serialize users: {}", e)
        })?;
    
    #[cfg(debug_assertions)]
    eprintln!("[User Management] Serialized {} bytes", content.len());
    
    fs::write(&users_file, content)
        .map_err(|e| {
            #[cfg(debug_assertions)]
            eprintln!("[User Management] File write failed: {} (path: {:?})", e, users_file);
            format!("Failed to write users file: {}", e)
        })?;
    
    #[cfg(debug_assertions)]
    eprintln!("[User Management] Users saved successfully");
    
    Ok(())
}

/// Get all users (public info only, no password hashes)
#[tauri::command]
pub async fn get_users() -> Result<Vec<UserPublic>, String> {
    let users = load_users()?;
    
    Ok(users.into_iter().map(|u| UserPublic {
        id: u.id,
        name: u.name,
        created_at: u.created_at,
    }).collect())
}

/// Create a new user
#[tauri::command]
pub async fn create_user(name: String, password: String) -> Result<UserPublic, String> {
    #[cfg(debug_assertions)]
    eprintln!("[User Management] Creating user: name='{}', password_len={}", name, password.len());
    
    // Validate name
    let name = name.trim();
    if name.is_empty() {
        #[cfg(debug_assertions)]
        eprintln!("[User Management] Validation failed: name is empty");
        return Err("User name cannot be empty".to_string());
    }
    if name.len() > 50 {
        #[cfg(debug_assertions)]
        eprintln!("[User Management] Validation failed: name too long ({})", name.len());
        return Err("User name is too long (max 50 characters)".to_string());
    }
    
    // Validate password
    if password.len() < 4 {
        #[cfg(debug_assertions)]
        eprintln!("[User Management] Validation failed: password too short ({})", password.len());
        return Err("Password must be at least 4 characters long".to_string());
    }
    
    // Load existing users
    let mut users = load_users().map_err(|e| {
        #[cfg(debug_assertions)]
        eprintln!("[User Management] Failed to load users: {}", e);
        e
    })?;
    
    #[cfg(debug_assertions)]
    eprintln!("[User Management] Loaded {} existing users", users.len());
    
    // Check for duplicate name
    if users.iter().any(|u| u.name.eq_ignore_ascii_case(name)) {
        #[cfg(debug_assertions)]
        eprintln!("[User Management] Validation failed: duplicate name '{}'", name);
        return Err("A user with this name already exists".to_string());
    }
    
    // Hash password
    #[cfg(debug_assertions)]
    eprintln!("[User Management] Hashing password...");
    let password_hash = hash(&password, DEFAULT_COST)
        .map_err(|e| {
            #[cfg(debug_assertions)]
            eprintln!("[User Management] Password hashing failed: {}", e);
            format!("Failed to hash password: {}", e)
        })?;
    
    // Create new user
    let user = User {
        id: Uuid::new_v4().to_string(),
        name: name.to_string(),
        password_hash,
        language: "en".to_string(), // Default to English
        created_at: Utc::now().to_rfc3339(),
    };
    
    #[cfg(debug_assertions)]
    eprintln!("[User Management] Created user: id='{}', name='{}'", user.id, user.name);
    
    // Add to users list
    users.push(user.clone());
    
    // Save users
    save_users(&users).map_err(|e| {
        #[cfg(debug_assertions)]
        eprintln!("[User Management] Failed to save users: {}", e);
        e
    })?;
    
    #[cfg(debug_assertions)]
    eprintln!("[User Management] User created successfully: id='{}'", user.id);
    
    // Return public user info
    Ok(UserPublic {
        id: user.id,
        name: user.name,
        created_at: user.created_at,
    })
}

/// Verify password for a user
#[tauri::command]
pub async fn verify_password(user_id: String, password: String) -> Result<bool, String> {
    let users = load_users()?;
    
    let user = users.iter()
        .find(|u| u.id == user_id)
        .ok_or_else(|| "User not found".to_string())?;
    
    verify(&password, &user.password_hash)
        .map_err(|e| format!("Failed to verify password: {}", e))
}

/// Get current logged-in user
#[tauri::command]
pub async fn get_current_user() -> Result<Option<String>, String> {
    let current_user_file = get_current_user_file_path()?;
    
    if !current_user_file.exists() {
        return Ok(None);
    }
    
    let content = fs::read_to_string(&current_user_file)
        .map_err(|e| format!("Failed to read current user file: {}", e))?;
    
    let user_id: String = serde_json::from_str(&content)
        .map_err(|e| format!("Failed to parse current user file: {}", e))?;
    
    // Verify user still exists
    let users = load_users()?;
    if users.iter().any(|u| u.id == user_id) {
        Ok(Some(user_id))
    } else {
        // User doesn't exist anymore, clear current user
        set_current_user(None).await?;
        Ok(None)
    }
}

/// Set current logged-in user (None for guest/logout)
#[tauri::command]
pub async fn set_current_user(user_id: Option<String>) -> Result<(), String> {
    let current_user_file = get_current_user_file_path()?;
    
    if let Some(id) = user_id {
        // Verify user exists
        let users = load_users()?;
        if !users.iter().any(|u| u.id == id) {
            return Err("User not found".to_string());
        }
        
        // Save current user
        let content = serde_json::to_string(&id)
            .map_err(|e| format!("Failed to serialize user ID: {}", e))?;
        fs::write(&current_user_file, content)
            .map_err(|e| format!("Failed to write current user file: {}", e))?;
    } else {
        // Remove current user file (guest mode or logout)
        if current_user_file.exists() {
            fs::remove_file(&current_user_file)
                .map_err(|e| format!("Failed to remove current user file: {}", e))?;
        }
    }
    
    Ok(())
}

/// Save chat history for a user
#[tauri::command]
pub async fn save_user_chat(user_id: String, messages: Vec<ChatMessage>) -> Result<(), String> {
    // Verify user exists
    let users = load_users()?;
    if !users.iter().any(|u| u.id == user_id) {
        return Err("User not found".to_string());
    }
    
    let chat_file = get_chat_history_path(&user_id)?;
    
    // Ensure user directory exists
    if let Some(parent) = chat_file.parent() {
        fs::create_dir_all(parent)
            .map_err(|e| format!("Failed to create user directory: {}", e))?;
    }
    
    let content = serde_json::to_string_pretty(&messages)
        .map_err(|e| format!("Failed to serialize chat history: {}", e))?;
    
    fs::write(&chat_file, content)
        .map_err(|e| format!("Failed to write chat history: {}", e))?;
    
    Ok(())
}

/// Load chat history for a user
#[tauri::command]
pub async fn load_user_chat(user_id: String) -> Result<Vec<ChatMessage>, String> {
    // Verify user exists
    let users = load_users()?;
    if !users.iter().any(|u| u.id == user_id) {
        return Err("User not found".to_string());
    }
    
    let chat_file = get_chat_history_path(&user_id)?;
    
    if !chat_file.exists() {
        return Ok(Vec::new());
    }
    
    let content = fs::read_to_string(&chat_file)
        .map_err(|e| format!("Failed to read chat history: {}", e))?;
    
    let messages: Vec<ChatMessage> = serde_json::from_str(&content)
        .map_err(|e| format!("Failed to parse chat history: {}", e))?;
    
    Ok(messages)
}

/// Delete a user and their data
#[tauri::command]
pub async fn delete_user(user_id: String) -> Result<(), String> {
    // Load users
    let mut users = load_users()?;
    
    // Find user index
    let index = users.iter()
        .position(|u| u.id == user_id)
        .ok_or_else(|| "User not found".to_string())?;
    
    // Remove user
    users.remove(index);
    
    // Save updated users list
    save_users(&users)?;
    
    // Delete user directory and all its contents
    let user_dir = get_user_dir_path(&user_id)?;
    if user_dir.exists() {
        fs::remove_dir_all(&user_dir)
            .map_err(|e| format!("Failed to delete user directory: {}", e))?;
    }
    
    // If this was the current user, clear current user
    if let Ok(Some(current_id)) = get_current_user().await {
        if current_id == user_id {
            set_current_user(None).await?;
        }
    }
    
    Ok(())
}

/// Get user's language preference
#[tauri::command]
pub async fn get_user_language(user_id: String) -> Result<Option<String>, String> {
    let users = load_users()?;
    
    let user = users.iter()
        .find(|u| u.id == user_id)
        .ok_or_else(|| "User not found".to_string())?;
    
    Ok(Some(user.language.clone()))
}

/// Set user's language preference
#[tauri::command]
pub async fn set_user_language(user_id: String, language: String) -> Result<(), String> {
    let mut users = load_users()?;
    
    let user = users.iter_mut()
        .find(|u| u.id == user_id)
        .ok_or_else(|| "User not found".to_string())?;
    
    user.language = language;
    
    save_users(&users)?;
    
    Ok(())
}
