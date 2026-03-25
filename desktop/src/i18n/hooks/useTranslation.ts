/**
 * React hook for translations
 */

import { useState, useEffect, useCallback } from 'react';
import { t as translate, setLanguage, getCurrentLanguage, initializeI18n, subscribeToLanguageChange, LanguageCode, SUPPORTED_LANGUAGES } from '../index';

export interface UseTranslationReturn {
  t: (key: string, params?: Record<string, string | number>) => string;
  currentLanguage: LanguageCode;
  setLanguage: (lang: LanguageCode) => Promise<void>;
  refreshLanguage: () => Promise<void>;
  supportedLanguages: typeof SUPPORTED_LANGUAGES;
}

/**
 * React hook for translations
 */
export function useTranslation(userId?: string | null): UseTranslationReturn {
  const [lang, setLang] = useState<LanguageCode>(getCurrentLanguage());
  const [, setIsInitialized] = useState(false);

  useEffect(() => {
    const init = async () => {
      const detected = await initializeI18n(userId);
      setLang(detected);
      setIsInitialized(true);
    };
    init();
  }, [userId]);

  useEffect(() => {
    const unsubscribe = subscribeToLanguageChange((newLang) => {
      setLang(newLang);
    });
    return unsubscribe;
  }, []);

  // Depend on lang so t reference changes when language changes; ensures consumers re-render and see new strings
  const t = useCallback((key: string, params?: Record<string, string | number>) => {
    return translate(key, params);
  }, [lang]);

  const handleSetLanguage = useCallback(async (newLang: LanguageCode) => {
    await setLanguage(newLang, userId);
    setLang(newLang);
  }, [userId]);

  const refreshLanguage = useCallback(async () => {
    const detected = await initializeI18n(userId);
    setLang(detected);
  }, [userId]);

  return {
    t,
    currentLanguage: lang,
    setLanguage: handleSetLanguage,
    refreshLanguage,
    supportedLanguages: SUPPORTED_LANGUAGES,
  };
}
