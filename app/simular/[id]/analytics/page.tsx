"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useRouter, useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/components/ui/use-toast";
import { SimulationAnalyticsDashboard } from "@/components/simulation-analytics-dashboard";
import { SimulationComparisonDashboard } from "@/components/simulation-comparison-dashboard";
import { SimulationSummaryCards } from "@/components/simulation-summary-cards";
import { SimulationBreadcrumb } from "@/components/simulation-breadcrumb";
import { SimulationNavigation } from "@/components/simulation-navigation";
import { SimulationQuickActions } from "@/components/simulation-quick-actions";
import { useSimulationFilterSync } from "@/hooks/use-simulation-filter-sync";
import {
  ArrowLeft,
  BarChart3,
  Loader2,
  Settings,
  TrendingUp,
  Download,
  Copy,
  Zap,
  Clock,
} from "lucide-react";

// Types
type Simulation = {
  id: number;
  name: string;
  description: string | null;
  created_at: string;
  updated_at: string;
  budget_count: number;
};

type ActivePeriod = {
  id: number;
  name: string;
  month: number;
  year: number;
  is_open: boolean;
  isOpen?: boolean; // Compatibility property
};

type EstudioData = {
  id: number;
  name: string;
  grouper_count: number;
  created_at: string;
  updated_at: string;
};

type GrouperData = {
  grouper_id: number;
  grouper_name: string;
  total_amount: number;
  budget_amount?: number;
};

export default function SimulationAnalyticsPage() {
  const router = useRouter();
  const params = useParams();
  const { toast } = useToast();

  const simulationId = parseInt(params.id as string);

  // State
  const [simulation, setSimulation] = useState<Simulation | null>(null);
  const [activePeriod, setActivePeriod] = useState<ActivePeriod | null>(null);
  const [simulationMetrics, setSimulationMetrics] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMetrics, setIsLoadingMetrics] = useState(false);
  const [activeTab, setActiveTab] = useState<
    "overview" | "comparison" | "periods" | "export"
  >("overview");

  // Filter state management - single instance for the entire page
  // Memoize hook options to prevent infinite re-initialization
  const filterSyncOptions = useMemo(() => ({
    simulationId: simulationId,
    persistAcrossTabs: true,
    persistAcrossNavigation: true,
    enableStorageSync: true,
    enableTabSync: true,
  }), [simulationId]);

  const filterSyncInitialState = useMemo(() => ({
    selectedEstudio: null,
    selectedGroupers: [],
    selectedPaymentMethods: ["efectivo", "credito"],
    comparisonPeriods: 3,
  }), []);

  const filterSync = useSimulationFilterSync(filterSyncOptions, filterSyncInitialState);

  // Extract filter state and update functions for easier access
  const {
    selectedEstudio,
    selectedGroupers,
    selectedPaymentMethods,
    comparisonPeriods,
  } = filterSync.filterState;

  const { updateEstudio, updateGroupers, updatePaymentMethods, updateComparisonPeriods } = filterSync;

  // Filter data state
  const [allEstudios, setAllEstudios] = useState<EstudioData[]>([]);
  const [allGroupers, setAllGroupers] = useState<GrouperData[]>([]);
  const [isLoadingFilters, setIsLoadingFilters] = useState(false);
  const [isFilterInitialized, setIsFilterInitialized] = useState(false);

  // Filter change handlers
  const handleFiltersChanged = useCallback((filters: any) => {
    console.log("Simulation filters changed:", filters);
  }, []);

  const handleEstudioChange = useCallback((estudioId: number | null) => {
    updateEstudio(estudioId);
    setAllGroupers([]); // Clear groupers to force reload
  }, [updateEstudio]);

  const handleGrouperChange = useCallback((grouperIds: number[]) => {
    updateGroupers(grouperIds);
  }, [updateGroupers]);

  const handlePaymentMethodChange = useCallback((methods: string[]) => {
    updatePaymentMethods(methods);
  }, [updatePaymentMethods]);

  const handleComparisonPeriodsChange = useCallback((periods: number) => {
    updateComparisonPeriods(periods);
  }, [updateComparisonPeriods]);

  // Fetch available estudios
  const fetchEstudios = useCallback(async () => {
    try {
      setIsLoadingFilters(true);
      const response = await fetch("/api/estudios");

      if (!response.ok) {
        throw new Error("Error al cargar estudios");
      }

      const data = await response.json();
      setAllEstudios(
        data.sort((a: EstudioData, b: EstudioData) =>
          a.name.localeCompare(b.name)
        )
      );

      // Auto-select first estudio only once on initial load
      if (!isFilterInitialized && !selectedEstudio && data.length > 0) {
        updateEstudio(data[0].id);
        setIsFilterInitialized(true);
      }
    } catch (error) {
      console.error("Error fetching estudios:", error);
      toast({
        title: "Error",
        description: "No se pudieron cargar los estudios",
        variant: "destructive",
      });
    } finally {
      setIsLoadingFilters(false);
    }
  }, [isFilterInitialized, selectedEstudio, updateEstudio, toast]);

  // Fetch available groupers based on selected estudio
  const fetchGroupers = useCallback(async () => {
    if (!selectedEstudio || !activePeriod) return;

    try {
      setIsLoadingFilters(true);
      const params = new URLSearchParams({
        periodId: activePeriod.id.toString(),
        paymentMethod: "all",
        estudioId: selectedEstudio.toString(),
      });

      const response = await fetch(
        `/api/dashboard/groupers?${params.toString()}`
      );

      if (!response.ok) {
        throw new Error("Error al cargar agrupadores");
      }

      const data = await response.json();
      setAllGroupers(
        data.sort((a: GrouperData, b: GrouperData) =>
          a.grouper_name.localeCompare(b.grouper_name)
        )
      );

      // Auto-select all groupers if none selected
      if (selectedGroupers.length === 0 && data.length > 0) {
        updateGroupers(data.map((g: GrouperData) => g.grouper_id));
      }
    } catch (error) {
      console.error("Error fetching groupers:", error);
      toast({
        title: "Error",
        description: "No se pudieron cargar los agrupadores",
        variant: "destructive",
      });
    } finally {
      setIsLoadingFilters(false);
    }
  }, [selectedEstudio, activePeriod, selectedGroupers.length, updateGroupers, toast]);

  // Load simulation metrics - memoized to prevent infinite re-renders
  const loadSimulationMetrics = useCallback(async () => {
    if (!simulation) return;

    try {
      setIsLoadingMetrics(true);
      const response = await fetch(
        `/api/simulations/${simulationId}/analytics?summary=true`
      );
      if (response.ok) {
        const data = await response.json();

        // Transform data into metrics format
        const totalSimulation =
          data.simulation_data?.grouper_data?.reduce(
            (sum: number, item: any) => sum + item.simulation_total,
            0
          ) || 0;

        const totalHistoricalAvg =
          data.comparison_metrics?.reduce(
            (sum: number, item: any) => sum + item.avg_historical,
            0
          ) || 0;

        const significantVariations =
          data.comparison_metrics?.filter(
            (item: any) => Math.abs(item.variance_percentage) > 10
          ).length || 0;

        const overallVariance =
          totalHistoricalAvg > 0
            ? ((totalSimulation - totalHistoricalAvg) / totalHistoricalAvg) *
              100
            : 0;

        const topVariations =
          data.comparison_metrics
            ?.filter((item: any) => Math.abs(item.variance_percentage) > 5)
            ?.sort(
              (a: any, b: any) =>
                Math.abs(b.variance_percentage) -
                Math.abs(a.variance_percentage)
            )
            ?.slice(0, 5)
            ?.map((item: any) => ({
              grouper_name: item.grouper_name,
              variance_percentage: item.variance_percentage,
              trend: item.trend,
            })) || [];

        setSimulationMetrics({
          totalSimulation,
          totalHistoricalAvg,
          overallVariance,
          grouperCount: data.simulation_data?.grouper_data?.length || 0,
          significantVariations,
          categoriesConfigured: simulation.budget_count,
          topVariations,
          budgetDistribution: [], // This would need to be calculated from budget data
        });
      }
    } catch (error) {
      console.error("Error loading simulation metrics:", error);
    } finally {
      setIsLoadingMetrics(false);
    }
  }, [simulation, simulationId]);

  // Load simulation and period data
  useEffect(() => {
    console.log(
      "useEffect triggered for loading data, simulationId:",
      simulationId
    );

    const loadData = async () => {
      if (isNaN(simulationId)) {
        toast({
          title: "Error",
          description: "ID de simulación inválido",
          variant: "destructive",
        });
        router.push("/simular");
        return;
      }

      setIsLoading(true);
      try {
        // Load simulation data
        const simulationResponse = await fetch(
          `/api/simulations/${simulationId}`
        );
        if (!simulationResponse.ok) {
          if (simulationResponse.status === 404) {
            toast({
              title: "Simulación no encontrada",
              description: "La simulación solicitada no existe",
              variant: "destructive",
            });
            router.push("/simular");
            return;
          }
          throw new Error("Error al cargar la simulación");
        }

        const simulationData = await simulationResponse.json();
        setSimulation(simulationData);

        // Load active period data
        const periodsResponse = await fetch("/api/periods");
        if (periodsResponse.ok) {
          const periodsData = await periodsResponse.json();
          const active = periodsData.find(
            (p: ActivePeriod) => p.is_open || p.isOpen
          );
          setActivePeriod(active || null);
        } else {
          console.error("Failed to load periods:", periodsResponse.status);
        }
      } catch (error) {
        toast({
          title: "Error",
          description: (error as Error).message || "Error al cargar los datos",
          variant: "destructive",
        });
        router.push("/simular");
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [simulationId, router, toast]);

  // Initialize filter data - only run once on mount
  useEffect(() => {
    // Only run on mount, don't add fetchEstudios to dependencies to avoid loop
    fetchEstudios();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Intentionally empty - run only on mount

  useEffect(() => {
    if (selectedEstudio && activePeriod) {
      fetchGroupers();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedEstudio, activePeriod]); // Don't add fetchGroupers to avoid circular dependency

  // Load metrics when simulation is available
  useEffect(() => {
    if (simulation) {
      loadSimulationMetrics();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [simulation?.id]); // Only depend on simulation ID to avoid infinite loops

  // Handle navigation - memoized to prevent infinite re-renders
  const handleNavigateToConfig = useCallback(() => {
    router.push(`/simular/${simulationId}`);
  }, [router, simulationId]);

  const handleNavigateToList = useCallback(() => {
    router.push("/simular");
  }, [router]);

  const handleNavigateToAnalytics = useCallback((simulationId: number) => {
    router.push(`/simular/${simulationId}/analytics`);
  }, [router]);

  const handleBackToSimulation = () => {
    router.push(`/simular/${simulationId}`);
  };

  const handleBackToList = () => {
    router.push("/simular");
  };

  // Handle export functionality - memoized to prevent infinite re-renders
  const handleExportData = useCallback(async () => {
    try {
      const response = await fetch(
        `/api/simulations/${simulationId}/analytics?export=true`
      );
      if (!response.ok) {
        throw new Error("Error al exportar datos");
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.style.display = "none";
      a.href = url;
      a.download = `simulacion-${simulationId}-analytics.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast({
        title: "Exportación exitosa",
        description: "Los datos de análisis se han descargado correctamente",
      });
    } catch (error) {
      toast({
        title: "Error de exportación",
        description: "No se pudieron exportar los datos de análisis",
        variant: "destructive",
      });
    }
  }, [simulationId, toast]);

  // Handle duplicate simulation - memoized to prevent infinite re-renders
  const handleDuplicateSimulation = useCallback(async () => {
    if (!simulation) return;

    try {
      const response = await fetch("/api/simulations", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: `${simulation.name} (Copia)`,
          description: simulation.description,
          copyFrom: simulationId,
        }),
      });

      if (!response.ok) {
        throw new Error("Error al duplicar la simulación");
      }

      const newSimulation = await response.json();

      toast({
        title: "Simulación duplicada",
        description: `Se ha creado una copia de la simulación: ${newSimulation.name}`,
      });

      // Navigate to the new simulation
      router.push(`/simular/${newSimulation.id}`);
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo duplicar la simulación",
        variant: "destructive",
      });
    }
  }, [simulation, simulationId, router, toast]);

  if (isLoading) {
    return (
      <div className="container mx-auto py-4 px-4 sm:py-6 sm:px-6 lg:px-8">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin" />
          <span className="ml-2">Cargando análisis de simulación...</span>
        </div>
      </div>
    );
  }

  if (!simulation) {
    return (
      <div className="container mx-auto py-4 px-4 sm:py-6 sm:px-6 lg:px-8">
        <Card>
          <CardHeader>
            <CardTitle>Simulación no encontrada</CardTitle>
            <CardDescription>
              La simulación solicitada no existe o ha sido eliminada.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={handleBackToList}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Volver a Simulaciones
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-4 px-4 sm:py-6 sm:px-6 lg:px-8 space-y-6">
      {/* Enhanced Breadcrumb Navigation */}
      <SimulationBreadcrumb
        simulationId={simulation.id}
        simulationName={simulation.name}
        currentPage="analytics"
        showQuickActions={true}
      />

      {/* Quick Navigation */}
      <SimulationNavigation
        currentSimulationId={simulation.id}
        showRecentList={false}
        maxRecentItems={3}
      />

      {/* Quick Actions - Temporarily disabled to diagnose infinite loop */}
      {/* <SimulationQuickActions
        currentSimulation={simulation}
        onNavigateToConfig={handleNavigateToConfig}
        onNavigateToList={handleNavigateToList}
        onDuplicate={handleDuplicateSimulation}
        onExport={handleExportData}
        onRefresh={loadSimulationMetrics}
        showWorkflowSuggestions={true}
      /> */}

      {/* Header with navigation and actions */}
      <div className="flex flex-col space-y-4 sm:flex-row sm:items-center sm:justify-between sm:space-y-0">
        <div className="flex flex-col space-y-2 sm:flex-row sm:items-center sm:space-y-0 sm:space-x-4">
          <Button
            variant="ghost"
            onClick={handleBackToSimulation}
            className="w-fit"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Configuración
          </Button>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold flex items-center gap-2">
              <BarChart3 className="h-6 w-6 text-blue-600" />
              Análisis: {simulation.name}
            </h1>
            {simulation.description && (
              <p className="text-sm sm:text-base text-muted-foreground">
                {simulation.description}
              </p>
            )}
          </div>
        </div>

        {/* Quick actions */}
        <div className="flex flex-col sm:flex-row gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleDuplicateSimulation}
            className="flex items-center gap-2"
          >
            <Copy className="h-4 w-4" />
            Duplicar
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportData}
            className="flex items-center gap-2"
          >
            <Download className="h-4 w-4" />
            Exportar
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleBackToSimulation}
            className="flex items-center gap-2"
          >
            <Settings className="h-4 w-4" />
            Configurar
          </Button>
        </div>
      </div>

      {/* Status indicator */}
      <div className="flex items-center justify-between bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-blue-600" />
          <span className="font-medium text-blue-900">
            Estado de la simulación:
          </span>
          {simulation.budget_count > 0 ? (
            <span className="text-green-600 font-medium">
              {simulation.budget_count} categorías configuradas
            </span>
          ) : (
            <span className="text-amber-600 font-medium">
              Sin presupuestos configurados
            </span>
          )}
        </div>
        {!activePeriod && (
          <div className="text-amber-600 text-sm">
            ⚠️ No hay período activo para comparación
          </div>
        )}
      </div>

      {/* Analytics Dashboard with Tabs */}
      <Tabs
        value={activeTab}
        onValueChange={(value) => setActiveTab(value as any)}
        className="w-full"
      >
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger
            value="overview"
            className="flex items-center space-x-1 sm:space-x-2"
          >
            <BarChart3 className="h-4 w-4" />
            <span className="hidden sm:inline">Vista General</span>
            <span className="sm:hidden">General</span>
          </TabsTrigger>
          <TabsTrigger
            value="comparison"
            className="flex items-center space-x-1 sm:space-x-2"
          >
            <TrendingUp className="h-4 w-4" />
            <span className="hidden sm:inline">Comparación</span>
            <span className="sm:hidden">Comparar</span>
          </TabsTrigger>
          <TabsTrigger
            value="periods"
            className="flex items-center space-x-1 sm:space-x-2"
          >
            <BarChart3 className="h-4 w-4" />
            <span className="hidden sm:inline">Por Períodos</span>
            <span className="sm:hidden">Períodos</span>
          </TabsTrigger>
          <TabsTrigger
            value="export"
            className="flex items-center space-x-1 sm:space-x-2"
          >
            <Download className="h-4 w-4" />
            <span className="hidden sm:inline">Exportar</span>
            <span className="sm:hidden">Export</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* Summary Cards */}
          {simulationMetrics && (
            <SimulationSummaryCards
              simulationInfo={simulation}
              metrics={simulationMetrics}
              isLoading={isLoadingMetrics}
              onRefresh={loadSimulationMetrics}
              onNavigateToConfig={handleNavigateToConfig}
              onExportSummary={() => {
                const summaryData = {
                  simulation: simulation,
                  metrics: simulationMetrics,
                  export_timestamp: new Date().toISOString(),
                };

                const blob = new Blob([JSON.stringify(summaryData, null, 2)], {
                  type: "application/json",
                });
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.style.display = "none";
                a.href = url;
                a.download = `simulation-${simulation.id}-summary.json`;
                document.body.appendChild(a);
                a.click();
                window.URL.revokeObjectURL(url);
                document.body.removeChild(a);

                toast({
                  title: "Resumen exportado",
                  description:
                    "El resumen de la simulación se ha descargado correctamente",
                });
              }}
            />
          )}

          {/* Detailed Analytics - Temporarily Disabled (Phase 0) */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-blue-600" />
                Panel de Análisis - En Mantenimiento
              </CardTitle>
              <CardDescription>
                Estamos optimizando la experiencia de análisis para mejorar el rendimiento.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="text-center py-8">
                <div className="mb-6 flex justify-center">
                  <div className="rounded-full bg-blue-100 p-4">
                    <Settings className="h-12 w-12 text-blue-600" />
                  </div>
                </div>
                <h3 className="text-lg font-semibold mb-2">
                  Mejoras en Progreso
                </h3>
                <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                  El panel de análisis está temporalmente no disponible mientras
                  optimizamos el rendimiento y corregimos problemas de visualización.
                  Los datos de tu simulación están seguros.
                </p>
                <div className="flex gap-3 justify-center">
                  <Button
                    variant="outline"
                    onClick={() => router.push(`/simular/${simulation.id}`)}
                  >
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Volver a Configuración
                  </Button>
                  <Button onClick={() => router.push("/simular")}>
                    <Zap className="mr-2 h-4 w-4" />
                    Ver Todas las Simulaciones
                  </Button>
                </div>
              </div>

              {/* Feature Preview */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
                <h4 className="font-medium text-blue-900 mb-3 flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Próximamente Disponible
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div className="flex items-start gap-2">
                    <TrendingUp className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                    <div>
                      <span className="text-blue-600 font-medium block">Análisis Comparativo</span>
                      <p className="text-blue-800">Comparación con datos históricos reales</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <BarChart3 className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                    <div>
                      <span className="text-blue-600 font-medium block">Visualizaciones</span>
                      <p className="text-blue-800">Gráficos interactivos de variaciones</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <Download className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                    <div>
                      <span className="text-blue-600 font-medium block">Exportación</span>
                      <p className="text-blue-800">Descarga de datos en múltiples formatos</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <Copy className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                    <div>
                      <span className="text-blue-600 font-medium block">Comparación Múltiple</span>
                      <p className="text-blue-800">Compara varias simulaciones a la vez</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Current Simulation Status */}
              {simulation && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <h4 className="font-medium text-green-900 mb-2 flex items-center gap-2">
                    <Zap className="h-4 w-4" />
                    Estado Actual de la Simulación
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
                    <div>
                      <span className="text-green-600 font-medium">Nombre:</span>
                      <p className="text-green-800">{simulation.name}</p>
                    </div>
                    <div>
                      <span className="text-green-600 font-medium">Categorías:</span>
                      <p className="text-green-800">
                        {simulation.budget_count > 0
                          ? `${simulation.budget_count} configuradas`
                          : "Sin configurar"}
                      </p>
                    </div>
                    <div>
                      <span className="text-green-600 font-medium">Actualizado:</span>
                      <p className="text-green-800">
                        {new Date(simulation.updated_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="comparison" className="space-y-6">
          <SimulationComparisonDashboard
            currentSimulationId={simulation.id}
            currentSimulationName={simulation.name}
            onNavigateToSimulation={handleNavigateToAnalytics}
            onDuplicateSimulation={handleDuplicateSimulation}
          />
        </TabsContent>

        <TabsContent value="periods" className="space-y-6">
          {/* Period Analysis - Temporarily Disabled (Phase 0) */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-blue-600" />
                Análisis por Períodos - En Mantenimiento
              </CardTitle>
              <CardDescription>
                El análisis de tendencias por períodos estará disponible próximamente.
              </CardDescription>
            </CardHeader>
            <CardContent className="text-center py-8">
              <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                Esta funcionalidad está siendo optimizada para ofrecerte
                mejores visualizaciones de tendencias a lo largo del tiempo.
              </p>
              <Button
                variant="outline"
                onClick={() => router.push(`/simular/${simulation.id}`)}
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Volver a Configuración
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="export" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Exportar Datos de Análisis</CardTitle>
              <CardDescription>
                Descarga los datos de análisis de la simulación en diferentes
                formatos
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card>
                  <CardContent className="p-4">
                    <h3 className="font-medium mb-2">Datos Completos (CSV)</h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      Incluye todos los datos de simulación y comparación
                      histórica
                    </p>
                    <Button onClick={handleExportData} className="w-full">
                      <Download className="mr-2 h-4 w-4" />
                      Descargar CSV
                    </Button>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4">
                    <h3 className="font-medium mb-2">Resumen Ejecutivo</h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      Métricas clave y variaciones significativas
                    </p>
                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={() => {
                        if (simulationMetrics) {
                          const summaryData = {
                            simulation: simulation,
                            metrics: simulationMetrics,
                            export_timestamp: new Date().toISOString(),
                          };

                          const blob = new Blob(
                            [JSON.stringify(summaryData, null, 2)],
                            {
                              type: "application/json",
                            }
                          );
                          const url = window.URL.createObjectURL(blob);
                          const a = document.createElement("a");
                          a.style.display = "none";
                          a.href = url;
                          a.download = `simulation-${simulation.id}-summary.json`;
                          document.body.appendChild(a);
                          a.click();
                          window.URL.revokeObjectURL(url);
                          document.body.removeChild(a);

                          toast({
                            title: "Resumen exportado",
                            description:
                              "El resumen ejecutivo se ha descargado correctamente",
                          });
                        } else {
                          toast({
                            title: "Error",
                            description: "No hay datos de resumen disponibles",
                            variant: "destructive",
                          });
                        }
                      }}
                    >
                      <Download className="mr-2 h-4 w-4" />
                      Descargar Resumen
                    </Button>
                  </CardContent>
                </Card>
              </div>

              {/* Quick Actions */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Acciones Rápidas</CardTitle>
                  <CardDescription>
                    Gestiona la simulación desde el análisis
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <Button
                      variant="outline"
                      onClick={() => router.push(`/simular/${simulation.id}`)}
                      className="flex items-center gap-2"
                    >
                      <Settings className="h-4 w-4" />
                      Configurar
                    </Button>
                    <Button
                      variant="outline"
                      onClick={handleDuplicateSimulation}
                      className="flex items-center gap-2"
                    >
                      <Copy className="h-4 w-4" />
                      Duplicar
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => router.push("/simular")}
                      className="flex items-center gap-2"
                    >
                      <ArrowLeft className="h-4 w-4" />
                      Ver Todas
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="font-medium text-blue-900 mb-2">
                  Información de Exportación
                </h4>
                <ul className="text-sm text-blue-800 space-y-1">
                  <li>• Los datos incluyen filtros aplicados actualmente</li>
                  <li>
                    • La exportación respeta la configuración de períodos de
                    comparación
                  </li>
                  <li>• Los archivos incluyen metadatos de la simulación</li>
                  <li>
                    • Formato compatible con Excel y herramientas de análisis
                  </li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
