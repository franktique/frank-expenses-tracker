"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertCircle, BookOpen, RefreshCw } from "lucide-react";
import { toast } from "@/components/ui/use-toast";

interface EstudioErrorBoundaryProps {
  children: React.ReactNode;
  selectedEstudio: number | null;
  allEstudios: any[];
  onEstudioChange: (estudioId: number | null) => void;
}

export function EstudioErrorBoundary({
  children,
  selectedEstudio,
  allEstudios,
  onEstudioChange,
}: EstudioErrorBoundaryProps) {
  const [hasError, setHasError] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string>("");

  // Check for estudio-related errors
  useEffect(() => {
    // Reset error state when estudios change
    setHasError(false);
    setErrorMessage("");

    // Check if no estudios are available
    if (allEstudios.length === 0) {
      setHasError(true);
      setErrorMessage("no-estudios");
      return;
    }

    // Check if selected estudio no longer exists
    if (selectedEstudio !== null) {
      const estudioExists = allEstudios.some((e) => e.id === selectedEstudio);
      if (!estudioExists) {
        setHasError(true);
        setErrorMessage("estudio-deleted");

        // Auto-select first available estudio
        const firstEstudio = allEstudios[0];
        if (firstEstudio) {
          onEstudioChange(firstEstudio.id);

          toast({
            title: "Estudio eliminado",
            description: `Se seleccionó automáticamente "${firstEstudio.name}"`,
            variant: "default",
          });

          // Clear error after auto-selection
          setTimeout(() => {
            setHasError(false);
            setErrorMessage("");
          }, 100);
        }
      }
    }
  }, [selectedEstudio, allEstudios, onEstudioChange]);

  if (hasError) {
    if (errorMessage === "no-estudios") {
      return (
        <div className="container mx-auto py-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-destructive" />
                Dashboard no disponible
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <BookOpen className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-lg font-medium mb-2">
                  No hay estudios disponibles
                </h3>
                <p className="text-muted-foreground mb-6">
                  Para usar el dashboard de agrupadores, primero debe crear al
                  menos un estudio y asignarle agrupadores.
                </p>
                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                  <Button onClick={() => (window.location.href = "/estudios")}>
                    <BookOpen className="mr-2 h-4 w-4" />
                    Crear Estudio
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => window.location.reload()}
                  >
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Recargar
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      );
    }

    if (errorMessage === "estudio-deleted") {
      return (
        <div className="container mx-auto py-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-warning" />
                Estudio eliminado
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-4">
                <p className="text-muted-foreground mb-4">
                  El estudio seleccionado ha sido eliminado. Seleccionando
                  automáticamente el primer estudio disponible...
                </p>
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mx-auto"></div>
              </div>
            </CardContent>
          </Card>
        </div>
      );
    }
  }

  return <>{children}</>;
}
