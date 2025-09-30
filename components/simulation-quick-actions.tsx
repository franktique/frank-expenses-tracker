"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useRouter, usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";
import {
  Settings,
  BarChart3,
  ArrowLeft,
  ArrowRight,
  Copy,
  Download,
  RefreshCw,
  Zap,
  Clock,
  TrendingUp,
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

interface SimulationQuickActionsProps {
  currentSimulation?: Simulation;
  onNavigateToConfig?: () => void;
  onNavigateToAnalytics?: () => void;
  onNavigateToList?: () => void;
  onDuplicate?: () => void;
  onExport?: () => void;
  onRefresh?: () => void;
  showWorkflowSuggestions?: boolean;
}

function SimulationQuickActions({
  currentSimulation,
  onNavigateToConfig,
  onNavigateToAnalytics,
  onNavigateToList,
  onDuplicate,
  onExport,
  onRefresh,
  showWorkflowSuggestions = true,
}: SimulationQuickActionsProps) {
  const router = useRouter();
  const pathname = usePathname();

  // State
  const [workflowSuggestions, setWorkflowSuggestions] = useState<string[]>([]);
  const [nextSimulation, setNextSimulation] = useState<Simulation | null>(null);
  const [prevSimulation, setPrevSimulation] = useState<Simulation | null>(null);

  // Determine current page context - memoized to prevent recalculation
  const pageContext = useMemo(() => ({
    isAnalyticsPage: pathname.includes("/analytics"),
    isConfigPage: pathname.includes("/simular/") && !pathname.includes("/analytics"),
    isListPage: pathname === "/simular",
  }), [pathname]);
  
  const { isAnalyticsPage, isConfigPage, isListPage } = pageContext;

  // Memoize computed page context values to prevent unnecessary re-renders
  const { currentSimulationId, simulationBudgetCount } = useMemo(() => ({
    currentSimulationId: currentSimulation?.id || null,
    simulationBudgetCount: currentSimulation?.budget_count || 0,
  }), [currentSimulation?.id, currentSimulation?.budget_count]);

  // Load navigation context - fixed dependencies to prevent infinite loops
  useEffect(() => {
    const loadNavigationContext = async () => {
      if (!currentSimulationId) return;

      try {
        const response = await fetch("/api/simulations");
        if (response.ok) {
          const simulations = await response.json();
          const currentIndex = simulations.findIndex(
            (s: Simulation) => s.id === currentSimulationId
          );

          // Set next and previous simulations
          if (currentIndex > 0) {
            setPrevSimulation(simulations[currentIndex - 1]);
          }
          if (currentIndex < simulations.length - 1) {
            setNextSimulation(simulations[currentIndex + 1]);
          }

          // Generate workflow suggestions - use current simulation budget count directly
          const suggestions = generateWorkflowSuggestions(
            { id: currentSimulationId, budget_count: currentSimulation?.budget_count || 0 } as Simulation,
            isAnalyticsPage,
            isConfigPage
          );
          setWorkflowSuggestions(suggestions);
        }
      } catch (error) {
        console.error("Error loading navigation context:", error);
      }
    };

    loadNavigationContext();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentSimulationId, isAnalyticsPage, isConfigPage]); // Removed simulationBudgetCount to prevent infinite loop

  // Generate workflow suggestions based on current context - memoized to prevent re-creation
  const generateWorkflowSuggestions = useCallback((
    simulation: Simulation,
    isAnalytics: boolean,
    isConfig: boolean
  ): string[] => {
    const suggestions: string[] = [];

    if (isConfig) {
      if (simulation.budget_count === 0) {
        suggestions.push("Configura presupuestos para las categorías");
      } else {
        suggestions.push("Revisa el análisis de tu simulación");
        suggestions.push("Compara con datos históricos");
      }
    }

    if (isAnalytics) {
      suggestions.push("Ajusta presupuestos basado en el análisis");
      suggestions.push("Exporta datos para reportes");
      suggestions.push("Duplica para crear variaciones");
    }

    return suggestions;
  }, []);

  // Navigation handlers - memoized to prevent re-creation
  const handleNavigateToNext = useCallback(() => {
    if (nextSimulation) {
      if (isAnalyticsPage) {
        router.push(`/simular/${nextSimulation.id}/analytics`);
      } else {
        router.push(`/simular/${nextSimulation.id}`);
      }
    }
  }, [nextSimulation, isAnalyticsPage, router]);

  const handleNavigateToPrev = useCallback(() => {
    if (prevSimulation) {
      if (isAnalyticsPage) {
        router.push(`/simular/${prevSimulation.id}/analytics`);
      } else {
        router.push(`/simular/${prevSimulation.id}`);
      }
    }
  }, [prevSimulation, isAnalyticsPage, router]);

  return (
    <TooltipProvider>
      <div className="space-y-4">
        {/* Quick Actions Bar */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                {/* Navigation between simulations */}
                <div className="flex items-center space-x-1">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleNavigateToPrev}
                        disabled={!prevSimulation}
                        className="h-8 w-8 p-0"
                      >
                        <ArrowLeft className="h-3 w-3" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      {prevSimulation
                        ? `Anterior: ${prevSimulation.name}`
                        : "No hay simulación anterior"}
                    </TooltipContent>
                  </Tooltip>

                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleNavigateToNext}
                        disabled={!nextSimulation}
                        className="h-8 w-8 p-0"
                      >
                        <ArrowRight className="h-3 w-3" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      {nextSimulation
                        ? `Siguiente: ${nextSimulation.name}`
                        : "No hay simulación siguiente"}
                    </TooltipContent>
                  </Tooltip>
                </div>

                {/* Context-aware actions */}
                <div className="flex items-center space-x-1">
                  {isConfigPage && onNavigateToAnalytics && (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={onNavigateToAnalytics}
                          className="flex items-center gap-1"
                        >
                          <BarChart3 className="h-3 w-3" />
                          <span className="hidden sm:inline">Análisis</span>
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        Ver análisis y comparaciones
                      </TooltipContent>
                    </Tooltip>
                  )}

                  {isAnalyticsPage && onNavigateToConfig && (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={onNavigateToConfig}
                          className="flex items-center gap-1"
                        >
                          <Settings className="h-3 w-3" />
                          <span className="hidden sm:inline">Configurar</span>
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Configurar presupuestos</TooltipContent>
                    </Tooltip>
                  )}
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex items-center space-x-1">
                {onDuplicate && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={onDuplicate}
                        className="flex items-center gap-1"
                      >
                        <Copy className="h-3 w-3" />
                        <span className="hidden sm:inline">Duplicar</span>
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      Crear copia de la simulación
                    </TooltipContent>
                  </Tooltip>
                )}

                {onExport && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={onExport}
                        className="flex items-center gap-1"
                      >
                        <Download className="h-3 w-3" />
                        <span className="hidden sm:inline">Exportar</span>
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      Exportar datos de la simulación
                    </TooltipContent>
                  </Tooltip>
                )}

                {onRefresh && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={onRefresh}
                        className="flex items-center gap-1"
                      >
                        <RefreshCw className="h-3 w-3" />
                        <span className="hidden sm:inline">Actualizar</span>
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Actualizar datos</TooltipContent>
                  </Tooltip>
                )}

                {onNavigateToList && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={onNavigateToList}
                        className="flex items-center gap-1"
                      >
                        <Zap className="h-3 w-3" />
                        <span className="hidden sm:inline">Lista</span>
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Ver todas las simulaciones</TooltipContent>
                  </Tooltip>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Workflow Suggestions */}
        {showWorkflowSuggestions && workflowSuggestions.length > 0 && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-blue-600" />
                Sugerencias de Flujo de Trabajo
              </CardTitle>
              <CardDescription className="text-xs">
                Próximos pasos recomendados para tu simulación
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {workflowSuggestions.map((suggestion, index) => (
                <div
                  key={index}
                  className="flex items-center gap-2 text-sm p-2 rounded-lg bg-blue-50 border border-blue-200"
                >
                  <Clock className="h-3 w-3 text-blue-600 flex-shrink-0" />
                  <span className="text-blue-800">{suggestion}</span>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Simulation Status */}
        {currentSimulation && (
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Zap className="h-4 w-4 text-blue-600" />
                  <span className="text-sm font-medium">Estado:</span>
                </div>
                <div className="flex items-center gap-2">
                  {currentSimulation.budget_count > 0 ? (
                    <Badge variant="default" className="text-xs">
                      {currentSimulation.budget_count} categorías configuradas
                    </Badge>
                  ) : (
                    <Badge variant="secondary" className="text-xs">
                      Sin configurar
                    </Badge>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </TooltipProvider>
  );
}

// Export component wrapped with React.memo with custom comparison to prevent unnecessary re-renders
export default React.memo(SimulationQuickActions, (prevProps, nextProps) => {
  // Only re-render if these specific values change
  return (
    prevProps.currentSimulation?.id === nextProps.currentSimulation?.id &&
    prevProps.currentSimulation?.budget_count === nextProps.currentSimulation?.budget_count &&
    prevProps.showWorkflowSuggestions === nextProps.showWorkflowSuggestions
    // Ignore callback props as they're stable from useCallback in parent
  );
});

// Named export for backwards compatibility
export { SimulationQuickActions };
