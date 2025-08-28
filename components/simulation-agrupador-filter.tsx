"use client";

import { useState } from "react";
import {
  Check,
  ChevronDown,
  Filter,
  AlertCircle,
  RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { cn } from "@/lib/utils";

type GrouperData = {
  grouper_id: number;
  grouper_name: string;
  total_amount: number;
  simulation_total?: number;
  budget_amount?: number;
};

interface SimulationAgrupadorFilterProps {
  allGroupers: GrouperData[];
  selectedGroupers: number[];
  onSelectionChange: (selected: number[]) => void;
  isLoading?: boolean;
  error?: string | null;
  onRetry?: () => void;
  simulationContext?: boolean;
  showSimulationData?: boolean;
}

export function SimulationAgrupadorFilter({
  allGroupers,
  selectedGroupers,
  onSelectionChange,
  isLoading = false,
  error = null,
  onRetry,
  simulationContext = false,
  showSimulationData = false,
}: SimulationAgrupadorFilterProps) {
  const [isOpen, setIsOpen] = useState(false);

  // Sort groupers alphabetically by name
  const sortedGroupers = [...allGroupers].sort((a, b) =>
    a.grouper_name.localeCompare(b.grouper_name)
  );

  // Check if all groupers are selected
  const isAllSelected = selectedGroupers.length === allGroupers.length;

  // Check if some (but not all) groupers are selected
  const isIndeterminate = selectedGroupers.length > 0 && !isAllSelected;

  // Handle "Select All" toggle
  const handleSelectAll = () => {
    if (isAllSelected) {
      // Deselect all
      onSelectionChange([]);
    } else {
      // Select all
      onSelectionChange(allGroupers.map((g) => g.grouper_id));
    }
  };

  // Handle individual grouper selection
  const handleGrouperToggle = (grouperId: number) => {
    const isSelected = selectedGroupers.includes(grouperId);

    if (isSelected) {
      // Remove from selection
      onSelectionChange(selectedGroupers.filter((id) => id !== grouperId));
    } else {
      // Add to selection
      onSelectionChange([...selectedGroupers, grouperId]);
    }
  };

  // Handle retry action
  const handleRetry = () => {
    if (onRetry) {
      onRetry();
    }
  };

  // Get display text for the trigger button
  const getDisplayText = () => {
    if (isLoading) {
      return "Cargando...";
    }

    if (error) {
      return "Error al cargar";
    }

    if (selectedGroupers.length === 0) {
      return simulationContext
        ? "Seleccionar agrupadores para simulación"
        : "Seleccionar agrupadores";
    }

    if (isAllSelected) {
      return "Todos los agrupadores";
    }

    if (selectedGroupers.length === 1) {
      const selectedGrouper = allGroupers.find(
        (g) => g.grouper_id === selectedGroupers[0]
      );
      return selectedGrouper?.grouper_name || "1 agrupador";
    }

    return `${selectedGroupers.length} agrupadores`;
  };

  // Format currency for display
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("es-CO", {
      style: "currency",
      currency: "COP",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={isOpen}
          className={cn(
            "w-[280px] justify-between",
            error && "border-destructive text-destructive",
            simulationContext && "border-blue-200 bg-blue-50/50"
          )}
          disabled={isLoading}
        >
          <div className="flex items-center gap-2">
            {error ? (
              <AlertCircle className="h-4 w-4" />
            ) : (
              <Filter
                className={cn("h-4 w-4", simulationContext && "text-blue-600")}
              />
            )}
            <span className="truncate">{getDisplayText()}</span>
          </div>
          <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[320px] p-0" align="start">
        <div className="p-2">
          {/* Header with context indicator */}
          {simulationContext && (
            <div className="px-2 py-2 text-xs text-blue-600 bg-blue-50 rounded-sm mb-2">
              Filtros para análisis de simulación
            </div>
          )}

          {/* Select All option */}
          <div className="flex items-center space-x-2 px-2 py-2 hover:bg-accent hover:text-accent-foreground rounded-sm cursor-pointer">
            <Checkbox
              id="select-all"
              checked={isAllSelected}
              ref={(ref) => {
                if (ref) {
                  ref.indeterminate = isIndeterminate;
                }
              }}
              onCheckedChange={handleSelectAll}
              disabled={isLoading}
            />
            <label
              htmlFor="select-all"
              className="text-sm font-medium cursor-pointer flex-1"
            >
              Todos
            </label>
          </div>

          {/* Separator */}
          <div className="h-px bg-border my-1" />

          {/* Individual grouper options */}
          <div className="max-h-[300px] overflow-y-auto">
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
                        <RefreshCw className="h-3 w-3 mr-1" />
                        Reintentar
                      </Button>
                    )}
                  </AlertDescription>
                </Alert>
              </div>
            ) : isLoading ? (
              <div className="px-2 py-4 text-sm text-muted-foreground text-center">
                <div className="flex items-center justify-center gap-2">
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  Cargando agrupadores...
                </div>
              </div>
            ) : sortedGroupers.length === 0 ? (
              <div className="px-2 py-4 text-sm text-muted-foreground text-center">
                No hay agrupadores disponibles
              </div>
            ) : (
              sortedGroupers.map((grouper) => {
                const isSelected = selectedGroupers.includes(
                  grouper.grouper_id
                );

                return (
                  <div
                    key={grouper.grouper_id}
                    className="flex items-center space-x-2 px-2 py-2 hover:bg-accent hover:text-accent-foreground rounded-sm cursor-pointer"
                    onClick={() => handleGrouperToggle(grouper.grouper_id)}
                  >
                    <Checkbox
                      id={`grouper-${grouper.grouper_id}`}
                      checked={isSelected}
                      onCheckedChange={() =>
                        handleGrouperToggle(grouper.grouper_id)
                      }
                      disabled={isLoading}
                    />
                    <div className="flex-1 min-w-0">
                      <label
                        htmlFor={`grouper-${grouper.grouper_id}`}
                        className="text-sm cursor-pointer font-medium truncate block"
                        title={grouper.grouper_name}
                      >
                        {grouper.grouper_name}
                      </label>
                      {showSimulationData &&
                        simulationContext &&
                        grouper.simulation_total !== undefined && (
                          <div className="text-xs text-blue-600 mt-1">
                            Simulación:{" "}
                            {formatCurrency(grouper.simulation_total)}
                          </div>
                        )}
                      {showSimulationData &&
                        !simulationContext &&
                        grouper.total_amount !== undefined && (
                          <div className="text-xs text-muted-foreground mt-1">
                            Total: {formatCurrency(grouper.total_amount)}
                          </div>
                        )}
                    </div>
                    {isSelected && <Check className="h-4 w-4 text-primary" />}
                  </div>
                );
              })
            )}
          </div>

          {/* Footer with selection count */}
          {!isLoading && sortedGroupers.length > 0 && (
            <>
              <div className="h-px bg-border my-1" />
              <div className="px-2 py-1 text-xs text-muted-foreground">
                {selectedGroupers.length} de {allGroupers.length} seleccionados
                {simulationContext && (
                  <span className="text-blue-600 ml-1">(simulación)</span>
                )}
              </div>
            </>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
