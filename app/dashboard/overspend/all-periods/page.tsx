"use client";

import { useMemo, useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { CategoryExclusionFilter } from "@/components/category-exclusion-filter";
import { Settings, Loader2 } from "lucide-react";
import type { AllPeriodsOverspendResponse } from "@/types/funds";

const CASH_METHODS = ["cash", "debit"];
const CREDIT_METHODS = ["credit"];
const STORAGE_KEY = "overspend_all_periods_excluded_categories";

function getMethodFilter(option: string) {
  if (option === "cash") return CASH_METHODS;
  if (option === "credit") return CREDIT_METHODS;
  return [...CASH_METHODS, ...CREDIT_METHODS];
}

interface PeriodSummary {
  periodId: string;
  periodName: string;
  month: number;
  year: number;
  totalPlanned: number;
  totalSpent: number;
  totalOverspend: number;
  categories: Array<{
    categoryId: string;
    categoryName: string;
    planned: number;
    spent: number;
    overspend: number;
  }>;
}

export default function AllPeriodsOverspendDashboard() {
  const [methodFilter, setMethodFilter] = useState<string>("all");
  const [excludedCategories, setExcludedCategories] = useState<string[]>([]);
  const [showCategoryFilter, setShowCategoryFilter] = useState(false);
  const [data, setData] = useState<AllPeriodsOverspendResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [categories, setCategories] = useState<{ id: string; name: string }[]>([]);
  const [selectedPeriodId, setSelectedPeriodId] = useState<string | null>(null);

  // Load excluded categories from localStorage on mount
  useEffect(() => {
    if (typeof window === "undefined") return; // Skip on server-side rendering
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        console.log("Loaded excluded categories from localStorage:", parsed);
        setExcludedCategories(parsed);
      }
    } catch (error) {
      console.warn("Failed to load excluded categories from localStorage:", error);
    }
  }, []);

  // Save excluded categories to localStorage whenever they change
  useEffect(() => {
    if (typeof window === "undefined") return; // Skip on server-side rendering
    try {
      console.log("Saving excluded categories to localStorage:", excludedCategories);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(excludedCategories));
    } catch (error) {
      console.warn("Failed to save excluded categories to localStorage:", error);
    }
  }, [excludedCategories]);

  // Fetch all-periods overspend data
  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        setError(null);

        const params = new URLSearchParams();
        if (methodFilter !== "all") {
          params.append("paymentMethod", methodFilter);
        }
        if (excludedCategories.length > 0) {
          params.append("excludedCategories", excludedCategories.join(","));
        }

        const response = await fetch(
          `/api/overspend/all-periods?${params.toString()}`
        );
        if (!response.ok) {
          throw new Error("Failed to fetch all-periods overspend data");
        }

        const responseData: AllPeriodsOverspendResponse = await response.json();
        setData(responseData);

        // Extract unique categories for filter
        const uniqueCategories = [
          ...new Map(
            responseData.overspendByCategory.map((cat) => [
              cat.categoryId,
              { id: cat.categoryId, name: cat.categoryName },
            ])
          ).values(),
        ];
        setCategories(uniqueCategories);

        // Auto-select first period if none selected
        if (!selectedPeriodId && responseData.overspendByCategory.length > 0) {
          const firstPeriod = responseData.overspendByCategory[0].periods[0];
          if (firstPeriod) {
            setSelectedPeriodId(firstPeriod.periodId);
          }
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error occurred");
        console.error("Error fetching all-periods data:", err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [methodFilter, excludedCategories, selectedPeriodId]);

  // Build periods summary - organized by period
  const periodSummaries = useMemo(() => {
    if (!data) return [];

    const periodMap = new Map<string, PeriodSummary>();

    // Iterate through categories and build period summaries
    data.overspendByCategory.forEach((category) => {
      category.periods.forEach((period) => {
        const key = period.periodId;

        if (!periodMap.has(key)) {
          periodMap.set(key, {
            periodId: period.periodId,
            periodName: period.periodName,
            month: period.month,
            year: period.year,
            totalPlanned: 0,
            totalSpent: 0,
            totalOverspend: 0,
            categories: [],
          });
        }

        const summary = periodMap.get(key)!;
        summary.totalPlanned += period.planeado;
        summary.totalSpent += period.actual;
        summary.totalOverspend += period.overspend;
        summary.categories.push({
          categoryId: category.categoryId,
          categoryName: category.categoryName,
          planned: period.planeado,
          spent: period.actual,
          overspend: period.overspend,
        });
      });
    });

    // Sort periods by year and month (newest first)
    return Array.from(periodMap.values()).sort((a, b) => {
      if (b.year !== a.year) return b.year - a.year;
      return b.month - a.month;
    });
  }, [data]);

  // Get selected period details
  const selectedPeriod = useMemo(() => {
    return periodSummaries.find((p) => p.periodId === selectedPeriodId);
  }, [periodSummaries, selectedPeriodId]);

  // Sort categories in selected period by overspend (highest first)
  const selectedPeriodCategories = useMemo(() => {
    if (!selectedPeriod) return [];
    return [...selectedPeriod.categories].sort(
      (a, b) => b.overspend - a.overspend
    );
  }, [selectedPeriod]);

  // Prepare chart data
  const chartData = useMemo(() => {
    return periodSummaries.map((period) => ({
      periodId: period.periodId,
      name: period.periodName,
      overspend: period.totalOverspend,
    }));
  }, [periodSummaries]);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-96 space-y-4">
        <Loader2 className="h-8 w-8 animate-spin" />
        <p className="text-muted-foreground">Cargando datos de todos los periodos...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-4">
        <Card className="bg-red-50 border-red-200">
          <CardHeader>
            <CardTitle className="text-red-900">Error</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-red-800">{error}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!data || periodSummaries.length === 0) {
    return (
      <div className="space-y-4">
        <Card className="bg-amber-50 border-amber-200">
          <CardHeader>
            <CardTitle className="text-amber-900">Sin datos</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-amber-800">No hay datos de overspend disponibles</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-4 items-end">
        <div className="flex-1">
          <label className="text-sm font-medium mb-2 block">Método de Pago</label>
          <Select value={methodFilter} onValueChange={setMethodFilter}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="cash">Efectivo/Débito</SelectItem>
              <SelectItem value="credit">Tarjeta Crédito</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowCategoryFilter(!showCategoryFilter)}
          className={showCategoryFilter ? "bg-gray-100" : ""}
        >
          <Settings className="h-4 w-4 mr-2" />
          Filtros
        </Button>
      </div>

      {/* Category Filter */}
      {showCategoryFilter && (
        <div className="flex justify-start">
          <CategoryExclusionFilter
            categories={categories}
            excludedCategories={excludedCategories}
            onExclusionChange={setExcludedCategories}
          />
        </div>
      )}

      {/* Bar Chart Timeline */}
      <Card>
        <CardHeader>
          <CardTitle>Timeline de Overspend por Periodo</CardTitle>
        </CardHeader>
        <CardContent>
          <div style={{ width: "100%", height: 400 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={chartData}
                margin={{ top: 20, right: 30, left: 0, bottom: 60 }}
              >
                <XAxis
                  dataKey="name"
                  angle={-45}
                  textAnchor="end"
                  height={100}
                />
                <YAxis />
                <Tooltip
                  formatter={(value: number) =>
                    `$${value.toLocaleString("es-MX", {
                      minimumFractionDigits: 2,
                    })}`
                  }
                  cursor={{ fill: "rgba(59, 130, 246, 0.1)" }}
                />
                <Bar
                  dataKey="overspend"
                  name="Overspend"
                  onClick={(data) => {
                    setSelectedPeriodId(data.periodId);
                  }}
                  cursor="pointer"
                  radius={[8, 8, 0, 0]}
                >
                  {chartData.map((entry) => (
                    <Cell
                      key={`cell-${entry.periodId}`}
                      fill={
                        selectedPeriodId === entry.periodId
                          ? "#2563eb"
                          : entry.overspend > 0
                            ? "#ef4444"
                            : "#22c55e"
                      }
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Selected Period Details */}
      {selectedPeriod && (
        <Card>
          <CardHeader>
            <CardTitle>
              Detalle de {selectedPeriod.periodName}
            </CardTitle>
            <p className="text-sm text-muted-foreground mt-2">
              Total Overspend:{" "}
              <span className="font-semibold text-red-600">
                ${selectedPeriod.totalOverspend.toLocaleString("es-MX", {
                  minimumFractionDigits: 2,
                })}
              </span>
            </p>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b">
                  <tr className="bg-muted/50">
                    <th className="text-left py-2 px-4">Categoría</th>
                    <th className="text-right py-2 px-4">Planeado</th>
                    <th className="text-right py-2 px-4">Gastado</th>
                    <th className="text-right py-2 px-4">Overspend</th>
                    <th className="text-right py-2 px-4">%</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedPeriodCategories.map((cat) => {
                    const percentage =
                      cat.planned > 0
                        ? ((cat.overspend / cat.planned) * 100).toFixed(1)
                        : "N/A";
                    return (
                      <tr
                        key={cat.categoryId}
                        className={`border-b hover:bg-muted/50 ${
                          cat.overspend > 0 ? "bg-red-50/50 dark:bg-red-950/20" : ""
                        }`}
                      >
                        <td className="py-3 px-4 font-medium">
                          {cat.categoryName}
                        </td>
                        <td className="text-right py-3 px-4">
                          ${cat.planned.toLocaleString("es-MX", {
                            minimumFractionDigits: 2,
                          })}
                        </td>
                        <td className="text-right py-3 px-4">
                          ${cat.spent.toLocaleString("es-MX", {
                            minimumFractionDigits: 2,
                          })}
                        </td>
                        <td className="text-right py-3 px-4 font-semibold">
                          <span
                            className={
                              cat.overspend > 0 ? "text-red-600" : "text-green-600"
                            }
                          >
                            ${Math.abs(cat.overspend).toLocaleString("es-MX", {
                              minimumFractionDigits: 2,
                            })}
                          </span>
                        </td>
                        <td className="text-right py-3 px-4">
                          {percentage !== "N/A" ? `${percentage}%` : "N/A"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
