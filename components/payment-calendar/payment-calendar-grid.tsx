'use client';

import { format } from 'date-fns';
import type { PaymentCalendarDay } from '@/types/funds';
import type { PaymentMethodFilter } from '@/lib/payment-calendar-utils';
import {
  buildCalendarGrid,
  getWeekdayHeaders,
} from '@/lib/payment-calendar-utils';
import { PaymentCalendarDayCell } from './payment-calendar-day-cell';
import { cn } from '@/lib/utils';

interface PaymentCalendarGridProps {
  month: number; // 1-indexed
  year: number;
  days: PaymentCalendarDay[];
  selectedDate: string | null;
  filter: PaymentMethodFilter;
  onSelectDate: (date: string | null) => void;
}

export function PaymentCalendarGrid({
  month,
  year,
  days,
  selectedDate,
  filter,
  onSelectDate,
}: PaymentCalendarGridProps) {
  const weeks = buildCalendarGrid(month, year, days);
  const headers = getWeekdayHeaders();
  const todayStr = format(new Date(), 'yyyy-MM-dd');

  const handleCellClick = (date: string) => {
    onSelectDate(selectedDate === date ? null : date);
  };

  return (
    <div className="w-full">
      {/* Weekday headers */}
      <div className="grid grid-cols-7 mb-1">
        {headers.map((h) => (
          <div
            key={h}
            className="text-center text-xs font-medium text-muted-foreground py-1"
          >
            {h}
          </div>
        ))}
      </div>

      {/* Calendar weeks */}
      <div className="space-y-1">
        {weeks.map((week, wi) => (
          <div key={wi} className="grid grid-cols-7 gap-1">
            {week.map((day, di) =>
              day === null ? (
                <div
                  key={di}
                  className="min-h-[80px] rounded-md border border-dashed border-border/30 bg-muted/20"
                />
              ) : (
                <PaymentCalendarDayCell
                  key={day.date}
                  day={day}
                  isSelected={selectedDate === day.date}
                  isToday={day.date === todayStr}
                  filter={filter}
                  onClick={() => handleCellClick(day.date)}
                />
              )
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
