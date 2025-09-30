"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "@/components/ui/use-toast";
import {
  BarChart3,
  TrendingUp,
  RefreshCw,
  AlertCircle,
  Activity,
  Target,
  Zap,
} from "lucide-react";
import { formatCurrency } from "@/lib/utils";

// Import our simulation chart components
import {
  SimulationChart,
  SimulationComparisonChart,
} from "./simulation-chart-components";
import { SimulationPeriodComparisonChart } from "./simulation-period-comparison-chart";

// Import enhanced filter components
import { SimulationFilterManager } from "./simulation-filter-manager";

// Types for simulation analytics data
interface SimulationAnalyticsData {
  simulation_data: {
    simulation_id: number;
    simulation_name: string;
    grouper_data: Array<{
      grouper_id: number;
      grouper_name: string;
      simulation_total: number;
      historical_avg?: number;
      variance_percentage?: number;
      is_simulation: boolean;
    }>;
  };
  historical_data: Array<{
    grouper_id: number;
    grouper_name: string;
    period_id: number;
    period_name: string;
    total_amount: number;
  }>;
  comparison_metrics: Array<{
    grouper_id: number;
    grouper_name: string;
    avg_historical: number;
    simulation_amount: number;
    variance_percentage: number;
    trend: "increase" | "decrease" | "stable";
  }>;
  metadata: {
    estudio_id: number | null;
    grouper_ids: number[] | null;
    payment_methods: string[] | null;
    comparison_periods: number;
  };
}

interface EstudioData {
  id: number;
  name: string;
  grouper_count: number;
  created_at: string;
  updated_at: string;
}

interface GrouperData {
  grouper_id: number;
  grouper_name: string;
  total_amount: number;
  budget_amount?: number;
}

interface SimulationAnalyticsDashboardProps {
  simulationId: number;
  simulationName?: string;
  activePeriod?: { id: number; name: string } | null;
  // Filter state props (managed by parent)
  selectedEstudio: number | null;
  selectedGroupers: number[];
  selectedPaymentMethods: string[];
  comparisonPeriods: number;
  allEstudios: EstudioData[];
  allGroupers: GrouperData[];
  isLoadingFilters: boolean;
  // Filter handlers
  onEstudioChange: (estudioId: number | null) => void;
  onGroupersChange: (grouperIds: number[]) => void;
  onPaymentMethodsChange: (methods: string[]) => void;
  onComparisonPeriodsChange: (periods: number) => void;
  onFiltersChanged?: (filters: any) => void;
}

export function SimulationAnalyticsDashboard({
  simulationId,
  simulationName = "Simulación",
  activePeriod,
  // Filter state props
  selectedEstudio,
  selectedGroupers,
  selectedPaymentMethods,
  comparisonPeriods,
  allEstudios,
  allGroupers,
  isLoadingFilters,
  // Filter handlers
  onEstudioChange,
  onGroupersChange,
  onPaymentMethodsChange,
  onComparisonPeriodsChange,
  onFiltersChanged,
}: SimulationAnalyticsDashboardProps) {
  // State management
  const [analyticsData, setAnalyticsData] =
    useState<SimulationAnalyticsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Active tab state
  const [activeTab, setActiveTab] = useState<
    "overview" | "comparison" | "periods"
  >("overview");

  // Fetch simulation analytics data
  const fetchAnalyticsData = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const params = new URLSearchParams({
        comparisonPeriods: comparisonPeriods.toString(),
      });

      if (selectedEstudio) {
        params.append("estudioId", selectedEstudio.toString());
      }

      if (selectedGroupers.length > 0) {
        params.append("grouperIds", selectedGroupers.join(","));
      }

      if (
        selectedPaymentMethods.length > 0 &&
        selectedPaymentMethods.length < 2
      ) {
        params.append("paymentMethods", selectedPaymentMethods.join(","));
      }

      const response = await fetch(
        `/api/simulations/${simulationId}/analytics?${params.toString()}`
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.error || `Error ${response.status}: ${response.statusText}`
        );
      }

      const data = await response.json();
      setAnalyticsData(data);
    } catch (error) {
      console.error("Error fetching analytics data:", error);
      const errorMessage =
        error instanceof Error
          ? error.message
          : "Error al cargar datos de análisis";
      setError(errorMessage);

      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [
    simulationId,
    selectedEstudio,
    selectedGroupers,
    selectedPaymentMethods,
    comparisonPeriods,
  ]);

  // Fetch analytics data when filters change
  useEffect(() => {
    if (selectedEstudio) {
      fetchAnalyticsData();
    }
  }, [fetchAnalyticsData, selectedEstudio]);

  // Transform data for period comparison
  const periodComparisonData = useMemo(() => {
    if (!analyticsData) return { historical: [], simulation: null };

    // Group historical data by period
    const periodMap = new Map();
    analyticsData.historical_data.forEach((item) => {
      if (!periodMap.has(item.period_id)) {
        periodMap.set(item.period_id, {
          period_id: item.period_id,
          period_name: item.period_name,
          period_month: 0, // We don't have this data from the API
          period_year: 0, // We don't have this data from the API
          grouper_data: [],
        });
      }

      periodMap.get(item.period_id).grouper_data.push({
        grouper_id: item.grouper_id,
        grouper_name: item.grouper_name,
        total_amount: item.total_amount,
      });
    });

    const historical = Array.from(periodMap.values());

    // Transform simulation data
    const simulation = analyticsData.simulation_data
      ? {
          period_name: `${analyticsData.simulation_data.simulation_name} (Simulación)`,
          is_simulation: true,
          grouper_data: analyticsData.simulation_data.grouper_data.map(
            (item) => ({
              grouper_id: item.grouper_id,
              grouper_name: item.grouper_name,
              total_amount: item.simulation_total,
            })
          ),
        }
      : undefined;

    return { historical, simulation };
  }, [analyticsData]);

  // Calculate summary metrics
  const summaryMetrics = useMemo(() => {
    if (!analyticsData) return null;

    const totalSimulation = analyticsData.simulation_data.grouper_data.reduce(
      (sum, item) => sum + item.simulation_total,
      0
    );

    const totalHistoricalAvg = analyticsData.comparison_metrics.reduce(
      (sum, item) => sum + item.avg_historical,
      0
    );

    const significantVariations = analyticsData.comparison_metrics.filter(
      (item) => Math.abs(item.variance_percentage) > 10
    ).length;

    const overallVariance =
      totalHistoricalAvg > 0
        ? ((totalSimulation - totalHistoricalAvg) / totalHistoricalAvg) * 100
        : 0;

    return {
      totalSimulation,
      totalHistoricalAvg,
      significantVariations,
      overallVariance,
      grouperCount: analyticsData.simulation_data.grouper_data.length,
    };
  }, [analyticsData]);

  if (!activePeriod) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-[400px]">
          <div className="text-center">
            <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">
              No hay período activo seleccionado
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with simulation info and summary metrics */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Activity className="h-6 w-6 text-blue-600" />
            Análisis de {simulationName}
          </h1>
          <p className="text-muted-foreground">
            Comparación con datos históricos y análisis de variaciones
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchAnalyticsData}
            disabled={isLoading}
          >
            <RefreshCw
              className={`h-4 w-4 mr-2 ${isLoading ? "animate-spin" : ""}`}
            />
            Actualizar
          </Button>
          <Badge variant="outline" className="text-blue-600 border-blue-600">
            Simulación #{simulationId}
          </Badge>
        </div>
      </div>

      {/* Summary metrics cards */}
      {summaryMetrics && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Target className="h-4 w-4 text-blue-600" />
                <span className="text-sm font-medium">Total Simulación</span>
              </div>
              <p className="text-2xl font-bold text-blue-600 mt-1">
                {formatCurrency(summaryMetrics.totalSimulation)}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-gray-600" />
                <span className="text-sm font-medium">Promedio Histórico</span>
              </div>
              <p className="text-2xl font-bold text-gray-600 mt-1">
                {formatCurrency(summaryMetrics.totalHistoricalAvg)}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <TrendingUp
                  className={`h-4 w-4 ${
                    summaryMetrics.overallVariance > 0
                      ? "text-green-600"
                      : summaryMetrics.overallVariance < 0
                      ? "text-red-600"
                      : "text-gray-600"
                  }`}
                />
                <span className="text-sm font-medium">Variación Total</span>
              </div>
              <p
                className={`text-2xl font-bold mt-1 ${
                  summaryMetrics.overallVariance > 0
                    ? "text-green-600"
                    : summaryMetrics.overallVariance < 0
                    ? "text-red-600"
                    : "text-gray-600"
                }`}
              >
                {summaryMetrics.overallVariance > 0 ? "+" : ""}
                {summaryMetrics.overallVariance.toFixed(1)}%
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Zap className="h-4 w-4 text-amber-600" />
                <span className="text-sm font-medium">
                  Variaciones Significativas
                </span>
              </div>
              <p className="text-2xl font-bold text-amber-600 mt-1">
                {summaryMetrics.significantVariations}
              </p>
              <p className="text-xs text-muted-foreground">
                de {summaryMetrics.grouperCount} agrupadores
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Enhanced Filters with Simulation Context */}
      <SimulationFilterManager
        currentSimulationId={simulationId}
        allEstudios={allEstudios}
        allGroupers={allGroupers}
        allSimulations={[]} // Not needed for single simulation analysis
        selectedEstudio={selectedEstudio}
        selectedGroupers={selectedGroupers}
        selectedPaymentMethods={selectedPaymentMethods}
        selectedSimulation={simulationId}
        comparisonPeriods={comparisonPeriods}
        onEstudioChange={onEstudioChange}
        onGroupersChange={onGroupersChange}
        onPaymentMethodsChange={onPaymentMethodsChange}
        onSimulationChange={() => {}} // Not applicable for single simulation
        onComparisonPeriodsChange={onComparisonPeriodsChange}
        isLoadingEstudios={isLoadingFilters}
        isLoadingGroupers={isLoadingFilters}
        isLoadingSimulations={false}
        estudioError={null}
        grouperError={null}
        simulationError={null}
        onRetryEstudios={() => {}} // Will be handled by parent
        onRetryGroupers={() => {}} // Will be handled by parent
        showSimulationSelector={false} // Single simulation context
        showComparisonPeriods={true}
        enableFilterPersistence={true}
        enableTabSynchronization={true}
        onFiltersChanged={onFiltersChanged}
      />

      {/* Error state */}
      {error && (
        <Card>
          <CardContent className="flex items-center justify-center h-[200px]">
            <div className="text-center">
              <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
              <p className="text-destructive font-medium mb-2">
                Error al cargar datos
              </p>
              <p className="text-muted-foreground text-sm mb-4">{error}</p>
              <Button onClick={fetchAnalyticsData} variant="outline">
                <RefreshCw className="h-4 w-4 mr-2" />
                Reintentar
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Charts */}
      {!error && analyticsData && (
        <Tabs
          value={activeTab}
          onValueChange={(value) => setActiveTab(value as any)}
        >
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="overview">Vista General</TabsTrigger>
            <TabsTrigger value="comparison">Comparación</TabsTrigger>
            <TabsTrigger value="periods">Períodos</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <SimulationChart
              data={analyticsData.simulation_data.grouper_data}
              comparisonMetrics={analyticsData.comparison_metrics}
              title="Análisis General de Simulación"
              description="Vista general de la simulación con comparación histórica"
              showComparison={true}
              isLoading={isLoading}
            />
          </TabsContent>

          <TabsContent value="comparison" className="space-y-6">
            <SimulationComparisonChart
              data={analyticsData.simulation_data.grouper_data}
              title="Comparación Lado a Lado"
              description="Comparación directa entre simulación y promedios históricos"
              isLoading={isLoading}
            />
          </TabsContent>

          <TabsContent value="periods" className="space-y-6">
            <SimulationPeriodComparisonChart
              historicalData={periodComparisonData.historical}
              simulationData={periodComparisonData.simulation}
              selectedGroupers={selectedGroupers}
              title="Comparación por Períodos"
              description="Análisis histórico vs simulación por períodos"
              isLoading={isLoading}
              showVarianceIndicators={true}
            />
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
