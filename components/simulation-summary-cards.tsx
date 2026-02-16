'use client';

import React, { memo, useMemo } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Target,
  TrendingUp,
  TrendingDown,
  BarChart3,
  Zap,
  AlertTriangle,
  CheckCircle,
  Activity,
  Calendar,
  DollarSign,
  Percent,
} from 'lucide-react';
import { formatCurrency } from '@/lib/utils';

// Types for simulation metrics
interface SimulationMetrics {
  totalSimulation: number;
  totalHistoricalAvg: number;
  overallVariance: number;
  grouperCount: number;
  significantVariations: number;
  categoriesConfigured: number;
  topVariations: Array<{
    grouper_name: string;
    variance_percentage: number;
    trend: 'increase' | 'decrease' | 'stable';
  }>;
  budgetDistribution: Array<{
    payment_method: string;
    amount: number;
    percentage: number;
  }>;
}

interface SimulationInfo {
  id: number;
  name: string;
  description: string | null;
  created_at: string;
  updated_at: string;
  budget_count: number;
}

interface SimulationSummaryCardsProps {
  simulationInfo: SimulationInfo;
  metrics: SimulationMetrics;
  isLoading?: boolean;
  onRefresh?: () => void;
  onNavigateToConfig?: () => void;
  onExportSummary?: () => void;
}

export const SimulationSummaryCards = memo<SimulationSummaryCardsProps>(
  ({
    simulationInfo,
    metrics,
    isLoading = false,
    onRefresh,
    onNavigateToConfig,
    onExportSummary,
  }) => {
    // Calculate status indicators
    const statusIndicators = useMemo(() => {
      const hasConfiguration = metrics.categoriesConfigured > 0;
      const hasSignificantChanges = metrics.significantVariations > 0;
      const isPositiveVariance = metrics.overallVariance > 0;
      const isHighVariance = Math.abs(metrics.overallVariance) > 20;

      return {
        configurationStatus: hasConfiguration ? 'complete' : 'incomplete',
        varianceStatus: isHighVariance ? 'high' : 'normal',
        trendStatus: isPositiveVariance ? 'positive' : 'negative',
        overallHealth:
          hasConfiguration && !isHighVariance ? 'good' : 'attention',
      };
    }, [metrics]);

    // Format creation date
    const formattedDate = useMemo(() => {
      return new Date(simulationInfo.created_at).toLocaleDateString('es-CO', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    }, [simulationInfo.created_at]);

    if (isLoading) {
      return (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, index) => (
            <Card key={index}>
              <CardContent className="p-4">
                <div className="animate-pulse">
                  <div className="mb-2 h-4 w-3/4 rounded bg-muted"></div>
                  <div className="mb-2 h-8 w-1/2 rounded bg-muted"></div>
                  <div className="h-3 w-full rounded bg-muted"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      );
    }

    return (
      <div className="space-y-6">
        {/* Main metrics cards */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
          {/* Total Simulation Amount */}
          <Card>
            <CardContent className="p-4">
              <div className="mb-2 flex items-center gap-2">
                <Target className="h-4 w-4 text-blue-600" />
                <span className="text-sm font-medium">Total Simulación</span>
              </div>
              <p className="mb-1 text-2xl font-bold text-blue-600">
                {formatCurrency(metrics.totalSimulation)}
              </p>
              <p className="text-xs text-muted-foreground">
                {metrics.grouperCount} agrupadores configurados
              </p>
            </CardContent>
          </Card>

          {/* Historical Average */}
          <Card>
            <CardContent className="p-4">
              <div className="mb-2 flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-gray-600" />
                <span className="text-sm font-medium">Promedio Histórico</span>
              </div>
              <p className="mb-1 text-2xl font-bold text-gray-600">
                {formatCurrency(metrics.totalHistoricalAvg)}
              </p>
              <p className="text-xs text-muted-foreground">
                Base de comparación
              </p>
            </CardContent>
          </Card>

          {/* Overall Variance */}
          <Card>
            <CardContent className="p-4">
              <div className="mb-2 flex items-center gap-2">
                <TrendingUp
                  className={`h-4 w-4 ${
                    metrics.overallVariance > 0
                      ? 'text-green-600'
                      : metrics.overallVariance < 0
                        ? 'text-red-600'
                        : 'text-gray-600'
                  }`}
                />
                <span className="text-sm font-medium">Variación Total</span>
              </div>
              <p
                className={`mb-1 text-2xl font-bold ${
                  metrics.overallVariance > 0
                    ? 'text-green-600'
                    : metrics.overallVariance < 0
                      ? 'text-red-600'
                      : 'text-gray-600'
                }`}
              >
                {metrics.overallVariance > 0 ? '+' : ''}
                {metrics.overallVariance.toFixed(1)}%
              </p>
              <p className="text-xs text-muted-foreground">
                vs promedio histórico
              </p>
            </CardContent>
          </Card>

          {/* Significant Variations */}
          <Card>
            <CardContent className="p-4">
              <div className="mb-2 flex items-center gap-2">
                <Zap className="h-4 w-4 text-amber-600" />
                <span className="text-sm font-medium">
                  Variaciones Significativas
                </span>
              </div>
              <p className="mb-1 text-2xl font-bold text-amber-600">
                {metrics.significantVariations}
              </p>
              <p className="text-xs text-muted-foreground">cambios {'>'}10%</p>
            </CardContent>
          </Card>
        </div>

        {/* Status and info cards */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {/* Configuration Status */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                {statusIndicators.configurationStatus === 'complete' ? (
                  <CheckCircle className="h-4 w-4 text-green-600" />
                ) : (
                  <AlertTriangle className="h-4 w-4 text-amber-600" />
                )}
                Estado de Configuración
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Categorías configuradas:</span>
                  <span className="font-medium">
                    {metrics.categoriesConfigured}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Agrupadores activos:</span>
                  <span className="font-medium">{metrics.grouperCount}</span>
                </div>
                <Badge
                  variant={
                    statusIndicators.configurationStatus === 'complete'
                      ? 'default'
                      : 'secondary'
                  }
                  className="w-full justify-center"
                >
                  {statusIndicators.configurationStatus === 'complete'
                    ? 'Configuración Completa'
                    : 'Configuración Pendiente'}
                </Badge>
                {statusIndicators.configurationStatus !== 'complete' && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full"
                    onClick={onNavigateToConfig}
                  >
                    Completar Configuración
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Top Variations */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Activity className="h-4 w-4 text-blue-600" />
                Principales Variaciones
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="space-y-2">
                {metrics.topVariations.slice(0, 3).map((variation, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between"
                  >
                    <div className="flex items-center gap-2">
                      {variation.trend === 'increase' ? (
                        <TrendingUp className="h-3 w-3 text-green-600" />
                      ) : variation.trend === 'decrease' ? (
                        <TrendingDown className="h-3 w-3 text-red-600" />
                      ) : (
                        <div className="h-3 w-3 rounded-full bg-gray-400" />
                      )}
                      <span
                        className="max-w-[100px] truncate text-sm"
                        title={variation.grouper_name}
                      >
                        {variation.grouper_name}
                      </span>
                    </div>
                    <Badge
                      variant={
                        variation.trend === 'increase'
                          ? 'default'
                          : variation.trend === 'decrease'
                            ? 'destructive'
                            : 'secondary'
                      }
                      className="text-xs"
                    >
                      {variation.variance_percentage > 0 ? '+' : ''}
                      {variation.variance_percentage.toFixed(1)}%
                    </Badge>
                  </div>
                ))}
                {metrics.topVariations.length === 0 && (
                  <p className="text-sm italic text-muted-foreground">
                    No hay variaciones significativas
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Simulation Info */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Calendar className="h-4 w-4 text-gray-600" />
                Información de Simulación
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="space-y-2 text-sm">
                <div>
                  <span className="text-muted-foreground">Nombre:</span>
                  <p
                    className="truncate font-medium"
                    title={simulationInfo.name}
                  >
                    {simulationInfo.name}
                  </p>
                </div>
                {simulationInfo.description && (
                  <div>
                    <span className="text-muted-foreground">Descripción:</span>
                    <p
                      className="truncate text-xs text-muted-foreground"
                      title={simulationInfo.description}
                    >
                      {simulationInfo.description}
                    </p>
                  </div>
                )}
                <div>
                  <span className="text-muted-foreground">Creada:</span>
                  <p className="font-medium">{formattedDate}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">ID:</span>
                  <p className="font-medium">#{simulationInfo.id}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Budget Distribution */}
        {metrics.budgetDistribution.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <DollarSign className="h-4 w-4 text-green-600" />
                Distribución por Método de Pago
              </CardTitle>
              <CardDescription>
                Desglose de presupuestos por método de pago
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                {metrics.budgetDistribution.map((distribution, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between rounded-lg border p-3"
                  >
                    <div className="flex items-center gap-2">
                      <div
                        className={`h-3 w-3 rounded-full ${
                          distribution.payment_method === 'efectivo'
                            ? 'bg-green-500'
                            : 'bg-blue-500'
                        }`}
                      />
                      <span className="font-medium capitalize">
                        {distribution.payment_method}
                      </span>
                    </div>
                    <div className="text-right">
                      <p className="font-bold">
                        {formatCurrency(distribution.amount)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {distribution.percentage.toFixed(1)}%
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Action buttons */}
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={onRefresh}>
            <Activity className="mr-2 h-4 w-4" />
            Actualizar Métricas
          </Button>
          <Button variant="outline" onClick={onExportSummary}>
            <BarChart3 className="mr-2 h-4 w-4" />
            Exportar Resumen
          </Button>
          <Button variant="outline" onClick={onNavigateToConfig}>
            <Target className="mr-2 h-4 w-4" />
            Ir a Configuración
          </Button>
        </div>
      </div>
    );
  }
);

SimulationSummaryCards.displayName = 'SimulationSummaryCards';
