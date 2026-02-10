import { useTranslation } from '../i18n/hooks/useTranslation';
import LanguageSelector from './LanguageSelector';
import './ErrorScreen.css';

interface ErrorScreenProps {
  message: string;
  retry?: () => void;
  onContinue?: () => void;
}

export default function ErrorScreen({ message, retry, onContinue }: ErrorScreenProps) {
  const { t } = useTranslation(null);

  return (
    <div className="error-screen">
      <div className="error-content">
        <div className="error-language-row">
          <LanguageSelector userId={null} />
        </div>
        <h1 className="error-title">{t('errors.title')}</h1>
        <p className="error-message">{message}</p>
        <div className="error-actions">
          {retry && (
            <button className="error-retry-button" onClick={retry}>
              {t('errors.retry')}
            </button>
          )}
          {onContinue && (
            <button type="button" className="error-continue-button" onClick={onContinue}>
              {t('ui.openSettings')}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
