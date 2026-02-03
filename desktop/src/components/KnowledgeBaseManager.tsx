import { useState, useEffect, useRef } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { KnowledgeBaseLoader } from '../knowledge/knowledge-loader';
import { formatBytes } from '../utils/storage';
import './KnowledgeBaseManager.css';

export default function KnowledgeBaseManager() {
  const [isInitialized, setIsInitialized] = useState(false);
  const [documentCount, setDocumentCount] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [loadProgress, setLoadProgress] = useState(0);
  const [loader, setLoader] = useState<KnowledgeBaseLoader | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    initializeStore();
  }, []);

  const initializeStore = async () => {
    try {
      await invoke('initialize_vector_store', { collectionName: 'dant_knowledge' });
      setIsInitialized(true);
      setLoader(new KnowledgeBaseLoader());
      await updateStats();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to initialize vector store');
      console.error('Failed to initialize vector store:', err);
    }
  };

  const updateStats = async () => {
    try {
      const stats = await invoke<{ document_count: number; collection_name: string }>('get_collection_stats');
      setDocumentCount(stats.document_count || 0);
    } catch (err) {
      console.error('Failed to update stats:', err);
    }
  };

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !loader) return;

    setIsLoading(true);
    setError(null);
    setLoadProgress(0);

    try {
      const manifest = await loader.getManifest(file);

      await loader.loadFromFile(file, (progress) => {
        setLoadProgress(progress);
      });

      await updateStats();
      setIsLoading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load knowledge base');
      setIsLoading(false);
    }
  };

  const handleDownloadFromURL = async (url: string) => {
    if (!loader) return;

    setIsLoading(true);
    setError(null);
    setLoadProgress(0);

    try {
      await loader.loadFromURL(url, (progress) => {
        setLoadProgress(progress);
      });

      await updateStats();
      setIsLoading(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to download knowledge base');
      setIsLoading(false);
    }
  };

  const handleClear = async () => {
    if (!confirm('Clear all knowledge base documents? This cannot be undone.')) {
      return;
    }

    try {
      // TODO: Implement clear command in Rust backend
      setError('Clear functionality not yet implemented');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to clear knowledge base');
    }
  };

  if (!isInitialized) {
    return (
      <div className="knowledge-base-manager">
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '2rem' }}>
          <div className="loading-spinner"></div>
          <p style={{ marginTop: '1rem' }}>Initializing knowledge base system...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="knowledge-base-manager">
      <h2>Knowledge Base Manager</h2>
      
      {error && (
        <div className="error-message">
          <strong>Error:</strong>
          <p style={{ marginTop: '0.5rem', marginBottom: 0 }}>{error}</p>
          <p style={{ marginTop: '0.75rem', fontSize: '0.9rem', opacity: 0.8 }}>
            Troubleshooting: Ensure the file is a valid knowledge base JSON file. Check that Python, ChromaDB, and sentence-transformers are installed.
          </p>
        </div>
      )}

      <div className="kb-stats">
        <h3>Current Status</h3>
        <div className="stat-grid">
          <div className="stat-item">
            <span className="stat-label">Documents:</span>
            <span className="stat-value">{documentCount.toLocaleString()}</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">Status:</span>
            <span className="stat-value" style={{ color: '#4ade80' }}>Initialized</span>
          </div>
        </div>
      </div>

      <div className="kb-actions">
        <h3>Load Knowledge Base</h3>
        
        <div className="load-option">
          <h4>From File</h4>
          <p>Upload a knowledge base package file (.json or .zst)</p>
          <input
            ref={fileInputRef}
            type="file"
            accept=".json,.zst"
            onChange={handleFileSelect}
            disabled={isLoading}
            className="file-input"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={isLoading}
            className="upload-button"
          >
            Choose File
          </button>
        </div>

        <div className="load-option">
          <h4>From URL</h4>
          <p>Download knowledge base from a URL</p>
          <div className="url-input-group">
            <input
              type="url"
              placeholder="https://example.com/knowledge-base.json"
              disabled={isLoading}
              className="url-input"
              id="kb-url-input"
            />
            <button
              onClick={() => {
                const input = document.getElementById('kb-url-input') as HTMLInputElement;
                if (input.value) {
                  handleDownloadFromURL(input.value);
                }
              }}
              disabled={isLoading}
              className="download-button"
            >
              Download
            </button>
          </div>
        </div>

        {isLoading && (
          <div className="load-progress">
            <div className="progress-bar">
              <div
                className="progress-fill"
                style={{ width: `${loadProgress * 100}%` }}
              />
            </div>
            <p>Loading knowledge base... {Math.round(loadProgress * 100)}%</p>
          </div>
        )}
      </div>

      {documentCount > 0 && (
        <div className="kb-management">
          <h3>Management</h3>
          <button
            onClick={handleClear}
            disabled={isLoading}
            className="clear-button"
          >
            Clear All Documents
          </button>
          <p className="warning-text">
            Warning: Clearing will remove all documents from the knowledge base. This action cannot be undone.
          </p>
        </div>
      )}

      <div className="info-note">
        <p>
          <strong>Knowledge Base Format:</strong> Knowledge bases are distributed as JSON files 
          (or compressed .zst files) containing documents, pre-computed embeddings, and metadata.
        </p>
        <p>
          <strong>Note:</strong> ZSTD decompression support is coming soon. For now, use uncompressed JSON files.
        </p>
      </div>
    </div>
  );
}
