"use client";

import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  AlertCircle,
  RefreshCw,
  PlusCircle,
  BarChart3,
  TrendingUp,
  Calculator,
  Home,
  Database,
  Zap,
} from "lucide-react";
import { formatCurrency } from "@/lib/utils";

// Fallback for when simulation data is missing or loading fails
export function SimulationDataFallback({
  simulationId,
  error,
  onRetry,
  onCreateNew,
  isRetrying = false,
  showCreateOption = true,
}: {
  simulationId?: number;
  error?: string;
  onRetry?: () => void;
  onCreateNew?: () => void;
  isRetrying?: boolean;
  showCreateOption?: boolean;
}) {
  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-muted-foreground">
          <Database className="h-5 w-5" />
          Datos de simulación no disponibles
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="text-center py-8">
          <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <div className="space-y-2">
            <h3 className="text-lg font-semibold">
              {simulationId
                ? `Simulación #${simulationId} no encontrada`
                : "No se pudieron cargar los datos"}
            </h3>
            <p className="text-sm text-muted-foreground max-w-md mx-auto">
              {error ||
                "Los datos de la simulación no están disponibles en este momento."}
            </p>
          </div>
        </div>

        <div className="flex justify-center gap-2">
          {onRetry && (
            <Button
              variant="outline"
              onClick={onRetry}
              disabled={isRetrying}
              className="flex items-center gap-2"
            >
              <RefreshCw
                className={`h-4 w-4 ${isRetrying ? "animate-spin" : ""}`}
              />
              {isRetrying ? "Reintentando..." : "Reintentar"}
            </Button>
          )}

          {showCreateOption && onCreateNew && (
            <Button onClick={onCreateNew} className="flex items-center gap-2">
              <PlusCircle className="h-4 w-4" />
              Crear Nueva Simulación
            </Button>
          )}

          <Button
            variant="outline"
            onClick={() => (window.location.href = "/simular")}
            className="flex items-center gap-2"
          >
            <Home className="h-4 w-4" />
            Ver Simulaciones
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// Fallback for when simulation analytics data is missing
export function SimulationAnalyticsFallback({
  simulationId,
  simulationName,
  error,
  onRetry,
  onConfigureBudgets,
  isRetrying = false,
  hasNoBudgets = false,
}: {
  simulationId: number;
  simulationName?: string;
  error?: string;
  onRetry?: () => void;
  onConfigureBudgets?: () => void;
  isRetrying?: boolean;
  hasNoBudgets?: boolean;
}) {
  const title = hasNoBudgets
    ? "Sin presupuestos configurados"
    : "Datos de análisis no disponibles";

  const description = hasNoBudgets
    ? "Esta simulación no tiene presupuestos configurados. Configure los presupuestos para ver el análisis."
    : error ||
      "No se pudieron cargar los datos de análisis para esta simulación.";

  const icon = hasNoBudgets ? (
    <Calculator className="h-12 w-12 text-amber-500 mx-auto mb-4" />
  ) : (
    <BarChart3 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
  );

  return (
    <Card className="w-full">
      <CardContent className="py-12">
        <div className="text-center space-y-4">
          {icon}
          <div className="space-y-2">
            <h3 className="text-lg font-semibold">{title}</h3>
            <p className="text-sm text-muted-foreground max-w-md mx-auto">
              {description}
              {simulationName && ` (${simulationName})`}
            </p>
          </div>

          <div className="flex justify-center gap-2 pt-4">
            {hasNoBudgets && onConfigureBudgets && (
              <Button
                onClick={onConfigureBudgets}
                className="flex items-center gap-2"
              >
                <Calculator className="h-4 w-4" />
                Configurar Presupuestos
              </Button>
            )}

            {!hasNoBudgets && onRetry && (
              <Button
                variant="outline"
                onClick={onRetry}
                disabled={isRetrying}
                className="flex items-center gap-2"
              >
                <RefreshCw
                  className={`h-4 w-4 ${isRetrying ? "animate-spin" : ""}`}
                />
                {isRetrying ? "Reintentando..." : "Reintentar"}
              </Button>
            )}

            <Button
              variant="outline"
              onClick={() =>
                (window.location.href = `/simular/${simulationId}`)
              }
              className="flex items-center gap-2"
            >
              <Home className="h-4 w-4" />
              Ir a Simulación
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Fallback for empty simulation list
export function EmptySimulationListFallback({
  onCreateFirst,
  isLoading = false,
}: {
  onCreateFirst?: () => void;
  isLoading?: boolean;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>No hay simulaciones</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-center py-8 space-y-4">
          <div className="mx-auto h-12 w-12 rounded-full bg-muted flex items-center justify-center mb-4">
            <PlusCircle className="h-6 w-6 text-muted-foreground" />
          </div>
          <div className="space-y-2">
            <p className="text-muted-foreground">
              Las simulaciones te permiten crear escenarios hipotéticos de
              presupuesto y compararlos with datos históricos.
            </p>
            <p className="text-sm text-muted-foreground">
              Crea tu primera simulación para comenzar a analizar diferentes
              escenarios financieros.
            </p>
          </div>
          {onCreateFirst && (
            <Button
              onClick={onCreateFirst}
              disabled={isLoading}
              className="flex items-center gap-2"
            >
              {isLoading ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                <PlusCircle className="h-4 w-4" />
              )}
              {isLoading ? "Creando..." : "Crear Primera Simulación"}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// Fallback for when categories are missing for budget configuration
export function MissingCategoriesFallback({
  onRetry,
  onGoToCategories,
  isRetrying = false,
}: {
  onRetry?: () => void;
  onGoToCategories?: () => void;
  isRetrying?: boolean;
}) {
  return (
    <Card className="w-full">
      <CardContent className="py-12">
        <div className="text-center space-y-4">
          <AlertCircle className="h-12 w-12 text-amber-500 mx-auto mb-4" />
          <div className="space-y-2">
            <h3 className="text-lg font-semibold">
              No hay categorías disponibles
            </h3>
            <p className="text-sm text-muted-foreground max-w-md mx-auto">
              Para configurar presupuestos de simulación, primero debe crear
              categorías en el sistema.
            </p>
          </div>

          <div className="flex justify-center gap-2 pt-4">
            {onGoToCategories && (
              <Button
                onClick={onGoToCategories}
                className="flex items-center gap-2"
              >
                <PlusCircle className="h-4 w-4" />
                Crear Categorías
              </Button>
            )}

            {onRetry && (
              <Button
                variant="outline"
                onClick={onRetry}
                disabled={isRetrying}
                className="flex items-center gap-2"
              >
                <RefreshCw
                  className={`h-4 w-4 ${isRetrying ? "animate-spin" : ""}`}
                />
                {isRetrying ? "Verificando..." : "Verificar Nuevamente"}
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Fallback summary cards with placeholder data
export function SimulationSummaryFallback({
  showPlaceholder = false,
  isLoading = false,
}: {
  showPlaceholder?: boolean;
  isLoading?: boolean;
}) {
  const placeholderValue = showPlaceholder ? formatCurrency(0) : "---";

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <Card className={isLoading ? "animate-pulse" : ""}>
        <CardContent className="p-4">
          <div className="flex items-center gap-2">
            <Calculator className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium text-muted-foreground">
              Total Simulación
            </span>
          </div>
          <p className="text-2xl font-bold text-muted-foreground mt-1">
            {placeholderValue}
          </p>
        </CardContent>
      </Card>

      <Card className={isLoading ? "animate-pulse" : ""}>
        <CardContent className="p-4">
          <div className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium text-muted-foreground">
              Promedio Histórico
            </span>
          </div>
          <p className="text-2xl font-bold text-muted-foreground mt-1">
            {placeholderValue}
          </p>
        </CardContent>
      </Card>

      <Card className={isLoading ? "animate-pulse" : ""}>
        <CardContent className="p-4">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium text-muted-foreground">
              Variación Total
            </span>
          </div>
          <p className="text-2xl font-bold text-muted-foreground mt-1">
            {showPlaceholder ? "0.0%" : "---"}
          </p>
        </CardContent>
      </Card>

      <Card className={isLoading ? "animate-pulse" : ""}>
        <CardContent className="p-4">
          <div className="flex items-center gap-2">
            <Zap className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium text-muted-foreground">
              Variaciones Significativas
            </span>
          </div>
          <p className="text-2xl font-bold text-muted-foreground mt-1">
            {showPlaceholder ? "0" : "---"}
          </p>
          <p className="text-xs text-muted-foreground">de 0 agrupadores</p>
        </CardContent>
      </Card>
    </div>
  );
}

// Fallback for chart components when data is missing
export function ChartDataFallback({
  title = "Gráfico no disponible",
  description,
  onRetry,
  isRetrying = false,
  height = "400px",
}: {
  title?: string;
  description?: string;
  onRetry?: () => void;
  isRetrying?: boolean;
  height?: string;
}) {
  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-muted-foreground">
          <BarChart3 className="h-5 w-5" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div
          className="flex items-center justify-center border-2 border-dashed border-muted rounded-lg"
          style={{ height }}
        >
          <div className="text-center space-y-4">
            <BarChart3 className="h-12 w-12 text-muted-foreground mx-auto" />
            <div className="space-y-2">
              <p className="text-sm font-medium text-muted-foreground">
                Datos no disponibles
              </p>
              {description && (
                <p className="text-xs text-muted-foreground max-w-sm">
                  {description}
                </p>
              )}
            </div>
            {onRetry && (
              <Button
                variant="outline"
                size="sm"
                onClick={onRetry}
                disabled={isRetrying}
                className="flex items-center gap-2"
              >
                <RefreshCw
                  className={`h-4 w-4 ${isRetrying ? "animate-spin" : ""}`}
                />
                {isRetrying ? "Cargando..." : "Reintentar"}
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Generic loading skeleton for simulation components
export function SimulationLoadingSkeleton({
  type = "card",
  count = 1,
}: {
  type?: "card" | "table" | "chart" | "summary";
  count?: number;
}) {
  if (type === "summary") {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <div className="h-4 w-4 bg-muted rounded" />
                <div className="h-4 w-20 bg-muted rounded" />
              </div>
              <div className="h-8 w-24 bg-muted rounded" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (type === "chart") {
    return (
      <Card className="animate-pulse">
        <CardHeader>
          <div className="h-6 w-48 bg-muted rounded" />
          <div className="h-4 w-64 bg-muted rounded" />
        </CardHeader>
        <CardContent>
          <div className="h-80 bg-muted rounded" />
        </CardContent>
      </Card>
    );
  }

  if (type === "table") {
    return (
      <Card className="animate-pulse">
        <CardHeader>
          <div className="h-6 w-48 bg-muted rounded" />
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {Array.from({ length: count }).map((_, i) => (
              <div key={i} className="flex items-center space-x-4">
                <div className="h-4 w-32 bg-muted rounded" />
                <div className="h-4 w-20 bg-muted rounded" />
                <div className="h-4 w-20 bg-muted rounded" />
                <div className="h-4 w-24 bg-muted rounded" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  // Default card skeleton
  return (
    <div className="space-y-4">
      {Array.from({ length: count }).map((_, i) => (
        <Card key={i} className="animate-pulse">
          <CardHeader>
            <div className="h-6 w-48 bg-muted rounded" />
            <div className="h-4 w-64 bg-muted rounded" />
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="h-4 w-full bg-muted rounded" />
              <div className="h-4 w-3/4 bg-muted rounded" />
              <div className="h-4 w-1/2 bg-muted rounded" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// Alert component for data consistency warnings
export function DataConsistencyAlert({
  issues,
  onResolve,
  onIgnore,
  severity = "warning",
}: {
  issues: string[];
  onResolve?: () => void;
  onIgnore?: () => void;
  severity?: "warning" | "error";
}) {
  if (issues.length === 0) return null;

  return (
    <Alert variant={severity === "error" ? "destructive" : "default"}>
      <AlertCircle className="h-4 w-4" />
      <AlertDescription>
        <div className="space-y-2">
          <p className="font-medium">
            {severity === "error"
              ? "Errores de consistencia detectados:"
              : "Advertencias de consistencia:"}
          </p>
          <ul className="list-disc list-inside text-sm space-y-1">
            {issues.map((issue, index) => (
              <li key={index}>{issue}</li>
            ))}
          </ul>
          <div className="flex gap-2 pt-2">
            {onResolve && (
              <Button size="sm" variant="outline" onClick={onResolve}>
                Resolver
              </Button>
            )}
            {onIgnore && (
              <Button size="sm" variant="ghost" onClick={onIgnore}>
                Ignorar
              </Button>
            )}
          </div>
        </div>
      </AlertDescription>
    </Alert>
  );
}
