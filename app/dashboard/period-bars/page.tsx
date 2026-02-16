'use client';

import { useState, useMemo, useEffect } from 'react';
import { useBudget } from '@/context/budget-context';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from '@/components/ui/select';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell,
} from 'recharts';
import { ExpenseDetailTable } from '@/components/expense-detail-table';

export default function PeriodBarsDashboard() {
  const { categories, expenses, periods } = useBudget();
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('');
  const [selectedPeriodId, setSelectedPeriodId] = useState<string | null>(null);

  // Compute filtered and grouped data
  const data = useMemo(() => {
    if (!selectedCategoryId) return [];
    // Filter expenses by category only
    const filtered = expenses.filter(
      (e) => e.category_id === selectedCategoryId
    );
    // Group by period, but also keep period date info for sorting
    const grouped: Record<
      string,
      { total: number; year: number; month: number }
    > = {};
    filtered.forEach((e) => {
      const period = periods.find((p) => p.id === e.period_id);
      if (period) {
        if (!grouped[period.id]) {
          grouped[period.id] = {
            total: 0,
            year: period.year,
            month: period.month,
          };
        }
        grouped[period.id].total += Number(e.amount);
      }
    });
    // Convert to array and sort by year/month
    return Object.entries(grouped)
      .map(([periodId, { total, year, month }]) => {
        const period = periods.find((p) => p.id === periodId);
        return {
          periodId,
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

  // Clear selection when category changes
  useEffect(() => {
    setSelectedPeriodId(null);
  }, [selectedCategoryId]);

  // Filtered expenses for detail table (sorted by date)
  const filteredExpenses = useMemo(() => {
    if (!selectedPeriodId || !selectedCategoryId) return [];
    return expenses
      .filter(
        (e) =>
          e.period_id === selectedPeriodId &&
          e.category_id === selectedCategoryId
      )
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [expenses, selectedPeriodId, selectedCategoryId]);

  // Get selected period name for display
  const selectedPeriodName = useMemo(() => {
    if (!selectedPeriodId) return '';
    const period = periods.find((p) => p.id === selectedPeriodId);
    return period?.name || '';
  }, [periods, selectedPeriodId]);

  // Handle bar click to select/deselect a period
  const handleBarClick = (data: any) => {
    if (data?.activePayload?.[0]) {
      const clickedPeriodId = data.activePayload[0].payload.periodId;
      // Toggle selection: if same period is clicked, deselect it
      setSelectedPeriodId((prev) =>
        prev === clickedPeriodId ? null : clickedPeriodId
      );
    }
  };

  // Get bar color based on selection
  const getBarColor = (periodId: string) => {
    if (periodId === selectedPeriodId) return '#3b82f6'; // Blue for selected
    return '#22d3ee'; // Cyan for normal
  };

  // Default to first category if none selected
  const categoryOptions = categories.map((cat) => ({
    value: cat.id,
    label: cat.name,
  }));
  const selectedCategory = categories.find(
    (cat) => cat.id === selectedCategoryId
  );

  // Set default category on mount or when categories change
  if (!selectedCategoryId && categoryOptions.length > 0) {
    setSelectedCategoryId(categoryOptions[0].value);
  }

  return (
    <div className="mx-auto w-full max-w-full px-4 py-10">
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
                <BarChart
                  data={data}
                  margin={{ top: 16, right: 16, left: 16, bottom: 32 }}
                  onClick={handleBarClick}
                  style={{ cursor: 'pointer' }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    dataKey="period"
                    angle={-30}
                    textAnchor="end"
                    interval={0}
                    height={60}
                  />
                  <YAxis />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (!active || !payload || !payload.length) {
                        return null;
                      }
                      const item = payload[0].payload;
                      return (
                        <div className="rounded-md border border-gray-200 bg-white p-3 shadow-lg dark:border-zinc-800 dark:bg-zinc-900">
                          <div className="mb-1 text-base font-medium text-gray-900 dark:text-gray-100">
                            {item.period}
                          </div>
                          <div className="text-gray-900 dark:text-gray-100">
                            Total:{' '}
                            {Number(payload[0].value).toLocaleString('es-CO', {
                              style: 'currency',
                              currency: 'COP',
                            })}
                          </div>
                          <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                            Clic para ver detalles
                          </div>
                        </div>
                      );
                    }}
                  />
                  <Bar
                    dataKey="total"
                    name={
                      selectedCategory ? selectedCategory.name : 'Categoría'
                    }
                  >
                    {data.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={getBarColor(entry.periodId)}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Expense Detail Table - Conditionally rendered */}
      {selectedPeriodId && filteredExpenses.length > 0 && (
        <ExpenseDetailTable
          expenses={filteredExpenses}
          periodName={selectedPeriodName}
          categoryName={selectedCategory?.name || ''}
        />
      )}
    </div>
  );
}
