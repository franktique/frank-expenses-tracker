import { Period } from "@/types/funds";

// Cache configuration
const CACHE_KEY = "budget_tracker_active_period";
const CACHE_VERSION = "1.0.0";
const CACHE_EXPIRY_MS = 24 * 60 * 60 * 1000; // 24 hours

// Cached period data structure
interface CachedActivePeriod {
  period: Period;
  timestamp: number;
  version: string;
}

// Error types for session storage operations
export interface StorageError {
  type:
    | "storage_unavailable"
    | "invalid_data"
    | "expired_cache"
    | "parse_error";
  message: string;
  originalError?: Error;
}

/**
 * Session storage utility for managing active period data
 * Provides caching with validation, expiry, and error handling
 */
export class ActivePeriodStorage {
  /**
   * Check if session storage is available in the current environment
   */
  private static isStorageAvailable(): boolean {
    try {
      if (typeof window === "undefined" || !window.sessionStorage) {
        return false;
      }

      // Test storage functionality
      const testKey = "__storage_test__";
      window.sessionStorage.setItem(testKey, "test");
      window.sessionStorage.removeItem(testKey);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Validate cached period data structure and expiry
   */
  private static validateCachedData(data: any): data is CachedActivePeriod {
    if (!data || typeof data !== "object") {
      return false;
    }

    // Check required properties
    if (!data.period || !data.timestamp || !data.version) {
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

    // Validate period structure
    const period = data.period;
    if (
      !period.id ||
      !period.name ||
      typeof period.month !== "number" ||
      typeof period.year !== "number" ||
      typeof period.is_open !== "boolean" ||
      typeof period.isOpen !== "boolean"
    ) {
      return false;
    }

    return true;
  }

  /**
   * Load active period from session storage
   * Returns null if no valid cached data exists
   */
  static loadActivePeriod(): Period | null {
    try {
      if (!this.isStorageAvailable()) {
        return null;
      }

      const cachedData = window.sessionStorage.getItem(CACHE_KEY);
      if (!cachedData) {
        return null;
      }

      const parsed = JSON.parse(cachedData);
      if (!this.validateCachedData(parsed)) {
        // Clear invalid cache
        this.clearActivePeriod();
        return null;
      }

      return parsed.period;
    } catch (error) {
      // Clear corrupted cache and return null
      this.clearActivePeriod();
      return null;
    }
  }

  /**
   * Save active period to session storage
   * Throws StorageError if operation fails
   */
  static saveActivePeriod(period: Period): void {
    if (!this.isStorageAvailable()) {
      throw new StorageError({
        type: "storage_unavailable",
        message: "Session storage is not available in this environment",
      });
    }

    try {
      const cachedData: CachedActivePeriod = {
        period,
        timestamp: Date.now(),
        version: CACHE_VERSION,
      };

      window.sessionStorage.setItem(CACHE_KEY, JSON.stringify(cachedData));
    } catch (error) {
      throw new StorageError({
        type: "storage_unavailable",
        message: "Failed to save active period to session storage",
        originalError:
          error instanceof Error ? error : new Error(String(error)),
      });
    }
  }

  /**
   * Clear active period from session storage
   * Safe to call even if storage is unavailable
   */
  static clearActivePeriod(): void {
    try {
      if (this.isStorageAvailable()) {
        window.sessionStorage.removeItem(CACHE_KEY);
      }
    } catch {
      // Silently ignore errors when clearing
    }
  }

  /**
   * Check if active period is cached and valid
   */
  static isActivePeriodCached(): boolean {
    try {
      if (!this.isStorageAvailable()) {
        return false;
      }

      const cachedData = window.sessionStorage.getItem(CACHE_KEY);
      if (!cachedData) {
        return false;
      }

      const parsed = JSON.parse(cachedData);
      return this.validateCachedData(parsed);
    } catch {
      return false;
    }
  }

  /**
   * Get cache metadata (timestamp, version) without loading the period
   */
  static getCacheMetadata(): {
    timestamp: number;
    version: string;
    isValid: boolean;
  } | null {
    try {
      if (!this.isStorageAvailable()) {
        return null;
      }

      const cachedData = window.sessionStorage.getItem(CACHE_KEY);
      if (!cachedData) {
        return null;
      }

      const parsed = JSON.parse(cachedData);
      const isValid = this.validateCachedData(parsed);

      return {
        timestamp: parsed.timestamp || 0,
        version: parsed.version || "unknown",
        isValid,
      };
    } catch {
      return null;
    }
  }

  /**
   * Force cache invalidation by clearing expired or invalid data
   */
  static invalidateCache(): void {
    try {
      if (!this.isStorageAvailable()) {
        return;
      }

      const cachedData = window.sessionStorage.getItem(CACHE_KEY);
      if (!cachedData) {
        return;
      }

      const parsed = JSON.parse(cachedData);
      if (!this.validateCachedData(parsed)) {
        this.clearActivePeriod();
      }
    } catch {
      this.clearActivePeriod();
    }
  }

  /**
   * Advanced cache recovery mechanisms
   */
  static recoverFromCorruptedCache(): {
    recovered: boolean;
    action: string;
    details?: string;
  } {
    try {
      if (!this.isStorageAvailable()) {
        return {
          recovered: false,
          action: "storage_unavailable",
          details: "Session storage is not available",
        };
      }

      const cachedData = window.sessionStorage.getItem(CACHE_KEY);
      if (!cachedData) {
        return {
          recovered: true,
          action: "no_cache",
          details: "No cached data found - nothing to recover",
        };
      }

      let parsed: any;
      try {
        parsed = JSON.parse(cachedData);
      } catch (parseError) {
        // Corrupted JSON - clear and report
        this.clearActivePeriod();
        return {
          recovered: true,
          action: "cleared_corrupted_json",
          details: "Cleared corrupted JSON data from cache",
        };
      }

      // Check if we can partially recover the data
      if (parsed && typeof parsed === "object") {
        // Try to extract period data even if structure is invalid
        const period = parsed.period;
        if (period && period.id && period.name) {
          // Attempt to reconstruct valid cache entry
          try {
            const reconstructed: CachedActivePeriod = {
              period: {
                id: period.id,
                name: period.name,
                month: period.month || 0,
                year: period.year || new Date().getFullYear(),
                is_open: Boolean(period.is_open || period.isOpen),
                isOpen: Boolean(period.is_open || period.isOpen),
              },
              timestamp: Date.now(), // Use current timestamp
              version: CACHE_VERSION, // Use current version
            };

            // Validate reconstructed data
            if (this.validateCachedData(reconstructed)) {
              window.sessionStorage.setItem(
                CACHE_KEY,
                JSON.stringify(reconstructed)
              );
              return {
                recovered: true,
                action: "reconstructed_cache",
                details: `Reconstructed cache for period: ${period.name}`,
              };
            }
          } catch (reconstructError) {
            // Reconstruction failed, clear cache
            this.clearActivePeriod();
            return {
              recovered: true,
              action: "cleared_invalid_reconstruction",
              details: "Failed to reconstruct cache data",
            };
          }
        }
      }

      // If we reach here, data is invalid and cannot be recovered
      this.clearActivePeriod();
      return {
        recovered: true,
        action: "cleared_invalid_data",
        details: "Cleared invalid cache data that could not be recovered",
      };
    } catch (error) {
      // Last resort - clear everything
      this.clearActivePeriod();
      return {
        recovered: true,
        action: "cleared_on_error",
        details: `Cleared cache due to recovery error: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
      };
    }
  }

  /**
   * Comprehensive cache health check and automatic repair
   */
  static performCacheHealthCheck(): {
    healthy: boolean;
    issues: string[];
    repaired: boolean;
    actions: string[];
  } {
    const issues: string[] = [];
    const actions: string[] = [];
    let repaired = false;

    // Check storage availability
    if (!this.isStorageAvailable()) {
      issues.push("Session storage is not available");
      return { healthy: false, issues, repaired: false, actions };
    }

    try {
      const cachedData = window.sessionStorage.getItem(CACHE_KEY);

      if (!cachedData) {
        return {
          healthy: true,
          issues: [],
          repaired: false,
          actions: ["No cache data - healthy state"],
        };
      }

      let parsed: any;
      try {
        parsed = JSON.parse(cachedData);
      } catch (parseError) {
        issues.push("Cache contains invalid JSON");
        this.clearActivePeriod();
        actions.push("Cleared corrupted JSON cache");
        repaired = true;
        return { healthy: true, issues, repaired, actions };
      }

      // Check cache structure
      if (!parsed || typeof parsed !== "object") {
        issues.push("Cache data is not an object");
        this.clearActivePeriod();
        actions.push("Cleared non-object cache data");
        repaired = true;
        return { healthy: true, issues, repaired, actions };
      }

      // Check required properties
      if (!parsed.period || !parsed.timestamp || !parsed.version) {
        issues.push("Cache missing required properties");
        const recovery = this.recoverFromCorruptedCache();
        if (recovery.recovered) {
          actions.push(`Recovery action: ${recovery.action}`);
          repaired = true;
        }
        return { healthy: repaired, issues, repaired, actions };
      }

      // Check version compatibility
      if (parsed.version !== CACHE_VERSION) {
        issues.push(
          `Cache version mismatch: ${parsed.version} vs ${CACHE_VERSION}`
        );
        this.clearActivePeriod();
        actions.push("Cleared cache due to version mismatch");
        repaired = true;
        return { healthy: true, issues, repaired, actions };
      }

      // Check expiry
      const age = Date.now() - parsed.timestamp;
      if (age > CACHE_EXPIRY_MS) {
        issues.push(
          `Cache expired: ${Math.round(age / 1000 / 60)} minutes old`
        );
        this.clearActivePeriod();
        actions.push("Cleared expired cache");
        repaired = true;
        return { healthy: true, issues, repaired, actions };
      }

      // Check period data integrity
      const period = parsed.period;
      if (
        !period.id ||
        !period.name ||
        typeof period.month !== "number" ||
        typeof period.year !== "number"
      ) {
        issues.push("Period data is incomplete or invalid");
        const recovery = this.recoverFromCorruptedCache();
        if (recovery.recovered) {
          actions.push(`Recovery action: ${recovery.action}`);
          repaired = true;
        }
        return { healthy: repaired, issues, repaired, actions };
      }

      // All checks passed
      return {
        healthy: true,
        issues: [],
        repaired: false,
        actions: ["Cache is healthy"],
      };
    } catch (error) {
      issues.push(
        `Health check failed: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
      this.clearActivePeriod();
      actions.push("Cleared cache due to health check error");
      return { healthy: true, issues, repaired: true, actions };
    }
  }

  /**
   * Graceful degradation fallback when session storage is unavailable
   * Returns a memory-based cache that works for the current session
   */
  static createMemoryFallback(): {
    loadActivePeriod: () => Period | null;
    saveActivePeriod: (period: Period) => void;
    clearActivePeriod: () => void;
    isActivePeriodCached: () => boolean;
  } {
    let memoryCache: Period | null = null;

    return {
      loadActivePeriod: () => memoryCache,
      saveActivePeriod: (period: Period) => {
        memoryCache = period;
        console.warn(
          "Using memory fallback for active period storage - data will not persist across page reloads"
        );
      },
      clearActivePeriod: () => {
        memoryCache = null;
      },
      isActivePeriodCached: () => memoryCache !== null,
    };
  }

  /**
   * Smart storage operation with automatic fallback
   * Attempts session storage first, falls back to memory cache if needed
   */
  static withFallback() {
    if (this.isStorageAvailable()) {
      return {
        loadActivePeriod: () => this.loadActivePeriod(),
        saveActivePeriod: (period: Period) => this.saveActivePeriod(period),
        clearActivePeriod: () => this.clearActivePeriod(),
        isActivePeriodCached: () => this.isActivePeriodCached(),
        usingFallback: false,
      };
    } else {
      const fallback = this.createMemoryFallback();
      return {
        ...fallback,
        usingFallback: true,
      };
    }
  }
}

/**
 * Custom error class for storage operations
 */
class StorageError extends Error {
  public readonly type: StorageError["type"];
  public readonly originalError?: Error;

  constructor(error: StorageError) {
    super(error.message);
    this.name = "StorageError";
    this.type = error.type;
    this.originalError = error.originalError;
  }
}

// Export utility functions for convenience
export const {
  loadActivePeriod,
  saveActivePeriod,
  clearActivePeriod,
  isActivePeriodCached,
  getCacheMetadata,
  invalidateCache,
} = ActivePeriodStorage;

// Export types
export type { CachedActivePeriod, StorageError };
