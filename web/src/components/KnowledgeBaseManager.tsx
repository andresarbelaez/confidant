import { useState, useEffect, useRef } from 'react';
import { IndexedDBVectorStore } from '../knowledge/indexeddb-vector-store';
import { KnowledgeBaseLoader } from '../knowledge/knowledge-loader';
import { formatBytes } from '../utils/storage';
import './KnowledgeBaseManager.css';

export default function KnowledgeBaseManager() {
  const [vectorStore, setVectorStore] = useState<IndexedDBVectorStore | null>(null);
  const [loader, setLoader] = useState<KnowledgeBaseLoader | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [documentCount, setDocumentCount] = useState(0);
  const [storageStats, setStorageStats] = useState<{
    documentCount: number;
    indexSize: number;
    storageSize: number;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [loadProgress, setLoadProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    initializeStore();
  }, []);

  const initializeStore = async () => {
    try {
      const store = new IndexedDBVectorStore('dant_knowledge', 384);
      await store.initialize();
      setVectorStore(store);
      
      const kbLoader = new KnowledgeBaseLoader(store);
      setLoader(kbLoader);
      
      setIsInitialized(true);
      await updateStats();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to initialize vector store');
    }
  };

  const updateStats = async () => {
    if (!vectorStore) return;
    
    try {
      const count = await vectorStore.count();
      setDocumentCount(count);
      
      const stats = await vectorStore.getStats();
      setStorageStats(stats);
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
      // Check if it's a valid knowledge base file
      const manifest = await loader.getManifest(file);
      console.log('Knowledge base manifest:', manifest);

      // Load the knowledge base
      await loader.loadFromFile(file, (progress) => {
        setLoadProgress(progress);
      });

      await updateStats();
      setIsLoading(false);
      
      // Reset file input
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
    if (!vectorStore) return;
    
    if (!confirm('Clear all knowledge base documents? This cannot be undone.')) {
      return;
    }

    try {
      await vectorStore.clear();
      await updateStats();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to clear knowledge base');
    }
  };

  if (!isInitialized) {
    return (
      <div className="knowledge-base-manager">
        <p>Initializing knowledge base system...</p>
      </div>
    );
  }

  return (
    <div className="knowledge-base-manager">
      <h2>Knowledge Base Manager</h2>
      
      {error && (
        <div className="error-message">
          {error}
        </div>
      )}

      <div className="kb-stats">
        <h3>Current Status</h3>
        <div className="stat-grid">
          <div className="stat-item">
            <span className="stat-label">Documents:</span>
            <span className="stat-value">{documentCount.toLocaleString()}</span>
          </div>
          {storageStats && (
            <>
              <div className="stat-item">
                <span className="stat-label">Index Size:</span>
                <span className="stat-value">{storageStats.indexSize.toLocaleString()}</span>
              </div>
              <div className="stat-item">
                <span className="stat-label">Storage:</span>
                <span className="stat-value">{formatBytes(storageStats.storageSize)}</span>
              </div>
            </>
          )}
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
          For MVP, we're focusing on health knowledge bases (~3GB uncompressed, ~1GB compressed).
        </p>
        <p>
          <strong>Note:</strong> ZSTD decompression support is coming soon. For now, use uncompressed JSON files.
        </p>
      </div>
    </div>
  );
}
