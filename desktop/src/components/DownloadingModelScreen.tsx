import { useEffect, useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { useTranslation } from '../i18n/hooks/useTranslation';
import './DownloadingModelScreen.css';

interface DownloadingModelScreenProps {
  url: string;
  outputPath: string;
  onComplete: () => void;
  onError: (message: string) => void;
}

export default function DownloadingModelScreen({
  url,
  outputPath,
  onComplete,
  onError,
}: DownloadingModelScreenProps) {
  const { t } = useTranslation(null);
  const [started, setStarted] = useState(false);

  useEffect(() => {
    if (started) return;
    setStarted(true);

    (async () => {
      try {
        await invoke('download_model', { url, outputPath });
        await invoke('initialize_model', { modelPath: outputPath });
        onComplete();
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to download or load model';
        onError(message);
      }
    })();
  }, [url, outputPath, onComplete, onError, started]);

  return (
    <div className="downloading-model-screen">
      <div className="downloading-model-content">
        <h1 className="downloading-model-title">{t('ui.appName')}</h1>
        <p className="downloading-model-heading">{t('ui.downloadingModelTitle')}</p>
        <p className="downloading-model-subtitle">{t('ui.downloadingModelSubtitle')}</p>
        <div className="downloading-model-spinner" aria-hidden="true" />
      </div>
    </div>
  );
}
