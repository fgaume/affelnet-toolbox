// src/services/hfCache.ts
// Fallback localStorage cache for HuggingFace API calls.
// On success: caches the JSON response. On network failure: returns cached data.

const CACHE_PREFIX = 'hf_cache_';

function cacheKey(url: string): string {
  return CACHE_PREFIX + url;
}

/**
 * Fetch JSON from a HuggingFace URL with localStorage fallback.
 * - On success: stores the response in localStorage and returns parsed JSON.
 * - On failure: returns the last cached response if available, otherwise throws.
 */
export async function fetchWithHfCache<T>(url: string): Promise<T> {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    const data: T = await response.json();
    try {
      localStorage.setItem(cacheKey(url), JSON.stringify(data));
    } catch {
      // localStorage full or unavailable — ignore
    }
    return data;
  } catch (error) {
    const cached = localStorage.getItem(cacheKey(url));
    if (cached) {
      return JSON.parse(cached) as T;
    }
    throw error;
  }
}
