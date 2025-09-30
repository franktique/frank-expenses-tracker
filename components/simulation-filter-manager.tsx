"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  RotateCcw,
  Filter,
  Settings,
  AlertCircle,
  RefreshCw,
  Zap,
} from "lucide-react";
import { toast } from "@/components/ui/use-toast";
import { cn } from "@/lib/utils";

// Import our enhanced filter components
import { AgrupadorFilter } from "./agrupador-filter";
import { EstudioFilter } from "./estudio-filter";
import { PaymentMethodFilter } from "./payment-method-filter";
import { SimulationSelectionFilter } from "./simulation-selection-filter";

// Import filter state management
import {
  SimulationFilterState,
  SimulationFilterOptions,
  saveSimulationFilterState,
  loadSimulationFilterState,
  clearSimulationFilterState,
  getDefaultSimulationFilterState,
  createSimulationFilterStateHandler,
} from "@/lib/simulation-filter-state";

// Types
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
  simulation_total?: number;
  budget_amount?: number;
}

interface SimulationData {
  id: number;
  name: string;
  description: string | null;
  created_at: string;
  updated_at: string;
  budget_count: number;
}

interface SimulationFilterManagerProps {
  // Current simulation context
  currentSimulationId?: number;

  // Filter data
  allEstudios: EstudioData[];
  allGroupers: GrouperData[];
  allSimulations: SimulationData[];

  // Current filter state
  selectedEstudio: number | null;
  selectedGroupers: number[];
  selectedPaymentMethods: string[];
  selectedSimulation: number | null;
  comparisonPeriods: number;

  // Change handlers
  onEstudioChange: (estudioId: number | null) => void;
  onGroupersChange: (grouperIds: number[]) => void;
  onPaymentMethodsChange: (methods: string[]) => void;
  onSimulationChange: (simulationId: number | null) => void;
  onComparisonPeriodsChange: (periods: number) => void;

  // Loading states
  isLoadingEstudios?: boolean;
  isLoadingGroupers?: boolean;
  isLoadingSimulations?: boolean;

  // Error states
  estudioError?: string | null;
  grouperError?: string | null;
  simulationError?: string | null;

  // Retry handlers
  onRetryEstudios?: () => void;
  onRetryGroupers?: () => void;
  onRetrySimulations?: () => void;

  // Additional options
  showSimulationSelector?: boolean;
  showComparisonPeriods?: boolean;
  enableFilterPersistence?: boolean;
  enableTabSynchronization?: boolean;
  onCreateNewSimulation?: () => void;
  onFiltersChanged?: (filters: SimulationFilterState) => void;
}

export function SimulationFilterManager({
  currentSimulationId,
  allEstudios,
  allGroupers,
  allSimulations,
  selectedEstudio,
  selectedGroupers,
  selectedPaymentMethods,
  selectedSimulation,
  comparisonPeriods,
  onEstudioChange,
  onGroupersChange,
  onPaymentMethodsChange,
  onSimulationChange,
  onComparisonPeriodsChange,
  isLoadingEstudios = false,
  isLoadingGroupers = false,
  isLoadingSimulations = false,
  estudioError = null,
  grouperError = null,
  simulationError = null,
  onRetryEstudios,
  onRetryGroupers,
  onRetrySimulations,
  showSimulationSelector = true,
  showComparisonPeriods = true,
  enableFilterPersistence = true,
  enableTabSynchronization = true,
  onCreateNewSimulation,
  onFiltersChanged,
}: SimulationFilterManagerProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);

  // Filter state management options
  const filterOptions: SimulationFilterOptions = useMemo(
    () => ({
      simulationId: currentSimulationId || 0,
      persistAcrossTabs: enableTabSynchronization,
      persistAcrossNavigation: enableFilterPersistence,
    }),
    [currentSimulationId, enableTabSynchronization, enableFilterPersistence]
  );

  // Create filter state handler
  const filterStateHandler = useMemo(() => {
    return createSimulationFilterStateHandler(filterOptions, onFiltersChanged);
  }, [filterOptions, onFiltersChanged]);

  // Handle filter reset
  const handleResetFilters = useCallback(() => {
    const defaultState = getDefaultSimulationFilterState();

    onEstudioChange(defaultState.selectedEstudio);
    onGroupersChange(defaultState.selectedGroupers);
    onPaymentMethodsChange(defaultState.selectedPaymentMethods);
    onComparisonPeriodsChange(defaultState.comparisonPeriods);

    if (showSimulationSelector) {
      onSimulationChange(null);
    }

    // Clear persisted state
    if (enableFilterPersistence) {
      clearSimulationFilterState(filterOptions);
    }

    toast({
      title: "Filtros restablecidos",
      description:
        "Se han restablecido todos los filtros a sus valores por defecto",
    });
  }, [
    onEstudioChange,
    onGroupersChange,
    onPaymentMethodsChange,
    onComparisonPeriodsChange,
    onSimulationChange,
    showSimulationSelector,
    enableFilterPersistence,
    filterOptions,
  ]);

  // Handle estudio change with state management
  const handleEstudioChange = useCallback(
    (estudioId: number | null) => {
      onEstudioChange(estudioId);

      if (enableFilterPersistence) {
        filterStateHandler.updateEstudio(estudioId, {
          selectedEstudio: estudioId,
          selectedGroupers,
          selectedPaymentMethods,
          comparisonPeriods,
        });
      }
    },
    [
      onEstudioChange,
      enableFilterPersistence,
      selectedGroupers,
      selectedPaymentMethods,
      comparisonPeriods,
    ]
  );

  // Handle grouper change with state management
  const handleGroupersChange = useCallback(
    (grouperIds: number[]) => {
      onGroupersChange(grouperIds);

      if (enableFilterPersistence) {
        filterStateHandler.updateGroupers(grouperIds, {
          selectedEstudio,
          selectedGroupers: grouperIds,
          selectedPaymentMethods,
          comparisonPeriods,
        });
      }
    },
    [
      onGroupersChange,
      enableFilterPersistence,
      selectedEstudio,
      selectedPaymentMethods,
      comparisonPeriods,
    ]
  );

  // Handle payment method change with state management
  const handlePaymentMethodsChange = useCallback(
    (methods: string[]) => {
      onPaymentMethodsChange(methods);

      if (enableFilterPersistence) {
        filterStateHandler.updatePaymentMethods(methods, {
          selectedEstudio,
          selectedGroupers,
          selectedPaymentMethods: methods,
          comparisonPeriods,
        });
      }
    },
    [
      onPaymentMethodsChange,
      enableFilterPersistence,
      selectedEstudio,
      selectedGroupers,
      comparisonPeriods,
    ]
  );

  // Handle comparison periods change with state management
  const handleComparisonPeriodsChange = useCallback(
    (periods: number) => {
      onComparisonPeriodsChange(periods);

      if (enableFilterPersistence) {
        filterStateHandler.updateComparisonPeriods(periods, {
          selectedEstudio,
          selectedGroupers,
          selectedPaymentMethods,
          comparisonPeriods: periods,
        });
      }
    },
    [
      onComparisonPeriodsChange,
      enableFilterPersistence,
      selectedEstudio,
      selectedGroupers,
      selectedPaymentMethods,
    ]
  );

  // Stable callback for Select component to avoid inline function recreation
  const handleSelectValueChange = useCallback(
    (value: string) => {
      handleComparisonPeriodsChange(parseInt(value));
    },
    [handleComparisonPeriodsChange]
  );

  // Calculate filter summary
  const filterSummary = useMemo(() => {
    const activeFilters = [];

    if (selectedEstudio) {
      const estudio = allEstudios.find((e) => e.id === selectedEstudio);
      if (estudio) {
        activeFilters.push(`Estudio: ${estudio.name}`);
      }
    }

    if (
      selectedGroupers.length > 0 &&
      selectedGroupers.length < allGroupers.length
    ) {
      activeFilters.push(`${selectedGroupers.length} agrupadores`);
    }

    if (
      selectedPaymentMethods.length > 0 &&
      selectedPaymentMethods.length < 2
    ) {
      const methodLabels = selectedPaymentMethods.map((method) => {
        switch (method) {
          case "efectivo":
            return "Efectivo";
          case "credito":
            return "Crédito";
          default:
            return method;
        }
      });
      activeFilters.push(`Métodos: ${methodLabels.join(", ")}`);
    }

    if (showSimulationSelector && selectedSimulation) {
      const simulation = allSimulations.find(
        (s) => s.id === selectedSimulation
      );
      if (simulation) {
        activeFilters.push(`Simulación: ${simulation.name}`);
      }
    }

    return activeFilters;
  }, [
    selectedEstudio,
    selectedGroupers,
    selectedPaymentMethods,
    selectedSimulation,
    allEstudios,
    allGroupers,
    allSimulations,
    showSimulationSelector,
  ]);

  // Check if any filters are active
  const hasActiveFilters = filterSummary.length > 0;

  return (
    <Card className="w-full border-blue-200 bg-blue-50/30">
      <CardHeader
        className="pb-3 cursor-pointer hover:bg-blue-50 transition-colors"
        onClick={() => setIsCollapsed(!isCollapsed)}
      >
        <CardTitle className="text-lg font-medium flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Filter className="h-5 w-5 text-blue-600" />
            <span>Filtros de Simulación</span>
            <Badge variant="outline" className="text-blue-600 border-blue-600">
              Análisis
            </Badge>
          </div>
          <div className="flex items-center gap-2">
            {hasActiveFilters && (
              <Badge variant="secondary" className="text-xs">
                {filterSummary.length} activos
              </Badge>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                setIsCollapsed(!isCollapsed);
              }}
              className="h-6 w-6 p-0"
            >
              <Settings
                className={cn(
                  "h-4 w-4 transition-transform",
                  !isCollapsed && "rotate-90"
                )}
              />
            </Button>
          </div>
        </CardTitle>
      </CardHeader>

      {!isCollapsed && (
        <CardContent className="space-y-4 pt-0">
          {/* Filter summary */}
          {hasActiveFilters && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Zap className="h-4 w-4 text-blue-600" />
                  <span className="text-sm font-medium text-blue-900">
                    Filtros Activos:
                  </span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleResetFilters}
                  className="h-6 text-xs text-blue-600 hover:text-blue-700 hover:bg-blue-100"
                >
                  <RotateCcw className="h-3 w-3 mr-1" />
                  Restablecer
                </Button>
              </div>
              <div className="mt-2 flex flex-wrap gap-1">
                {filterSummary.map((filter, index) => (
                  <Badge key={index} variant="secondary" className="text-xs">
                    {filter}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Filter controls */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {/* Simulation selector */}
            {showSimulationSelector && (
              <div className="space-y-2">
                <label className="text-sm font-medium text-blue-900">
                  Simulación para Análisis
                </label>
                <SimulationSelectionFilter
                  allSimulations={allSimulations}
                  selectedSimulation={selectedSimulation}
                  onSelectionChange={onSimulationChange}
                  isLoading={isLoadingSimulations}
                  error={simulationError}
                  onRetry={onRetrySimulations}
                  onCreateNew={onCreateNewSimulation}
                  persistSelection={enableFilterPersistence}
                />
              </div>
            )}

            {/* Estudio filter */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-blue-900">
                Estudio
              </label>
              <EstudioFilter
                allEstudios={allEstudios}
                selectedEstudio={selectedEstudio}
                onSelectionChange={handleEstudioChange}
                isLoading={isLoadingEstudios}
                error={estudioError}
                onRetry={onRetryEstudios}
                simulationContext={true}
                persistSelection={enableFilterPersistence}
              />
            </div>

            {/* Grouper filter */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-blue-900">
                Agrupadores
              </label>
              <AgrupadorFilter
                allGroupers={allGroupers}
                selectedGroupers={selectedGroupers}
                onSelectionChange={handleGroupersChange}
                isLoading={isLoadingGroupers}
                error={grouperError}
                onRetry={onRetryGroupers}
                simulationContext={true}
                showSimulationData={true}
              />
            </div>

            {/* Payment method filter */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-blue-900">
                Métodos de Pago
              </label>
              <PaymentMethodFilter
                title="Métodos para Análisis"
                selectedMethods={selectedPaymentMethods}
                onMethodsChange={handlePaymentMethodsChange}
                simulationContext={true}
                showBudgetInfo={true}
                persistSelection={enableFilterPersistence}
              />
            </div>
          </div>

          {/* Additional options */}
          {showComparisonPeriods && (
            <>
              <Separator className="bg-blue-200" />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-blue-900">
                    Períodos de Comparación
                  </label>
                  <Select
                    value={comparisonPeriods.toString()}
                    onValueChange={handleSelectValueChange}
                  >
                    <SelectTrigger className="border-blue-200 bg-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">1 período</SelectItem>
                      <SelectItem value="2">2 períodos</SelectItem>
                      <SelectItem value="3">3 períodos</SelectItem>
                      <SelectItem value="6">6 períodos</SelectItem>
                      <SelectItem value="12">12 períodos</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-blue-900">
                    Acciones
                  </label>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleResetFilters}
                      className="border-blue-200 text-blue-600 hover:bg-blue-50"
                    >
                      <RotateCcw className="h-4 w-4 mr-2" />
                      Restablecer
                    </Button>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* Status indicators */}
          <div className="text-xs text-blue-600 bg-blue-50 p-2 rounded border border-blue-200">
            <div className="flex items-center justify-between">
              <span>
                Estado:{" "}
                {hasActiveFilters
                  ? `${filterSummary.length} filtros activos`
                  : "Sin filtros activos"}
              </span>
              {enableFilterPersistence && (
                <span className="text-blue-500">
                  Filtros guardados automáticamente
                </span>
              )}
            </div>
          </div>
        </CardContent>
      )}
    </Card>
  );
}
