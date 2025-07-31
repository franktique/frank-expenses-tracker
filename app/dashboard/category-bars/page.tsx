"use client";

import { useState, useMemo } from "react";
import { useBudget } from "@/context/budget-context";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from "@/components/ui/select";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";
import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";

export default function CategoryBarsDashboard() {
  const { categories, expenses, activePeriod } = useBudget();
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>("");

  // Compute filtered and grouped data
  const data = useMemo(() => {
    if (!selectedCategoryId) return [];
    // Filter expenses by category only
    const filtered = expenses.filter(
      (e) => e.category_id === selectedCategoryId
    );
    // Group by date
    const grouped: Record<string, number> = {};
    filtered.forEach((e) => {
      // Always use YYYY-MM-DD for grouping
      const dateKey = e.date.split("T")[0];
      grouped[dateKey] = (grouped[dateKey] || 0) + Number(e.amount);
    });
    // Convert to array and sort by date
    return Object.entries(grouped)
      .map(([date, total]) => ({
        date: format(parseISO(date), "dd/MM/yyyy", { locale: es }),
        total,
      }))
      .sort((a, b) => {
        // Sort by date ascending
        const [d1, m1, y1] = a.date.split("/").map(Number);
        const [d2, m2, y2] = b.date.split("/").map(Number);
        return (
          new Date(y1, m1 - 1, d1).getTime() -
          new Date(y2, m2 - 1, d2).getTime()
        );
      });
  }, [expenses, activePeriod, selectedCategoryId]);

  // Default to first category if none selected
  const categoryOptions = categories.map((cat) => ({
    value: cat.id,
    label: cat.name,
  }));
  const selectedCategory = categories.find(
    (cat) => cat.id === selectedCategoryId
  );

  // Set default category on mount or when categories change
  // (Avoids blank chart on first load)
  if (!selectedCategoryId && categoryOptions.length > 0) {
    setSelectedCategoryId(categoryOptions[0].value);
  }

  return (
    <div className="max-w-full w-full mx-auto py-10 px-4">
      <Card>
        <CardHeader>
          <CardTitle>Gastos por Fecha (por Categoría)</CardTitle>
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
            {/* Dynamic min-width based on number of bars */}
            <div
              className="h-full"
              style={{ minWidth: `${Math.max(data.length * 60, 600)}px` }}
            >
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={data}
                  margin={{ top: 16, right: 32, left: 8, bottom: 24 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    dataKey="date"
                    angle={-30}
                    textAnchor="end"
                    height={60}
                  />
                  <YAxis />
                  <Tooltip
                    content={({ active, payload, label }) => {
                      if (!active || !payload || !payload.length) return null;
                      return (
                        <div className="rounded-md bg-white dark:bg-zinc-900 p-3 shadow-lg border border-gray-200 dark:border-zinc-800">
                          <div className="font-medium text-gray-900 dark:text-gray-100 text-base mb-1">
                            {label}
                          </div>
                          <div className="text-gray-900 dark:text-gray-100">
                            {selectedCategory
                              ? selectedCategory.name
                              : "Categoría"}
                            :{" "}
                            {payload[0].value.toLocaleString("es-CO", {
                              style: "currency",
                              currency: "COP",
                            })}
                          </div>
                        </div>
                      );
                    }}
                  />
                  <Bar
                    dataKey="total"
                    fill="#6366f1"
                    name={
                      selectedCategory ? selectedCategory.name : "Categoría"
                    }
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
