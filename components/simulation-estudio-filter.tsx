"use client";

import { useState } from "react";
import {
  Check,
  ChevronDown,
  BookOpen,
  AlertCircle,
  RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { cn } from "@/lib/utils";

type EstudioData = {
  id: number;
  name: string;
  grouper_count: number;
  created_at: string;
  updated_at: string;
};

interface SimulationEstudioFilterProps {
  allEstudios: EstudioData[];
  selectedEstudio: number | null;
  onSelectionChange: (selected: number | null) => void;
  isLoading?: boolean;
  error?: string | null;
  onRetry?: () => void;
  simulationContext?: boolean;
  persistSelection?: boolean;
}

export function SimulationEstudioFilter({
  allEstudios,
  selectedEstudio,
  onSelectionChange,
  isLoading = false,
  error = null,
  onRetry,
  simulationContext = false,
  persistSelection = true,
}: SimulationEstudioFilterProps) {
  const [isOpen, setIsOpen] = useState(false);

  // Sort estudios alphabetically by name
  const sortedEstudios = [...allEstudios].sort((a, b) =>
    a.name.localeCompare(b.name)
  );

  // Handle estudio selection
  const handleEstudioSelect = (estudioId: number) => {
    onSelectionChange(estudioId);
    setIsOpen(false);

    // Persist selection if enabled
    if (persistSelection && simulationContext) {
      try {
        sessionStorage.setItem(
          "simulation-selectedEstudioId",
          estudioId.toString()
        );
      } catch (error) {
        console.warn("Failed to persist estudio selection:", error);
      }
    }
  };

  // Handle clear selection
  const handleClearSelection = () => {
    onSelectionChange(null);
    setIsOpen(false);

    if (persistSelection && simulationContext) {
      try {
        sessionStorage.removeItem("simulation-selectedEstudioId");
      } catch (error) {
        console.warn("Failed to clear persisted estudio selection:", error);
      }
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

    if (selectedEstudio === null) {
      if (allEstudios.length === 0) {
        return "No hay estudios disponibles";
      }
      return simulationContext
        ? "Seleccionar estudio para simulación"
        : "Seleccionar estudio";
    }

    const selectedEstudioData = allEstudios.find(
      (e) => e.id === selectedEstudio
    );
    return selectedEstudioData?.name || "Estudio no encontrado";
  };

  // Get selected estudio data for display
  const selectedEstudioData = selectedEstudio
    ? allEstudios.find((e) => e.id === selectedEstudio)
    : null;

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={isOpen}
          className={cn(
            "w-[300px] justify-between",
            error && "border-destructive text-destructive",
            simulationContext && "border-blue-200 bg-blue-50/50"
          )}
          disabled={isLoading || allEstudios.length === 0}
        >
          <div className="flex items-center gap-2">
            {error ? (
              <AlertCircle className="h-4 w-4" />
            ) : (
              <BookOpen
                className={cn("h-4 w-4", simulationContext && "text-blue-600")}
              />
            )}
            <span className="truncate">{getDisplayText()}</span>
          </div>
          <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[300px] p-0" align="start">
        <div className="p-2">
          {/* Header with context indicator */}
          <div className="px-2 py-2 text-sm font-medium text-muted-foreground border-b flex items-center justify-between">
            <span>
              {simulationContext
                ? "Estudio para Simulación"
                : "Seleccionar Estudio"}
            </span>
            {simulationContext && (
              <div className="text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded">
                Simulación
              </div>
            )}
          </div>

          {/* Content */}
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
                  Cargando estudios...
                </div>
              </div>
            ) : sortedEstudios.length === 0 ? (
              <div className="px-2 py-4 text-sm text-muted-foreground text-center">
                <div className="space-y-3">
                  <BookOpen className="h-8 w-8 mx-auto opacity-50" />
                  <div>
                    <p className="font-medium">No hay estudios disponibles</p>
                    <p className="text-xs mt-1">
                      {simulationContext
                        ? "Crea un estudio para usar en simulaciones"
                        : "Crea un estudio para comenzar a filtrar agrupadores"}
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => (window.location.href = "/estudios")}
                    className="text-xs h-7"
                  >
                    Ir a Estudios
                  </Button>
                </div>
              </div>
            ) : (
              <>
                {/* Clear selection option */}
                {selectedEstudio !== null && (
                  <>
                    <div
                      className="flex items-center space-x-2 px-2 py-2 hover:bg-accent hover:text-accent-foreground rounded-sm cursor-pointer text-muted-foreground"
                      onClick={handleClearSelection}
                    >
                      <div className="h-4 w-4" /> {/* Spacer */}
                      <span className="text-sm italic">Limpiar selección</span>
                    </div>
                    <div className="h-px bg-border my-1" />
                  </>
                )}

                {/* Estudio options */}
                {sortedEstudios.map((estudio) => {
                  const isSelected = selectedEstudio === estudio.id;

                  return (
                    <div
                      key={estudio.id}
                      className={cn(
                        "flex items-center space-x-2 px-2 py-2 hover:bg-accent hover:text-accent-foreground rounded-sm cursor-pointer",
                        isSelected &&
                          simulationContext &&
                          "bg-blue-50 border-l-2 border-blue-600"
                      )}
                      onClick={() => handleEstudioSelect(estudio.id)}
                    >
                      <BookOpen
                        className={cn(
                          "h-4 w-4 text-muted-foreground",
                          isSelected && simulationContext && "text-blue-600"
                        )}
                      />
                      <div className="flex-1 min-w-0">
                        <div
                          className={cn(
                            "text-sm font-medium truncate",
                            isSelected && simulationContext && "text-blue-900"
                          )}
                          title={estudio.name}
                        >
                          {estudio.name}
                        </div>
                        <div
                          className={cn(
                            "text-xs text-muted-foreground",
                            isSelected && simulationContext && "text-blue-600"
                          )}
                        >
                          {estudio.grouper_count}{" "}
                          {estudio.grouper_count === 1
                            ? "agrupador"
                            : "agrupadores"}
                        </div>
                      </div>
                      {isSelected && (
                        <Check
                          className={cn(
                            "h-4 w-4 text-primary",
                            simulationContext && "text-blue-600"
                          )}
                        />
                      )}
                    </div>
                  );
                })}
              </>
            )}
          </div>

          {/* Footer with selection info */}
          {!isLoading && sortedEstudios.length > 0 && selectedEstudioData && (
            <>
              <div className="h-px bg-border my-1" />
              <div
                className={cn(
                  "px-2 py-1 text-xs text-muted-foreground",
                  simulationContext && "text-blue-600"
                )}
              >
                Seleccionado: {selectedEstudioData.name} (
                {selectedEstudioData.grouper_count}{" "}
                {selectedEstudioData.grouper_count === 1
                  ? "agrupador"
                  : "agrupadores"}
                )
                {simulationContext && (
                  <span className="ml-1">(simulación)</span>
                )}
              </div>
            </>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
