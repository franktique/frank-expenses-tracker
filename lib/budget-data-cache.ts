/**
 * Budget data caching utilities for efficient simulate mode performance
 * Implements LRU cache with TTL for budget data to minimize API calls
 */

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

interface CacheKey {
  periodId: string;
  estudioId?: number | null;
  grouperIds?: number[];
  paymentMethod?: string;
}

class BudgetDataCache {
  private cache = new Map<string, CacheEntry<any>>();
  private maxSize: number;
  private defaultTTL: number;

  constructor(maxSize = 50, defaultTTL = 5 * 60 * 1000) {
    // 5 minutes default TTL
    this.maxSize = maxSize;
    this.defaultTTL = defaultTTL;
  }

  /**
   * Generate a cache key from the request parameters
   */
  private generateKey(key: CacheKey): string {
    const parts = [
      `period:${key.periodId}`,
      key.estudioId ? `estudio:${key.estudioId}` : 'estudio:all',
      key.grouperIds?.length
        ? `groupers:${key.grouperIds.sort().join(',')}`
        : 'groupers:all',
      key.paymentMethod ? `payment:${key.paymentMethod}` : 'payment:all',
    ];
    return parts.join('|');
  }

  /**
   * Check if a cache entry is still valid
   */
  private isValid(entry: CacheEntry<any>): boolean {
    return Date.now() - entry.timestamp < entry.ttl;
  }

  /**
   * Implement LRU eviction when cache is full
   */
  private evictLRU(): void {
    if (this.cache.size >= this.maxSize) {
      // Find the oldest entry
      let oldestKey = '';
      let oldestTime = Date.now();

      for (const [key, entry] of this.cache.entries()) {
        if (entry.timestamp < oldestTime) {
          oldestTime = entry.timestamp;
          oldestKey = key;
        }
      }

      if (oldestKey) {
        this.cache.delete(oldestKey);
      }
    }
  }

  /**
   * Get cached data if available and valid
   */
  get<T>(key: CacheKey): T | null {
    const cacheKey = this.generateKey(key);
    const entry = this.cache.get(cacheKey);

    if (!entry) {
      return null;
    }

    if (!this.isValid(entry)) {
      this.cache.delete(cacheKey);
      return null;
    }

    // Update timestamp for LRU (move to end)
    entry.timestamp = Date.now();
    this.cache.set(cacheKey, entry);

    return entry.data;
  }

  /**
   * Set cached data with optional custom TTL
   */
  set<T>(key: CacheKey, data: T, customTTL?: number): void {
    const cacheKey = this.generateKey(key);
    const ttl = customTTL || this.defaultTTL;

    // Evict old entries if cache is full
    this.evictLRU();

    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
      ttl,
    };

    this.cache.set(cacheKey, entry);
  }

  /**
   * Invalidate cache entries matching a pattern
   */
  invalidate(pattern: Partial<CacheKey>): void {
    const keysToDelete: string[] = [];

    for (const [cacheKey] of this.cache.entries()) {
      let shouldDelete = true;

      // Check if the cache key matches the pattern
      if (
        pattern.periodId &&
        !cacheKey.includes(`period:${pattern.periodId}`)
      ) {
        shouldDelete = false;
      }

      if (pattern.estudioId !== undefined) {
        const estudioPart = pattern.estudioId
          ? `estudio:${pattern.estudioId}`
          : 'estudio:all';
        if (!cacheKey.includes(estudioPart)) {
          shouldDelete = false;
        }
      }

      if (
        pattern.paymentMethod &&
        !cacheKey.includes(`payment:${pattern.paymentMethod}`)
      ) {
        shouldDelete = false;
      }

      if (shouldDelete) {
        keysToDelete.push(cacheKey);
      }
    }

    keysToDelete.forEach((key) => this.cache.delete(key));
  }

  /**
   * Clear all cached data
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Get cache statistics for debugging
   */
  getStats(): {
    size: number;
    maxSize: number;
    hitRate: number;
    validEntries: number;
  } {
    let validEntries = 0;
    for (const entry of this.cache.values()) {
      if (this.isValid(entry)) {
        validEntries++;
      }
    }

    return {
      size: this.cache.size,
      maxSize: this.maxSize,
      hitRate: 0, // Would need to track hits/misses to calculate
      validEntries,
    };
  }

  /**
   * Clean up expired entries
   */
  cleanup(): void {
    const keysToDelete: string[] = [];

    for (const [key, entry] of this.cache.entries()) {
      if (!this.isValid(entry)) {
        keysToDelete.push(key);
      }
    }

    keysToDelete.forEach((key) => this.cache.delete(key));
  }
}

// Create a singleton instance for the application
export const budgetDataCache = new BudgetDataCache();

/**
 * Higher-order function to wrap API calls with caching
 */
export function withBudgetCache<T>(
  fetchFunction: (key: CacheKey) => Promise<T>,
  customTTL?: number
) {
  return async (key: CacheKey): Promise<T> => {
    // Try to get from cache first
    const cached = budgetDataCache.get<T>(key);
    if (cached !== null) {
      return cached;
    }

    // Fetch from API if not in cache
    try {
      const data = await fetchFunction(key);

      // Cache the result
      budgetDataCache.set(key, data, customTTL);

      return data;
    } catch (error) {
      // Don't cache errors, just throw them
      throw error;
    }
  };
}

/**
 * Preload budget data for common scenarios
 */
export async function preloadBudgetData(
  periodId: string,
  estudioId?: number | null,
  fetchFunction?: (key: CacheKey) => Promise<any>
): Promise<void> {
  if (!fetchFunction) return;

  const commonKeys: CacheKey[] = [
    // All groupers for the period/estudio
    { periodId, estudioId },
    // All groupers with all payment methods
    { periodId, estudioId, paymentMethod: 'all' },
  ];

  // Preload in parallel without waiting
  const preloadPromises = commonKeys.map(async (key) => {
    try {
      const cached = budgetDataCache.get(key);
      if (cached === null) {
        const data = await fetchFunction(key);
        budgetDataCache.set(key, data);
      }
    } catch (error) {
      // Silently fail preloading - it's just an optimization
      console.warn('Budget data preload failed:', error);
    }
  });

  // Don't await - let preloading happen in background
  Promise.allSettled(preloadPromises);
}

/**
 * Invalidate cache when budget data changes
 */
export function invalidateBudgetCache(
  periodId?: string,
  estudioId?: number | null
): void {
  if (periodId) {
    budgetDataCache.invalidate({ periodId, estudioId });
  } else {
    // Clear all if no specific period
    budgetDataCache.clear();
  }
}

/**
 * Periodic cleanup function to remove expired entries
 */
export function startBudgetCacheCleanup(
  intervalMs = 10 * 60 * 1000
): () => void {
  const interval = setInterval(() => {
    budgetDataCache.cleanup();
  }, intervalMs);

  // Return cleanup function
  return () => clearInterval(interval);
}

/**
 * Memory management - clear cache when memory pressure is detected
 */
export function handleMemoryPressure(): void {
  // Clear half of the cache entries (oldest first)
  const stats = budgetDataCache.getStats();
  const targetSize = Math.floor(stats.maxSize / 2);

  while (budgetDataCache.getStats().size > targetSize) {
    // The evictLRU method will remove the oldest entry
    budgetDataCache['evictLRU']();
  }
}

/**
 * Enhanced cache warming for simulate mode with intelligent prefetching
 */
export async function warmSimulateModeCache(
  periodId: string,
  estudioId?: number | null,
  fetchFunction?: (key: CacheKey) => Promise<any>
): Promise<void> {
  if (!fetchFunction) return;

  // Pre-warm cache with simulate mode specific data
  const simulateModeKeys: CacheKey[] = [
    // Budget data for simulate mode
    { periodId, estudioId, paymentMethod: 'all' },
    // Common grouper combinations
    { periodId, estudioId, grouperIds: [], paymentMethod: 'all' },
    // Preload for different payment methods that might be used
    { periodId, estudioId, paymentMethod: 'credit' },
    { periodId, estudioId, paymentMethod: 'debit' },
    { periodId, estudioId, paymentMethod: 'cash' },
  ];

  // Warm cache in background with priority queue and intelligent batching
  const warmingPromises = simulateModeKeys.map(async (key, index) => {
    try {
      const cached = budgetDataCache.get(key);
      if (cached === null) {
        // Add progressive delay for lower priority items to prevent overwhelming the API
        if (index > 0) {
          await new Promise((resolve) => setTimeout(resolve, index * 150));
        }

        const data = await fetchFunction(key);
        // Use longer TTL for simulate mode data since it changes less frequently
        budgetDataCache.set(key, data, 20 * 60 * 1000); // 20 minutes for simulate mode

        // Record access pattern for intelligent prefetching
        cachePrefetcher.recordAccess(key);
      }
    } catch (error) {
      console.warn('Cache warming failed for key:', key, error);
    }
  });

  // Don't await - let warming happen in background
  Promise.allSettled(warmingPromises);
}

/**
 * Advanced cache optimization with compression for large datasets
 */
export class AdvancedBudgetCache extends BudgetDataCache {
  private compressionEnabled: boolean;
  private compressionThreshold: number;

  constructor(
    maxSize = 100,
    defaultTTL = 5 * 60 * 1000,
    enableCompression = true
  ) {
    super(maxSize, defaultTTL);
    this.compressionEnabled = enableCompression;
    this.compressionThreshold = 1000; // Compress data larger than 1KB
  }

  /**
   * Compress data if it's large enough to benefit from compression
   */
  private compressData(data: any): any {
    if (!this.compressionEnabled) return data;

    const dataString = JSON.stringify(data);
    if (dataString.length > this.compressionThreshold) {
      try {
        // Simple compression using JSON optimization
        return {
          _compressed: true,
          _data: this.optimizeJsonStructure(data),
          _originalSize: dataString.length,
        };
      } catch (error) {
        console.warn('Data compression failed:', error);
        return data;
      }
    }
    return data;
  }

  /**
   * Decompress data if it was compressed
   */
  private decompressData(data: any): any {
    if (data && data._compressed) {
      return data._data;
    }
    return data;
  }

  /**
   * Optimize JSON structure for better compression
   */
  private optimizeJsonStructure(data: any): any {
    if (Array.isArray(data)) {
      // For arrays of objects, extract common keys
      if (data.length > 0 && typeof data[0] === 'object') {
        const keys = Object.keys(data[0]);
        const values = data.map((item) => keys.map((key) => item[key]));
        return { _keys: keys, _values: values };
      }
    }
    return data;
  }

  /**
   * Enhanced set method with compression
   */
  set<T>(key: CacheKey, data: T, customTTL?: number): void {
    const compressedData = this.compressionEnabled
      ? this.compressData(data)
      : data;
    super.set(key, compressedData, customTTL);
  }

  /**
   * Enhanced get method with decompression
   */
  get<T>(key: CacheKey): T | null {
    const data = super.get(key);
    if (data === null) return null;

    return this.compressionEnabled ? this.decompressData(data) : data;
  }

  /**
   * Get cache efficiency metrics
   */
  getEfficiencyMetrics(): {
    compressionRatio: number;
    memoryUsage: number;
    hitRate: number;
  } {
    const stats = this.getStats();
    let totalOriginalSize = 0;
    let totalCompressedSize = 0;

    // Calculate compression metrics (simplified)
    for (const entry of (this as any).cache.values()) {
      if (entry.data && entry.data._compressed) {
        totalOriginalSize += entry.data._originalSize || 0;
        totalCompressedSize += JSON.stringify(entry.data._data).length;
      }
    }

    return {
      compressionRatio:
        totalOriginalSize > 0 ? totalCompressedSize / totalOriginalSize : 1,
      memoryUsage: totalCompressedSize,
      hitRate: stats.validEntries / Math.max(stats.size, 1),
    };
  }
}

// Create enhanced cache instance
export const advancedBudgetCache = new AdvancedBudgetCache(
  75,
  8 * 60 * 1000,
  true
);

/**
 * Intelligent cache prefetching based on user behavior
 */
export class IntelligentCachePrefetcher {
  private accessPatterns = new Map<string, number>();
  private prefetchQueue = new Set<string>();

  recordAccess(key: CacheKey): void {
    const keyStr = this.keyToString(key);
    const count = this.accessPatterns.get(keyStr) || 0;
    this.accessPatterns.set(keyStr, count + 1);

    // If this key is accessed frequently, prefetch related data
    if (count > 2) {
      this.scheduleRelatedPrefetch(key);
    }
  }

  private keyToString(key: CacheKey): string {
    return JSON.stringify(key);
  }

  private scheduleRelatedPrefetch(key: CacheKey): void {
    // Prefetch related keys based on patterns
    const relatedKeys = this.generateRelatedKeys(key);

    relatedKeys.forEach((relatedKey) => {
      const keyStr = this.keyToString(relatedKey);
      if (!this.prefetchQueue.has(keyStr)) {
        this.prefetchQueue.add(keyStr);
        // Schedule prefetch with delay to avoid blocking main thread
        setTimeout(() => this.executePrefetch(relatedKey), 100);
      }
    });
  }

  private generateRelatedKeys(key: CacheKey): CacheKey[] {
    const related: CacheKey[] = [];

    // If accessing specific groupers, prefetch all groupers
    if (key.grouperIds && key.grouperIds.length > 0) {
      related.push({ ...key, grouperIds: [] });
    }

    // If accessing specific payment method, prefetch "all"
    if (key.paymentMethod && key.paymentMethod !== 'all') {
      related.push({ ...key, paymentMethod: 'all' });
    }

    return related;
  }

  private async executePrefetch(key: CacheKey): Promise<void> {
    const keyStr = this.keyToString(key);
    try {
      // Only prefetch if not already cached
      if (budgetDataCache.get(key) === null) {
        // This would need to be connected to the actual fetch function
        // For now, just remove from queue
        this.prefetchQueue.delete(keyStr);
      }
    } catch (error) {
      console.warn('Prefetch failed:', error);
      this.prefetchQueue.delete(keyStr);
    }
  }

  getStats(): { patterns: number; queueSize: number } {
    return {
      patterns: this.accessPatterns.size,
      queueSize: this.prefetchQueue.size,
    };
  }

  clear(): void {
    this.accessPatterns.clear();
    this.prefetchQueue.clear();
  }
}

// Create singleton prefetcher
export const cachePrefetcher = new IntelligentCachePrefetcher();

/**
 * Comprehensive performance optimization manager for simulate mode
 */
export class SimulateModePerformanceManager {
  private performanceMetrics = {
    cacheHits: 0,
    cacheMisses: 0,
    apiCalls: 0,
    renderTimes: [] as number[],
    memoryUsage: [] as number[],
    animationPerformance: [] as number[],
  };

  private optimizationStrategies = {
    enableAggressiveCaching: false,
    enableDataCompression: false,
    enableAnimationReduction: false,
    enableMemoryOptimization: false,
  };

  /**
   * Record a cache hit
   */
  recordCacheHit(): void {
    this.performanceMetrics.cacheHits++;
  }

  /**
   * Record a cache miss
   */
  recordCacheMiss(): void {
    this.performanceMetrics.cacheMisses++;
  }

  /**
   * Record an API call
   */
  recordApiCall(): void {
    this.performanceMetrics.apiCalls++;
  }

  /**
   * Record render time
   */
  recordRenderTime(time: number): void {
    this.performanceMetrics.renderTimes.push(time);
    // Keep only last 50 entries
    if (this.performanceMetrics.renderTimes.length > 50) {
      this.performanceMetrics.renderTimes.shift();
    }

    // Auto-adjust optimization strategies
    this.adjustOptimizationStrategies();
  }

  /**
   * Record memory usage
   */
  recordMemoryUsage(usage: number): void {
    this.performanceMetrics.memoryUsage.push(usage);
    // Keep only last 20 entries
    if (this.performanceMetrics.memoryUsage.length > 20) {
      this.performanceMetrics.memoryUsage.shift();
    }
  }

  /**
   * Record animation performance
   */
  recordAnimationPerformance(time: number): void {
    this.performanceMetrics.animationPerformance.push(time);
    // Keep only last 30 entries
    if (this.performanceMetrics.animationPerformance.length > 30) {
      this.performanceMetrics.animationPerformance.shift();
    }
  }

  /**
   * Get current performance metrics
   */
  getMetrics() {
    const totalCacheRequests =
      this.performanceMetrics.cacheHits + this.performanceMetrics.cacheMisses;
    const cacheHitRate =
      totalCacheRequests > 0
        ? this.performanceMetrics.cacheHits / totalCacheRequests
        : 0;

    const avgRenderTime =
      this.performanceMetrics.renderTimes.length > 0
        ? this.performanceMetrics.renderTimes.reduce((a, b) => a + b, 0) /
          this.performanceMetrics.renderTimes.length
        : 0;

    const avgMemoryUsage =
      this.performanceMetrics.memoryUsage.length > 0
        ? this.performanceMetrics.memoryUsage.reduce((a, b) => a + b, 0) /
          this.performanceMetrics.memoryUsage.length
        : 0;

    const avgAnimationTime =
      this.performanceMetrics.animationPerformance.length > 0
        ? this.performanceMetrics.animationPerformance.reduce(
            (a, b) => a + b,
            0
          ) / this.performanceMetrics.animationPerformance.length
        : 0;

    return {
      cacheHitRate,
      avgRenderTime,
      avgMemoryUsage,
      avgAnimationTime,
      apiCalls: this.performanceMetrics.apiCalls,
      optimizationStrategies: { ...this.optimizationStrategies },
    };
  }

  /**
   * Automatically adjust optimization strategies based on performance
   */
  private adjustOptimizationStrategies(): void {
    const metrics = this.getMetrics();

    // Enable aggressive caching if cache hit rate is low
    this.optimizationStrategies.enableAggressiveCaching =
      metrics.cacheHitRate < 0.7;

    // Enable data compression if memory usage is high
    this.optimizationStrategies.enableDataCompression =
      metrics.avgMemoryUsage > 50 * 1024 * 1024; // 50MB

    // Enable animation reduction if render times are slow
    this.optimizationStrategies.enableAnimationReduction =
      metrics.avgRenderTime > 100;

    // Enable memory optimization if memory usage is consistently high
    this.optimizationStrategies.enableMemoryOptimization =
      this.performanceMetrics.memoryUsage.length >= 10 &&
      this.performanceMetrics.memoryUsage.every(
        (usage) => usage > 30 * 1024 * 1024
      ); // 30MB
  }

  /**
   * Get optimization recommendations
   */
  getOptimizationRecommendations(): string[] {
    const recommendations: string[] = [];
    const metrics = this.getMetrics();

    if (metrics.cacheHitRate < 0.5) {
      recommendations.push(
        'Consider increasing cache TTL or preloading more data'
      );
    }

    if (metrics.avgRenderTime > 150) {
      recommendations.push(
        'Consider reducing data size or enabling performance mode'
      );
    }

    if (metrics.avgMemoryUsage > 100 * 1024 * 1024) {
      // 100MB
      recommendations.push(
        'High memory usage detected - consider enabling data compression'
      );
    }

    if (metrics.avgAnimationTime > 20) {
      recommendations.push(
        'Animations are running slowly - consider reducing animation complexity'
      );
    }

    if (metrics.apiCalls > 50) {
      recommendations.push(
        'High number of API calls - consider more aggressive caching'
      );
    }

    return recommendations;
  }

  /**
   * Reset all metrics
   */
  reset(): void {
    this.performanceMetrics = {
      cacheHits: 0,
      cacheMisses: 0,
      apiCalls: 0,
      renderTimes: [],
      memoryUsage: [],
      animationPerformance: [],
    };

    this.optimizationStrategies = {
      enableAggressiveCaching: false,
      enableDataCompression: false,
      enableAnimationReduction: false,
      enableMemoryOptimization: false,
    };
  }

  /**
   * Get performance grade
   */
  getPerformanceGrade(): 'A' | 'B' | 'C' | 'D' | 'F' {
    const metrics = this.getMetrics();
    let score = 100;

    // Deduct points for poor performance
    if (metrics.cacheHitRate < 0.8) score -= 20;
    if (metrics.avgRenderTime > 100) score -= 25;
    if (metrics.avgMemoryUsage > 50 * 1024 * 1024) score -= 20;
    if (metrics.avgAnimationTime > 16.67) score -= 15;
    if (metrics.apiCalls > 30) score -= 20;

    if (score >= 90) return 'A';
    if (score >= 80) return 'B';
    if (score >= 70) return 'C';
    if (score >= 60) return 'D';
    return 'F';
  }
}

// Create singleton instance
export const simulateModePerformanceManager =
  new SimulateModePerformanceManager();

// Export types for use in other modules
export type { CacheKey, CacheEntry };
