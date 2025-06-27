"use client";

import { useState, useMemo } from "react";
import { useBudget } from "@/context/budget-context";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "@/components/ui/select";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip } from "recharts";

export default function PeriodBarsDashboard() {
  const { categories, expenses, periods } = useBudget();
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>("");

  // Compute filtered and grouped data
  const data = useMemo(() => {
    if (!selectedCategoryId) return [];
    // Filter expenses by category only
    const filtered = expenses.filter(
      (e) => e.category_id === selectedCategoryId
    );
    // Group by period, but also keep period date info for sorting
    const grouped: Record<string, { total: number; year: number; month: number }> = {};
    filtered.forEach((e) => {
      const period = periods.find((p) => p.id === e.period_id);
      if (period) {
        if (!grouped[period.id]) {
          grouped[period.id] = { total: 0, year: period.year, month: period.month };
        }
        grouped[period.id].total += Number(e.amount);
      }
    });
    // Convert to array and sort by year/month
    return Object.entries(grouped)
      .map(([periodId, { total, year, month }]) => {
        const period = periods.find((p) => p.id === periodId);
        return {
          period: period ? period.name : periodId,
          total,
          year,
          month,
        };
      })
      .sort((a, b) => {
        if (a.year !== b.year) return a.year - b.year;
        return a.month - b.month;
      });
  }, [expenses, periods, selectedCategoryId]);

  // Default to first category if none selected
  const categoryOptions = categories.map((cat) => ({ value: cat.id, label: cat.name }));
  const selectedCategory = categories.find((cat) => cat.id === selectedCategoryId);

  // Set default category on mount or when categories change
  if (!selectedCategoryId && categoryOptions.length > 0) {
    setSelectedCategoryId(categoryOptions[0].value);
  }

  return (
    <div className="max-w-full w-full mx-auto py-10 px-4">
      <Card>
        <CardHeader>
          <CardTitle>Gastos por Periodo (por Categoría)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="mb-6 max-w-xs">
            <Select
              value={selectedCategoryId}
              onValueChange={setSelectedCategoryId}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecciona una categoría" />
              </SelectTrigger>
              <SelectContent>
                {categoryOptions.map((cat) => (
                  <SelectItem key={cat.value} value={cat.value}>
                    {cat.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="h-80 w-full overflow-x-auto">
            <div
              className="h-full"
              style={{ minWidth: `${Math.max(data.length * 80, 400)}px` }}
            >
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data} margin={{ top: 16, right: 16, left: 16, bottom: 32 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="period" angle={-30} textAnchor="end" interval={0} height={60} />
                  <YAxis />
                  <Tooltip
                    formatter={(value: number) =>
                      value.toLocaleString("es-CO", { style: "currency", currency: "COP" })
                    }
                  />
                  <Bar dataKey="total" fill="#22d3ee" name={selectedCategory ? selectedCategory.name : "Categoría"} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
