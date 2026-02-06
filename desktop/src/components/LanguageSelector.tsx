import { useTranslation } from '../i18n/hooks/useTranslation';
import './LanguageSelector.css';

interface LanguageSelectorProps {
  userId?: string | null;
}

export default function LanguageSelector({ userId }: LanguageSelectorProps) {
  const { t, currentLanguage, setLanguage, supportedLanguages } = useTranslation(userId);

  const handleLanguageChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newLang = e.target.value as any;
    await setLanguage(newLang);
  };

  return (
    <div className="language-selector">
      <label htmlFor="language-select" className="language-label">
        {t('ui.language')}
      </label>
      <select
        id="language-select"
        value={currentLanguage}
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
