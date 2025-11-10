"use client";

import { useMemo, useState, useEffect } from "react";
import { useBudget } from "@/context/budget-context";
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
} from "recharts";
import { CategoryExclusionFilter } from "@/components/category-exclusion-filter";
import { Settings } from "lucide-react";

const PAYMENT_METHOD_LABELS: Record<string, string> = {
  cash: "Efectivo",
  debit: "Tarjeta Débito",
  credit: "Tarjeta Crédito",
};

const CASH_METHODS = ["cash", "debit"];
const CREDIT_METHODS = ["credit"];
const STORAGE_KEY = "overspend_current_period_excluded_categories";

function getMethodFilter(option: string) {
  if (option === "cash") return CASH_METHODS;
  if (option === "credit") return CREDIT_METHODS;
  return [...CASH_METHODS, ...CREDIT_METHODS];
}

export default function OverspendDashboard() {
  const { expenses, budgets, categories, activePeriod } = useBudget();
  const [methodFilter, setMethodFilter] = useState<string>("all");
  const [excludedCategories, setExcludedCategories] = useState<string[]>([]);
  const [showCategoryFilter, setShowCategoryFilter] = useState(false);

  // Load excluded categories from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        setExcludedCategories(JSON.parse(stored));
      }
    } catch (error) {
      console.warn("Failed to load excluded categories from localStorage:", error);
    }
  }, []);

  // Save excluded categories to localStorage whenever they change
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(excludedCategories));
    } catch (error) {
      console.warn("Failed to save excluded categories to localStorage:", error);
    }
  }, [excludedCategories]);

  // Filter by active period & payment method
  const filteredExpenses = useMemo(() => {
    if (!activePeriod) return [];
    const methods = getMethodFilter(methodFilter);
    return expenses.filter(
      (e) =>
        e.period_id === activePeriod.id && methods.includes(e.payment_method)
    );
  }, [expenses, activePeriod, methodFilter]);

  // Get planned (budgeted) per category & payment method
  const plannedByCatAndMethod = useMemo(() => {
    if (!activePeriod) return {};
    const map: Record<string, Record<string, number>> = {};
    budgets.forEach((b) => {
      if (b.period_id !== activePeriod.id) return;
      if (!map[b.category_id]) map[b.category_id] = {};
      map[b.category_id][b.payment_method] = b.expected_amount;
    });
    return map;
  }, [budgets, activePeriod]);

  // Actual spent per category & method
  const spentByCatAndMethod = useMemo(() => {
    const map: Record<string, Record<string, number>> = {};
    filteredExpenses.forEach((e) => {
      if (!map[e.category_id]) map[e.category_id] = {};
      map[e.category_id][e.payment_method] =
        (map[e.category_id][e.payment_method] || 0) + Number(e.amount);
    });
    return map;
  }, [filteredExpenses]);

  // Calculate overspend per category & method
  const overspendRows = useMemo(() => {
    const rows = [];
    const methods = getMethodFilter(methodFilter);
    // Use all categories with either planned or spent > 0, excluding the selected ones
    categories
      .filter((cat) => !excludedCategories.includes(cat.id))
      .forEach((cat) => {
        let planned = 0;
        let spent = 0;
        methods.forEach((method) => {
          planned += plannedByCatAndMethod[cat.id]?.[method] || 0;
          spent += spentByCatAndMethod[cat.id]?.[method] || 0;
        });
        const overspent = spent - planned;
        if (overspent > 0) {
          rows.push({
            category: cat.name,
            planned,
            overspent,
          });
        }
      });
    // Order from most to least overspent
    return rows.sort((a, b) => b.overspent - a.overspent);
  }, [plannedByCatAndMethod, spentByCatAndMethod, categories, methodFilter, excludedCategories]);

  // KPI values
  // Calculate overspend per category for each method, excluding selected categories
  const overspendByCategory = useMemo(() => {
    if (!activePeriod) return {};
    const map: Record<string, { cash: number; credit: number }> = {};
    categories
      .filter((cat) => !excludedCategories.includes(cat.id))
      .forEach((cat) => {
        // Cash/debit
        let plannedCash = 0,
          spentCash = 0;
        let plannedCredit = 0,
          spentCredit = 0;
        if (plannedByCatAndMethod[cat.id]) {
          plannedCash =
            Number(plannedByCatAndMethod[cat.id]["cash"] || 0) +
            Number(plannedByCatAndMethod[cat.id]["debit"] || 0);
          plannedCredit = Number(plannedByCatAndMethod[cat.id]["credit"] || 0);
        }
        if (spentByCatAndMethod[cat.id]) {
          spentCash =
            Number(spentByCatAndMethod[cat.id]["cash"] || 0) +
            Number(spentByCatAndMethod[cat.id]["debit"] || 0);
          spentCredit = Number(spentByCatAndMethod[cat.id]["credit"] || 0);
        }
        map[cat.id] = {
          cash: Math.max(0, spentCash - plannedCash),
          credit: Math.max(0, spentCredit - plannedCredit),
        };
      });
    return map;
  }, [categories, plannedByCatAndMethod, spentByCatAndMethod, activePeriod, excludedCategories]);

  // KPIs: sum only the overspent values visible in the chart
  // KPIs: always show total overspend for each method for the open period, regardless of filter
  const kpiCash = useMemo(() => {
    if (methodFilter === "credit") return null;
    return Object.values(overspendByCategory).reduce(
      (sum, v) => sum + (v.cash > 0 ? v.cash : 0),
      0
    );
  }, [overspendByCategory, methodFilter]);

  const kpiCredit = useMemo(() => {
    if (methodFilter === "cash") return null;
    return Object.values(overspendByCategory).reduce(
      (sum, v) => sum + (v.credit > 0 ? v.credit : 0),
      0
    );
  }, [overspendByCategory, methodFilter]);

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row gap-4">
        {kpiCash !== null && (
          <Card className="flex-1 bg-blue-50">
            <CardHeader>
              <CardTitle>Overspend en Efectivo/Débito</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-blue-900">
                $
                {(!isNaN(kpiCash) && isFinite(kpiCash)
                  ? kpiCash
                  : 0
                ).toLocaleString("es-MX", { minimumFractionDigits: 2 })}
              </div>
            </CardContent>
          </Card>
        )}
        {kpiCredit !== null && (
          <Card className="flex-1 bg-red-300">
            <CardHeader>
              <CardTitle>Overspend en Tarjeta Crédito</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-red-900">
                $
                {(!isNaN(kpiCredit) && isFinite(kpiCredit)
                  ? kpiCredit
                  : 0
                ).toLocaleString("es-MX", { minimumFractionDigits: 2 })}
              </div>
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
      {showCategoryFilter && (
        <div className="flex justify-start">
          <CategoryExclusionFilter
            categories={categories.map((cat) => ({ id: cat.id, name: cat.name }))}
            excludedCategories={excludedCategories}
            onExclusionChange={setExcludedCategories}
          />
        </div>
      )}
      <Card>
        <CardHeader>
          <CardTitle>Overspend por Categoría</CardTitle>
        </CardHeader>
        <CardContent>
          <div
            style={{ width: "100%", height: 60 + overspendRows.length * 48 }}
          >
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                layout="vertical"
                data={overspendRows}
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
                  dataKey="overspent"
                  fill="#ef4444"
                  name="Excedente"
                  barSize={18}
                  radius={[8, 8, 8, 8]}
                >
                  <LabelList
                    dataKey="overspent"
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
    </div>
  );
}
