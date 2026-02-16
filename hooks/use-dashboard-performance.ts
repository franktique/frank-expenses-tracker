/**
 * Performance optimization hook for dashboard components
 * Handles memoization, caching, and memory management
 */

import { useCallback, useEffect, useMemo, useRef } from 'react';
import {
  budgetDataCache,
  withBudgetCache,
  preloadBudgetData,
  startBudgetCacheCleanup,
  handleMemoryPressure,
  type CacheKey,
} from '@/lib/budget-data-cache';
import { memoryEfficientUtils } from '@/lib/memory-management';

interface DashboardPerformanceOptions {
  enableCaching?: boolean;
  enablePreloading?: boolean;
  cacheCleanupInterval?: number;
  memoryPressureThreshold?: number;
}

interface PerformanceMetrics {
  renderCount: number;
  lastRenderTime: number;
  averageRenderTime: number;
  cacheHitRate: number;
}

export function useDashboardPerformance(
  options: DashboardPerformanceOptions = {}
) {
  const {
    enableCaching = true,
    enablePreloading = true,
    cacheCleanupInterval = 10 * 60 * 1000, // 10 minutes
    memoryPressureThreshold = 50 * 1024 * 1024, // 50MB
  } = options;

  // Performance tracking
  const metricsRef = useRef<PerformanceMetrics>({
    renderCount: 0,
    lastRenderTime: 0,
    averageRenderTime: 0,
    cacheHitRate: 0,
  });

  const renderStartTimeRef = useRef<number>(0);
  const cleanupFunctionRef = useRef<(() => void) | null>(null);

  // Track render performance
  const startRenderTracking = useCallback(() => {
    renderStartTimeRef.current = performance.now();
  }, []);

  const endRenderTracking = useCallback(() => {
    const renderTime = performance.now() - renderStartTimeRef.current;
    const metrics = metricsRef.current;

    metrics.renderCount++;
    metrics.lastRenderTime = renderTime;
    metrics.averageRenderTime =
      (metrics.averageRenderTime * (metrics.renderCount - 1) + renderTime) /
      metrics.renderCount;
  }, []);

  // Memoized fetch function with caching
  const createCachedFetch = useCallback(
    <T>(fetchFunction: (key: CacheKey) => Promise<T>, customTTL?: number) => {
      if (!enableCaching) {
        return fetchFunction;
      }
      return withBudgetCache(fetchFunction, customTTL);
    },
    [enableCaching]
  );

  // Preload data for common scenarios
  const preloadData = useCallback(
    async (
      periodId: string,
      estudioId?: number | null,
      fetchFunction?: (key: CacheKey) => Promise<any>
    ) => {
      if (!enablePreloading || !fetchFunction) return;

      await preloadBudgetData(periodId, estudioId, fetchFunction);
    },
    [enablePreloading]
  );

  // Memory pressure detection and handling
  const checkMemoryPressure = useCallback(() => {
    if ('memory' in performance && (performance as any).memory) {
      const memInfo = (performance as any).memory;
      const usedMemory = memInfo.usedJSHeapSize;

      if (usedMemory > memoryPressureThreshold) {
        console.warn('Memory pressure detected, clearing cache');
        handleMemoryPressure();
        return true;
      }
    }
    return false;
  }, [memoryPressureThreshold]);

  // Optimized data transformation with memoization
  const createMemoizedTransform = useCallback(
    <T, R>(
      transformFunction: (data: T, ...args: any[]) => R,
      dependencies: any[]
    ) => {
      return useMemo(() => transformFunction, dependencies);
    },
    []
  );

  // Debounced function creator for expensive operations
  const createDebouncedFunction = useCallback(
    <T extends (...args: any[]) => any>(func: T, delay: number): T => {
      let timeoutId: NodeJS.Timeout;

      return ((...args: Parameters<T>) => {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => func(...args), delay);
      }) as T;
    },
    []
  );

  // Throttled function creator for frequent operations
  const createThrottledFunction = useCallback(
    <T extends (...args: any[]) => any>(func: T, limit: number): T => {
      let inThrottle: boolean;

      return ((...args: Parameters<T>) => {
        if (!inThrottle) {
          func(...args);
          inThrottle = true;
          setTimeout(() => (inThrottle = false), limit);
        }
      }) as T;
    },
    []
  );

  // Chart animation optimization
  const getOptimizedAnimationConfig = useCallback(
    (isSimulateMode: boolean, dataLength: number) => {
      // Reduce animations for large datasets or in simulate mode for better performance
      const shouldAnimate = dataLength < 20 && !isSimulateMode;

      return {
        animationBegin: 0,
        animationDuration: shouldAnimate ? 300 : 0,
        animationEasing: 'ease-out',
        isAnimationActive: shouldAnimate,
      };
    },
    []
  );

  // Optimized color generation with memoization
  const createOptimizedColorGenerator = useCallback((colors: string[]) => {
    const colorCache = new Map<number, string>();

    return (index: number): string => {
      if (colorCache.has(index)) {
        return colorCache.get(index)!;
      }

      const color = colors[index % colors.length];
      colorCache.set(index, color);
      return color;
    };
  }, []);

  // Setup cache cleanup and memory monitoring
  useEffect(() => {
    if (enableCaching) {
      // Start cache cleanup
      cleanupFunctionRef.current =
        startBudgetCacheCleanup(cacheCleanupInterval);

      // Setup memory pressure monitoring
      const memoryCheckInterval = setInterval(() => {
        checkMemoryPressure();
      }, 30000); // Check every 30 seconds

      return () => {
        if (cleanupFunctionRef.current) {
          cleanupFunctionRef.current();
        }
        clearInterval(memoryCheckInterval);
      };
    }
  }, [enableCaching, cacheCleanupInterval, checkMemoryPressure]);

  // Performance monitoring effect
  useEffect(() => {
    const observer = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      entries.forEach((entry) => {
        if (entry.entryType === 'measure' && entry.name.includes('dashboard')) {
          console.log(
            `Dashboard performance: ${entry.name} took ${entry.duration}ms`
          );
        }
      });
    });

    observer.observe({ entryTypes: ['measure'] });

    return () => observer.disconnect();
  }, []);

  // Get current performance metrics
  const getPerformanceMetrics = useCallback((): PerformanceMetrics => {
    const cacheStats = budgetDataCache.getStats();
    return {
      ...metricsRef.current,
      cacheHitRate:
        cacheStats.size > 0 ? cacheStats.validEntries / cacheStats.size : 0,
    };
  }, []);

  // Clear all performance data
  const clearPerformanceData = useCallback(() => {
    metricsRef.current = {
      renderCount: 0,
      lastRenderTime: 0,
      averageRenderTime: 0,
      cacheHitRate: 0,
    };
    budgetDataCache.clear();
  }, []);

  return {
    // Performance tracking
    startRenderTracking,
    endRenderTracking,
    getPerformanceMetrics,
    clearPerformanceData,

    // Caching utilities
    createCachedFetch,
    preloadData,
    checkMemoryPressure,

    // Optimization utilities
    createMemoizedTransform,
    createDebouncedFunction,
    createThrottledFunction,
    getOptimizedAnimationConfig,
    createOptimizedColorGenerator,

    // Cache management
    cache: budgetDataCache,
  };
}

// Hook for optimizing chart re-renders
export function useChartOptimization(
  data: any[],
  simulateMode: boolean,
  dependencies: any[] = []
) {
  // Memoize chart data to prevent unnecessary re-renders
  const memoizedData = useMemo(() => data, [data, ...dependencies]);

  // Memoize chart configuration based on simulate mode
  const chartConfig = useMemo(
    () => ({
      animationBegin: 0,
      animationDuration: simulateMode ? 150 : 300, // Faster animations in simulate mode
      animationEasing: 'ease-out',
      isAnimationActive: data.length < 50, // Disable animations for large datasets
    }),
    [simulateMode, data.length]
  );

  // Memoize color calculations
  const colorConfig = useMemo(() => {
    const baseColors = [
      '#8884d8',
      '#83a6ed',
      '#8dd1e1',
      '#82ca9d',
      '#a4de6c',
      '#d0ed57',
      '#ffc658',
      '#ff8042',
      '#ff6361',
      '#bc5090',
    ];

    return {
      colors: baseColors,
      getColor: (index: number) => baseColors[index % baseColors.length],
      getSimulateColor: (index: number, opacity = 0.7) =>
        `${baseColors[index % baseColors.length]}${Math.floor(opacity * 255)
          .toString(16)
          .padStart(2, '0')}`,
    };
  }, []);

  return {
    memoizedData,
    chartConfig,
    colorConfig,
  };
}

// Hook for managing simulate mode state with performance optimizations
export function useSimulateModeOptimization(
  initialMode: boolean = false,
  onModeChange?: (mode: boolean) => void
) {
  const modeChangeTimeoutRef = useRef<NodeJS.Timeout>();
  const lastModeRef = useRef<boolean>(initialMode);
  const transitionStartRef = useRef<number>(0);

  // Enhanced debounced mode change with transition tracking
  const debouncedModeChange = useCallback(
    (mode: boolean) => {
      // Skip if mode hasn't actually changed
      if (lastModeRef.current === mode) {
        return;
      }

      // Track transition start time for performance monitoring
      transitionStartRef.current = performance.now();

      if (modeChangeTimeoutRef.current) {
        clearTimeout(modeChangeTimeoutRef.current);
      }

      modeChangeTimeoutRef.current = setTimeout(() => {
        lastModeRef.current = mode;
        onModeChange?.(mode);

        // Log transition performance
        const transitionTime = performance.now() - transitionStartRef.current;
        if (transitionTime > 100) {
          console.warn(
            `Simulate mode transition took ${transitionTime.toFixed(2)}ms`
          );
        }
      }, 100); // 100ms debounce
    },
    [onModeChange]
  );

  // Immediate mode change for critical updates
  const immediateModeChange = useCallback(
    (mode: boolean) => {
      if (modeChangeTimeoutRef.current) {
        clearTimeout(modeChangeTimeoutRef.current);
      }
      lastModeRef.current = mode;
      onModeChange?.(mode);
    },
    [onModeChange]
  );

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (modeChangeTimeoutRef.current) {
        clearTimeout(modeChangeTimeoutRef.current);
      }
    };
  }, []);

  return {
    debouncedModeChange,
    immediateModeChange,
    getCurrentMode: () => lastModeRef.current,
  };
}

// Hook for optimizing data transformations
export function useDataTransformationOptimization<T, R>(
  data: T[],
  transformFunction: (data: T[]) => R[],
  dependencies: any[] = []
) {
  // Memoize transformation result
  const transformedData = useMemo(() => {
    const startTime = performance.now();
    const result = transformFunction(data);
    const endTime = performance.now();

    // Log slow transformations
    if (endTime - startTime > 50) {
      console.warn(
        `Data transformation took ${(endTime - startTime).toFixed(2)}ms for ${
          data.length
        } items`
      );
    }

    return result;
  }, [data, ...dependencies]);

  // Track transformation performance
  const transformationStats = useMemo(() => {
    return {
      inputSize: data.length,
      outputSize: transformedData.length,
      compressionRatio:
        data.length > 0 ? transformedData.length / data.length : 0,
    };
  }, [data.length, transformedData.length]);

  return {
    transformedData,
    transformationStats,
  };
}

// Hook for managing chart render cycles with advanced optimization
export function useChartRenderOptimization(
  chartData: any[],
  simulateMode: boolean,
  options: {
    maxRenderItems?: number;
    enableVirtualization?: boolean;
    animationThreshold?: number;
    enableSmartAggregation?: boolean;
    performanceMode?: 'auto' | 'performance' | 'quality';
  } = {}
) {
  const {
    maxRenderItems = 50,
    enableVirtualization = true,
    animationThreshold = 20,
    enableSmartAggregation = true,
    performanceMode = 'auto',
  } = options;

  const renderCountRef = useRef(0);
  const lastRenderTimeRef = useRef(0);
  const performanceHistoryRef = useRef<number[]>([]);
  const adaptiveThresholdRef = useRef(maxRenderItems);

  // Adaptive performance monitoring
  const updatePerformanceHistory = useCallback(
    (renderTime: number) => {
      performanceHistoryRef.current.push(renderTime);

      // Keep only last 10 render times
      if (performanceHistoryRef.current.length > 10) {
        performanceHistoryRef.current.shift();
      }

      // Adjust adaptive threshold based on performance
      const avgRenderTime =
        performanceHistoryRef.current.reduce((a, b) => a + b, 0) /
        performanceHistoryRef.current.length;

      if (avgRenderTime > 200) {
        // Slow rendering
        adaptiveThresholdRef.current = Math.max(
          20,
          adaptiveThresholdRef.current - 5
        );
      } else if (avgRenderTime < 50) {
        // Fast rendering
        adaptiveThresholdRef.current = Math.min(
          maxRenderItems,
          adaptiveThresholdRef.current + 5
        );
      }
    },
    [maxRenderItems]
  );

  // Optimize chart data for rendering with advanced strategies
  const optimizedChartData = useMemo(() => {
    renderCountRef.current++;
    const startTime = performance.now();

    let processedData = chartData;
    const effectiveMaxItems =
      performanceMode === 'performance'
        ? Math.min(adaptiveThresholdRef.current, maxRenderItems)
        : maxRenderItems;

    // Apply different optimization strategies based on performance mode
    if (enableVirtualization && chartData.length > effectiveMaxItems) {
      if (enableSmartAggregation && performanceMode !== 'quality') {
        // Use smart aggregation from memory management utils
        processedData = memoryEfficientUtils.optimizeChartData(
          chartData,
          effectiveMaxItems,
          {
            enableAggregation: true,
            aggregationThreshold: 0.02, // 2% threshold
          }
        );
      } else {
        // Simple truncation for quality mode
        processedData = [...chartData]
          .sort(
            (a, b) =>
              (b.total_amount || b.amount || 0) -
              (a.total_amount || a.amount || 0)
          )
          .slice(0, effectiveMaxItems);
      }
    }

    const endTime = performance.now();
    const renderTime = endTime - startTime;
    lastRenderTimeRef.current = renderTime;

    // Update performance history for adaptive optimization
    updatePerformanceHistory(renderTime);

    return processedData;
  }, [
    chartData,
    maxRenderItems,
    enableVirtualization,
    enableSmartAggregation,
    performanceMode,
    updatePerformanceHistory,
  ]);

  // Advanced animation decision logic
  const shouldAnimate = useMemo(() => {
    const avgRenderTime =
      performanceHistoryRef.current.length > 0
        ? performanceHistoryRef.current.reduce((a, b) => a + b, 0) /
          performanceHistoryRef.current.length
        : 0;

    // Don't animate in simulate mode for smoother transitions
    if (simulateMode) return false;

    // Don't animate if performance is poor
    if (avgRenderTime > 150) return false;

    // Don't animate large datasets
    if (optimizedChartData.length > animationThreshold) return false;

    // Don't animate if last render was slow
    if (lastRenderTimeRef.current > 100) return false;

    return performanceMode !== 'performance';
  }, [
    simulateMode,
    optimizedChartData.length,
    animationThreshold,
    performanceMode,
  ]);

  // Enhanced chart configuration with adaptive settings
  const chartConfig = useMemo(() => {
    const baseConfig = {
      animationBegin: 0,
      animationDuration: shouldAnimate ? (simulateMode ? 100 : 250) : 0,
      animationEasing: 'ease-out',
      isAnimationActive: shouldAnimate,
      // Reduce re-renders by disabling unnecessary features for large datasets
      syncId: optimizedChartData.length > 20 ? undefined : 'chart-sync',
    };

    // Add performance-specific optimizations
    if (performanceMode === 'performance') {
      return {
        ...baseConfig,
        animationDuration: 0,
        isAnimationActive: false,
        // Disable expensive features
        dot: false,
        connectNulls: false,
      };
    }

    return baseConfig;
  }, [shouldAnimate, simulateMode, optimizedChartData.length, performanceMode]);

  // Comprehensive performance metrics
  const performanceMetrics = useMemo(() => {
    const avgRenderTime =
      performanceHistoryRef.current.length > 0
        ? performanceHistoryRef.current.reduce((a, b) => a + b, 0) /
          performanceHistoryRef.current.length
        : 0;

    return {
      renderCount: renderCountRef.current,
      lastRenderTime: lastRenderTimeRef.current,
      averageRenderTime: avgRenderTime,
      dataReduction:
        chartData.length > 0
          ? (chartData.length - optimizedChartData.length) / chartData.length
          : 0,
      animationsEnabled: shouldAnimate,
      adaptiveThreshold: adaptiveThresholdRef.current,
      performanceMode,
      renderHistory: [...performanceHistoryRef.current],
    };
  }, [
    chartData.length,
    optimizedChartData.length,
    shouldAnimate,
    performanceMode,
  ]);

  // Performance grade calculation
  const performanceGrade = useMemo(() => {
    const avgRenderTime = performanceMetrics.averageRenderTime;

    if (avgRenderTime < 50) return 'A';
    if (avgRenderTime < 100) return 'B';
    if (avgRenderTime < 200) return 'C';
    return 'D';
  }, [performanceMetrics.averageRenderTime]);

  return {
    optimizedChartData,
    chartConfig,
    performanceMetrics,
    performanceGrade,
    shouldAnimate,
    adaptiveThreshold: adaptiveThresholdRef.current,
  };
}
