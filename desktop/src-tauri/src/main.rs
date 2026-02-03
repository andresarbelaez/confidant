// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod llm;
mod vector_store;
mod embeddings;

use llm::{initialize_model, generate_text, is_model_loaded, download_model, check_model_exists, get_app_data_dir, find_existing_models};
use vector_store::{
    initialize_vector_store, add_documents, search_similar, get_collection_stats,
};
use embeddings::{generate_embedding, generate_embeddings_batch};

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .invoke_handler(tauri::generate_handler![
            // LLM commands
            initialize_model,
            generate_text,
            is_model_loaded,
            download_model,
            check_model_exists,
            get_app_data_dir,
            find_existing_models,
            // Vector store commands
            initialize_vector_store,
            add_documents,
            search_similar,
            get_collection_stats,
            // Embeddings commands
            generate_embedding,
            generate_embeddings_batch,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
