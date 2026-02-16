/**
 * Chart animation optimizer for smooth simulate mode transitions
 * Handles animation timing, easing, and performance optimization
 */

import React from 'react';

interface AnimationConfig {
  duration: number;
  easing: string;
  delay: number;
  stagger: number;
}

interface ChartAnimationOptions {
  simulateMode: boolean;
  dataLength: number;
  performanceMode: 'auto' | 'performance' | 'quality';
  previousMode?: boolean;
  enableTransitions?: boolean;
}

class ChartAnimationOptimizer {
  private animationCache = new Map<string, AnimationConfig>();
  private transitionQueue: Array<() => void> = [];
  private isTransitioning = false;

  /**
   * Get optimized animation configuration based on context with enhanced performance detection
   */
  getAnimationConfig(options: ChartAnimationOptions): AnimationConfig {
    const {
      simulateMode,
      dataLength,
      performanceMode,
      previousMode,
      enableTransitions = true,
    } = options;

    const cacheKey = `${simulateMode}-${dataLength}-${performanceMode}`;

    // Check cache first
    if (this.animationCache.has(cacheKey)) {
      return this.animationCache.get(cacheKey)!;
    }

    let config: AnimationConfig;

    // Determine if this is a mode transition
    const isModeTransition =
      previousMode !== undefined && previousMode !== simulateMode;

    // Enhanced performance detection
    const isLowPerformanceDevice = this.detectLowPerformanceDevice();
    const shouldReduceAnimations =
      performanceMode === 'performance' ||
      dataLength > 50 ||
      isLowPerformanceDevice;

    if (shouldReduceAnimations) {
      // High performance mode - minimal animations
      config = {
        duration: 0,
        easing: 'linear',
        delay: 0,
        stagger: 0,
      };
    } else if (isModeTransition && enableTransitions) {
      // Mode transition - smooth but fast with adaptive timing
      const baseDuration = simulateMode ? 180 : 280;
      const adaptiveDuration = Math.max(100, baseDuration - dataLength * 2);

      config = {
        duration: adaptiveDuration,
        easing: 'cubic-bezier(0.4, 0, 0.2, 1)', // Material design easing
        delay: 0,
        stagger: Math.min(15, Math.max(5, 800 / dataLength)), // Adaptive stagger
      };
    } else if (simulateMode) {
      // Simulate mode - reduced animations for clarity with adaptive timing
      config = {
        duration: Math.max(100, 150 - dataLength * 1.5),
        easing: 'ease-out',
        delay: 0,
        stagger: Math.max(5, 15 - dataLength * 0.2),
      };
    } else {
      // Normal mode - full animations with adaptive timing
      const baseDuration = dataLength > 20 ? 180 : 280;
      config = {
        duration: Math.max(150, baseDuration - dataLength * 1.5),
        easing: 'ease-out',
        delay: 0,
        stagger: Math.min(25, Math.max(8, 1200 / dataLength)),
      };
    }

    // Cache the configuration with size limit
    if (this.animationCache.size > 50) {
      // Clear oldest entries when cache gets too large
      const firstKey = this.animationCache.keys().next().value;
      this.animationCache.delete(firstKey);
    }

    this.animationCache.set(cacheKey, config);

    return config;
  }

  /**
   * Detect low performance devices for animation optimization
   */
  private detectLowPerformanceDevice(): boolean {
    if (typeof navigator === 'undefined') return false;

    // Check for low-end device indicators
    const connection = (navigator as any).connection;
    const hardwareConcurrency = navigator.hardwareConcurrency || 4;
    const deviceMemory = (navigator as any).deviceMemory;

    // Consider device low-performance if:
    // - Less than 4 CPU cores
    // - Less than 4GB RAM (if available)
    // - Slow network connection
    const isLowCPU = hardwareConcurrency < 4;
    const isLowMemory = deviceMemory && deviceMemory < 4;
    const isSlowConnection =
      connection &&
      (connection.effectiveType === 'slow-2g' ||
        connection.effectiveType === '2g');

    return isLowCPU || isLowMemory || isSlowConnection;
  }

  /**
   * Create smooth transition between simulate and actual modes
   */
  createModeTransition(
    fromSimulate: boolean,
    toSimulate: boolean,
    onTransitionComplete?: () => void
  ): {
    exitAnimation: AnimationConfig;
    enterAnimation: AnimationConfig;
    totalDuration: number;
  } {
    const exitDuration = 150; // Quick exit
    const enterDuration = 250; // Smooth enter
    const gap = 50; // Small gap between animations

    const exitAnimation: AnimationConfig = {
      duration: exitDuration,
      easing: 'ease-in',
      delay: 0,
      stagger: 5,
    };

    const enterAnimation: AnimationConfig = {
      duration: enterDuration,
      easing: 'ease-out',
      delay: exitDuration + gap,
      stagger: 8,
    };

    const totalDuration = exitDuration + gap + enterDuration;

    // Schedule transition completion callback
    if (onTransitionComplete) {
      setTimeout(onTransitionComplete, totalDuration);
    }

    return {
      exitAnimation,
      enterAnimation,
      totalDuration,
    };
  }

  /**
   * Queue animation to prevent overlapping transitions
   */
  queueAnimation(animationFn: () => void): void {
    this.transitionQueue.push(animationFn);
    this.processQueue();
  }

  /**
   * Process animation queue sequentially
   */
  private async processQueue(): Promise<void> {
    if (this.isTransitioning || this.transitionQueue.length === 0) {
      return;
    }

    this.isTransitioning = true;

    while (this.transitionQueue.length > 0) {
      const animationFn = this.transitionQueue.shift()!;

      try {
        await new Promise<void>((resolve) => {
          animationFn();
          // Wait for animation to complete
          setTimeout(resolve, 300); // Max animation duration
        });
      } catch (error) {
        console.warn('Animation failed:', error);
      }
    }

    this.isTransitioning = false;
  }

  /**
   * Create staggered animation delays for chart elements
   */
  createStaggeredDelays(
    itemCount: number,
    baseDelay: number = 0,
    staggerAmount: number = 20
  ): number[] {
    const delays: number[] = [];

    for (let i = 0; i < itemCount; i++) {
      // Use easing function for more natural stagger
      const progress = i / Math.max(itemCount - 1, 1);
      const easedProgress = this.easeOutCubic(progress);
      delays.push(baseDelay + easedProgress * staggerAmount * itemCount);
    }

    return delays;
  }

  /**
   * Easing function for smooth animations
   */
  private easeOutCubic(t: number): number {
    return 1 - Math.pow(1 - t, 3);
  }

  /**
   * Get CSS animation properties for chart elements
   */
  getCSSAnimationProps(
    config: AnimationConfig,
    index: number = 0
  ): React.CSSProperties {
    return {
      animationDuration: `${config.duration}ms`,
      animationTimingFunction: config.easing,
      animationDelay: `${config.delay + index * config.stagger}ms`,
      animationFillMode: 'both',
    };
  }

  /**
   * Create optimized Recharts animation props
   */
  getRechartsAnimationProps(
    options: ChartAnimationOptions,
    elementIndex: number = 0
  ): {
    animationBegin: number;
    animationDuration: number;
    animationEasing: string;
    isAnimationActive: boolean;
  } {
    const config = this.getAnimationConfig(options);

    return {
      animationBegin: config.delay + elementIndex * config.stagger,
      animationDuration: config.duration,
      animationEasing: config.easing,
      isAnimationActive: config.duration > 0,
    };
  }

  /**
   * Clear animation cache to free memory
   */
  clearCache(): void {
    this.animationCache.clear();
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): {
    size: number;
    isTransitioning: boolean;
    queueLength: number;
  } {
    return {
      size: this.animationCache.size,
      isTransitioning: this.isTransitioning,
      queueLength: this.transitionQueue.length,
    };
  }
}

// Create singleton instance
export const chartAnimationOptimizer = new ChartAnimationOptimizer();

/**
 * React hook for chart animation optimization
 */
export function useChartAnimationOptimization(
  simulateMode: boolean,
  dataLength: number,
  options: {
    performanceMode?: 'auto' | 'performance' | 'quality';
    enableTransitions?: boolean;
    onTransitionComplete?: () => void;
  } = {}
) {
  const {
    performanceMode = 'auto',
    enableTransitions = true,
    onTransitionComplete,
  } = options;

  const previousModeRef = React.useRef<boolean>(simulateMode);
  const [isTransitioning, setIsTransitioning] = React.useState(false);

  // Detect mode changes
  const isModeTransition = previousModeRef.current !== simulateMode;

  React.useEffect(() => {
    if (isModeTransition) {
      setIsTransitioning(true);

      const transition = chartAnimationOptimizer.createModeTransition(
        previousModeRef.current,
        simulateMode,
        () => {
          setIsTransitioning(false);
          onTransitionComplete?.();
        }
      );

      // Update previous mode reference
      previousModeRef.current = simulateMode;
    }
  }, [simulateMode, isModeTransition, onTransitionComplete]);

  // Get animation configuration
  const animationConfig = React.useMemo(() => {
    return chartAnimationOptimizer.getAnimationConfig({
      simulateMode,
      dataLength,
      performanceMode,
      previousMode: isModeTransition ? previousModeRef.current : undefined,
      enableTransitions,
    });
  }, [
    simulateMode,
    dataLength,
    performanceMode,
    isModeTransition,
    enableTransitions,
  ]);

  // Get Recharts animation props
  const getRechartsProps = React.useCallback(
    (elementIndex: number = 0) => {
      return chartAnimationOptimizer.getRechartsAnimationProps(
        {
          simulateMode,
          dataLength,
          performanceMode,
          previousMode: isModeTransition ? previousModeRef.current : undefined,
          enableTransitions,
        },
        elementIndex
      );
    },
    [
      simulateMode,
      dataLength,
      performanceMode,
      isModeTransition,
      enableTransitions,
    ]
  );

  // Create staggered delays
  const createStaggeredDelays = React.useCallback(
    (itemCount: number) => {
      return chartAnimationOptimizer.createStaggeredDelays(
        itemCount,
        animationConfig.delay,
        animationConfig.stagger
      );
    },
    [animationConfig]
  );

  return {
    animationConfig,
    isTransitioning,
    isModeTransition,
    getRechartsProps,
    createStaggeredDelays,
    queueAnimation: chartAnimationOptimizer.queueAnimation.bind(
      chartAnimationOptimizer
    ),
  };
}

/**
 * Advanced performance monitoring for chart animations
 */
export class AnimationPerformanceMonitor {
  private performanceEntries: PerformanceEntry[] = [];
  private animationMetrics = new Map<
    string,
    {
      count: number;
      totalDuration: number;
      averageDuration: number;
      lastPerformance: number;
    }
  >();

  /**
   * Start monitoring an animation
   */
  startAnimation(animationId: string): void {
    performance.mark(`animation-start-${animationId}`);
  }

  /**
   * End monitoring an animation
   */
  endAnimation(animationId: string): void {
    performance.mark(`animation-end-${animationId}`);
    performance.measure(
      `animation-${animationId}`,
      `animation-start-${animationId}`,
      `animation-end-${animationId}`
    );

    // Update metrics
    const entries = performance.getEntriesByName(`animation-${animationId}`);
    if (entries.length > 0) {
      const entry = entries[entries.length - 1];
      const existing = this.animationMetrics.get(animationId) || {
        count: 0,
        totalDuration: 0,
        averageDuration: 0,
        lastPerformance: 0,
      };

      existing.count++;
      existing.totalDuration += entry.duration;
      existing.averageDuration = existing.totalDuration / existing.count;
      existing.lastPerformance = entry.duration;

      this.animationMetrics.set(animationId, existing);
    }
  }

  /**
   * Get performance metrics for an animation
   */
  getMetrics(animationId: string) {
    return this.animationMetrics.get(animationId);
  }

  /**
   * Get all performance metrics
   */
  getAllMetrics() {
    return Object.fromEntries(this.animationMetrics);
  }

  /**
   * Clear performance data
   */
  clear(): void {
    this.animationMetrics.clear();
    // Clear performance entries
    performance.clearMarks();
    performance.clearMeasures();
  }

  /**
   * Get performance recommendations
   */
  getRecommendations(): string[] {
    const recommendations: string[] = [];

    for (const [animationId, metrics] of this.animationMetrics) {
      if (metrics.averageDuration > 16.67) {
        // 60fps threshold
        recommendations.push(
          `Animation "${animationId}" is running below 60fps (avg: ${metrics.averageDuration.toFixed(
            2
          )}ms)`
        );
      }

      if (metrics.lastPerformance > 33.33) {
        // 30fps threshold
        recommendations.push(
          `Animation "${animationId}" last performance was poor (${metrics.lastPerformance.toFixed(
            2
          )}ms)`
        );
      }
    }

    return recommendations;
  }
}

// Create singleton instance
export const animationPerformanceMonitor = new AnimationPerformanceMonitor();

// Export types
export type { AnimationConfig, ChartAnimationOptions };
