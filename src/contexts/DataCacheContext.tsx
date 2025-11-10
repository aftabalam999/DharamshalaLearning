import React, { createContext, useContext, useCallback, useRef } from 'react';

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  key: string;
}

interface DataCacheContextType {
  getCachedData: <T>(key: string, fetchFn: () => Promise<T>, ttl?: number) => Promise<T>;
  invalidateCache: (key?: string) => void;
  clearAllCache: () => void;
}

const DataCacheContext = createContext<DataCacheContextType | undefined>(undefined);

// Cache storage - in-memory for session, with localStorage backup
const memoryCache = new Map<string, CacheEntry<any>>();

// Default TTL: 5 minutes (in milliseconds)
const DEFAULT_TTL = 5 * 60 * 1000;

export const DataCacheProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const pendingRequests = useRef<Map<string, Promise<any>>>(new Map());

  /**
   * Get cached data or fetch fresh data
   * @param key - Unique cache key
   * @param fetchFn - Function to fetch data if not cached
   * @param ttl - Time to live in milliseconds (default: 5 minutes)
   */
  const getCachedData = useCallback(async <T,>(
    key: string,
    fetchFn: () => Promise<T>,
    ttl: number = DEFAULT_TTL
  ): Promise<T> => {
    // Check if there's already a pending request for this key
    const pendingRequest = pendingRequests.current.get(key);
    if (pendingRequest) {
      console.log(`[Cache] Reusing pending request for: ${key}`);
      return pendingRequest;
    }

    // Check memory cache first
    const cachedEntry = memoryCache.get(key);
    const now = Date.now();

    if (cachedEntry && (now - cachedEntry.timestamp) < ttl) {
      console.log(`[Cache] HIT (memory) for: ${key}, age: ${Math.round((now - cachedEntry.timestamp) / 1000)}s`);
      return cachedEntry.data as T;
    }

    // Check localStorage as backup
    try {
      const localStorageKey = `cache_${key}`;
      const localStorageItem = localStorage.getItem(localStorageKey);
      
      if (localStorageItem) {
        const parsedEntry: CacheEntry<T> = JSON.parse(localStorageItem);
        
        if ((now - parsedEntry.timestamp) < ttl) {
          console.log(`[Cache] HIT (localStorage) for: ${key}, age: ${Math.round((now - parsedEntry.timestamp) / 1000)}s`);
          
          // Restore to memory cache
          memoryCache.set(key, parsedEntry);
          return parsedEntry.data;
        } else {
          // Expired - remove from localStorage
          localStorage.removeItem(localStorageKey);
        }
      }
    } catch (error) {
      console.warn('[Cache] Error reading from localStorage:', error);
    }

    // Cache miss - fetch fresh data
    console.log(`[Cache] MISS for: ${key}, fetching fresh data...`);
    
    const fetchPromise = fetchFn()
      .then((data) => {
        const entry: CacheEntry<T> = {
          data,
          timestamp: now,
          key
        };

        // Store in memory cache
        memoryCache.set(key, entry);

        // Store in localStorage as backup
        try {
          const localStorageKey = `cache_${key}`;
          localStorage.setItem(localStorageKey, JSON.stringify(entry));
        } catch (error) {
          console.warn('[Cache] Error writing to localStorage:', error);
        }

        // Remove from pending requests
        pendingRequests.current.delete(key);

        return data;
      })
      .catch((error) => {
        // Remove from pending requests on error
        pendingRequests.current.delete(key);
        throw error;
      });

    // Track pending request
    pendingRequests.current.set(key, fetchPromise);

    return fetchPromise;
  }, []);

  /**
   * Invalidate specific cache key or all cache
   * @param key - Optional specific key to invalidate
   */
  const invalidateCache = useCallback((key?: string) => {
    if (key) {
      console.log(`[Cache] Invalidating cache for: ${key}`);
      memoryCache.delete(key);
      
      try {
        localStorage.removeItem(`cache_${key}`);
      } catch (error) {
        console.warn('[Cache] Error removing from localStorage:', error);
      }
    } else {
      console.log('[Cache] Invalidating all cache');
      memoryCache.clear();
      
      // Clear all cache items from localStorage
      try {
        const keysToRemove: string[] = [];
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && key.startsWith('cache_')) {
            keysToRemove.push(key);
          }
        }
        keysToRemove.forEach(key => localStorage.removeItem(key));
      } catch (error) {
        console.warn('[Cache] Error clearing localStorage:', error);
      }
    }
  }, []);

  /**
   * Clear all cache (memory + localStorage)
   */
  const clearAllCache = useCallback(() => {
    invalidateCache();
  }, [invalidateCache]);

  const value: DataCacheContextType = {
    getCachedData,
    invalidateCache,
    clearAllCache
  };

  return (
    <DataCacheContext.Provider value={value}>
      {children}
    </DataCacheContext.Provider>
  );
};

/**
 * Hook to use data cache
 */
export const useDataCache = () => {
  const context = useContext(DataCacheContext);
  if (!context) {
    throw new Error('useDataCache must be used within DataCacheProvider');
  }
  return context;
};

/**
 * Helper function to generate cache keys
 */
export const generateCacheKey = (base: string, params?: Record<string, any>): string => {
  if (!params || Object.keys(params).length === 0) {
    return base;
  }
  
  const paramString = Object.entries(params)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${key}:${JSON.stringify(value)}`)
    .join('|');
    
  return `${base}_${paramString}`;
};
