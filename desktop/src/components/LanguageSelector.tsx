import { useTranslation } from '../i18n/hooks/useTranslation';
import type { LanguageCode } from '../i18n';
import './LanguageSelector.css';

interface LanguageSelectorProps {
  userId?: string | null;
  /** When provided, the selector is controlled: shows this value and calls onChange instead of persisting. */
  value?: LanguageCode;
  onChange?: (lang: LanguageCode) => void;
}

export default function LanguageSelector({ userId, value, onChange }: LanguageSelectorProps) {
  const { t, currentLanguage, setLanguage, supportedLanguages } = useTranslation(userId);
  const isControlled = value !== undefined && onChange !== undefined;
  const displayValue = isControlled ? value : currentLanguage;

  const handleLanguageChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newLang = e.target.value as LanguageCode;
    if (isControlled) {
      onChange(newLang);
    } else {
      await setLanguage(newLang);
    }
  };

  return (
    <div className="language-selector">
      <label htmlFor="language-select" className="language-label">
        {t('ui.language')}
      </label>
      <select
        id="language-select"
        value={displayValue}
        onChange={handleLanguageChange}
        className="language-select"
      >
        {supportedLanguages.map((lang) => (
          <option key={lang.code} value={lang.code}>
            {lang.nativeName} ({lang.name})
          </option>
        ))}
      </select>
    </div>
  );
}
