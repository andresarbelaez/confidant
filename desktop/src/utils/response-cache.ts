/**
 * Response Cache System
 * File-based persistent cache for common user queries
 */

import { invoke } from '@tauri-apps/api/core';
import { LanguageCode } from '../i18n';

export interface CachedResponse {
  query: string; // Normalized query
  response: string; // Cached response
  language: LanguageCode; // Language code (e.g., 'en', 'es', 'fr')
  createdAt: string; // ISO timestamp
  hitCount: number; // Usage statistics
}

interface ResponseCache {
  version: string;
  language: LanguageCode;
  responses: Record<string, CachedResponse>; // normalizedQuery -> response
}

const CACHE_VERSION = '1.1.0';
const CACHE_DIR = 'cache';
let cacheData: ResponseCache | null = null;

/**
 * Normalize query for cache matching
 * - Lowercase
 * - Trim whitespace
 * - Normalize multiple spaces to single space
 * - Remove punctuation (optional, but helps with matching)
 */
export function normalizeQuery(query: string): string {
  return query
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ') // Multiple spaces to single
    .replace(/[^\w\s]/g, ''); // Remove punctuation for better matching
}

// Note: Cache file path is now handled by Rust backend

/**
 * Load cache from file
 */
async function loadCache(language: LanguageCode): Promise<ResponseCache> {
  try {
    // Use Rust command to read cache file
    const content = await invoke<string | null>('read_cache_file', { language });
    
    if (content) {
      const parsed: ResponseCache = JSON.parse(content);
      
      // Validate version
      if (parsed.version === CACHE_VERSION && parsed.language === language) {
        return parsed;
      }
    }
  } catch (err) {
    console.warn('[Cache] Failed to load cache:', err);
  }
  
  // Return empty cache if load fails
  return {
    version: CACHE_VERSION,
    language,
    responses: {},
  };
}

/**
 * Save cache to file
 */
async function saveCache(cache: ResponseCache): Promise<void> {
  try {
    // Use Rust command to write cache file
    const content = JSON.stringify(cache, null, 2);
    await invoke('write_cache_file', { 
      language: cache.language, 
      content 
    });
  } catch (err) {
    console.error('[Cache] Failed to save cache:', err);
  }
}

/**
 * Initialize cache for a language
 */
export async function initializeCache(language: LanguageCode): Promise<void> {
  cacheData = await loadCache(language);
  
  // Pre-populate common queries if cache is empty
  if (Object.keys(cacheData.responses).length === 0) {
    await prePopulateCache(language);
  }
}

/**
 * Pre-populate cache with common queries using i18n translations
 */
async function prePopulateCache(language: LanguageCode): Promise<void> {
  // Dynamically import i18n to get translations
  const { t, initializeI18n } = await import('../i18n');
  
  // Ensure i18n is initialized for this language
  await initializeI18n(null);
  
  // Use i18n translations for cached responses
  const commonQueries: Record<string, string> = {
    'hi': t('cached.hi'),
    'hello': t('cached.hello'),
    'hey': t('cached.hey'),
    'what are you': t('cached.whatAreYou'),
    'who are you': t('cached.whoAreYou'),
    'what can you do': t('cached.whatCanYouDo'),
    'help': t('cached.help'),
  };

  const now = new Date().toISOString();
  
  for (const [query, response] of Object.entries(commonQueries)) {
    const normalized = normalizeQuery(query);
    cacheData!.responses[normalized] = {
      query: normalized,
      response,
      language,
      createdAt: now,
      hitCount: 0,
    };
  }
  
  await saveCache(cacheData!);
}

/**
 * Get cached response for a query
 */
export async function getCachedResponse(
  query: string,
  language: LanguageCode
): Promise<string | null> {
  // Ensure cache is loaded
  if (!cacheData || cacheData.language !== language) {
    await initializeCache(language);
  }
  
  const normalized = normalizeQuery(query);
  const cached = cacheData!.responses[normalized];
  
  if (cached) {
    // Increment hit count
    cached.hitCount++;
    await saveCache(cacheData!);
    
    return cached.response;
  }
  
  return null;
}

/**
 * Cache a response for a query
 */
export async function cacheResponse(
  query: string,
  response: string,
  language: LanguageCode
): Promise<void> {
  // Ensure cache is loaded
  if (!cacheData || cacheData.language !== language) {
    await initializeCache(language);
  }
  
  const normalized = normalizeQuery(query);
  const now = new Date().toISOString();
  
  cacheData!.responses[normalized] = {
    query: normalized,
    response,
    language,
    createdAt: now,
    hitCount: 0,
  };
  
  await saveCache(cacheData!);
}

/**
 * Get cache statistics
 */
export async function getCacheStats(language: LanguageCode): Promise<{
  totalEntries: number;
  totalHits: number;
  topQueries: Array<{ query: string; hits: number }>;
}> {
  // Ensure cache is loaded
  if (!cacheData || cacheData.language !== language) {
    await initializeCache(language);
  }
  
  const entries = Object.values(cacheData!.responses);
  const totalHits = entries.reduce((sum, entry) => sum + entry.hitCount, 0);
  
  const topQueries = entries
    .sort((a, b) => b.hitCount - a.hitCount)
    .slice(0, 10)
    .map(entry => ({
      query: entry.query,
      hits: entry.hitCount,
    }));
  
  return {
    totalEntries: entries.length,
    totalHits,
    topQueries,
  };
}

/**
 * Clear cache for a language
 */
export async function clearCache(language: LanguageCode): Promise<void> {
  cacheData = {
    version: CACHE_VERSION,
    language,
    responses: {},
  };
  
  await saveCache(cacheData);
  
  // Re-populate common queries
  await prePopulateCache(language);
}
