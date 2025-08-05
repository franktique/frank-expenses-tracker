/**
 * Memory management utilities for dashboard performance optimization
 * Handles cleanup, garbage collection hints, and memory pressure detection
 */

import React from "react";

interface MemoryInfo {
  usedJSHeapSize: number;
  totalJSHeapSize: number;
  jsHeapSizeLimit: number;
}

interface MemoryPressureConfig {
  warningThreshold: number; // Percentage of heap limit
  criticalThreshold: number; // Percentage of heap limit
  checkInterval: number; // Milliseconds
  onWarning?: () => void;
  onCritical?: () => void;
}

class MemoryManager {
  private config: MemoryPressureConfig;
  private intervalId: NodeJS.Timeout | null = null;
  private listeners: Set<(info: MemoryInfo) => void> = new Set();
  private lastCleanup: number = 0;
  private cleanupThrottle: number = 30000; // 30 seconds

  constructor(config: Partial<MemoryPressureConfig> = {}) {
    this.config = {
      warningThreshold: 70, // 70% of heap limit
      criticalThreshold: 85, // 85% of heap limit
      checkInterval: 30000, // 30 seconds
      ...config,
    };
  }

  /**
   * Get current memory information
   */
  getMemoryInfo(): MemoryInfo | null {
    if ("memory" in performance && (performance as any).memory) {
      return (performance as any).memory as MemoryInfo;
    }
    return null;
  }

  /**
   * Calculate memory usage percentage
   */
  getMemoryUsagePercentage(): number {
    const memInfo = this.getMemoryInfo();
    if (!memInfo) return 0;

    return (memInfo.usedJSHeapSize / memInfo.jsHeapSizeLimit) * 100;
  }

  /**
   * Check if memory pressure exists
   */
  checkMemoryPressure(): "normal" | "warning" | "critical" {
    const usage = this.getMemoryUsagePercentage();

    if (usage >= this.config.criticalThreshold) {
      return "critical";
    } else if (usage >= this.config.warningThreshold) {
      return "warning";
    }

    return "normal";
  }

  /**
   * Start monitoring memory pressure
   */
  startMonitoring(): void {
    if (this.intervalId) {
      this.stopMonitoring();
    }

    this.intervalId = setInterval(() => {
      const memInfo = this.getMemoryInfo();
      if (!memInfo) return;

      const pressure = this.checkMemoryPressure();

      // Notify listeners
      this.listeners.forEach((listener) => listener(memInfo));

      // Handle pressure levels
      switch (pressure) {
        case "warning":
          console.warn(
            `Memory usage at ${this.getMemoryUsagePercentage().toFixed(1)}%`
          );
          this.config.onWarning?.();
          break;
        case "critical":
          console.error(
            `Critical memory usage at ${this.getMemoryUsagePercentage().toFixed(
              1
            )}%`
          );
          this.config.onCritical?.();
          this.performEmergencyCleanup();
          break;
      }
    }, this.config.checkInterval);
  }

  /**
   * Stop monitoring memory pressure
   */
  stopMonitoring(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  /**
   * Add a memory info listener
   */
  addListener(listener: (info: MemoryInfo) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /**
   * Perform emergency cleanup when memory is critical
   */
  private performEmergencyCleanup(): void {
    const now = Date.now();
    if (now - this.lastCleanup < this.cleanupThrottle) {
      return; // Throttle cleanup to prevent excessive calls
    }

    this.lastCleanup = now;

    // Clear various caches and temporary data
    this.clearImageCaches();
    this.clearEventListeners();
    this.suggestGarbageCollection();

    console.log("Emergency memory cleanup performed");
  }

  /**
   * Clear image caches to free memory
   */
  private clearImageCaches(): void {
    // Clear any cached images or blob URLs
    if (typeof window !== "undefined") {
      // Clear any blob URLs that might be cached
      const images = document.querySelectorAll('img[src^="blob:"]');
      images.forEach((img) => {
        const src = (img as HTMLImageElement).src;
        if (src.startsWith("blob:")) {
          URL.revokeObjectURL(src);
        }
      });
    }
  }

  /**
   * Clear unnecessary event listeners
   */
  private clearEventListeners(): void {
    // This would be implemented based on specific application needs
    // For now, just log that we're attempting cleanup
    console.log("Clearing unnecessary event listeners");
  }

  /**
   * Suggest garbage collection (if available)
   */
  private suggestGarbageCollection(): void {
    // In development or if gc is exposed
    if (typeof window !== "undefined" && "gc" in window) {
      try {
        (window as any).gc();
        console.log("Manual garbage collection triggered");
      } catch (error) {
        console.warn("Manual garbage collection failed:", error);
      }
    }
  }

  /**
   * Get memory statistics for debugging
   */
  getMemoryStats(): {
    current: MemoryInfo | null;
    usagePercentage: number;
    pressureLevel: "normal" | "warning" | "critical";
    isMonitoring: boolean;
  } {
    return {
      current: this.getMemoryInfo(),
      usagePercentage: this.getMemoryUsagePercentage(),
      pressureLevel: this.checkMemoryPressure(),
      isMonitoring: this.intervalId !== null,
    };
  }
}

// Create singleton instance
export const memoryManager = new MemoryManager({
  onWarning: () => {
    // Import and clear budget cache when memory warning occurs
    import("./budget-data-cache").then(({ budgetDataCache }) => {
      const stats = budgetDataCache.getStats();
      if (stats.size > 10) {
        // Clear half the cache
        for (let i = 0; i < Math.floor(stats.size / 2); i++) {
          budgetDataCache["evictLRU"]?.();
        }
        console.log("Budget cache partially cleared due to memory pressure");
      }
    });
  },
  onCritical: () => {
    // Clear all caches when memory is critical
    import("./budget-data-cache").then(({ budgetDataCache }) => {
      budgetDataCache.clear();
      console.log("All caches cleared due to critical memory pressure");
    });
  },
});

/**
 * React hook for memory management
 */
export function useMemoryManagement(
  options: {
    enableMonitoring?: boolean;
    onMemoryPressure?: (level: "warning" | "critical") => void;
  } = {}
) {
  const { enableMonitoring = true, onMemoryPressure } = options;

  React.useEffect(() => {
    if (!enableMonitoring) return;

    // Start monitoring
    memoryManager.startMonitoring();

    // Add custom listener if provided
    let removeListener: (() => void) | undefined;
    if (onMemoryPressure) {
      removeListener = memoryManager.addListener((memInfo) => {
        const pressure = memoryManager.checkMemoryPressure();
        if (pressure !== "normal") {
          onMemoryPressure(pressure);
        }
      });
    }

    return () => {
      memoryManager.stopMonitoring();
      removeListener?.();
    };
  }, [enableMonitoring, onMemoryPressure]);

  return {
    getMemoryStats: () => memoryManager.getMemoryStats(),
    checkMemoryPressure: () => memoryManager.checkMemoryPressure(),
    getMemoryUsagePercentage: () => memoryManager.getMemoryUsagePercentage(),
  };
}

/**
 * Cleanup function for component unmounting
 */
export function createCleanupFunction(
  cleanupTasks: (() => void)[]
): () => void {
  return () => {
    cleanupTasks.forEach((task) => {
      try {
        task();
      } catch (error) {
        console.warn("Cleanup task failed:", error);
      }
    });
  };
}

/**
 * Debounced cleanup to prevent excessive cleanup calls
 */
export function createDebouncedCleanup(
  cleanupFunction: () => void,
  delay: number = 1000
): () => void {
  let timeoutId: NodeJS.Timeout;

  return () => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(cleanupFunction, delay);
  };
}

/**
 * Memory-efficient data processing utilities
 */
export const memoryEfficientUtils = {
  /**
   * Process large arrays in chunks to prevent memory spikes
   */
  processInChunks: async <T, R>(
    array: T[],
    processor: (chunk: T[]) => R[],
    chunkSize: number = 100
  ): Promise<R[]> => {
    const results: R[] = [];

    for (let i = 0; i < array.length; i += chunkSize) {
      const chunk = array.slice(i, i + chunkSize);
      const chunkResults = processor(chunk);
      results.push(...chunkResults);

      // Allow garbage collection between chunks
      await new Promise((resolve) => setTimeout(resolve, 0));
    }

    return results;
  },

  /**
   * Create a memory-efficient map that automatically cleans up old entries
   */
  createLRUMap: <K, V>(maxSize: number = 100) => {
    const map = new Map<K, V>();

    return {
      get: (key: K): V | undefined => {
        const value = map.get(key);
        if (value !== undefined) {
          // Move to end (most recently used)
          map.delete(key);
          map.set(key, value);
        }
        return value;
      },

      set: (key: K, value: V): void => {
        if (map.has(key)) {
          map.delete(key);
        } else if (map.size >= maxSize) {
          // Remove least recently used (first entry)
          const firstKey = map.keys().next().value;
          map.delete(firstKey);
        }
        map.set(key, value);
      },

      clear: (): void => map.clear(),
      size: (): number => map.size,
    };
  },

  /**
   * Optimize chart data for rendering performance with advanced aggregation and memory efficiency
   */
  optimizeChartData: <T extends { total_amount: number }>(
    data: T[],
    maxItems: number = 50,
    options: {
      enableAggregation?: boolean;
      aggregationThreshold?: number;
      sortKey?: keyof T;
      enableMemoryOptimization?: boolean;
    } = {}
  ): T[] => {
    const {
      enableAggregation = true,
      aggregationThreshold = 0.01, // 1% of total
      sortKey = "total_amount" as keyof T,
      enableMemoryOptimization = true,
    } = options;

    // If data is within limits, return as-is
    if (data.length <= maxItems) {
      return data;
    }

    // Memory optimization: use streaming approach for large datasets
    if (enableMemoryOptimization && data.length > 1000) {
      return memoryEfficientUtils.processLargeDataset(
        data,
        maxItems,
        aggregationThreshold,
        sortKey
      );
    }

    // Calculate total for percentage-based aggregation
    const total = data.reduce((sum, item) => sum + item.total_amount, 0);
    const minAmount = total * aggregationThreshold;

    // Sort by the specified key (default: total_amount) with memory-efficient approach
    const sorted = [...data].sort((a, b) => {
      const aVal = typeof a[sortKey] === "number" ? (a[sortKey] as number) : 0;
      const bVal = typeof b[sortKey] === "number" ? (b[sortKey] as number) : 0;
      return bVal - aVal;
    });

    if (!enableAggregation) {
      return sorted.slice(0, maxItems);
    }

    // Find items that are significant enough to show individually
    const significantItems: T[] = [];
    const insignificantItems: T[] = [];

    for (const item of sorted) {
      if (
        significantItems.length < maxItems - 1 &&
        item.total_amount >= minAmount
      ) {
        significantItems.push(item);
      } else {
        insignificantItems.push(item);
      }
    }

    // Aggregate remaining items into "Others" category
    if (insignificantItems.length > 0) {
      const othersTotal = insignificantItems.reduce(
        (sum, item) => sum + item.total_amount,
        0
      );

      if (othersTotal > 0) {
        const othersItem = {
          ...insignificantItems[0], // Use first item as template
          grouper_name: `Otros (${insignificantItems.length})`,
          category_name: `Otros (${insignificantItems.length})`,
          total_amount: othersTotal,
        } as T;

        return [...significantItems, othersItem];
      }
    }

    return significantItems;
  },

  /**
   * Process large datasets with memory-efficient streaming approach
   */
  processLargeDataset: <T extends { total_amount: number }>(
    data: T[],
    maxItems: number,
    aggregationThreshold: number,
    sortKey: keyof T
  ): T[] => {
    // Use a min-heap to keep track of top items without sorting entire array
    const topItems: T[] = [];
    let totalSum = 0;

    // First pass: calculate total and find top items
    for (const item of data) {
      totalSum += item.total_amount;

      if (topItems.length < maxItems) {
        topItems.push(item);
        // Sort only when we have enough items
        if (topItems.length === maxItems) {
          topItems.sort((a, b) => {
            const aVal =
              typeof a[sortKey] === "number" ? (a[sortKey] as number) : 0;
            const bVal =
              typeof b[sortKey] === "number" ? (b[sortKey] as number) : 0;
            return aVal - bVal; // Min heap (smallest first)
          });
        }
      } else {
        const itemVal =
          typeof item[sortKey] === "number" ? (item[sortKey] as number) : 0;
        const minVal =
          typeof topItems[0][sortKey] === "number"
            ? (topItems[0][sortKey] as number)
            : 0;

        if (itemVal > minVal) {
          topItems[0] = item;
          // Re-heapify
          let i = 0;
          while (i < topItems.length - 1) {
            const leftChild = 2 * i + 1;
            const rightChild = 2 * i + 2;
            let smallest = i;

            if (leftChild < topItems.length) {
              const leftVal =
                typeof topItems[leftChild][sortKey] === "number"
                  ? (topItems[leftChild][sortKey] as number)
                  : 0;
              const smallestVal =
                typeof topItems[smallest][sortKey] === "number"
                  ? (topItems[smallest][sortKey] as number)
                  : 0;
              if (leftVal < smallestVal) {
                smallest = leftChild;
              }
            }

            if (rightChild < topItems.length) {
              const rightVal =
                typeof topItems[rightChild][sortKey] === "number"
                  ? (topItems[rightChild][sortKey] as number)
                  : 0;
              const smallestVal =
                typeof topItems[smallest][sortKey] === "number"
                  ? (topItems[smallest][sortKey] as number)
                  : 0;
              if (rightVal < smallestVal) {
                smallest = rightChild;
              }
            }

            if (smallest !== i) {
              [topItems[i], topItems[smallest]] = [
                topItems[smallest],
                topItems[i],
              ];
              i = smallest;
            } else {
              break;
            }
          }
        }
      }
    }

    // Sort final results in descending order
    topItems.sort((a, b) => {
      const aVal = typeof a[sortKey] === "number" ? (a[sortKey] as number) : 0;
      const bVal = typeof b[sortKey] === "number" ? (b[sortKey] as number) : 0;
      return bVal - aVal;
    });

    return topItems;
  },

  /**
   * Debounce function calls to prevent excessive re-renders
   */
  createSmartDebounce: <T extends (...args: any[]) => any>(
    func: T,
    wait: number,
    options: {
      leading?: boolean;
      trailing?: boolean;
      maxWait?: number;
    } = {}
  ): T & { cancel: () => void; flush: () => void } => {
    const { leading = false, trailing = true, maxWait } = options;

    let timeoutId: NodeJS.Timeout | undefined;
    let maxTimeoutId: NodeJS.Timeout | undefined;
    let lastCallTime: number | undefined;
    let lastInvokeTime = 0;
    let lastArgs: Parameters<T>;
    let lastThis: any;
    let result: ReturnType<T>;

    function invokeFunc(time: number) {
      const args = lastArgs;
      const thisArg = lastThis;

      lastArgs = undefined as any;
      lastThis = undefined;
      lastInvokeTime = time;
      result = func.apply(thisArg, args);
      return result;
    }

    function leadingEdge(time: number) {
      lastInvokeTime = time;
      timeoutId = setTimeout(timerExpired, wait);
      return leading ? invokeFunc(time) : result;
    }

    function remainingWait(time: number) {
      const timeSinceLastCall = time - (lastCallTime || 0);
      const timeSinceLastInvoke = time - lastInvokeTime;
      const timeWaiting = wait - timeSinceLastCall;

      return maxWait !== undefined
        ? Math.min(timeWaiting, maxWait - timeSinceLastInvoke)
        : timeWaiting;
    }

    function shouldInvoke(time: number) {
      const timeSinceLastCall = time - (lastCallTime || 0);
      const timeSinceLastInvoke = time - lastInvokeTime;

      return (
        lastCallTime === undefined ||
        timeSinceLastCall >= wait ||
        timeSinceLastCall < 0 ||
        (maxWait !== undefined && timeSinceLastInvoke >= maxWait)
      );
    }

    function timerExpired() {
      const time = Date.now();
      if (shouldInvoke(time)) {
        return trailingEdge(time);
      }
      timeoutId = setTimeout(timerExpired, remainingWait(time));
    }

    function trailingEdge(time: number) {
      timeoutId = undefined;

      if (trailing && lastArgs) {
        return invokeFunc(time);
      }
      lastArgs = undefined as any;
      lastThis = undefined;
      return result;
    }

    function cancel() {
      if (timeoutId !== undefined) {
        clearTimeout(timeoutId);
      }
      if (maxTimeoutId !== undefined) {
        clearTimeout(maxTimeoutId);
      }
      lastInvokeTime = 0;
      lastArgs = undefined as any;
      lastCallTime = undefined;
      lastThis = undefined;
      timeoutId = undefined;
      maxTimeoutId = undefined;
    }

    function flush() {
      return timeoutId === undefined ? result : trailingEdge(Date.now());
    }

    function debounced(...args: Parameters<T>): ReturnType<T> {
      const time = Date.now();
      const isInvoking = shouldInvoke(time);

      lastArgs = args;
      lastThis = this;
      lastCallTime = time;

      if (isInvoking) {
        if (timeoutId === undefined) {
          return leadingEdge(lastCallTime);
        }
        if (maxWait !== undefined) {
          timeoutId = setTimeout(timerExpired, wait);
          return invokeFunc(lastCallTime);
        }
      }
      if (timeoutId === undefined) {
        timeoutId = setTimeout(timerExpired, wait);
      }
      return result;
    }

    debounced.cancel = cancel;
    debounced.flush = flush;
    return debounced as T & { cancel: () => void; flush: () => void };
  },
};
