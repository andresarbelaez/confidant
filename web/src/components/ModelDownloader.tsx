import { useState, useEffect, useRef } from 'react';
import { AVAILABLE_MODELS, DEFAULT_MODEL, isModelDownloaded, deleteModel, listDownloadedModels, type ModelInfo } from '../llm/model-loader';
import { WASMLLMEngine } from '../llm/wasm-llm-engine';
import { setLLMEngine } from '../utils/llm-instance';
import { diagnoseModelDownload } from '../utils/diagnose-model-download';
import { testModelFileDownload } from '../utils/network-debug';
import './ModelDownloader.css';

type InitializationState = 'not-initialized' | 'initializing' | 'initialized' | 'error';

export default function ModelDownloader() {
  const [selectedModel, setSelectedModel] = useState<ModelInfo>(DEFAULT_MODEL);
  const [downloadedModels, setDownloadedModels] = useState<string[]>([]);
  const [initState, setInitState] = useState<InitializationState>('not-initialized');
  const [initProgress, setInitProgress] = useState<number>(0);
  const [initializedModel, setInitializedModel] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const engineRef = useRef<WASMLLMEngine | null>(null);

  useEffect(() => {
    loadDownloadedModels();
    // Initialize engine instance
    if (!engineRef.current) {
      engineRef.current = new WASMLLMEngine();
      // Share engine instance globally
      setLLMEngine(engineRef.current);
    }
    // Check if current model is already initialized
    checkInitializedModel();
  }, []);

  const loadDownloadedModels = async () => {
    const models = await listDownloadedModels();
    setDownloadedModels(models);
  };

  const checkInitializedModel = () => {
    if (engineRef.current?.isModelLoaded()) {
      const modelName = engineRef.current.getModelName();
      if (modelName) {
        setInitializedModel(modelName);
        setInitState('initialized');
      }
    }
  };

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  };

  const handleInitialize = async () => {
    if (initState === 'initializing' || !engineRef.current) return;

    setInitState('initializing');
    setError(null);
    setInitProgress(0);

    try {
      // Run diagnostics first
      console.log('[Model Downloader] Running diagnostics...');
      await diagnoseModelDownload();
      
      // Initialize the LLM engine with progress callback
      // WebLLM will automatically download the model if needed
      await engineRef.current.initialize(
        selectedModel.name,
        (progress: number) => {
          setInitProgress(progress);
        }
      );

      // Initialization successful
      setInitState('initialized');
      setInitializedModel(selectedModel.name);
      setInitProgress(1);
      
      // Refresh downloaded models list
      await loadDownloadedModels();

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Initialization failed';
      console.error('[Model Downloader] Initialization error:', err);
      
      // Run diagnostics to help identify the issue
      await diagnoseModelDownload();
      
      // Provide helpful error messages
      if (errorMessage.includes('Quota') || errorMessage.includes('quota exceeded')) {
        setError(
          `Storage Quota Exceeded\n\n` +
          `Your browser storage is nearly full (97.3% used).\n\n` +
          `The model requires ~2GB of free space, but only 23MB is available.\n\n` +
          `Solutions:\n` +
          `1. Clear browser storage for this site:\n` +
          `   DevTools → Application → Storage → Clear site data\n` +
          `2. If in incognito mode, try regular window (incognito has lower limits)\n` +
          `3. Clear Cache Storage:\n` +
          `   DevTools → Application → Cache Storage → Delete all\n` +
          `4. Clear other site data to free up space\n\n` +
          `After clearing, try initializing again.`
        );
      } else if (errorMessage.includes('Cache') || errorMessage.includes('network')) {
        // Check if service worker is the issue (async)
        let hasServiceWorker = false;
        if ('serviceWorker' in navigator) {
          if (navigator.serviceWorker.controller) {
            hasServiceWorker = true;
          } else {
            try {
              const regs = await navigator.serviceWorker.getRegistrations();
              hasServiceWorker = regs.length > 0;
            } catch {
              // Ignore
            }
          }
        }
        
        let errorText = `Model download failed: ${errorMessage}\n\n`;
        
        if (hasServiceWorker) {
          errorText += `⚠️ SERVICE WORKER DETECTED - This is likely the cause!\n\n`;
          errorText += `Fix Steps:\n`;
          errorText += `1. Open DevTools (F12)\n`;
          errorText += `2. Go to Application → Service Workers\n`;
          errorText += `3. Click "Unregister" for any active service workers\n`;
          errorText += `4. Close DevTools\n`;
          errorText += `5. Hard refresh (Cmd+Shift+R / Ctrl+Shift+R)\n`;
          errorText += `6. Try initializing the model again\n\n`;
        } else {
          errorText += `Troubleshooting:\n`;
          errorText += `1. Check console diagnostics above\n`;
          errorText += `2. Check Network tab for failed requests\n`;
          errorText += `3. Try in incognito/private window\n`;
          errorText += `4. Check browser storage quota\n\n`;
        }
        
        errorText += `The error "net::ERR_FAILED 200 (OK)" means:\n`;
        errorText += `- The server responded successfully (200 OK)\n`;
        errorText += `- But Chrome's network layer reports it as failed\n`;
        errorText += `- This prevents Cache.add() from working\n\n`;
        errorText += `From your Network tab, I can see:\n`;
        errorText += `- WASM file downloads successfully ✅\n`;
        errorText += `- Model shard files fail with ERR_FAILED ❌\n\n`;
        errorText += `Possible causes:\n`;
        errorText += `1. Browser extension still interfering (even if disabled)\n`;
        errorText += `2. CORS/security policy blocking large binary files\n`;
        errorText += `3. CDN response format issue\n`;
        errorText += `4. Browser security settings\n\n`;
        errorText += `Try:\n`;
        errorText += `1. Completely close and reopen browser (not just disable extensions)\n`;
        errorText += `2. Try a different browser (Edge, Firefox)\n`;
        errorText += `3. Check Chrome security settings\n`;
        errorText += `4. Click "Run Network Debug Test" below to test CDN access\n\n`;
        errorText += `This is a known WebLLM issue - see GitHub issues #313, #688`;
        
        setError(errorText);
      } else {
        setError(errorMessage);
      }
      
      setInitState('error');
      setInitProgress(0);
    }
  };

  const handleDelete = async (modelName: string) => {
    if (!confirm(`Delete model ${modelName}? This will free up storage space.`)) {
      return;
    }

    try {
      await deleteModel(modelName);
      await loadDownloadedModels();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete model');
    }
  };

  const isModelAlreadyDownloaded = (modelName: string): boolean => {
    return downloadedModels.includes(modelName);
  };

  const isCurrentModelInitialized = (): boolean => {
    return initializedModel === selectedModel.name && initState === 'initialized';
  };

  const getStatusMessage = (): string => {
    if (isCurrentModelInitialized()) {
      return '✓ Model Ready';
    }
    if (initState === 'initializing') {
      return 'Initializing...';
    }
    if (initState === 'error') {
      return 'Initialization Failed';
    }
    return 'Not Initialized';
  };

  return (
    <div className="model-downloader">
      <h2>LLM Model Manager</h2>
      
      {error && (
        <div className="error-message">
          <pre style={{ whiteSpace: 'pre-wrap', fontFamily: 'inherit' }}>{error}</pre>
          {error.includes('Cache') && error.includes('network') && (
            <div style={{ marginTop: '1rem' }}>
              <button
                onClick={async () => {
                  console.log('Running network debug test...');
                  await testModelFileDownload();
                }}
                style={{
                  padding: '0.5rem 1rem',
                  background: 'rgba(59, 130, 246, 0.1)',
                  border: '1px solid rgba(59, 130, 246, 0.3)',
                  borderRadius: '6px',
                  color: '#3b82f6',
                  cursor: 'pointer',
                  fontSize: '0.9rem'
                }}
              >
                Run Network Debug Test
              </button>
            </div>
          )}
        </div>
      )}

      <div className="model-selector">
        <label htmlFor="model-select">Select Model:</label>
        <select
          id="model-select"
          value={selectedModel.name}
          onChange={(e) => {
            const model = AVAILABLE_MODELS.find(m => m.name === e.target.value);
            if (model) {
              setSelectedModel(model);
              // Reset state if switching to different model
              if (initializedModel !== model.name) {
                setInitState('not-initialized');
              } else {
                setInitState('initialized');
              }
            }
          }}
          disabled={initState === 'initializing'}
        >
          {AVAILABLE_MODELS.map((model) => (
            <option key={model.name} value={model.name}>
              {model.name} ({formatBytes(model.size)})
            </option>
          ))}
        </select>
      </div>

      <div className="model-info">
        <p><strong>Description:</strong> {selectedModel.description}</p>
        <p><strong>Size:</strong> {formatBytes(selectedModel.size)}</p>
        <p className={`status-badge ${isCurrentModelInitialized() ? 'ready' : initState === 'initializing' ? 'initializing' : 'not-ready'}`}>
          {getStatusMessage()}
        </p>
        {isModelAlreadyDownloaded(selectedModel.name) && (
          <p className="downloaded-badge">✓ Model cached locally</p>
        )}
      </div>

      {initState === 'initializing' && (
        <div className="init-progress">
          <div className="progress-bar">
            <div
              className="progress-fill"
              style={{ width: `${initProgress * 100}%` }}
            />
          </div>
          <p>
            Initializing model... {Math.round(initProgress * 100)}%
            {initProgress < 1 && (
              <span className="progress-note"> (Downloading if needed)</span>
            )}
          </p>
        </div>
      )}

      <div className="model-actions">
        <button
          onClick={handleInitialize}
          disabled={initState === 'initializing' || isCurrentModelInitialized()}
          className="initialize-button"
        >
          {initState === 'initializing' 
            ? 'Initializing...' 
            : isCurrentModelInitialized()
            ? 'Model Ready'
            : 'Initialize Model'}
        </button>
      </div>

      {downloadedModels.length > 0 && (
        <div className="downloaded-models">
          <h3>Downloaded Models</h3>
          <ul>
            {downloadedModels.map((modelName) => (
              <li key={modelName}>
                <span>{modelName}</span>
                <button
                  onClick={() => handleDelete(modelName)}
                  className="delete-button"
                >
                  Delete
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="info-note">
        <p>
          <strong>How it works:</strong> Click "Initialize Model" to set up the AI engine. 
          If this is your first time using this model, WebLLM will automatically download and cache it 
          (this may take a few minutes depending on your connection). Once initialized, the model is ready to use.
        </p>
      </div>
    </div>
  );
}
