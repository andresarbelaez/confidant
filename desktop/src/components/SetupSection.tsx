import { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { MODEL_OPTIONS, ModelOption, getDefaultModel } from '../config/model-options';
import { KB_OPTIONS, KBOption, getDefaultKB } from '../config/kb-options';
import { useTranslation } from '../i18n/hooks/useTranslation';
import './SetupSection.css';

type DownloadStatus = 'not-started' | 'downloading' | 'downloaded' | 'error' | 'checking';

interface SetupSectionProps {
  onModelReady: (modelPath: string) => void;
  onKBReady: () => void;
}

export default function SetupSection({ onModelReady, onKBReady }: SetupSectionProps) {
  const { t } = useTranslation(null);
  const [selectedModel, setSelectedModel] = useState<ModelOption>(getDefaultModel());
  const [selectedKB, setSelectedKB] = useState<KBOption>(getDefaultKB());
  
  const [modelStatus, setModelStatus] = useState<DownloadStatus>('checking');
  const [kbStatus, setKBStatus] = useState<DownloadStatus>('checking');
  
  const [modelProgress, setModelProgress] = useState(0);
  const [kbProgress, setKBProgress] = useState(0);
  
  const [modelError, setModelError] = useState<string | null>(null);
  const [kbError, setKBError] = useState<string | null>(null);
  const [existingModels, setExistingModels] = useState<string[]>([]);
  const [showExistingModels, setShowExistingModels] = useState(false);

  // Check for existing models on mount
  useEffect(() => {
    findExistingModels();
  }, []);


  // Check if model already exists
  useEffect(() => {
    checkModelExists();
  }, [selectedModel]);

  // Check if KB already exists and initialize vector store
  useEffect(() => {
    initializeVectorStore();
  }, []);

  // Check if KB already exists
  useEffect(() => {
    checkKBExists();
  }, [selectedKB]);

  const checkModelExists = async () => {
    try {
      const modelPath = await getModelPath(selectedModel.id);
      const exists = await invoke<boolean>('check_model_exists', { path: modelPath });
      
      // Check file size if it exists
      if (exists) {
        try {
          // Try to initialize if not already initialized
          const isLoaded = await invoke<boolean>('is_model_loaded');
          if (!isLoaded) {
            await invoke('initialize_model', { modelPath });
          }
          setModelStatus('downloaded');
          onModelReady(modelPath);
        } catch (err) {
          // If initialization fails (e.g., file too small), don't mark as downloaded
          // But still allow user to select a different model via "Use Existing Model" button
          console.error('[Setup] Failed to initialize model at expected path:', modelPath);
          setModelStatus('not-started');
        }
      } else {
        setModelStatus('not-started');
      }
    } catch (err) {
      console.error('Failed to check model:', err);
      setModelStatus('not-started');
    }
  };

  const findExistingModels = async () => {
    try {
      const models = await invoke<string[]>('find_existing_models');
      
      // Filter out models in the wrong location (desktop/src-tauri/data/models/)
      // These are likely incomplete downloads
      const validModels = models.filter(path => {
        // Prefer models in the project root data/models/ directory
        return !path.includes('desktop/src-tauri/data/models');
      });
      
      // If we have valid models, use them; otherwise show all found models
      const modelsToShow = validModels.length > 0 ? validModels : models;
      setExistingModels(modelsToShow);
      
      if (modelsToShow.length > 0) {
        if (validModels.length < models.length) {
        }
      }
    } catch (err) {
      console.error('Failed to find existing models:', err);
    }
  };

  const initializeVectorStore = async () => {
    try {
      await invoke('initialize_vector_store', { collectionName: 'dant_knowledge' });
    } catch (err) {
      console.warn('Vector store initialization failed:', err);
    }
  };

  const checkKBExists = async () => {
    try {
      // Initialize vector store first
      await initializeVectorStore();
      
      // Check if KB is loaded in vector store
      const stats = await invoke<{ document_count: number }>('get_collection_stats');
      if (stats.document_count > 0) {
        setKBStatus('downloaded');
        onKBReady();
      } else {
        setKBStatus('not-started');
      }
    } catch (err) {
      console.error('Failed to check KB:', err);
      setKBStatus('not-started');
    }
  };

  const getModelPath = async (modelId: string): Promise<string> => {
    // Get app data directory and construct model path
    const appDataDir = await invoke<string>('get_app_data_dir');
    // Extract filename from model URL (e.g., "Llama-3.2-3B-Instruct-Q4_0.gguf")
    const modelOption = MODEL_OPTIONS.find(m => m.id === modelId);
    const filename = modelOption 
      ? modelOption.url.split('/').pop() || `${modelId}.gguf`
      : `${modelId}.gguf`;
    return `${appDataDir}/models/${filename}`;
  };

  const handleModelDownload = async () => {
    setModelStatus('downloading');
    setModelError(null);
    setModelProgress(0);

    try {
      const modelPath = await getModelPath(selectedModel.id);
      
      // Download model via Rust backend
      await invoke('download_model', {
        url: selectedModel.url,
        outputPath: modelPath,
      });

      setModelProgress(100);
      setModelStatus('downloaded');
      
      // Initialize model after download
      await invoke('initialize_model', { modelPath });
      onModelReady(modelPath);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to download model';
      setModelError(errorMessage);
      setModelStatus('error');
      console.error('[Setup] Model download error:', err);
    }
  };

  const handleKBDownload = async () => {
    setKBStatus('downloading');
    setKBError(null);
    setKBProgress(0);

    try {
      // Initialize vector store first
      await initializeVectorStore();

      // Download KB via frontend (using existing knowledge-loader)
      const { KnowledgeBaseLoader } = await import('../knowledge/knowledge-loader');
      const loader = new KnowledgeBaseLoader();

      await loader.loadFromURL(selectedKB.url, (progress) => {
        setKBProgress(progress * 100);
      });

      setKBProgress(100);
      setKBStatus('downloaded');
      onKBReady();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to download knowledge base';
      setKBError(errorMessage);
      setKBStatus('error');
      console.error('[Setup] KB download error:', err);
    }
  };

  return (
    <div className="setup-section">
      <div className="setup-header">
        <h2>{t('setup.getStartedWithConfidant')}</h2>
        <div className="privacy-info">
          <p>{t('setup.privacyInfo')}</p>
        </div>
      </div>

      <div className="setup-selectors">
        <div className="selector-group">
          <label htmlFor="model-selector">{t('setup.aiModel')}</label>
          <select
            id="model-selector"
            value={selectedModel.id}
            onChange={(e) => {
              const model = MODEL_OPTIONS.find(m => m.id === e.target.value);
              if (model) setSelectedModel(model);
            }}
            disabled={modelStatus === 'downloading'}
            className="selector-dropdown"
          >
            {MODEL_OPTIONS.map(model => (
              <option key={model.id} value={model.id}>
                {model.name} ({model.size})
              </option>
            ))}
          </select>
          <p className="selector-description">{selectedModel.description}</p>
          
          <div className="selector-status">
            <span className={`status-badge ${modelStatus}`}>
              {modelStatus === 'checking' && t('setup.checking')}
              {modelStatus === 'not-started' && t('setup.notDownloaded')}
              {modelStatus === 'downloading' && t('setup.downloading')}
              {modelStatus === 'downloaded' && t('setup.ready')}
              {modelStatus === 'error' && t('setup.error')}
            </span>
          </div>

          {modelStatus === 'downloading' && (
            <div className="progress-container">
              <div className="progress-bar">
                <div className="progress-fill" style={{ width: `${modelProgress}%` }} />
              </div>
              <p className="progress-text">{Math.round(modelProgress)}%</p>
            </div>
          )}

          {modelError && (
            <div className="error-message">
              <strong>{t('ui.errorLabel')}:</strong> {modelError}
            </div>
          )}

          {existingModels.length > 0 && !showExistingModels && modelStatus !== 'downloading' && (
            <div className="existing-models-notice">
              <p>{t('setup.foundModels', { count: existingModels.length.toString(), plural: existingModels.length > 1 ? 's' : '' })}</p>
              <button
                onClick={() => setShowExistingModels(true)}
                className="browse-button"
                type="button"
              >
                {modelStatus === 'downloaded' ? t('setup.switchModel') : t('setup.useExistingModel')}
              </button>
            </div>
          )}

          {showExistingModels && (
            <div className="existing-models-list">
              <h4>{t('setup.chooseModelAlreadyOnComputer')}</h4>
              <select
                className="existing-model-selector"
                onChange={async (e) => {
                  const selectedPath = e.target.value;
                  if (selectedPath) {
                    try {
                      setModelStatus('checking');
                      setModelError(null);
                      
                      // Verify file exists
                      const exists = await invoke<boolean>('check_model_exists', { path: selectedPath });
                      if (!exists) {
                        throw new Error('Model file not found at the specified path');
                      }
                      
                      // Try to initialize the selected model
                      await invoke('initialize_model', { modelPath: selectedPath });
                      setModelStatus('downloaded');
                      onModelReady(selectedPath);
                      setShowExistingModels(false);
                    } catch (err) {
                      const errorMessage = err instanceof Error ? err.message : 'Failed to use existing model';
                      setModelError(errorMessage);
                      setModelStatus('error');
                      console.error('[Setup] Failed to use existing model:', err);
                    }
                  }
                }}
              >
                <option value="">{t('setup.chooseModelOption')}</option>
                {existingModels.map((path, idx) => {
                  const filename = path.split('/').pop() || path;
                  // Show file size if available
                  return (
                    <option key={idx} value={path}>
                      {filename}
                    </option>
                  );
                })}
              </select>
              <button
                onClick={() => setShowExistingModels(false)}
                className="cancel-button"
                type="button"
              >
                {t('ui.cancel')}
              </button>
            </div>
          )}

          {!showExistingModels && (
            <button
              onClick={handleModelDownload}
              disabled={modelStatus === 'downloading' || modelStatus === 'downloaded' || modelStatus === 'checking'}
              className="download-button"
            >
              {modelStatus === 'downloading' ? (
                <>
                  <span className="button-spinner"></span>
                  {t('setup.downloading')}
                </>
              ) : modelStatus === 'downloaded' ? (
                t('setup.downloaded')
              ) : (
                t('setup.downloadModel')
              )}
            </button>
          )}
        </div>

        <div className="selector-group">
          <label htmlFor="kb-selector">{t('setup.knowledgeBase')}</label>
          <select
            id="kb-selector"
            value={selectedKB.id}
            onChange={(e) => {
              const kb = KB_OPTIONS.find(k => k.id === e.target.value);
              if (kb) setSelectedKB(kb);
            }}
            disabled={kbStatus === 'downloading'}
            className="selector-dropdown"
          >
            {KB_OPTIONS.map(kb => (
              <option key={kb.id} value={kb.id}>
                {kb.name} ({kb.size})
              </option>
            ))}
          </select>
          <p className="selector-description">{selectedKB.description}</p>
          <p className="selector-meta">{selectedKB.documentCount}</p>
          
          <div className="selector-status">
            <span className={`status-badge ${kbStatus}`}>
              {kbStatus === 'checking' && t('setup.checking')}
              {kbStatus === 'not-started' && t('setup.notDownloaded')}
              {kbStatus === 'downloading' && t('setup.downloading')}
              {kbStatus === 'downloaded' && t('setup.ready')}
              {kbStatus === 'error' && t('setup.error')}
            </span>
          </div>

          {kbStatus === 'downloading' && (
            <div className="progress-container">
              <div className="progress-bar">
                <div className="progress-fill" style={{ width: `${kbProgress}%` }} />
              </div>
              <p className="progress-text">{Math.round(kbProgress)}%</p>
            </div>
          )}

          {kbError && (
            <div className="error-message">
              <strong>{t('ui.errorLabel')}:</strong> {kbError}
            </div>
          )}

          <button
            onClick={handleKBDownload}
            disabled={kbStatus === 'downloading' || kbStatus === 'downloaded' || kbStatus === 'checking' || !selectedKB.url}
            className="download-button"
          >
            {kbStatus === 'downloading' ? (
              <>
                <span className="button-spinner"></span>
                {t('setup.downloading')}
              </>
            ) : kbStatus === 'downloaded' ? (
              t('setup.downloaded')
            ) : !selectedKB.url ? (
              t('setup.comingSoon')
            ) : (
              t('setup.downloadKnowledgeBase')
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
