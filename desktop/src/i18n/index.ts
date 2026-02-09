/**
 * Internationalization (i18n) System
 * Handles language detection, translation loading, and language switching
 */

import { invoke } from '@tauri-apps/api/core';

export type LanguageCode = 'en' | 'es' | 'fr' | 'de' | 'it' | 'pt' | 'ja' | 'zh' | 'ko' | 'ru';

export interface Language {
  code: LanguageCode;
  name: string;
  nativeName: string;
}

export const SUPPORTED_LANGUAGES: Language[] = [
  { code: 'en', name: 'English', nativeName: 'English' },
  { code: 'es', name: 'Spanish', nativeName: 'Español' },
  { code: 'fr', name: 'French', nativeName: 'Français' },
  { code: 'de', name: 'German', nativeName: 'Deutsch' },
  { code: 'it', name: 'Italian', nativeName: 'Italiano' },
  { code: 'pt', name: 'Portuguese', nativeName: 'Português' },
  { code: 'ja', name: 'Japanese', nativeName: '日本語' },
  { code: 'zh', name: 'Chinese', nativeName: '中文' },
  { code: 'ko', name: 'Korean', nativeName: '한국어' },
  { code: 'ru', name: 'Russian', nativeName: 'Русский' },
];

// Translation data cache
let translationsCache: Record<string, any> = {};
let currentLanguage: LanguageCode = 'en';

// Listeners notified when setLanguage() completes (so UI can re-render)
const languageChangeListeners: Array<(newLang: LanguageCode) => void> = [];

export function subscribeToLanguageChange(callback: (newLang: LanguageCode) => void): () => void {
  languageChangeListeners.push(callback);
  return () => {
    const i = languageChangeListeners.indexOf(callback);
    if (i !== -1) languageChangeListeners.splice(i, 1);
  };
}

/**
 * Detect system language from browser
 */
export function detectSystemLanguage(): LanguageCode {
  if (typeof navigator !== 'undefined' && navigator.language) {
    const browserLang = navigator.language.split('-')[0].toLowerCase();
    const supported = SUPPORTED_LANGUAGES.find(l => l.code === browserLang);
    if (supported) {
      return supported.code;
    }
  }
  return 'en'; // Default fallback
}

/**
 * Load translation file for a language
 */
async function loadTranslations(lang: LanguageCode): Promise<Record<string, any>> {
  try {
    // Dynamic import of translation file
    const translations = await import(`./translations/${lang}.json`);
    return translations.default || translations;
  } catch (err) {
    console.warn(`[i18n] Failed to load translations for ${lang}, falling back to English`, err);
    // Fallback to English if translation file doesn't exist
    if (lang !== 'en') {
      try {
        const fallback = await import(`./translations/en.json`);
        return fallback.default || fallback;
      } catch (fallbackErr) {
        console.error('[i18n] Failed to load English fallback translations', fallbackErr);
        return {};
      }
    }
    return {};
  }
}

/**
 * Initialize i18n system
 * Detects language from user preference or system locale
 */
export async function initializeI18n(userId?: string | null): Promise<LanguageCode> {
  let lang: LanguageCode = 'en';

  // Try to get user's language preference
  if (userId) {
    try {
      const userLang = await invoke<LanguageCode | null>('get_user_language', { userId });
      if (userLang && SUPPORTED_LANGUAGES.some(l => l.code === userLang)) {
        lang = userLang;
      }
    } catch (err) {
      console.warn('[i18n] Failed to get user language preference:', err);
    }
  }

  // Fallback to system language if no user preference
  if (lang === 'en' && !userId) {
    lang = detectSystemLanguage();
  }

  // Load translations
  translationsCache = await loadTranslations(lang);
  currentLanguage = lang;

  return lang;
}

/**
 * Set language and reload translations
 */
export async function setLanguage(lang: LanguageCode, userId?: string | null): Promise<void> {
  if (!SUPPORTED_LANGUAGES.some(l => l.code === lang)) {
    console.warn(`[i18n] Unsupported language: ${lang}`);
    return;
  }

  // Save user preference if userId is provided
  if (userId) {
    try {
      await invoke('set_user_language', { userId, language: lang });
    } catch (err) {
      console.warn('[i18n] Failed to save user language preference:', err);
    }
  }

  // Load translations
  translationsCache = await loadTranslations(lang);
  currentLanguage = lang;
  languageChangeListeners.forEach((fn) => fn(lang));
}

/**
 * Get current language
 */
export function getCurrentLanguage(): LanguageCode {
  return currentLanguage;
}

/**
 * Translate a key (supports nested keys like 'ui.settings')
 */
export function t(key: string, params?: Record<string, string | number>): string {
  const keys = key.split('.');
  let value: any = translationsCache;

  // Navigate through nested object
  for (const k of keys) {
    if (value && typeof value === 'object' && k in value) {
      value = value[k];
    } else {
      // Key not found, return the key itself
      console.warn(`[i18n] Translation key not found: ${key}`);
      return key;
    }
  }

  // If value is a string, apply parameter substitution
  if (typeof value === 'string') {
    if (params) {
      return value.replace(/\{\{(\w+)\}\}/g, (match, paramKey) => {
        return params[paramKey]?.toString() || match;
      });
    }
    return value;
  }

  // If value is not a string, return the key
  console.warn(`[i18n] Translation value is not a string for key: ${key}`);
  return key;
}

/**
 * Check if a translation key exists
 */
export function hasTranslation(key: string): boolean {
  const keys = key.split('.');
  let value: any = translationsCache;

  for (const k of keys) {
    if (value && typeof value === 'object' && k in value) {
      value = value[k];
    } else {
      return false;
    }
  }

  return typeof value === 'string';
}
