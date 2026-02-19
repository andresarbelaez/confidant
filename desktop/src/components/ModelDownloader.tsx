import { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { useTranslation } from '../i18n/hooks/useTranslation';
import './ModelDownloader.css';

type InitializationState = 'not-initialized' | 'initializing' | 'initialized' | 'error';

export default function ModelDownloader() {
  const { t } = useTranslation(null);
  const [modelPath, setModelPath] = useState('');
  const [initState, setInitState] = useState<InitializationState>('not-initialized');
  const [error, setError] = useState<string | null>(null);
  const [isModelLoaded, setIsModelLoaded] = useState(false);

  useEffect(() => {
    checkModelStatus();
  }, []);

  const checkModelStatus = async () => {
    try {
      const loaded = await invoke<boolean>('is_model_loaded');
      setIsModelLoaded(loaded);
      if (loaded) {
        setInitState('initialized');
      }
    } catch (err) {
      console.error('Failed to check model status:', err);
    }
  };

  const handleInitialize = async () => {
    if (initState === 'initializing' || !modelPath.trim()) {
      return;
    }

    setInitState('initializing');
    setError(null);

    try {
      await invoke('initialize_model', { modelPath: modelPath.trim() });
      setInitState('initialized');
      setIsModelLoaded(true);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      console.error('[Model Downloader] Initialization error:', err);
      setError(errorMessage);
      setInitState('error');
    }
  };

  return (
    <div className="model-downloader">
      <h2>{t('setup.aiModel')}</h2>
      
      {error && (
        <div className="error-message">
          <strong>{t('ui.errorLabel')}:</strong>
          <pre style={{ whiteSpace: 'pre-wrap', fontFamily: 'inherit', marginTop: '0.5rem' }}>{error}</pre>
          <p style={{ marginTop: '0.75rem', fontSize: '0.9rem', opacity: 0.8 }}>
            Check that the path is correct and the file exists. You need Python and llama-cpp-python installed.
          </p>
        </div>
      )}

      <div className="model-selector">
        <label htmlFor="model-path">{t('setup.pathToModelFile')}</label>
        <input
          id="model-path"
          type="text"
          value={modelPath}
          onChange={(e) => setModelPath(e.target.value)}
          placeholder={t('setup.pathPlaceholder')}
          disabled={initState === 'initializing'}
          style={{
            width: '100%',
            padding: '0.75rem',
            borderRadius: '6px',
            border: '1px solid var(--color-border-subtle)',
            background: 'var(--color-surface-subtle)',
            color: 'inherit',
            fontSize: '1rem',
            fontFamily: 'monospace',
          }}
        />
        <p style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', marginTop: '0.5rem' }}>
          Enter the full path to your GGUF model file.
        </p>
      </div>

      <div className="model-info">
        <p>
          <strong>{t('setup.statusLabel')}:</strong>{' '}
          <span className={`status-badge ${initState === 'initialized' ? 'ready' : initState === 'initializing' ? 'initializing' : 'not-ready'}`}>
            {initState === 'initialized' ? `✓ ${t('setup.modelReady')}` : 
             initState === 'initializing' ? t('setup.initializing') : 
             t('setup.notInitialized')}
          </span>
        </p>
        {isModelLoaded && (
          <p style={{ color: 'var(--color-success-text)', marginTop: '0.5rem' }}>
            Model is loaded and ready to use.
          </p>
        )}
      </div>

      <div className="model-actions">
        <button
          onClick={handleInitialize}
          disabled={initState === 'initializing' || initState === 'initialized' || !modelPath.trim()}
          className="initialize-button"
        >
          {initState === 'initializing' ? (
            <>
              <span className="button-spinner"></span>
              {t('setup.initializing')}
            </>
          ) : initState === 'initialized' ? (
            t('setup.modelReady')
          ) : (
            t('setup.initializeModel')
          )}
        </button>
      </div>

      <div className="info-note">
        <p>{t('setup.howItWorksModel')}</p>
        <p>{t('setup.recommendedModel')} <a href="https://huggingface.co/bartowski/Llama-3.2-3B-Instruct-GGUF" target="_blank" rel="noopener noreferrer">{t('setup.downloadFromHuggingFace')}</a>.</p>
      </div>
    </div>
  );
}
