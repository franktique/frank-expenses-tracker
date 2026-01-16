"use client";

import type { Expense } from "@/types/funds";
import { PAYMENT_METHOD_LABELS } from "@/types/funds";
import { Card } from "@/components/ui/card";
import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";

interface ExpenseDetailTableProps {
  expenses: Expense[];
  periodName: string;
  categoryName: string;
}

/**
 * ExpenseDetailTable Component
 *
 * Displays a detailed breakdown of expenses for a selected period and category.
 * Shows date, description, event, amount, and payment method sorted by date (ascending).
 */
export function ExpenseDetailTable({
  expenses,
  periodName,
  categoryName,
}: ExpenseDetailTableProps) {
  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("es-CO", {
      style: "currency",
      currency: "COP",
    }).format(amount);
  };

  // Calculate total
  const total = expenses.reduce((sum, expense) => sum + Number(expense.amount), 0);

  // Get payment method label with color styling
  const getPaymentMethodBadge = (method: string) => {
    const label = PAYMENT_METHOD_LABELS[method as keyof typeof PAYMENT_METHOD_LABELS] || method;
    const colorClasses = {
      cash: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
      debit: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
      credit: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400",
    };
    const colorClass = colorClasses[method as keyof typeof colorClasses] || "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400";

    return (
      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${colorClass}`}>
        {label}
      </span>
    );
  };

  return (
    <Card className="p-6 mt-6 animate-in fade-in-50 duration-300">
      {/* Header */}
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
          Detalle de Gastos
        </h3>
        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
          {categoryName} - {periodName}
        </p>
      </div>

      {/* Empty state */}
      {expenses.length === 0 ? (
        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
          <p>No hay gastos registrados para este período.</p>
        </div>
      ) : (
        <>
          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700">
                  <th className="text-left py-3 px-4 font-semibold text-sm text-gray-700 dark:text-gray-300">
                    Fecha
                  </th>
                  <th className="text-left py-3 px-4 font-semibold text-sm text-gray-700 dark:text-gray-300">
                    Descripción
                  </th>
                  <th className="text-left py-3 px-4 font-semibold text-sm text-gray-700 dark:text-gray-300">
                    Evento
                  </th>
                  <th className="text-right py-3 px-4 font-semibold text-sm text-gray-700 dark:text-gray-300">
                    Monto
                  </th>
                  <th className="text-center py-3 px-4 font-semibold text-sm text-gray-700 dark:text-gray-300">
                    Método
                  </th>
                </tr>
              </thead>
              <tbody>
                {expenses.map((expense, index) => (
                  <tr
                    key={`${expense.id}-${index}`}
                    className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                  >
                    <td className="py-3 px-4 text-sm text-gray-600 dark:text-gray-400 whitespace-nowrap">
                      {format(parseISO(expense.date), "dd/MM/yyyy", { locale: es })}
                    </td>
                    <td className="py-3 px-4 text-sm text-gray-900 dark:text-gray-100">
                      {expense.description}
                    </td>
                    <td className="py-3 px-4 text-sm text-gray-600 dark:text-gray-400">
                      {expense.event || "-"}
                    </td>
                    <td className="py-3 px-4 text-sm text-right font-medium text-gray-900 dark:text-gray-100 whitespace-nowrap">
                      {formatCurrency(expense.amount)}
                    </td>
                    <td className="py-3 px-4 text-sm text-center">
                      {getPaymentMethodBadge(expense.payment_method)}
                    </td>
                  </tr>
                ))}
              </tbody>
              {/* Total row */}
              <tfoot>
                <tr className="border-t-2 border-gray-300 dark:border-gray-600 font-semibold">
                  <td className="py-3 px-4 text-sm text-gray-900 dark:text-gray-100">
                    Total
                  </td>
                  <td colSpan={2}></td>
                  <td className="py-3 px-4 text-sm text-right text-gray-900 dark:text-gray-100">
                    {formatCurrency(total)}
                  </td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Expense count */}
          <div className="mt-4 text-xs text-gray-500 dark:text-gray-400">
            {expenses.length} {expenses.length === 1 ? "gasto" : "gastos"}
          </div>
        </>
      )}
    </Card>
  );
}
