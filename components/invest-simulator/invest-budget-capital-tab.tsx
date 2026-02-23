'use client';

import { useMemo, useState, useEffect } from 'react';
import { Minus, Plus, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useBudget } from '@/context/budget-context';
import {
  SUPPORTED_CURRENCIES,
  formatCurrency,
  type CurrencyCode,
} from '@/types/invest-simulator';
import { calculateRequiredCapitalForMonthlyIncome } from '@/lib/invest-calculations';
import { CategoryExclusionFilter } from '@/components/category-exclusion-filter';

const EXCL_KEY = (periodId: string) => `invest_budget_capital_excl_${periodId}`;
const RATE_KEY = (periodId: string) => `invest_budget_capital_rate_${periodId}`;

export function InvestBudgetCapitalTab() {
  const { activePeriod, budgets, categories } = useBudget();

  // inputRate: what the user is editing in the form
  const [inputRate, setInputRate] = useState<number>(8.25);
  // appliedRate: the rate actually used for the table (null = not yet calculated)
  const [appliedRate, setAppliedRate] = useState<number | null>(null);

  const [currency, setCurrency] = useState<CurrencyCode>('COP');
  const [excludedCategories, setExcludedCategories] = useState<string[]>([]);
  const [hasLoadedFromStorage, setHasLoadedFromStorage] = useState(false);

  // Load saved rate + exclusions from localStorage when period changes
  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Reset to defaults first so stale state doesn't bleed across periods
    setInputRate(8.25);
    setAppliedRate(null);
    setExcludedCategories([]);

    if (!activePeriod) {
      setHasLoadedFromStorage(true);
      return;
    }

    try {
      const storedRate = localStorage.getItem(RATE_KEY(activePeriod.id));
      if (storedRate !== null) {
        const parsed = parseFloat(storedRate);
        if (!isNaN(parsed)) {
          setInputRate(parsed);
          setAppliedRate(parsed);
        }
      }
    } catch {
      // ignore
    }

    try {
      const storedExcl = localStorage.getItem(EXCL_KEY(activePeriod.id));
      if (storedExcl) {
        setExcludedCategories(JSON.parse(storedExcl));
      }
    } catch {
      // ignore
    }

    setHasLoadedFromStorage(true);
  }, [activePeriod]);

  // Save exclusions to localStorage whenever they change (after initial load)
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!hasLoadedFromStorage) return;
    if (!activePeriod) return;
    try {
      localStorage.setItem(
        EXCL_KEY(activePeriod.id),
        JSON.stringify(excludedCategories)
      );
    } catch {
      // ignore
    }
  }, [excludedCategories, hasLoadedFromStorage, activePeriod]);

  // Aggregate budget amounts per category for the active period
  const categoryBudgets = useMemo(() => {
    if (!activePeriod) return [];

    const byCategory: Record<string, number> = {};
    for (const budget of budgets) {
      if (budget.period_id !== activePeriod.id) continue;
      byCategory[budget.category_id] =
        (Number(byCategory[budget.category_id]) || 0) +
        (Number(budget.expected_amount) || 0);
    }

    const rows = Object.entries(byCategory)
      .filter(([, amount]) => amount > 0)
      .map(([categoryId, amount]) => {
        const cat = categories.find((c) => c.id === categoryId);
        return {
          categoryId,
          categoryName: cat?.name ?? categoryId,
          budgetAmount: amount,
        };
      });

    rows.sort((a, b) => b.budgetAmount - a.budgetAmount);
    return rows;
  }, [activePeriod, budgets, categories]);

  // Apply exclusion filter
  const visibleRows = useMemo(
    () =>
      categoryBudgets.filter(
        (row) => !excludedCategories.includes(row.categoryId)
      ),
    [categoryBudgets, excludedCategories]
  );

  // Categories list for the exclusion filter
  const filterCategories = useMemo(
    () =>
      categoryBudgets.map((row) => ({
        id: row.categoryId,
        name: row.categoryName,
      })),
    [categoryBudgets]
  );

  // Per-row capital calculations — only recalculate when appliedRate changes
  const rowsWithCapital = useMemo(() => {
    if (appliedRate === null) return [];
    let runningCapital = 0;
    return visibleRows.map((row) => {
      const requiredCapital = calculateRequiredCapitalForMonthlyIncome(
        appliedRate,
        row.budgetAmount
      );
      runningCapital += Number(requiredCapital) || 0;
      return { ...row, requiredCapital, runningCapital };
    });
  }, [visibleRows, appliedRate]);

  // Totals
  const totalBudget = useMemo(
    () =>
      rowsWithCapital.reduce(
        (sum, r) => sum + (Number(r.budgetAmount) || 0),
        0
      ),
    [rowsWithCapital]
  );
  const totalCapital = useMemo(
    () =>
      rowsWithCapital.reduce(
        (sum, r) => sum + (Number(r.requiredCapital) || 0),
        0
      ),
    [rowsWithCapital]
  );

  // Whether the user has pending changes not yet applied
  const hasPendingChanges = appliedRate === null || inputRate !== appliedRate;

  // Apply current inputRate, save to localStorage
  const handleCalculate = () => {
    if (!activePeriod) return;
    setAppliedRate(inputRate);
    try {
      localStorage.setItem(RATE_KEY(activePeriod.id), String(inputRate));
    } catch {
      // ignore
    }
  };

  // Rate +/- helpers
  const decreaseRate = () =>
    setInputRate((r) => Math.round(Math.max(0, r - 0.25) * 100) / 100);
  const increaseRate = () =>
    setInputRate((r) => Math.round(Math.min(100, r + 0.25) * 100) / 100);

  // ── Empty / loading states ────────────────────────────────────────────────
  if (!activePeriod) {
    return (
      <div className="mt-6 rounded-lg border border-dashed p-8 text-center text-muted-foreground">
        No hay período activo. Selecciona un período para continuar.
      </div>
    );
  }

  if (categoryBudgets.length === 0) {
    return (
      <div className="mt-6 rounded-lg border border-dashed p-8 text-center text-muted-foreground">
        No hay presupuesto para el período actual ({activePeriod.name}).
      </div>
    );
  }

  return (
    <div className="mt-6 space-y-6">
      {/* Controls */}
      <div className="rounded-lg bg-purple-50 p-6 dark:bg-purple-950/20">
        <h3 className="mb-4 text-lg font-medium text-purple-900 dark:text-purple-100">
          Período: {activePeriod.name}
        </h3>

        <div className="flex flex-wrap items-end gap-6">
          {/* Annual rate input */}
          <div className="space-y-2">
            <Label className="text-sm text-muted-foreground">Tasa EA</Label>
            <div className="flex items-center gap-2">
              <Input
                type="number"
                step="0.01"
                min="0"
                max="100"
                value={inputRate}
                onChange={(e) => {
                  const value = parseFloat(e.target.value);
                  if (!isNaN(value))
                    setInputRate(Math.min(100, Math.max(0, value)));
                }}
                className="h-auto w-20 border-0 bg-transparent p-0 text-2xl font-bold text-purple-900 focus-visible:ring-0 dark:text-purple-100"
              />
              <span className="text-2xl font-bold text-purple-900 dark:text-purple-100">
                %
              </span>
              <div className="flex gap-1">
                <Button
                  type="button"
                  variant="default"
                  size="icon"
                  className="h-10 w-10 rounded-full bg-purple-600 hover:bg-purple-700"
                  onClick={decreaseRate}
                >
                  <Minus className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  variant="default"
                  size="icon"
                  className="h-10 w-10 rounded-full bg-purple-600 hover:bg-purple-700"
                  onClick={increaseRate}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>

          {/* Currency */}
          <div className="space-y-2">
            <Label className="text-sm text-muted-foreground">Moneda</Label>
            <Select
              value={currency}
              onValueChange={(v: CurrencyCode) => setCurrency(v)}
            >
              <SelectTrigger className="w-36 bg-white dark:bg-gray-900">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(SUPPORTED_CURRENCIES).map(([key, curr]) => (
                  <SelectItem key={key} value={key}>
                    {curr.symbol} {curr.code}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Calculate button */}
          <div className="flex flex-col justify-end">
            {hasPendingChanges && appliedRate !== null && (
              <p className="mb-1 text-xs text-amber-600 dark:text-amber-400">
                Tasa modificada — recalcula para ver los nuevos valores
              </p>
            )}
            <Button
              onClick={handleCalculate}
              className={
                hasPendingChanges
                  ? 'bg-purple-600 text-white hover:bg-purple-700'
                  : 'bg-purple-200 text-purple-800 hover:bg-purple-300 dark:bg-purple-800/40 dark:text-purple-200 dark:hover:bg-purple-700/60'
              }
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              {appliedRate === null ? 'Calcular' : 'Recalcular'}
            </Button>
          </div>
        </div>
      </div>

      {/* Filter row */}
      <div className="flex justify-end">
        <CategoryExclusionFilter
          categories={filterCategories}
          excludedCategories={excludedCategories}
          onExclusionChange={setExcludedCategories}
        />
      </div>

      {/* Table — hidden until first calculation */}
      {appliedRate === null ? (
        <div className="rounded-lg border border-dashed p-8 text-center text-muted-foreground">
          Ajusta la tasa EA y haz clic en <strong>Calcular</strong> para ver el
          capital requerido por categoría.
        </div>
      ) : rowsWithCapital.length === 0 ? (
        <div className="rounded-lg border border-dashed p-8 text-center text-muted-foreground">
          Todas las categorías están excluidas.
        </div>
      ) : (
        <>
          <p className="text-sm text-muted-foreground">
            Capital calculado con tasa EA{' '}
            <span className="font-semibold text-purple-700 dark:text-purple-300">
              {appliedRate}%
            </span>
          </p>
          <div className="overflow-hidden rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Categoría</TableHead>
                  <TableHead className="text-right">
                    Presupuesto mensual
                  </TableHead>
                  <TableHead className="text-right">
                    Capital requerido
                  </TableHead>
                  <TableHead className="text-right text-purple-700 dark:text-purple-300">
                    Capital acumulado
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rowsWithCapital.map((row) => (
                  <TableRow key={row.categoryId}>
                    <TableCell className="font-medium">
                      {row.categoryName}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatCurrency(row.budgetAmount, currency)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatCurrency(row.requiredCapital, currency)}
                    </TableCell>
                    <TableCell className="text-right font-medium tabular-nums text-purple-700 dark:text-purple-300">
                      {formatCurrency(row.runningCapital, currency)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
              <TableFooter>
                <TableRow className="font-semibold">
                  <TableCell>Total</TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatCurrency(totalBudget, currency)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatCurrency(totalCapital, currency)}
                  </TableCell>
                  <TableCell />
                </TableRow>
              </TableFooter>
            </Table>
          </div>
        </>
      )}
    </div>
  );
}
