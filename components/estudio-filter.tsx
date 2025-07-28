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

interface EstudioFilterProps {
  allEstudios: EstudioData[];
  selectedEstudio: number | null;
  onSelectionChange: (selected: number | null) => void;
  isLoading?: boolean;
  error?: string | null;
  onRetry?: () => void;
}

export function EstudioFilter({
  allEstudios,
  selectedEstudio,
  onSelectionChange,
  isLoading = false,
  error = null,
  onRetry,
}: EstudioFilterProps) {
  const [isOpen, setIsOpen] = useState(false);

  // Sort estudios alphabetically by name
  const sortedEstudios = [...allEstudios].sort((a, b) =>
    a.name.localeCompare(b.name)
  );

  // Handle estudio selection
  const handleEstudioSelect = (estudioId: number) => {
    onSelectionChange(estudioId);
    setIsOpen(false);
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
      return "Seleccionar estudio";
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
            "w-[280px] justify-between",
            error && "border-destructive text-destructive"
          )}
          disabled={isLoading || allEstudios.length === 0}
        >
          <div className="flex items-center gap-2">
            {error ? (
              <AlertCircle className="h-4 w-4" />
            ) : (
              <BookOpen className="h-4 w-4" />
            )}
            <span className="truncate">{getDisplayText()}</span>
          </div>
          <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[280px] p-0" align="start">
        <div className="p-2">
          {/* Header */}
          <div className="px-2 py-2 text-sm font-medium text-muted-foreground border-b">
            Seleccionar Estudio
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
                      Crea un estudio para comenzar a filtrar agrupadores
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
              sortedEstudios.map((estudio) => {
                const isSelected = selectedEstudio === estudio.id;

                return (
                  <div
                    key={estudio.id}
                    className="flex items-center space-x-2 px-2 py-2 hover:bg-accent hover:text-accent-foreground rounded-sm cursor-pointer"
                    onClick={() => handleEstudioSelect(estudio.id)}
                  >
                    <BookOpen className="h-4 w-4 text-muted-foreground" />
                    <div className="flex-1 min-w-0">
                      <div
                        className="text-sm font-medium truncate"
                        title={estudio.name}
                      >
                        {estudio.name}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {estudio.grouper_count}{" "}
                        {estudio.grouper_count === 1
                          ? "agrupador"
                          : "agrupadores"}
                      </div>
                    </div>
                    {isSelected && <Check className="h-4 w-4 text-primary" />}
                  </div>
                );
              })
            )}
          </div>

          {/* Footer with selection info */}
          {!isLoading && sortedEstudios.length > 0 && selectedEstudioData && (
            <>
              <div className="h-px bg-border my-1" />
              <div className="px-2 py-1 text-xs text-muted-foreground">
                Seleccionado: {selectedEstudioData.name} (
                {selectedEstudioData.grouper_count}{" "}
                {selectedEstudioData.grouper_count === 1
                  ? "agrupador"
                  : "agrupadores"}
                )
              </div>
            </>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
