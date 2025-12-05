"use client";

import { useState, useMemo, useEffect } from "react";
import { useBudget } from "@/context/budget-context";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell,
} from "recharts";
import { format, parseISO, getDaysInMonth } from "date-fns";
import { es } from "date-fns/locale";
import type {
  BudgetExecutionViewMode,
  BudgetExecutionResponse,
} from "@/types/funds";
import {
  fetchBudgetExecutionData,
  formatChartData,
  formatCurrency,
  calculateBudgetStats,
} from "@/lib/budget-execution-utils";

export default function ProjectedExecutionDashboard() {
  const { activePeriod } = useBudget();
  const [viewMode, setViewMode] = useState<BudgetExecutionViewMode>("daily");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [budgetExecutionData, setBudgetExecutionData] =
    useState<BudgetExecutionResponse | null>(null);

  // Fetch data when period or viewMode changes
  useEffect(() => {
    const fetchData = async () => {
      if (!activePeriod?.id) {
        setError("No active period selected");
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        setError(null);
        // Clear old data to prevent stale data rendering with wrong viewMode
        setBudgetExecutionData(null);
        const data = await fetchBudgetExecutionData(activePeriod.id, viewMode);
        setBudgetExecutionData(data);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to load budget data"
        );
        setBudgetExecutionData(null);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [activePeriod?.id, viewMode]);

  // Format chart data
  const chartData = useMemo(() => {
    if (!budgetExecutionData?.data) return [];
    return formatChartData(budgetExecutionData.data, viewMode);
  }, [budgetExecutionData, viewMode]);

  // Calculate statistics
  const stats = useMemo(() => {
    if (!budgetExecutionData?.data) {
      return {
        total: 0,
        average: 0,
        peak: 0,
        min: 0,
      };
    }
    return calculateBudgetStats(budgetExecutionData.data);
  }, [budgetExecutionData]);

  // Get peak date/week info
  const peakInfo = useMemo(() => {
    if (!budgetExecutionData?.data || budgetExecutionData.data.length === 0) {
      return null;
    }
    const peak = budgetExecutionData.data.reduce((max, item) =>
      item.amount > max.amount ? item : max
    );

    if (viewMode === "daily") {
      const date = parseISO(peak.date);
      return {
        label: format(date, "dd 'de' MMMM", { locale: es }),
        amount: peak.amount,
      };
    } else {
      return {
        label: `Semana ${peak.weekNumber}`,
        amount: peak.amount,
      };
    }
  }, [budgetExecutionData, viewMode]);

  // Calculate days in period for auto-switching view
  const daysInPeriod = useMemo(() => {
    if (!activePeriod) return 0;
    const date = new Date(activePeriod.year, activePeriod.month, 1);
    return getDaysInMonth(date);
  }, [activePeriod]);

  // Auto-switch to weekly if period is long
  useEffect(() => {
    if (daysInPeriod > 31) {
      setViewMode("weekly");
    }
  }, [daysInPeriod]);

  if (!activePeriod) {
    return (
      <div className="max-w-full w-full mx-auto py-10 px-4">
        <Card className="border-yellow-200 dark:border-yellow-900 bg-yellow-50 dark:bg-yellow-950">
          <CardContent className="pt-6">
            <p className="text-yellow-900 dark:text-yellow-100">
              Por favor, selecciona un período activo para ver la ejecución
              proyectada del presupuesto.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-full w-full mx-auto py-10 px-4">
      <div className="space-y-6">
        {/* Header Card */}
        <Card>
          <CardHeader>
            <CardTitle>Ejecución Proyectada del Presupuesto</CardTitle>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
              Período: <span className="font-semibold">{activePeriod.name}</span>
            </p>
          </CardHeader>
          <CardContent>
            {/* View Toggle Buttons */}
            <div className="flex gap-2 mb-6">
              <Button
                variant={viewMode === "daily" ? "default" : "outline"}
                onClick={() => setViewMode("daily")}
                className="px-6"
              >
                Diario
              </Button>
              <Button
                variant={viewMode === "weekly" ? "default" : "outline"}
                onClick={() => setViewMode("weekly")}
                className="px-6"
              >
                Semanal
              </Button>
            </div>

            {/* KPI Cards */}
            {!isLoading && !error && (
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                <div className="p-4 bg-blue-50 dark:bg-blue-950 rounded-lg border border-blue-200 dark:border-blue-800">
                  <div className="text-sm text-blue-600 dark:text-blue-400 font-medium">
                    Presupuesto Total
                  </div>
                  <div className="text-2xl font-bold text-blue-900 dark:text-blue-100 mt-2">
                    {formatCurrency(stats.total)}
                  </div>
                </div>

                <div className="p-4 bg-green-50 dark:bg-green-950 rounded-lg border border-green-200 dark:border-green-800">
                  <div className="text-sm text-green-600 dark:text-green-400 font-medium">
                    Promedio {viewMode === "daily" ? "Diario" : "Semanal"}
                  </div>
                  <div className="text-2xl font-bold text-green-900 dark:text-green-100 mt-2">
                    {formatCurrency(stats.average)}
                  </div>
                </div>

                <div className="p-4 bg-purple-50 dark:bg-purple-950 rounded-lg border border-purple-200 dark:border-purple-800">
                  <div className="text-sm text-purple-600 dark:text-purple-400 font-medium">
                    Presupuesto Máximo
                  </div>
                  <div className="text-2xl font-bold text-purple-900 dark:text-purple-100 mt-2">
                    {formatCurrency(stats.peak)}
                  </div>
                </div>

                <div className="p-4 bg-orange-50 dark:bg-orange-950 rounded-lg border border-orange-200 dark:border-orange-800">
                  <div className="text-sm text-orange-600 dark:text-orange-400 font-medium">
                    Pico
                  </div>
                  <div className="text-lg font-bold text-orange-900 dark:text-orange-100 mt-2">
                    {peakInfo
                      ? `${peakInfo.label} - ${formatCurrency(peakInfo.amount)}`
                      : "N/A"}
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Chart Card */}
        <Card>
          <CardContent className="pt-6">
            {isLoading && (
              <div className="h-80 flex items-center justify-center">
                <div className="text-gray-500 dark:text-gray-400">
                  <div className="animate-spin inline-block mr-3">⏳</div>
                  Cargando datos...
                </div>
              </div>
            )}

            {error && (
              <div className="h-80 flex items-center justify-center">
                <div className="text-red-500 dark:text-red-400 text-center">
                  <p className="font-medium mb-2">Error al cargar los datos</p>
                  <p className="text-sm">{error}</p>
                  <Button
                    onClick={() => window.location.reload()}
                    className="mt-4"
                  >
                    Reintentar
                  </Button>
                </div>
              </div>
            )}

            {!isLoading && !error && chartData.length === 0 && (
              <div className="h-80 flex items-center justify-center">
                <div className="text-gray-500 dark:text-gray-400 text-center">
                  <p>No hay presupuestos para mostrar en este período.</p>
                </div>
              </div>
            )}

            {!isLoading && !error && chartData.length > 0 && (
              <div className="h-96 w-full overflow-x-auto">
                <div
                  className="h-full"
                  style={{
                    minWidth: `${Math.max(chartData.length * 50, 600)}px`,
                  }}
                >
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={chartData}
                      margin={{ top: 16, right: 32, left: 8, bottom: 60 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis
                        dataKey="displayDate"
                        angle={-45}
                        textAnchor="end"
                        height={80}
                      />
                      <YAxis
                        tickFormatter={(value) => {
                          if (value >= 1000000) {
                            return `$${(value / 1000000).toFixed(0)}M`;
                          }
                          if (value >= 1000) {
                            return `$${(value / 1000).toFixed(0)}K`;
                          }
                          return `$${value}`;
                        }}
                      />
                      <Tooltip
                        content={({ active, payload }) => {
                          if (!active || !payload || !payload.length) {
                            return null;
                          }
                          const data = payload[0].payload;
                          return (
                            <div className="rounded-md bg-white dark:bg-zinc-900 p-3 shadow-lg border border-gray-200 dark:border-zinc-800">
                              <div className="font-medium text-gray-900 dark:text-gray-100 text-base mb-1">
                                {data.fullDate || data.displayDate}
                              </div>
                              <div className="text-gray-900 dark:text-gray-100">
                                Presupuesto:{" "}
                                {formatCurrency(payload[0].value as number)}
                              </div>
                            </div>
                          );
                        }}
                      />
                      <Bar dataKey="amount" fill="#6366f1" name="Presupuesto">
                        {chartData.map((entry, index) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={
                              entry.amount === stats.peak
                                ? "#f97316"
                                : "#6366f1"
                            }
                          />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
