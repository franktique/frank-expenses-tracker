'use client';

import type { BudgetDetail, BudgetExecutionViewMode } from '@/types/funds';
import { Card } from '@/components/ui/card';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';

interface BudgetDetailTableProps {
  budgets: BudgetDetail[];
  selectedDate: string;
  viewMode: BudgetExecutionViewMode;
  weekStart?: string;
  weekEnd?: string;
}

/**
 * BudgetDetailTable Component
 *
 * Displays a detailed breakdown of budgets for a selected date or week.
 * Shows category names and amounts sorted by amount (descending).
 */
export function BudgetDetailTable({
  budgets,
  selectedDate,
  viewMode,
  weekStart,
  weekEnd,
}: BudgetDetailTableProps) {
  // Sort budgets by amount (highest first)
  const sortedBudgets = [...budgets].sort((a, b) => b.amount - a.amount);

  // Format the header date/week display
  const getHeaderText = () => {
    if (viewMode === 'weekly' && weekStart && weekEnd) {
      const start = parseISO(weekStart);
      const end = parseISO(weekEnd);
      return `Semana ${format(start, "d 'de' MMMM", { locale: es })} - ${format(end, "d 'de' MMMM 'de' yyyy", { locale: es })}`;
    } else {
      const date = parseISO(selectedDate);
      return format(date, "d 'de' MMMM 'de' yyyy", { locale: es });
    }
  };

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN',
    }).format(amount);
  };

  // Calculate total
  const total = sortedBudgets.reduce((sum, budget) => sum + budget.amount, 0);

  return (
    <Card className="mt-6 p-6 duration-300 animate-in fade-in-50">
      {/* Header */}
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
          Detalle de Presupuestos
        </h3>
        <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
          {getHeaderText()}
        </p>
      </div>

      {/* Empty state */}
      {sortedBudgets.length === 0 ? (
        <div className="py-8 text-center text-gray-500 dark:text-gray-400">
          <p>No hay presupuestos programados para este período.</p>
        </div>
      ) : (
        <>
          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700">
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 dark:text-gray-300">
                    Categoría
                  </th>
                  {viewMode === 'weekly' && (
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 dark:text-gray-300">
                      Fecha
                    </th>
                  )}
                  <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700 dark:text-gray-300">
                    Monto
                  </th>
                </tr>
              </thead>
              <tbody>
                {sortedBudgets.map((budget, index) => (
                  <tr
                    key={`${budget.budgetId}-${budget.date}-${index}`}
                    className="border-b border-gray-100 transition-colors hover:bg-gray-50 dark:border-gray-800 dark:hover:bg-gray-800/50"
                  >
                    <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100">
                      {budget.categoryName}
                    </td>
                    {viewMode === 'weekly' && (
                      <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                        {format(parseISO(budget.date), "d 'de' MMM", {
                          locale: es,
                        })}
                      </td>
                    )}
                    <td className="px-4 py-3 text-right text-sm font-medium text-gray-900 dark:text-gray-100">
                      {formatCurrency(budget.amount)}
                    </td>
                  </tr>
                ))}
              </tbody>
              {/* Total row */}
              <tfoot>
                <tr className="border-t-2 border-gray-300 font-semibold dark:border-gray-600">
                  <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100">
                    Total
                  </td>
                  {viewMode === 'weekly' && <td></td>}
                  <td className="px-4 py-3 text-right text-sm text-gray-900 dark:text-gray-100">
                    {formatCurrency(total)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Budget count */}
          <div className="mt-4 text-xs text-gray-500 dark:text-gray-400">
            {sortedBudgets.length}{' '}
            {sortedBudgets.length === 1 ? 'presupuesto' : 'presupuestos'}
          </div>
        </>
      )}
    </Card>
  );
}
