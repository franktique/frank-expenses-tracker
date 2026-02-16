// Cache configuration
const CACHE_KEY = 'budget_tracker_excluded_categories';
const CACHE_VERSION = '1.0.0';
const CACHE_EXPIRY_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

// Cached excluded categories data structure
interface CachedExcludedCategories {
  categoryIds: string[];
  timestamp: number;
  version: string;
}

/**
 * LocalStorage utility for managing excluded categories in dashboard
 * Provides caching with validation, expiry, and error handling
 */
export class ExcludedCategoriesStorage {
  /**
   * Check if localStorage is available in the current environment
   */
  private static isStorageAvailable(): boolean {
    try {
      if (typeof window === 'undefined' || !window.localStorage) {
        return false;
      }

      // Test storage functionality
      const testKey = '__storage_test__';
      window.localStorage.setItem(testKey, 'test');
      window.localStorage.removeItem(testKey);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Validate cached excluded categories data structure and expiry
   */
  private static validateCachedData(
    data: any
  ): data is CachedExcludedCategories {
    if (!data || typeof data !== 'object') {
      return false;
    }

    // Check required properties
    if (!Array.isArray(data.categoryIds) || !data.timestamp || !data.version) {
      return false;
    }

    // Check version compatibility
    if (data.version !== CACHE_VERSION) {
      return false;
    }

    // Check expiry
    const now = Date.now();
    if (now - data.timestamp > CACHE_EXPIRY_MS) {
      return false;
    }

    // Validate that all categoryIds are strings
    if (!data.categoryIds.every((id: any) => typeof id === 'string')) {
      return false;
    }

    return true;
  }

  /**
   * Load excluded categories from localStorage
   * Returns empty array if no valid cached data exists
   */
  static loadExcludedCategories(): string[] {
    try {
      if (!this.isStorageAvailable()) {
        return [];
      }

      const cachedData = window.localStorage.getItem(CACHE_KEY);
      if (!cachedData) {
        return [];
      }

      const parsed = JSON.parse(cachedData);
      if (!this.validateCachedData(parsed)) {
        // Clear invalid cache
        this.clearExcludedCategories();
        return [];
      }

      return parsed.categoryIds;
    } catch (error) {
      // Clear corrupted cache and return empty array
      this.clearExcludedCategories();
      return [];
    }
  }

  /**
   * Save excluded categories to localStorage
   * Removes duplicates and validates category IDs
   */
  static saveExcludedCategories(categoryIds: string[]): void {
    if (!this.isStorageAvailable()) {
      console.warn(
        'localStorage is not available - excluded categories will not persist'
      );
      return;
    }

    try {
      // Remove duplicates and filter out invalid entries
      const uniqueIds = Array.from(
        new Set(
          categoryIds.filter((id) => typeof id === 'string' && id.length > 0)
        )
      );

      const cachedData: CachedExcludedCategories = {
        categoryIds: uniqueIds,
        timestamp: Date.now(),
        version: CACHE_VERSION,
      };

      window.localStorage.setItem(CACHE_KEY, JSON.stringify(cachedData));
    } catch (error) {
      console.error(
        'Failed to save excluded categories to localStorage:',
        error
      );
    }
  }

  /**
   * Clear excluded categories from localStorage
   * Safe to call even if storage is unavailable
   */
  static clearExcludedCategories(): void {
    try {
      if (this.isStorageAvailable()) {
        window.localStorage.removeItem(CACHE_KEY);
      }
    } catch {
      // Silently ignore errors when clearing
    }
  }

  /**
   * Check if any categories are excluded
   */
  static hasExcludedCategories(): boolean {
    const excluded = this.loadExcludedCategories();
    return excluded.length > 0;
  }

  /**
   * Toggle a category's exclusion status
   * Returns the new list of excluded category IDs
   */
  static toggleCategory(categoryId: string): string[] {
    const current = this.loadExcludedCategories();
    const index = current.indexOf(categoryId);

    let updated: string[];
    if (index > -1) {
      // Remove category
      updated = current.filter((id) => id !== categoryId);
    } else {
      // Add category
      updated = [...current, categoryId];
    }

    this.saveExcludedCategories(updated);
    return updated;
  }

  /**
   * Check if a specific category is excluded
   */
  static isCategoryExcluded(categoryId: string): boolean {
    const excluded = this.loadExcludedCategories();
    return excluded.includes(categoryId);
  }

  /**
   * Get cache metadata without loading the full data
   */
  static getCacheMetadata(): {
    count: number;
    timestamp: number;
    version: string;
    isValid: boolean;
  } | null {
    try {
      if (!this.isStorageAvailable()) {
        return null;
      }

      const cachedData = window.localStorage.getItem(CACHE_KEY);
      if (!cachedData) {
        return null;
      }

      const parsed = JSON.parse(cachedData);
      const isValid = this.validateCachedData(parsed);

      return {
        count: Array.isArray(parsed.categoryIds)
          ? parsed.categoryIds.length
          : 0,
        timestamp: parsed.timestamp || 0,
        version: parsed.version || 'unknown',
        isValid,
      };
    } catch {
      return null;
    }
  }

  /**
   * Clean up invalid category IDs that no longer exist
   * Useful when categories are deleted from the system
   */
  static cleanupInvalidCategories(validCategoryIds: string[]): void {
    const current = this.loadExcludedCategories();
    const validSet = new Set(validCategoryIds);

    // Filter out any excluded categories that are no longer valid
    const cleaned = current.filter((id) => validSet.has(id));

    // Only save if something changed
    if (cleaned.length !== current.length) {
      this.saveExcludedCategories(cleaned);
    }
  }
}

// Export convenience functions
export const loadExcludedCategories = () =>
  ExcludedCategoriesStorage.loadExcludedCategories();
export const saveExcludedCategories = (categoryIds: string[]) =>
  ExcludedCategoriesStorage.saveExcludedCategories(categoryIds);
export const clearExcludedCategories = () =>
  ExcludedCategoriesStorage.clearExcludedCategories();
export const hasExcludedCategories = () =>
  ExcludedCategoriesStorage.hasExcludedCategories();
export const toggleCategory = (categoryId: string) =>
  ExcludedCategoriesStorage.toggleCategory(categoryId);
export const isCategoryExcluded = (categoryId: string) =>
  ExcludedCategoriesStorage.isCategoryExcluded(categoryId);
export const getCacheMetadata = () =>
  ExcludedCategoriesStorage.getCacheMetadata();
export const cleanupInvalidCategories = (validCategoryIds: string[]) =>
  ExcludedCategoriesStorage.cleanupInvalidCategories(validCategoryIds);

// Export types
export type { CachedExcludedCategories };
