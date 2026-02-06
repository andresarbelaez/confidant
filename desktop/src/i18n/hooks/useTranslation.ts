/**
 * React hook for translations
 */

import { useState, useEffect, useCallback } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { t as translate, setLanguage, getCurrentLanguage, initializeI18n, LanguageCode, SUPPORTED_LANGUAGES } from '../index';

export interface UseTranslationReturn {
  t: (key: string, params?: Record<string, string | number>) => string;
  currentLanguage: LanguageCode;
  setLanguage: (lang: LanguageCode) => Promise<void>;
  supportedLanguages: typeof SUPPORTED_LANGUAGES;
}

/**
 * React hook for translations
 * Provides translation function and language management
 */
export function useTranslation(userId?: string | null): UseTranslationReturn {
  const [lang, setLang] = useState<LanguageCode>(getCurrentLanguage());
  const [isInitialized, setIsInitialized] = useState(false);

  // Initialize i18n on mount
  useEffect(() => {
    const init = async () => {
      const detectedLang = await initializeI18n(userId);
      setLang(detectedLang);
      setIsInitialized(true);
    };
    init();
  }, [userId]);

  // Translation function
  const t = useCallback((key: string, params?: Record<string, string | number>) => {
    return translate(key, params);
  }, []);

  // Language setter
  const handleSetLanguage = useCallback(async (newLang: LanguageCode) => {
    await setLanguage(newLang, userId);
    setLang(newLang);
  }, [userId]);

  return {
    t,
    currentLanguage: lang,
    setLanguage: handleSetLanguage,
    supportedLanguages: SUPPORTED_LANGUAGES,
  };
}
