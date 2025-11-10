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
  Legend,
  ResponsiveContainer,
  LabelList,
  LineChart,
  Line,
  CartesianGrid,
} from "recharts";
import { CategoryExclusionFilter } from "@/components/category-exclusion-filter";
import { Settings, Loader2 } from "lucide-react";
import type { AllPeriodsOverspendResponse, CategoryOverspendRow } from "@/types/funds";

const PAYMENT_METHOD_LABELS: Record<string, string> = {
  cash: "Efectivo",
  debit: "Tarjeta Débito",
  credit: "Tarjeta Crédito",
};

const CASH_METHODS = ["cash", "debit"];
const CREDIT_METHODS = ["credit"];

function getMethodFilter(option: string) {
  if (option === "cash") return CASH_METHODS;
  if (option === "credit") return CREDIT_METHODS;
  return [...CASH_METHODS, ...CREDIT_METHODS];
}

interface ChartDataRow {
  category: string;
  planned: number;
  spent: number;
}

interface TrendDataPoint {
  period: string;
  totalPlanned: number;
  totalSpent: number;
  totalOverspend: number;
}

export default function AllPeriodsOverspendDashboard() {
  const [methodFilter, setMethodFilter] = useState<string>("all");
  const [excludedCategories, setExcludedCategories] = useState<string[]>([]);
  const [showCategoryFilter, setShowCategoryFilter] = useState(false);
  const [data, setData] = useState<AllPeriodsOverspendResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [categories, setCategories] = useState<{ id: string; name: string }[]>([]);

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
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error occurred");
        console.error("Error fetching all-periods data:", err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [methodFilter, excludedCategories]);

  // Prepare chart data - sorted by total overspend
  const chartData = useMemo(() => {
    if (!data) return [];
    return data.overspendByCategory.map((cat) => ({
      category: cat.categoryName,
      planned: cat.totalPlaneado,
      spent: cat.totalActual,
    })) as ChartDataRow[];
  }, [data]);

  // Prepare trend data - shows overspend trend over time
  const trendData = useMemo(() => {
    if (!data || data.overspendByCategory.length === 0) return [];

    // Collect all unique periods
    const periodMap = new Map<string, TrendDataPoint>();

    data.overspendByCategory.forEach((category) => {
      category.periods.forEach((period) => {
        const key = `${period.year}-${String(period.month).padStart(2, "0")}`;
        if (!periodMap.has(key)) {
          periodMap.set(key, {
            period: period.periodName,
            totalPlanned: 0,
            totalSpent: 0,
            totalOverspend: 0,
          });
        }

        const entry = periodMap.get(key)!;
        entry.totalPlanned += period.planeado;
        entry.totalSpent += period.actual;
        entry.totalOverspend += period.overspend;
      });
    });

    // Sort by year and month
    return Array.from(periodMap.values()).sort((a, b) => {
      const aDate = new Date(a.period);
      const bDate = new Date(b.period);
      return aDate.getTime() - bDate.getTime();
    });
  }, [data]);

  // KPI calculations
  const kpiCash = useMemo(() => {
    if (!data || methodFilter === "credit") return null;
    return data.summary.totalOverspend;
  }, [data, methodFilter]);

  const kpiCredit = useMemo(() => {
    if (!data || methodFilter === "cash") return null;
    return data.summary.totalOverspend;
  }, [data, methodFilter]);

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

  if (!data) {
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
      {/* KPI Cards */}
      <div className="flex flex-col md:flex-row gap-4">
        {kpiCash !== null && (
          <Card className="flex-1 bg-blue-50">
            <CardHeader>
              <CardTitle>Total Overspend Efectivo/Débito</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-blue-900">
                $
                {(!isNaN(kpiCash) && isFinite(kpiCash)
                  ? kpiCash
                  : 0
                ).toLocaleString("es-MX", { minimumFractionDigits: 2 })}
              </div>
              <p className="text-sm text-blue-700 mt-2">
                Acumulado en todos los periodos
              </p>
            </CardContent>
          </Card>
        )}
        {kpiCredit !== null && (
          <Card className="flex-1 bg-red-300">
            <CardHeader>
              <CardTitle>Total Overspend Tarjeta Crédito</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-red-900">
                $
                {(!isNaN(kpiCredit) && isFinite(kpiCredit)
                  ? kpiCredit
                  : 0
                ).toLocaleString("es-MX", { minimumFractionDigits: 2 })}
              </div>
              <p className="text-sm text-red-700 mt-2">
                Acumulado en todos los periodos
              </p>
            </CardContent>
          </Card>
        )}
        <div className="flex items-end gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowCategoryFilter(!showCategoryFilter)}
            className={showCategoryFilter ? "bg-gray-100" : ""}
          >
            <Settings className="h-4 w-4 mr-2" />
            Filtros
          </Button>
          <Select value={methodFilter} onValueChange={setMethodFilter}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="cash">Efectivo/Débito</SelectItem>
              <SelectItem value="credit">Tarjeta Crédito</SelectItem>
            </SelectContent>
          </Select>
        </div>
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

      {/* Overspend by Category Chart */}
      {chartData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Overspend Total por Categoría (Todos los Periodos)</CardTitle>
          </CardHeader>
          <CardContent>
            <div
              style={{ width: "100%", height: 60 + chartData.length * 48 }}
            >
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  layout="vertical"
                  data={chartData}
                  margin={{ top: 20, right: 40, left: 40, bottom: 20 }}
                  barCategoryGap={32}
                >
                  <XAxis type="number" hide />
                  <YAxis type="category" dataKey="category" width={180} />
                  <Tooltip
                    formatter={(value: number) =>
                      `$${value.toLocaleString("es-MX", {
                        minimumFractionDigits: 2,
                      })}`
                    }
                  />
                  <Legend />
                  <Bar
                    dataKey="planned"
                    fill="#3b82f6"
                    name="Planeado"
                    barSize={18}
                    radius={[8, 8, 8, 8]}
                  >
                    <LabelList
                      dataKey="planned"
                      position="right"
                      formatter={(v: number | undefined) =>
                        typeof v === "number" && v > 0
                          ? `$${v.toLocaleString("es-MX", {
                              minimumFractionDigits: 2,
                            })}`
                          : ""
                      }
                    />
                  </Bar>
                  <Bar
                    dataKey="spent"
                    fill="#ef4444"
                    name="Gastado"
                    barSize={18}
                    radius={[8, 8, 8, 8]}
                  >
                    <LabelList
                      dataKey="spent"
                      position="right"
                      formatter={(v: number | undefined) =>
                        typeof v === "number" && v > 0
                          ? `$${v.toLocaleString("es-MX", {
                              minimumFractionDigits: 2,
                            })}`
                          : ""
                      }
                    />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Overspend Trend Over Time */}
      {trendData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Tendencia de Overspend a lo Largo del Tiempo</CardTitle>
          </CardHeader>
          <CardContent>
            <div style={{ width: "100%", height: 300 }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={trendData}
                  margin={{ top: 5, right: 30, left: 0, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="period" />
                  <YAxis />
                  <Tooltip
                    formatter={(value: number) =>
                      `$${value.toLocaleString("es-MX", {
                        minimumFractionDigits: 2,
                      })}`
                    }
                  />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="totalPlanned"
                    stroke="#3b82f6"
                    name="Total Planeado"
                    connectNulls
                  />
                  <Line
                    type="monotone"
                    dataKey="totalSpent"
                    stroke="#ef4444"
                    name="Total Gastado"
                    connectNulls
                  />
                  <Line
                    type="monotone"
                    dataKey="totalOverspend"
                    stroke="#f97316"
                    name="Total Overspend"
                    connectNulls
                    strokeDasharray="5 5"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Summary Table */}
      {data.overspendByCategory.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Resumen por Categoría</CardTitle>
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
                    <th className="text-right py-2 px-4">% Overspend</th>
                  </tr>
                </thead>
                <tbody>
                  {data.overspendByCategory.map((category) => {
                    const percentOverspend =
                      category.totalPlaneado > 0
                        ? ((category.totalOverspend / category.totalPlaneado) * 100).toFixed(1)
                        : "N/A";
                    return (
                      <tr key={category.categoryId} className="border-b hover:bg-muted/50">
                        <td className="py-3 px-4">{category.categoryName}</td>
                        <td className="text-right py-3 px-4">
                          ${category.totalPlaneado.toLocaleString("es-MX", {
                            minimumFractionDigits: 2,
                          })}
                        </td>
                        <td className="text-right py-3 px-4">
                          ${category.totalActual.toLocaleString("es-MX", {
                            minimumFractionDigits: 2,
                          })}
                        </td>
                        <td className="text-right py-3 px-4 font-semibold text-red-600">
                          ${category.totalOverspend.toLocaleString("es-MX", {
                            minimumFractionDigits: 2,
                          })}
                        </td>
                        <td className="text-right py-3 px-4">
                          {percentOverspend !== "N/A" ? `${percentOverspend}%` : "N/A"}
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
