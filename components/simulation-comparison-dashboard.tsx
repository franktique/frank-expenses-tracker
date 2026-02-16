'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from '@/components/ui/use-toast';
import {
  BarChart3,
  TrendingUp,
  RefreshCw,
  AlertCircle,
  Activity,
  Target,
  Zap,
  Plus,
  X,
  Copy,
  Download,
} from 'lucide-react';
import { formatCurrency } from '@/lib/utils';

// Import chart components
import {
  SimulationChart,
  SimulationComparisonChart,
} from './simulation-chart-components';

// Types
interface SimulationData {
  id: number;
  name: string;
  description: string | null;
  created_at: string;
  updated_at: string;
  budget_count: number;
}

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
  comparison_metrics: Array<{
    grouper_id: number;
    grouper_name: string;
    avg_historical: number;
    simulation_amount: number;
    variance_percentage: number;
    trend: 'increase' | 'decrease' | 'stable';
  }>;
}

interface ComparisonSummary {
  simulationId: number;
  simulationName: string;
  totalAmount: number;
  grouperCount: number;
  significantVariations: number;
  overallVariance: number;
}

interface SimulationComparisonDashboardProps {
  currentSimulationId: number;
  currentSimulationName: string;
  onNavigateToSimulation?: (simulationId: number) => void;
  onDuplicateSimulation?: (simulationId: number) => void;
}

export function SimulationComparisonDashboard({
  currentSimulationId,
  currentSimulationName,
  onNavigateToSimulation,
  onDuplicateSimulation,
}: SimulationComparisonDashboardProps) {
  // State management
  const [allSimulations, setAllSimulations] = useState<SimulationData[]>([]);
  const [selectedSimulations, setSelectedSimulations] = useState<number[]>([
    currentSimulationId,
  ]);
  const [simulationAnalytics, setSimulationAnalytics] = useState<
    Map<number, SimulationAnalyticsData>
  >(new Map());
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingAnalytics, setIsLoadingAnalytics] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'detailed'>(
    'overview'
  );

  // Load all simulations
  const fetchSimulations = useCallback(async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/simulations');
      if (!response.ok) {
        throw new Error('Error al cargar simulaciones');
      }

      const data = await response.json();
      setAllSimulations(data);
    } catch (error) {
      console.error('Error fetching simulations:', error);
      setError('No se pudieron cargar las simulaciones');
      toast({
        title: 'Error',
        description: 'No se pudieron cargar las simulaciones',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Load analytics for selected simulations
  const fetchSimulationAnalytics = useCallback(async () => {
    if (selectedSimulations.length === 0) return;

    try {
      setIsLoadingAnalytics(true);
      const analyticsMap = new Map<number, SimulationAnalyticsData>();

      // Fetch analytics for each selected simulation
      const promises = selectedSimulations.map(async (simulationId) => {
        const response = await fetch(
          `/api/simulations/${simulationId}/analytics?comparisonPeriods=3`
        );
        if (response.ok) {
          const data = await response.json();
          analyticsMap.set(simulationId, data);
        }
      });

      await Promise.all(promises);
      setSimulationAnalytics(analyticsMap);
    } catch (error) {
      console.error('Error fetching simulation analytics:', error);
      toast({
        title: 'Error',
        description: 'No se pudieron cargar los análisis de simulación',
        variant: 'destructive',
      });
    } finally {
      setIsLoadingAnalytics(false);
    }
  }, [selectedSimulations]);

  // Initialize data
  useEffect(() => {
    fetchSimulations();
  }, [fetchSimulations]);

  useEffect(() => {
    fetchSimulationAnalytics();
  }, [fetchSimulationAnalytics]);

  // Handle simulation selection
  const handleAddSimulation = (simulationId: number) => {
    if (!selectedSimulations.includes(simulationId)) {
      setSelectedSimulations([...selectedSimulations, simulationId]);
    }
  };

  const handleRemoveSimulation = (simulationId: number) => {
    if (selectedSimulations.length > 1) {
      setSelectedSimulations(
        selectedSimulations.filter((id) => id !== simulationId)
      );
    }
  };

  // Calculate comparison summaries
  const comparisonSummaries = useMemo((): ComparisonSummary[] => {
    return selectedSimulations
      .map((simulationId) => {
        const analytics = simulationAnalytics.get(simulationId);
        const simulation = allSimulations.find((s) => s.id === simulationId);

        if (!analytics || !simulation) return null;

        const totalAmount = analytics.simulation_data.grouper_data.reduce(
          (sum, item) => sum + item.simulation_total,
          0
        );

        const significantVariations = analytics.comparison_metrics.filter(
          (item) => Math.abs(item.variance_percentage) > 10
        ).length;

        const totalHistoricalAvg = analytics.comparison_metrics.reduce(
          (sum, item) => sum + item.avg_historical,
          0
        );

        const overallVariance =
          totalHistoricalAvg > 0
            ? ((totalAmount - totalHistoricalAvg) / totalHistoricalAvg) * 100
            : 0;

        return {
          simulationId,
          simulationName: simulation.name,
          totalAmount,
          grouperCount: analytics.simulation_data.grouper_data.length,
          significantVariations,
          overallVariance,
        };
      })
      .filter((summary): summary is ComparisonSummary => summary !== null);
  }, [selectedSimulations, simulationAnalytics, allSimulations]);

  // Prepare comparison chart data
  const comparisonChartData = useMemo(() => {
    const allGroupers = new Map<number, string>();
    const simulationTotals = new Map<number, Map<number, number>>();

    // Collect all groupers and simulation data
    selectedSimulations.forEach((simulationId) => {
      const analytics = simulationAnalytics.get(simulationId);
      if (analytics) {
        const totalsMap = new Map<number, number>();
        analytics.simulation_data.grouper_data.forEach((item) => {
          allGroupers.set(item.grouper_id, item.grouper_name);
          totalsMap.set(item.grouper_id, item.simulation_total);
        });
        simulationTotals.set(simulationId, totalsMap);
      }
    });

    // Transform data for chart
    return Array.from(allGroupers.entries()).map(([grouperId, grouperName]) => {
      const dataPoint: any = {
        grouper_id: grouperId,
        grouper_name:
          grouperName.length > 15
            ? grouperName.substring(0, 15) + '...'
            : grouperName,
      };

      selectedSimulations.forEach((simulationId) => {
        const simulation = allSimulations.find((s) => s.id === simulationId);
        const totals = simulationTotals.get(simulationId);
        const simulationName = simulation?.name || `Simulación ${simulationId}`;

        dataPoint[`simulation_${simulationId}`] = totals?.get(grouperId) || 0;
        dataPoint[`simulation_${simulationId}_name`] = simulationName;
      });

      return dataPoint;
    });
  }, [selectedSimulations, simulationAnalytics, allSimulations]);

  // Handle export functionality
  const handleExportComparison = async () => {
    try {
      const exportData = {
        simulations: comparisonSummaries,
        detailed_data: comparisonChartData,
        export_timestamp: new Date().toISOString(),
      };

      const blob = new Blob([JSON.stringify(exportData, null, 2)], {
        type: 'application/json',
      });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = `simulation-comparison-${Date.now()}.json`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast({
        title: 'Exportación exitosa',
        description: 'Los datos de comparación se han descargado correctamente',
      });
    } catch (error) {
      toast({
        title: 'Error de exportación',
        description: 'No se pudieron exportar los datos de comparación',
        variant: 'destructive',
      });
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex h-[400px] items-center justify-center">
          <div className="text-center">
            <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-b-2 border-primary"></div>
            <p>Cargando simulaciones...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="flex h-[400px] items-center justify-center">
          <div className="text-center">
            <AlertCircle className="mx-auto mb-4 h-12 w-12 text-destructive" />
            <p className="mb-2 font-medium text-destructive">
              Error al cargar datos
            </p>
            <p className="mb-4 text-sm text-muted-foreground">{error}</p>
            <Button onClick={fetchSimulations} variant="outline">
              <RefreshCw className="mr-2 h-4 w-4" />
              Reintentar
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with controls */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="flex items-center gap-2 text-xl font-bold">
            <Activity className="h-5 w-5 text-blue-600" />
            Comparación de Simulaciones
          </h2>
          <p className="text-muted-foreground">
            Análisis lado a lado de múltiples simulaciones
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportComparison}
            disabled={comparisonSummaries.length === 0}
          >
            <Download className="mr-2 h-4 w-4" />
            Exportar
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={fetchSimulationAnalytics}
            disabled={isLoadingAnalytics}
          >
            <RefreshCw
              className={`mr-2 h-4 w-4 ${
                isLoadingAnalytics ? 'animate-spin' : ''
              }`}
            />
            Actualizar
          </Button>
        </div>
      </div>

      {/* Simulation selector */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Seleccionar Simulaciones</CardTitle>
          <CardDescription>
            Elige las simulaciones que deseas comparar (máximo 4)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-4 flex flex-wrap gap-2">
            {selectedSimulations.map((simulationId) => {
              const simulation = allSimulations.find(
                (s) => s.id === simulationId
              );
              const isCurrentSimulation = simulationId === currentSimulationId;

              return (
                <Badge
                  key={simulationId}
                  variant={isCurrentSimulation ? 'default' : 'secondary'}
                  className="flex items-center gap-2 px-3 py-1"
                >
                  <span>
                    {simulation?.name || `Simulación ${simulationId}`}
                  </span>
                  {!isCurrentSimulation && selectedSimulations.length > 1 && (
                    <button
                      onClick={() => handleRemoveSimulation(simulationId)}
                      className="rounded-full p-0.5 hover:bg-destructive/20"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  )}
                </Badge>
              );
            })}
          </div>

          {selectedSimulations.length < 4 && (
            <div className="flex items-center gap-2">
              <Select
                onValueChange={(value) => handleAddSimulation(parseInt(value))}
              >
                <SelectTrigger className="w-[300px]">
                  <SelectValue placeholder="Agregar simulación para comparar" />
                </SelectTrigger>
                <SelectContent>
                  {allSimulations
                    .filter((sim) => !selectedSimulations.includes(sim.id))
                    .map((simulation) => (
                      <SelectItem
                        key={simulation.id}
                        value={simulation.id.toString()}
                      >
                        {simulation.name}
                        {simulation.budget_count > 0 && (
                          <span className="ml-2 text-muted-foreground">
                            ({simulation.budget_count} categorías)
                          </span>
                        )}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
              <Button
                variant="ghost"
                size="sm"
                className="text-blue-600"
                disabled={selectedSimulations.length >= 4}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Summary cards */}
      {comparisonSummaries.length > 0 && (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {comparisonSummaries.map((summary) => (
            <Card key={summary.simulationId} className="relative">
              <CardContent className="p-4">
                <div className="mb-2 flex items-center justify-between">
                  <h3
                    className="truncate font-medium"
                    title={summary.simulationName}
                  >
                    {summary.simulationName}
                  </h3>
                  <div className="flex items-center gap-1">
                    {summary.simulationId === currentSimulationId && (
                      <Badge variant="outline" className="text-xs">
                        Actual
                      </Badge>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0"
                      onClick={() =>
                        onDuplicateSimulation?.(summary.simulationId)
                      }
                    >
                      <Copy className="h-3 w-3" />
                    </Button>
                  </div>
                </div>

                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Total:</span>
                    <span className="font-medium">
                      {formatCurrency(summary.totalAmount)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Agrupadores:</span>
                    <span>{summary.grouperCount}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Variaciones:</span>
                    <span
                      className={
                        summary.significantVariations > 0
                          ? 'text-amber-600'
                          : 'text-green-600'
                      }
                    >
                      {summary.significantVariations}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">
                      Variación total:
                    </span>
                    <span
                      className={
                        summary.overallVariance > 5
                          ? 'text-green-600'
                          : summary.overallVariance < -5
                            ? 'text-red-600'
                            : 'text-gray-600'
                      }
                    >
                      {summary.overallVariance > 0 ? '+' : ''}
                      {summary.overallVariance.toFixed(1)}%
                    </span>
                  </div>
                </div>

                {summary.simulationId !== currentSimulationId && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-3 w-full"
                    onClick={() =>
                      onNavigateToSimulation?.(summary.simulationId)
                    }
                  >
                    Ver Detalles
                  </Button>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Comparison charts */}
      {comparisonChartData.length > 0 && (
        <Tabs
          value={activeTab}
          onValueChange={(value) => setActiveTab(value as any)}
        >
          <TabsList>
            <TabsTrigger value="overview">Vista General</TabsTrigger>
            <TabsTrigger value="detailed">Análisis Detallado</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Comparación por Agrupadores</CardTitle>
                <CardDescription>
                  Comparación lado a lado de todas las simulaciones
                  seleccionadas
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isLoadingAnalytics ? (
                  <div className="flex h-[400px] items-center justify-center">
                    <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-primary"></div>
                  </div>
                ) : (
                  <div className="h-[500px] w-full">
                    {/* This would be a custom multi-simulation comparison chart */}
                    <div className="flex h-full items-center justify-center text-muted-foreground">
                      <div className="text-center">
                        <BarChart3 className="mx-auto mb-4 h-12 w-12 opacity-50" />
                        <p>Gráfico de comparación múltiple</p>
                        <p className="text-sm">
                          Mostrando {selectedSimulations.length} simulaciones
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="detailed" className="space-y-6">
            {selectedSimulations.map((simulationId) => {
              const analytics = simulationAnalytics.get(simulationId);
              const simulation = allSimulations.find(
                (s) => s.id === simulationId
              );

              if (!analytics || !simulation) return null;

              return (
                <SimulationChart
                  key={simulationId}
                  data={analytics.simulation_data.grouper_data}
                  comparisonMetrics={analytics.comparison_metrics}
                  title={`Análisis: ${simulation.name}`}
                  description={`Simulación ID: ${simulationId}`}
                  showComparison={true}
                  isLoading={isLoadingAnalytics}
                />
              );
            })}
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
