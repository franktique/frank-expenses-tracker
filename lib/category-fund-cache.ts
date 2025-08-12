/**
 * Category-Fund relationship caching utilities
 * Implements efficient caching for category-fund relationships with TTL and invalidation
 */

import { Fund, CategoryFundRelationship } from "@/types/funds";

interface CategoryFundCacheEntry {
  funds: Fund[];
  timestamp: number;
  ttl: number;
}

interface CategoryFundRelationshipCacheEntry {
  relationships: CategoryFundRelationship[];
  timestamp: number;
  ttl: number;
}

class CategoryFundCache {
  private categoryFundsCache = new Map<string, CategoryFundCacheEntry>();
  private relationshipsCache = new Map<
    string,
    CategoryFundRelationshipCacheEntry
  >();
  private defaultTTL: number;
  private maxSize: number;

  constructor(maxSize = 100, defaultTTL = 5 * 60 * 1000) {
    // 5 minutes default TTL
    this.maxSize = maxSize;
    this.defaultTTL = defaultTTL;
  }

  /**
   * Check if a cache entry is still valid
   */
  private isValid(
    entry: CategoryFundCacheEntry | CategoryFundRelationshipCacheEntry
  ): boolean {
    return Date.now() - entry.timestamp < entry.ttl;
  }

  /**
   * Implement LRU eviction when cache is full
   */
  private evictLRU(): void {
    const totalSize =
      this.categoryFundsCache.size + this.relationshipsCache.size;

    if (totalSize >= this.maxSize) {
      // Find the oldest entry across both caches
      let oldestKey = "";
      let oldestTime = Date.now();
      let oldestCache: "funds" | "relationships" = "funds";

      for (const [key, entry] of this.categoryFundsCache.entries()) {
        if (entry.timestamp < oldestTime) {
          oldestTime = entry.timestamp;
          oldestKey = key;
          oldestCache = "funds";
        }
      }

      for (const [key, entry] of this.relationshipsCache.entries()) {
        if (entry.timestamp < oldestTime) {
          oldestTime = entry.timestamp;
          oldestKey = key;
          oldestCache = "relationships";
        }
      }

      if (oldestKey) {
        if (oldestCache === "funds") {
          this.categoryFundsCache.delete(oldestKey);
        } else {
          this.relationshipsCache.delete(oldestKey);
        }
      }
    }
  }

  /**
   * Get cached funds for a category
   */
  getCategoryFunds(categoryId: string): Fund[] | null {
    const entry = this.categoryFundsCache.get(categoryId);

    if (!entry) {
      return null;
    }

    if (!this.isValid(entry)) {
      this.categoryFundsCache.delete(categoryId);
      return null;
    }

    // Update timestamp for LRU
    entry.timestamp = Date.now();
    this.categoryFundsCache.set(categoryId, entry);

    return entry.funds;
  }

  /**
   * Set cached funds for a category
   */
  setCategoryFunds(
    categoryId: string,
    funds: Fund[],
    customTTL?: number
  ): void {
    this.evictLRU();

    const entry: CategoryFundCacheEntry = {
      funds,
      timestamp: Date.now(),
      ttl: customTTL || this.defaultTTL,
    };

    this.categoryFundsCache.set(categoryId, entry);
  }

  /**
   * Get cached relationships for a category
   */
  getCategoryRelationships(
    categoryId: string
  ): CategoryFundRelationship[] | null {
    const entry = this.relationshipsCache.get(categoryId);

    if (!entry) {
      return null;
    }

    if (!this.isValid(entry)) {
      this.relationshipsCache.delete(categoryId);
      return null;
    }

    // Update timestamp for LRU
    entry.timestamp = Date.now();
    this.relationshipsCache.set(categoryId, entry);

    return entry.relationships;
  }

  /**
   * Set cached relationships for a category
   */
  setCategoryRelationships(
    categoryId: string,
    relationships: CategoryFundRelationship[],
    customTTL?: number
  ): void {
    this.evictLRU();

    const entry: CategoryFundRelationshipCacheEntry = {
      relationships,
      timestamp: Date.now(),
      ttl: customTTL || this.defaultTTL,
    };

    this.relationshipsCache.set(categoryId, entry);
  }

  /**
   * Invalidate cache for a specific category
   */
  invalidateCategory(categoryId: string): void {
    this.categoryFundsCache.delete(categoryId);
    this.relationshipsCache.delete(categoryId);
  }

  /**
   * Invalidate cache for multiple categories
   */
  invalidateCategories(categoryIds: string[]): void {
    categoryIds.forEach((id) => this.invalidateCategory(id));
  }

  /**
   * Invalidate cache entries that include a specific fund
   */
  invalidateFund(fundId: string): void {
    // Check category funds cache
    const categoryFundsToInvalidate: string[] = [];
    for (const [categoryId, entry] of this.categoryFundsCache.entries()) {
      if (entry.funds.some((fund) => fund.id === fundId)) {
        categoryFundsToInvalidate.push(categoryId);
      }
    }

    // Check relationships cache
    const relationshipsToInvalidate: string[] = [];
    for (const [categoryId, entry] of this.relationshipsCache.entries()) {
      if (entry.relationships.some((rel) => rel.fund_id === fundId)) {
        relationshipsToInvalidate.push(categoryId);
      }
    }

    // Invalidate affected entries
    [...categoryFundsToInvalidate, ...relationshipsToInvalidate].forEach(
      (categoryId) => {
        this.invalidateCategory(categoryId);
      }
    );
  }

  /**
   * Clear all cached data
   */
  clear(): void {
    this.categoryFundsCache.clear();
    this.relationshipsCache.clear();
  }

  /**
   * Clean up expired entries
   */
  cleanup(): void {
    const categoryFundsToDelete: string[] = [];
    for (const [key, entry] of this.categoryFundsCache.entries()) {
      if (!this.isValid(entry)) {
        categoryFundsToDelete.push(key);
      }
    }

    const relationshipsToDelete: string[] = [];
    for (const [key, entry] of this.relationshipsCache.entries()) {
      if (!this.isValid(entry)) {
        relationshipsToDelete.push(key);
      }
    }

    categoryFundsToDelete.forEach((key) => this.categoryFundsCache.delete(key));
    relationshipsToDelete.forEach((key) => this.relationshipsCache.delete(key));
  }

  /**
   * Get cache statistics
   */
  getStats(): {
    categoryFundsSize: number;
    relationshipsSize: number;
    totalSize: number;
    maxSize: number;
    validCategoryFunds: number;
    validRelationships: number;
  } {
    let validCategoryFunds = 0;
    for (const entry of this.categoryFundsCache.values()) {
      if (this.isValid(entry)) {
        validCategoryFunds++;
      }
    }

    let validRelationships = 0;
    for (const entry of this.relationshipsCache.values()) {
      if (this.isValid(entry)) {
        validRelationships++;
      }
    }

    return {
      categoryFundsSize: this.categoryFundsCache.size,
      relationshipsSize: this.relationshipsCache.size,
      totalSize: this.categoryFundsCache.size + this.relationshipsCache.size,
      maxSize: this.maxSize,
      validCategoryFunds,
      validRelationships,
    };
  }

  /**
   * Preload category funds for multiple categories
   */
  async preloadCategoryFunds(
    categoryIds: string[],
    fetchFunction: (categoryId: string) => Promise<Fund[]>
  ): Promise<void> {
    const preloadPromises = categoryIds.map(async (categoryId) => {
      try {
        const cached = this.getCategoryFunds(categoryId);
        if (cached === null) {
          const funds = await fetchFunction(categoryId);
          this.setCategoryFunds(categoryId, funds);
        }
      } catch (error) {
        console.warn(
          `Failed to preload funds for category ${categoryId}:`,
          error
        );
      }
    });

    // Don't await - let preloading happen in background
    Promise.allSettled(preloadPromises);
  }

  /**
   * Batch update category funds cache
   */
  batchUpdateCategoryFunds(
    updates: Array<{ categoryId: string; funds: Fund[] }>
  ): void {
    updates.forEach(({ categoryId, funds }) => {
      this.setCategoryFunds(categoryId, funds);
    });
  }

  /**
   * Get cache efficiency metrics
   */
  getEfficiencyMetrics(): {
    hitRate: number;
    memoryUsage: number;
    averageEntrySize: number;
  } {
    const stats = this.getStats();
    const totalValidEntries =
      stats.validCategoryFunds + stats.validRelationships;
    const totalEntries = stats.categoryFundsSize + stats.relationshipsSize;

    // Calculate approximate memory usage
    let memoryUsage = 0;
    for (const entry of this.categoryFundsCache.values()) {
      memoryUsage += JSON.stringify(entry.funds).length;
    }
    for (const entry of this.relationshipsCache.values()) {
      memoryUsage += JSON.stringify(entry.relationships).length;
    }

    return {
      hitRate: totalEntries > 0 ? totalValidEntries / totalEntries : 0,
      memoryUsage,
      averageEntrySize: totalEntries > 0 ? memoryUsage / totalEntries : 0,
    };
  }
}

// Create singleton instance
export const categoryFundCache = new CategoryFundCache();

/**
 * Higher-order function to wrap category-fund API calls with caching
 */
export function withCategoryFundCache<T>(
  fetchFunction: (categoryId: string) => Promise<T>,
  cacheKey: "funds" | "relationships",
  customTTL?: number
) {
  return async (categoryId: string): Promise<T> => {
    // Try to get from cache first
    let cached: T | null = null;

    if (cacheKey === "funds") {
      cached = categoryFundCache.getCategoryFunds(categoryId) as T | null;
    } else {
      cached = categoryFundCache.getCategoryRelationships(
        categoryId
      ) as T | null;
    }

    if (cached !== null) {
      return cached;
    }

    // Fetch from API if not in cache
    try {
      const data = await fetchFunction(categoryId);

      // Cache the result
      if (cacheKey === "funds") {
        categoryFundCache.setCategoryFunds(
          categoryId,
          data as Fund[],
          customTTL
        );
      } else {
        categoryFundCache.setCategoryRelationships(
          categoryId,
          data as CategoryFundRelationship[],
          customTTL
        );
      }

      return data;
    } catch (error) {
      // Don't cache errors, just throw them
      throw error;
    }
  };
}

/**
 * Periodic cleanup function to remove expired entries
 */
export function startCategoryFundCacheCleanup(
  intervalMs = 10 * 60 * 1000
): () => void {
  const interval = setInterval(() => {
    categoryFundCache.cleanup();
  }, intervalMs);

  // Return cleanup function
  return () => clearInterval(interval);
}

/**
 * Invalidate cache when category-fund relationships change
 */
export function invalidateCategoryFundCache(
  categoryId?: string,
  fundId?: string
): void {
  if (categoryId) {
    categoryFundCache.invalidateCategory(categoryId);
  } else if (fundId) {
    categoryFundCache.invalidateFund(fundId);
  } else {
    // Clear all if no specific category or fund
    categoryFundCache.clear();
  }
}

/**
 * Warm cache with commonly accessed category-fund relationships
 */
export async function warmCategoryFundCache(
  categoryIds: string[],
  fetchCategoryFunds: (categoryId: string) => Promise<Fund[]>
): Promise<void> {
  await categoryFundCache.preloadCategoryFunds(categoryIds, fetchCategoryFunds);
}

// Export types for use in other modules
export type { CategoryFundCacheEntry, CategoryFundRelationshipCacheEntry };
