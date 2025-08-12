"use client";

import React, { memo, useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Activity, BarChart3, Clock, Zap } from "lucide-react";

interface PerformanceMetrics {
  renderCount: number;
  lastRenderTime: number;
  averageRenderTime: number;
  cacheHitRate: number;
  memoryUsage?: number;
  performanceGrade?: string;
}

interface PerformanceMonitorProps {
  metrics: PerformanceMetrics;
  isVisible?: boolean;
  onToggle?: () => void;
  projectionMode?: boolean;
}

export const PerformanceMonitor = memo<PerformanceMonitorProps>(
  ({ metrics, isVisible = false, onToggle, projectionMode = false }) => {
    const [isExpanded, setIsExpanded] = useState(false);

    if (!isVisible) {
      return (
        <Button
          variant="outline"
          size="sm"
          onClick={onToggle}
          className="fixed bottom-4 right-4 z-50 opacity-70 hover:opacity-100"
        >
          <Activity className="h-4 w-4" />
        </Button>
      );
    }

    const getGradeColor = (grade?: string) => {
      switch (grade) {
        case "A":
          return "bg-green-500";
        case "B":
          return "bg-blue-500";
        case "C":
          return "bg-yellow-500";
        case "D":
          return "bg-red-500";
        default:
          return "bg-gray-500";
      }
    };

    const formatTime = (ms: number) => {
      if (ms < 1) return "<1ms";
      return `${ms.toFixed(1)}ms`;
    };

    const formatPercentage = (value: number) => {
      return `${(value * 100).toFixed(1)}%`;
    };

    return (
      <Card className="fixed bottom-4 right-4 z-50 w-80 shadow-lg">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm flex items-center gap-2">
              <Activity className="h-4 w-4" />
              Performance Monitor
              {projectionMode && (
                <Badge variant="secondary" className="text-xs">
                  Projection Mode
                </Badge>
              )}
            </CardTitle>
            <div className="flex items-center gap-2">
              {metrics.performanceGrade && (
                <Badge
                  className={`text-white ${getGradeColor(
                    metrics.performanceGrade
                  )}`}
                >
                  {metrics.performanceGrade}
                </Badge>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsExpanded(!isExpanded)}
              >
                {isExpanded ? "−" : "+"}
              </Button>
              <Button variant="ghost" size="sm" onClick={onToggle}>
                ×
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="pt-0">
          <div className="space-y-2 text-sm">
            {/* Core metrics - always visible */}
            <div className="flex justify-between items-center">
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                Last Render:
              </span>
              <span className="font-mono">
                {formatTime(metrics.lastRenderTime)}
              </span>
            </div>

            <div className="flex justify-between items-center">
              <span className="flex items-center gap-1">
                <BarChart3 className="h-3 w-3" />
                Cache Hit Rate:
              </span>
              <span className="font-mono">
                {formatPercentage(metrics.cacheHitRate)}
              </span>
            </div>

            {/* Expanded metrics */}
            {isExpanded && (
              <>
                <hr className="my-2" />

                <div className="flex justify-between items-center">
                  <span>Render Count:</span>
                  <span className="font-mono">{metrics.renderCount}</span>
                </div>

                <div className="flex justify-between items-center">
                  <span>Avg Render Time:</span>
                  <span className="font-mono">
                    {formatTime(metrics.averageRenderTime)}
                  </span>
                </div>

                {metrics.memoryUsage !== undefined && (
                  <div className="flex justify-between items-center">
                    <span>Memory Usage:</span>
                    <span className="font-mono">
                      {(metrics.memoryUsage / 1024 / 1024).toFixed(1)}MB
                    </span>
                  </div>
                )}

                {/* Performance tips */}
                <div className="mt-3 p-2 bg-muted rounded text-xs">
                  <div className="flex items-center gap-1 mb-1">
                    <Zap className="h-3 w-3" />
                    <span className="font-medium">Tips:</span>
                  </div>
                  {metrics.lastRenderTime > 100 && (
                    <div>
                      • Consider reducing data size or enabling performance mode
                    </div>
                  )}
                  {metrics.cacheHitRate < 0.5 && (
                    <div>
                      • Low cache hit rate - data might be changing frequently
                    </div>
                  )}
                  {projectionMode && (
                    <div>
                      • Projection mode optimizes animations for better
                      performance
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }
);

PerformanceMonitor.displayName = "PerformanceMonitor";

/**
 * Hook for managing performance monitor visibility
 */
export function usePerformanceMonitor() {
  const [isVisible, setIsVisible] = useState(false);
  const [isDevelopment, setIsDevelopment] = useState(false);

  useEffect(() => {
    // Only show in development or when explicitly enabled
    setIsDevelopment(process.env.NODE_ENV === "development");
  }, []);

  const toggle = () => setIsVisible(!isVisible);
  const show = () => setIsVisible(true);
  const hide = () => setIsVisible(false);

  return {
    isVisible: isVisible && isDevelopment,
    toggle,
    show,
    hide,
  };
}
