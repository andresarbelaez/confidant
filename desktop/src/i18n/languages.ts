/**
 * Language definitions and metadata
 */

import { Language, LanguageCode } from './index';

export { Language, LanguageCode, SUPPORTED_LANGUAGES } from './index';

/**
 * Get language by code
 */
export function getLanguage(code: LanguageCode): Language | undefined {
  return SUPPORTED_LANGUAGES.find(l => l.code === code);
}

/**
 * Get language name
 */
export function getLanguageName(code: LanguageCode): string {
  const lang = getLanguage(code);
  return lang ? lang.name : code;
}

/**
 * Get native language name
 */
export function getNativeLanguageName(code: LanguageCode): string {
  const lang = getLanguage(code);
  return lang ? lang.nativeName : code;
}
