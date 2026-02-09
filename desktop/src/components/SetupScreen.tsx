import { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { MODEL_OPTIONS, ModelOption, getDefaultModel } from '../config/model-options';
import { KB_OPTIONS, KBOption, getDefaultKB } from '../config/kb-options';
import { useTranslation } from '../i18n/hooks/useTranslation';
import './SetupScreen.css';

type DownloadStatus = 'not-started' | 'downloading' | 'downloaded' | 'error' | 'checking';

interface SetupScreenProps {
  onModelReady: (modelPath: string) => void;
  onKBReady: () => void;
  onProceed: () => void;
  showOnlyKB?: boolean;
}

export default function SetupScreen({ 
  onModelReady, 
  onKBReady,
  onProceed,
  showOnlyKB = false
}: SetupScreenProps) {
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

  // Auto-proceed when both are ready (for initial setup)
  // Only auto-proceed if we're in the initial setup flow (showOnlyKB for global KB)
  useEffect(() => {
    if (!showOnlyKB) return; // Only auto-proceed for global KB setup
    
    const canProceed = kbStatus === 'downloaded';
    
    if (canProceed && onProceed) {
      // Small delay to ensure state is updated and user sees the completion
      const timer = setTimeout(() => {
        onProceed();
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [kbStatus, showOnlyKB, onProceed]);

  const checkModelExists = async () => {
    try {
      const modelPath = await getModelPath(selectedModel.id);
      const exists = await invoke<boolean>('check_model_exists', { path: modelPath });
      
      if (exists) {
        try {
          const isLoaded = await invoke<boolean>('is_model_loaded');
          if (!isLoaded) {
            await invoke('initialize_model', { modelPath });
          }
          setModelStatus('downloaded');
          onModelReady(modelPath);
        } catch (err) {
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
      
      const validModels = models.filter(path => {
        return !path.includes('desktop/src-tauri/data/models');
      });
      
      const modelsToShow = validModels.length > 0 ? validModels : models;
      setExistingModels(modelsToShow);
    } catch (err) {
      console.error('Failed to find existing models:', err);
    }
  };

  const initializeVectorStore = async () => {
    try {
      const collectionName = showOnlyKB ? 'dant_knowledge_global' : 'dant_knowledge';
      await invoke('initialize_vector_store', { collectionName, dbPath: null });
    } catch (err) {
      console.warn('Vector store initialization failed:', err);
    }
  };

  const checkKBExists = async () => {
    try {
      await initializeVectorStore();
      
      const collectionName = showOnlyKB ? 'dant_knowledge_global' : 'dant_knowledge';
      const stats = await invoke<{ document_count: number }>('get_collection_stats', {
        collectionName
      });
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
    const appDataDir = await invoke<string>('get_app_data_dir');
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
      
      await invoke('download_model', {
        url: selectedModel.url,
        outputPath: modelPath,
      });

      setModelProgress(100);
      setModelStatus('downloaded');
      
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
      const collectionName = showOnlyKB ? 'dant_knowledge_global' : 'dant_knowledge';
      await invoke('initialize_vector_store', { collectionName, dbPath: null });

      const { KnowledgeBaseLoader } = await import('../knowledge/knowledge-loader');
      const loader = new KnowledgeBaseLoader();

      await loader.loadFromURL(selectedKB.url, (progress) => {
        setKBProgress(progress * 100);
      }, collectionName);

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
    <div className="setup-screen">
      <div className="setup-screen-content">
        <div className="setup-screen-header">
          <h1 className="setup-screen-title">{showOnlyKB ? t('setup.globalKnowledgeBase') : t('ui.settings')}</h1>
        </div>
        
        <div className="setup-screen-body">
          <div className="privacy-info">
            <p>
              {t('setup.privacyInfo')}
            </p>
          </div>

          <div className="setup-selectors">
            {!showOnlyKB && (
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
                    <h4>{t('setup.chooseModel')}</h4>
                    <select
                      className="existing-model-selector"
                      onChange={async (e) => {
                        const selectedPath = e.target.value;
                        if (selectedPath) {
                          try {
                            setModelStatus('checking');
                            setModelError(null);
                            
                            const exists = await invoke<boolean>('check_model_exists', { path: selectedPath });
                            if (!exists) {
                              throw new Error('Model file not found at the specified path');
                            }
                            
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
            )}

            <div className="selector-group">
              <label htmlFor="kb-selector">{showOnlyKB ? t('setup.globalKnowledgeBase') : t('setup.knowledgeBase')}</label>
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
      </div>
    </div>
  );
}
