import type { RefObject } from 'react';
import { useTranslation } from '../i18n/hooks/useTranslation';
import type { LanguageCode } from '../i18n';
import { SUPPORTED_LANGUAGES } from '../i18n';
import OptionGrid from './OptionGrid';
import './LanguageSelector.css';

interface LanguageSelectorProps {
  userId?: string | null;
  /** When provided, the selector is controlled: shows this value and calls onChange instead of persisting. */
  value?: LanguageCode | undefined;
  onChange?: (lang: LanguageCode | undefined) => void;
  /** When set, clicks inside this element (e.g. modal dialog) do not clear the selection. Pass modal dialog ref when used inside a modal. */
  clickOutsideBoundaryRef?: RefObject<HTMLElement | null>;
}

const LANGUAGE_OPTIONS = SUPPORTED_LANGUAGES.map((l) => ({
  value: l.code,
  label: l.nativeName,
  acronym: l.code.toUpperCase(),
}));

export default function LanguageSelector({ userId, value, onChange, clickOutsideBoundaryRef }: LanguageSelectorProps) {
  const { t, currentLanguage, setLanguage } = useTranslation(userId);
  const isControlled = onChange !== undefined;
  const gridValue = isControlled ? value : currentLanguage;

  const handleGridChange = (next: string | undefined) => {
    if (next === undefined) {
      if (isControlled) onChange(undefined);
      return;
    }
    const code = next as LanguageCode;
    if (isControlled) onChange(code);
    else setLanguage(code);
  };

  return (
    <div className="language-selector">
      <OptionGrid
        label={t('ui.language')}
        options={LANGUAGE_OPTIONS}
        value={gridValue}
        onChange={handleGridChange}
        clickOutsideBoundaryRef={clickOutsideBoundaryRef}
      />
    </div>
  );
}
