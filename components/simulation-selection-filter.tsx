'use client';

import { useState } from 'react';
import {
  Check,
  ChevronDown,
  Activity,
  AlertCircle,
  RefreshCw,
  Plus,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

type SimulationData = {
  id: number;
  name: string;
  description: string | null;
  created_at: string;
  updated_at: string;
  budget_count: number;
};

interface SimulationSelectionFilterProps {
  allSimulations: SimulationData[];
  selectedSimulation: number | null;
  onSelectionChange: (selected: number | null) => void;
  isLoading?: boolean;
  error?: string | null;
  onRetry?: () => void;
  onCreateNew?: () => void;
  showBudgetCount?: boolean;
  persistSelection?: boolean;
}

export function SimulationSelectionFilter({
  allSimulations,
  selectedSimulation,
  onSelectionChange,
  isLoading = false,
  error = null,
  onRetry,
  onCreateNew,
  showBudgetCount = true,
  persistSelection = true,
}: SimulationSelectionFilterProps) {
  const [isOpen, setIsOpen] = useState(false);

  // Sort simulations by name
  const sortedSimulations = [...allSimulations].sort((a, b) =>
    a.name.localeCompare(b.name)
  );

  // Handle simulation selection
  const handleSimulationSelect = (simulationId: number) => {
    onSelectionChange(simulationId);
    setIsOpen(false);

    // Persist selection if enabled
    if (persistSelection) {
      try {
        sessionStorage.setItem(
          'analytics-selectedSimulationId',
          simulationId.toString()
        );
      } catch (error) {
        console.warn('Failed to persist simulation selection:', error);
      }
    }
  };

  // Handle clear selection
  const handleClearSelection = () => {
    onSelectionChange(null);
    setIsOpen(false);

    if (persistSelection) {
      try {
        sessionStorage.removeItem('analytics-selectedSimulationId');
      } catch (error) {
        console.warn('Failed to clear persisted simulation selection:', error);
      }
    }
  };

  // Handle retry action
  const handleRetry = () => {
    if (onRetry) {
      onRetry();
    }
  };

  // Handle create new simulation
  const handleCreateNew = () => {
    if (onCreateNew) {
      onCreateNew();
    }
    setIsOpen(false);
  };

  // Get display text for the trigger button
  const getDisplayText = () => {
    if (isLoading) {
      return 'Cargando...';
    }

    if (error) {
      return 'Error al cargar';
    }

    if (selectedSimulation === null) {
      if (allSimulations.length === 0) {
        return 'No hay simulaciones disponibles';
      }
      return 'Seleccionar simulación para análisis';
    }

    const selectedSimulationData = allSimulations.find(
      (s) => s.id === selectedSimulation
    );
    return selectedSimulationData?.name || 'Simulación no encontrada';
  };

  // Get selected simulation data for display
  const selectedSimulationData = selectedSimulation
    ? allSimulations.find((s) => s.id === selectedSimulation)
    : null;

  // Format date for display
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-CO', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={isOpen}
          className={cn(
            'w-[320px] justify-between',
            error && 'border-destructive text-destructive',
            'border-blue-200 bg-blue-50/50'
          )}
          disabled={isLoading}
        >
          <div className="flex items-center gap-2">
            {error ? (
              <AlertCircle className="h-4 w-4" />
            ) : (
              <Activity className="h-4 w-4 text-blue-600" />
            )}
            <span className="truncate">{getDisplayText()}</span>
          </div>
          <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[350px] p-0" align="start">
        <div className="p-2">
          {/* Header */}
          <div className="flex items-center justify-between border-b px-2 py-2 text-sm font-medium text-muted-foreground">
            <span>Seleccionar Simulación</span>
            <div className="rounded bg-blue-50 px-2 py-1 text-xs text-blue-600">
              Análisis
            </div>
          </div>

          {/* Content */}
          <div className="max-h-[400px] overflow-y-auto">
            {error ? (
              <div className="px-2 py-2">
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription className="text-xs">
                    {error}
                    {onRetry && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleRetry}
                        className="ml-2 h-6 px-2 text-xs"
                        disabled={isLoading}
                      >
                        <RefreshCw className="mr-1 h-3 w-3" />
                        Reintentar
                      </Button>
                    )}
                  </AlertDescription>
                </Alert>
              </div>
            ) : isLoading ? (
              <div className="px-2 py-4 text-center text-sm text-muted-foreground">
                <div className="flex items-center justify-center gap-2">
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  Cargando simulaciones...
                </div>
              </div>
            ) : sortedSimulations.length === 0 ? (
              <div className="px-2 py-4 text-center text-sm text-muted-foreground">
                <div className="space-y-3">
                  <Activity className="mx-auto h-8 w-8 opacity-50" />
                  <div>
                    <p className="font-medium">
                      No hay simulaciones disponibles
                    </p>
                    <p className="mt-1 text-xs">
                      Crea una simulación para comenzar el análisis
                    </p>
                  </div>
                  {onCreateNew && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleCreateNew}
                      className="h-7 text-xs"
                    >
                      <Plus className="mr-1 h-3 w-3" />
                      Crear Simulación
                    </Button>
                  )}
                </div>
              </div>
            ) : (
              <>
                {/* Clear selection option */}
                {selectedSimulation !== null && (
                  <>
                    <div
                      className="flex cursor-pointer items-center space-x-2 rounded-sm px-2 py-2 text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                      onClick={handleClearSelection}
                    >
                      <div className="h-4 w-4" /> {/* Spacer */}
                      <span className="text-sm italic">Limpiar selección</span>
                    </div>
                    <div className="my-1 h-px bg-border" />
                  </>
                )}

                {/* Create new option */}
                {onCreateNew && (
                  <>
                    <div
                      className="flex cursor-pointer items-center space-x-2 rounded-sm px-2 py-2 text-blue-600 hover:bg-blue-50 hover:text-blue-700"
                      onClick={handleCreateNew}
                    >
                      <Plus className="h-4 w-4" />
                      <span className="text-sm font-medium">
                        Crear Nueva Simulación
                      </span>
                    </div>
                    <div className="my-1 h-px bg-border" />
                  </>
                )}

                {/* Simulation options */}
                {sortedSimulations.map((simulation) => {
                  const isSelected = selectedSimulation === simulation.id;

                  return (
                    <div
                      key={simulation.id}
                      className={cn(
                        'flex cursor-pointer items-start space-x-2 rounded-sm px-2 py-3 hover:bg-accent hover:text-accent-foreground',
                        isSelected && 'border-l-2 border-blue-600 bg-blue-50'
                      )}
                      onClick={() => handleSimulationSelect(simulation.id)}
                    >
                      <Activity
                        className={cn(
                          'mt-0.5 h-4 w-4 text-muted-foreground',
                          isSelected && 'text-blue-600'
                        )}
                      />
                      <div className="min-w-0 flex-1">
                        <div
                          className={cn(
                            'truncate text-sm font-medium',
                            isSelected && 'text-blue-900'
                          )}
                          title={simulation.name}
                        >
                          {simulation.name}
                        </div>
                        {simulation.description && (
                          <div
                            className={cn(
                              'mt-1 line-clamp-2 text-xs text-muted-foreground',
                              isSelected && 'text-blue-600'
                            )}
                          >
                            {simulation.description}
                          </div>
                        )}
                        <div className="mt-2 flex items-center gap-2">
                          <div
                            className={cn(
                              'text-xs text-muted-foreground',
                              isSelected && 'text-blue-600'
                            )}
                          >
                            {formatDate(simulation.created_at)}
                          </div>
                          {showBudgetCount && (
                            <Badge
                              variant={
                                simulation.budget_count > 0
                                  ? 'default'
                                  : 'secondary'
                              }
                              className={cn(
                                'text-xs',
                                isSelected &&
                                  simulation.budget_count > 0 &&
                                  'bg-blue-600',
                                isSelected &&
                                  simulation.budget_count === 0 &&
                                  'bg-blue-200 text-blue-700'
                              )}
                            >
                              {simulation.budget_count} categorías
                            </Badge>
                          )}
                        </div>
                      </div>
                      {isSelected && (
                        <Check className="mt-0.5 h-4 w-4 text-blue-600" />
                      )}
                    </div>
                  );
                })}
              </>
            )}
          </div>

          {/* Footer with selection info */}
          {!isLoading &&
            sortedSimulations.length > 0 &&
            selectedSimulationData && (
              <>
                <div className="my-1 h-px bg-border" />
                <div className="px-2 py-1 text-xs text-blue-600">
                  Seleccionada: {selectedSimulationData.name}
                  {showBudgetCount && (
                    <span className="ml-1">
                      ({selectedSimulationData.budget_count} categorías
                      configuradas)
                    </span>
                  )}
                </div>
              </>
            )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
