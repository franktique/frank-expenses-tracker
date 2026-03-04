'use client';

import { format } from 'date-fns';
import type { PaymentCalendarDay } from '@/types/funds';
import type { PaymentMethodFilter } from '@/lib/payment-calendar-utils';
import { getDayTotals, formatCurrency } from '@/lib/payment-calendar-utils';
import { cn } from '@/lib/utils';

interface PaymentCalendarDayCellProps {
  day: PaymentCalendarDay;
  isSelected: boolean;
  isToday: boolean;
  filter: PaymentMethodFilter;
  onClick: () => void;
}

export function PaymentCalendarDayCell({
  day,
  isSelected,
  isToday,
  filter,
  onClick,
}: PaymentCalendarDayCellProps) {
  const [year, month, dayNum] = day.date.split('-').map(Number);
  const dayNumber = dayNum;
  const { cashTotal, creditTotal } = getDayTotals(day, filter);
  const hasAmounts = cashTotal > 0 || creditTotal > 0;

  return (
    <button
      onClick={onClick}
      className={cn(
        'relative flex flex-col min-h-[80px] p-1.5 rounded-md border text-left w-full transition-colors',
        'hover:bg-accent hover:border-accent-foreground/20',
        isSelected
          ? 'bg-accent border-primary/40 ring-1 ring-primary/30'
          : 'bg-card border-border',
        !hasAmounts && 'cursor-default'
      )}
    >
      {/* Day number */}
      <span
        className={cn(
          'text-xs font-medium leading-none mb-1',
          isToday
            ? 'flex items-center justify-center w-5 h-5 rounded-full bg-primary text-primary-foreground text-[10px]'
            : 'text-muted-foreground'
        )}
      >
        {dayNumber}
      </span>

      {/* Amount badges */}
      <div className="flex flex-col gap-0.5 mt-auto">
        {cashTotal > 0 && (
          <span className="text-[10px] font-medium px-1 py-0.5 rounded bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300 leading-none truncate">
            {formatCurrency(cashTotal)}
          </span>
        )}
        {creditTotal > 0 && (
          <span className="text-[10px] font-medium px-1 py-0.5 rounded bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300 leading-none truncate">
            💳 {formatCurrency(creditTotal)}
          </span>
        )}
      </div>
    </button>
  );
}
