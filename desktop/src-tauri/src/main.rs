// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod llm;
mod vector_store;
mod embeddings;
mod user_management;
mod cache;
mod bundled_defaults;
mod python_bundle;

use llm::{initialize_model, generate_text, generate_text_stream, is_model_loaded, download_model, check_model_exists, get_app_data_dir, find_existing_models};
use vector_store::{
    initialize_vector_store, add_documents, add_documents_to_collection,
    search_similar, search_collection, get_collection_stats, get_collection_stats_by_name,
    initialize_user_vector_store, delete_user_knowledge_base,
};
use embeddings::{generate_embedding, generate_embeddings_batch};
use user_management::{
    get_users, create_user, verify_password, get_current_user, set_current_user,
    clear_current_user_on_exit,
    save_user_chat, load_user_chat, delete_user_chat, delete_user, get_user_language, set_user_language,
};
use cache::{read_cache_file, write_cache_file};
use bundled_defaults::ensure_bundled_defaults_initialized;
use tauri::Manager;

/// Print a message to stderr so it appears in the terminal when running the app (e.g. dev timing logs).
#[tauri::command]
fn log_to_terminal(message: String) -> Result<(), String> {
    eprintln!("[Confidant] {}", message);
    Ok(())
}

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .on_window_event(|window, event| {
            if let tauri::WindowEvent::CloseRequested { .. } = event {
                let _ = clear_current_user_on_exit(&window.app_handle());
            }
        })
        .invoke_handler(tauri::generate_handler![
            // LLM commands
            initialize_model,
            generate_text,
            generate_text_stream,
            is_model_loaded,
            download_model,
            check_model_exists,
            get_app_data_dir,
            find_existing_models,
            // Vector store commands
            initialize_vector_store,
            add_documents,
            add_documents_to_collection,
            search_similar,
            search_collection,
            get_collection_stats,
            get_collection_stats_by_name,
            initialize_user_vector_store,
            delete_user_knowledge_base,
            // Embeddings commands
            generate_embedding,
            generate_embeddings_batch,
            // User management commands
            get_users,
            create_user,
            verify_password,
            get_current_user,
            set_current_user,
            save_user_chat,
            load_user_chat,
            delete_user_chat,
            delete_user,
            get_user_language,
            set_user_language,
            // Cache commands
            read_cache_file,
            write_cache_file,
            // Bundled defaults (opinionated setup)
            ensure_bundled_defaults_initialized,
            log_to_terminal,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
