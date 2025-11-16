// Cache Utility for Home Page Vertical Cards
// Provides localStorage-based caching with TTL for dashboard metrics

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number; // Time to live in milliseconds
}

interface CacheOptions {
  ttl?: number; // Default TTL in milliseconds
  keyPrefix?: string; // Prefix for localStorage keys
}

export class DataCache {
  private keyPrefix: string;
  private defaultTTL: number;

  constructor(options: CacheOptions = {}) {
    this.keyPrefix = options.keyPrefix || 'dashboard_cache_';
    this.defaultTTL = options.ttl || 15 * 60 * 1000; // Default 15 minutes
  }

  /**
   * Get data from cache if valid, otherwise return null
   */
  get<T>(key: string): T | null {
    try {
      const cacheKey = this.keyPrefix + key;
      const cached = localStorage.getItem(cacheKey);
      
      if (!cached) {
        console.log(`[DataCache] Cache miss for key: ${key}`);
        return null;
      }

      const entry: CacheEntry<T> = JSON.parse(cached);
      const now = Date.now();
      
      // Check if cache has expired
      if (now - entry.timestamp > entry.ttl) {
        console.log(`[DataCache] Cache expired for key: ${key}, age: ${Math.round((now - entry.timestamp) / 1000)}s`);
        this.delete(key); // Clean up expired entry
        return null;
      }

      console.log(`[DataCache] Cache hit for key: ${key}, age: ${Math.round((now - entry.timestamp) / 1000)}s`);
      return entry.data;
    } catch (error) {
      console.error(`[DataCache] Error reading cache for key: ${key}`, error);
      this.delete(key); // Clean up corrupted entry
      return null;
    }
  }

  /**
   * Set data in cache with optional custom TTL
   */
  set<T>(key: string, data: T, customTTL?: number): void {
    try {
      const cacheKey = this.keyPrefix + key;
      const ttl = customTTL || this.defaultTTL;
      const entry: CacheEntry<T> = {
        data,
        timestamp: Date.now(),
        ttl
      };

      localStorage.setItem(cacheKey, JSON.stringify(entry));
      console.log(`[DataCache] Cached data for key: ${key}, TTL: ${Math.round(ttl / 1000)}s`);
    } catch (error) {
      console.error(`[DataCache] Error setting cache for key: ${key}`, error);
      // If localStorage is full, try to clear old entries
      this.cleanup();
    }
  }

  /**
   * Delete specific cache entry
   */
  delete(key: string): void {
    try {
      const cacheKey = this.keyPrefix + key;
      localStorage.removeItem(cacheKey);
      console.log(`[DataCache] Deleted cache for key: ${key}`);
    } catch (error) {
      console.error(`[DataCache] Error deleting cache for key: ${key}`, error);
    }
  }

  /**
   * Clear all cache entries with current prefix
   */
  clear(): void {
    try {
      const keysToDelete: string[] = [];
      
      // Find all keys with our prefix
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(this.keyPrefix)) {
          keysToDelete.push(key);
        }
      }

      // Delete found keys
      keysToDelete.forEach(key => localStorage.removeItem(key));
      console.log(`[DataCache] Cleared ${keysToDelete.length} cache entries`);
    } catch (error) {
      console.error('[DataCache] Error clearing cache', error);
    }
  }

  /**
   * Clean up expired entries and free space
   */
  cleanup(): void {
    try {
      const keysToDelete: string[] = [];
      const now = Date.now();
      
      // Find expired keys
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(this.keyPrefix)) {
          try {
            const cached = localStorage.getItem(key);
            if (cached) {
              const entry: CacheEntry<any> = JSON.parse(cached);
              if (now - entry.timestamp > entry.ttl) {
                keysToDelete.push(key);
              }
            }
          } catch {
            // If we can't parse it, delete it
            keysToDelete.push(key);
          }
        }
      }

      // Delete expired keys
      keysToDelete.forEach(key => localStorage.removeItem(key));
      console.log(`[DataCache] Cleaned up ${keysToDelete.length} expired cache entries`);
    } catch (error) {
      console.error('[DataCache] Error during cleanup', error);
    }
  }

  /**
   * Get or set pattern: fetch from cache, or execute fetcher and cache result
   */
  async getOrSet<T>(
    key: string, 
    fetcher: () => Promise<T>, 
    customTTL?: number
  ): Promise<T> {
    // Try to get from cache first
    const cached = this.get<T>(key);
    if (cached !== null) {
      return cached;
    }

    // Cache miss - fetch new data
    console.log(`[DataCache] Fetching fresh data for key: ${key}`);
    try {
      const data = await fetcher();
      this.set(key, data, customTTL);
      return data;
    } catch (error) {
      console.error(`[DataCache] Error fetching data for key: ${key}`, error);
      throw error;
    }
  }

  /**
   * Check if cache entry exists and is valid
   */
  has(key: string): boolean {
    return this.get(key) !== null;
  }

  /**
   * Get cache statistics
   */
  getStats(): { totalEntries: number; validEntries: number; expiredEntries: number } {
    let totalEntries = 0;
    let validEntries = 0;
    let expiredEntries = 0;
    const now = Date.now();

    try {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(this.keyPrefix)) {
          totalEntries++;
          try {
            const cached = localStorage.getItem(key);
            if (cached) {
              const entry: CacheEntry<any> = JSON.parse(cached);
              if (now - entry.timestamp > entry.ttl) {
                expiredEntries++;
              } else {
                validEntries++;
              }
            }
          } catch {
            expiredEntries++;
          }
        }
      }
    } catch (error) {
      console.error('[DataCache] Error getting stats', error);
    }

    return { totalEntries, validEntries, expiredEntries };
  }
}

// Default cache instance for home page metrics
export const homePageCache = new DataCache({
  keyPrefix: 'home_metrics_',
  ttl: 15 * 60 * 1000 // 15 minutes default TTL
});

// Cache keys for vertical cards
export const CACHE_KEYS = {
  WTM_SLP_SUMMARY: 'wtm_slp_summary',
  YOUTUBE_SUMMARY: 'youtube_summary',
  MANIFESTO_SUMMARY: 'manifesto_summary',
  MIGRANT_SUMMARY: 'migrant_summary',
  GGY_OVERALL_SUMMARY: 'ggy_overall_summary',
  CALL_CENTER_EXTERNAL_NEW_SUMMARY: 'call_center_external_new_summary',
  TRAINING_HOME_SUMMARY: 'training_home_summary'
} as const;

// GGY cache instance and helpers (for Analytics)
export const ggyCache = new DataCache({
  keyPrefix: 'ggy_',
  ttl: 10 * 60 * 1000 // 10 minutes default TTL
});

export function makeGGYRangeKey(prefix: 'sum' | 'slp', startDate: string, endDate: string): string {
  return `${prefix}_${startDate}_${endDate}`;
}

/**
 * Utility function to create user-specific cache keys
 * Ensures different users have separate cached data
 */
export function createUserCacheKey(baseKey: string, userId?: string, assemblies?: string[]): string {
  const parts = [baseKey];
  
  if (userId) {
    // Use first 8 chars of user ID to keep key manageable
    parts.push(userId.substring(0, 8));
  }
  
  if (assemblies && assemblies.length > 0) {
    // Sort assemblies for consistent key generation
    const sortedAssemblies = [...assemblies].sort();
    // Use hash of assemblies if too many, otherwise join
    if (sortedAssemblies.length > 5) {
      const hash = sortedAssemblies.join('|').substring(0, 20);
      parts.push(`assemblies_${hash}`);
    } else {
      parts.push(sortedAssemblies.join('_'));
    }
  }
  
  return parts.join('_');
}

/**
 * Force refresh cache - clears specific cache entries
 * Useful for manual refresh buttons or data updates
 */
export function forceCacheRefresh(keys: string[]): void {
  console.log(`[DataCache] Force refreshing cache keys: ${keys.join(', ')}`);
  keys.forEach(key => homePageCache.delete(key));
}

/**
 * Initialize cache on app startup
 * Cleans up expired entries
 */
export function initializeCache(): void {
  console.log('[DataCache] Initializing home page cache');
  homePageCache.cleanup();
  
  const stats = homePageCache.getStats();
  console.log(`[DataCache] Cache stats - Total: ${stats.totalEntries}, Valid: ${stats.validEntries}, Expired: ${stats.expiredEntries}`);
}
