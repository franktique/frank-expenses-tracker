'use client';

import { X } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import type { PaymentCalendarDay } from '@/types/funds';
import type { PaymentMethodFilter } from '@/lib/payment-calendar-utils';
import {
  formatCurrency,
  formatCalendarDate,
  capitalize,
} from '@/lib/payment-calendar-utils';

interface PaymentCalendarDetailProps {
  day: PaymentCalendarDay;
  filter: PaymentMethodFilter;
  onClose: () => void;
}

const PAYMENT_METHOD_LABELS: Record<string, string> = {
  cash: 'Efectivo',
  debit: 'Débito',
  credit: 'Crédito',
};

const PAYMENT_METHOD_VARIANT: Record<
  string,
  'default' | 'secondary' | 'outline'
> = {
  cash: 'secondary',
  debit: 'secondary',
  credit: 'default',
};

export function PaymentCalendarDetail({
  day,
  filter,
  onClose,
}: PaymentCalendarDetailProps) {
  const filteredBudgets = day.budgets.filter((b) => {
    if (filter === 'cash') return b.paymentMethod !== 'credit';
    if (filter === 'credit') return b.paymentMethod === 'credit';
    return true;
  });

  const cashTotal = filteredBudgets
    .filter((b) => b.paymentMethod !== 'credit')
    .reduce((sum, b) => sum + b.amount, 0);

  const creditTotal = filteredBudgets
    .filter((b) => b.paymentMethod === 'credit')
    .reduce((sum, b) => sum + b.amount, 0);

  const grandTotal = cashTotal + creditTotal;

  return (
    <Card className="mt-4">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-semibold capitalize">
            {capitalize(formatCalendarDate(day.date))}
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0"
            onClick={onClose}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {filteredBudgets.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No hay pagos para este día.
          </p>
        ) : (
          <>
            {/* Budget list */}
            <div className="space-y-1 mb-4">
              {filteredBudgets.map((budget, i) => (
                <div
                  key={`${budget.budgetId}-${i}`}
                  className="flex items-center justify-between py-1.5 px-2 rounded-md hover:bg-muted/50"
                >
                  <span className="text-sm text-foreground truncate mr-3">
                    {budget.categoryName}
                  </span>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <Badge
                      variant={
                        PAYMENT_METHOD_VARIANT[budget.paymentMethod] ??
                        'outline'
                      }
                      className="text-[10px] py-0"
                    >
                      {PAYMENT_METHOD_LABELS[budget.paymentMethod] ??
                        budget.paymentMethod}
                    </Badge>
                    <span className="text-sm font-medium tabular-nums">
                      {formatCurrency(budget.amount)}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {/* Subtotals */}
            <div className="border-t pt-3 space-y-1">
              {cashTotal > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-emerald-700 dark:text-emerald-400 font-medium">
                    Total Efectivo/Débito
                  </span>
                  <span className="font-semibold tabular-nums">
                    {formatCurrency(cashTotal)}
                  </span>
                </div>
              )}
              {creditTotal > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-blue-700 dark:text-blue-400 font-medium">
                    Total Crédito
                  </span>
                  <span className="font-semibold tabular-nums">
                    {formatCurrency(creditTotal)}
                  </span>
                </div>
              )}
              {cashTotal > 0 && creditTotal > 0 && (
                <div className="flex justify-between text-sm border-t pt-1 mt-1">
                  <span className="font-semibold">Total</span>
                  <span className="font-bold tabular-nums">
                    {formatCurrency(grandTotal)}
                  </span>
                </div>
              )}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
