'use client';

import { useState, useEffect, useMemo } from 'react';
import { useBudget } from '@/context/budget-context';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CalendarRange, Loader2 } from 'lucide-react';
import type { PaymentCalendarResponse, PaymentCalendarDay } from '@/types/funds';
import type { PaymentMethodFilter } from '@/lib/payment-calendar-utils';
import { formatCurrency } from '@/lib/payment-calendar-utils';
import { PaymentCalendarGrid } from '@/components/payment-calendar/payment-calendar-grid';
import { PaymentCalendarDetail } from '@/components/payment-calendar/payment-calendar-detail';
import { cn } from '@/lib/utils';

export default function PaymentCalendarPage() {
  const { activePeriod } = useBudget();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [calendarData, setCalendarData] =
    useState<PaymentCalendarResponse | null>(null);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [filter, setFilter] = useState<PaymentMethodFilter>('all');

  useEffect(() => {
    if (!activePeriod?.id) {
      setError('No hay un período activo seleccionado.');
      setIsLoading(false);
      return;
    }

    const fetchData = async () => {
      try {
        setIsLoading(true);
        setError(null);
        setSelectedDate(null);
        const res = await fetch(
          `/api/payment-calendar/${activePeriod.id}`
        );
        if (!res.ok) {
          const body = await res.json();
          throw new Error(body.error ?? 'Error al cargar el calendario');
        }
        const data: PaymentCalendarResponse = await res.json();
        setCalendarData(data);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : 'Error al cargar el calendario'
        );
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [activePeriod?.id]);

  // Compute KPI totals across the entire period (respecting current filter)
  const kpis = useMemo(() => {
    if (!calendarData?.days) return { cash: 0, credit: 0, total: 0 };
    let cash = 0;
    let credit = 0;
    for (const day of calendarData.days) {
      if (filter !== 'credit') cash += day.cashTotal;
      if (filter !== 'cash') credit += day.creditTotal;
    }
    return { cash, credit, total: cash + credit };
  }, [calendarData, filter]);

  const selectedDay: PaymentCalendarDay | null = useMemo(() => {
    if (!selectedDate || !calendarData?.days) return null;
    return calendarData.days.find((d) => d.date === selectedDate) ?? null;
  }, [selectedDate, calendarData]);

  if (!activePeriod) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground">
        <p>Selecciona un período activo para ver el calendario de pagos.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 p-4 md:p-6">
      {/* Header */}
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2">
          <CalendarRange className="h-5 w-5 text-primary" />
          <h1 className="text-xl font-bold">Calendario de Pagos</h1>
        </div>
        {calendarData && (
          <p className="text-sm text-muted-foreground">
            {calendarData.periodName}
          </p>
        )}
      </div>

      {/* Filter buttons */}
      <div className="flex gap-2 flex-wrap">
        {(
          [
            { key: 'all', label: 'Todos' },
            { key: 'cash', label: 'Efectivo / Débito' },
            { key: 'credit', label: 'Crédito' },
          ] as { key: PaymentMethodFilter; label: string }[]
        ).map(({ key, label }) => (
          <Button
            key={key}
            variant={filter === key ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter(key)}
          >
            {label}
          </Button>
        ))}
      </div>

      {/* KPI Cards */}
      {!isLoading && !error && calendarData && (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {filter !== 'credit' && (
            <Card>
              <CardHeader className="pb-1 pt-3 px-4">
                <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Total Efectivo / Débito
                </CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-3">
                <p className="text-lg font-bold text-emerald-700 dark:text-emerald-400">
                  {formatCurrency(kpis.cash)}
                </p>
              </CardContent>
            </Card>
          )}
          {filter !== 'cash' && (
            <Card>
              <CardHeader className="pb-1 pt-3 px-4">
                <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Total Crédito
                </CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-3">
                <p className="text-lg font-bold text-blue-700 dark:text-blue-400">
                  {formatCurrency(kpis.credit)}
                </p>
              </CardContent>
            </Card>
          )}
          {filter === 'all' && (
            <Card>
              <CardHeader className="pb-1 pt-3 px-4">
                <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Total General
                </CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-3">
                <p className="text-lg font-bold">{formatCurrency(kpis.total)}</p>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Content */}
      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : error ? (
        <div className="flex items-center justify-center h-64 text-destructive">
          <p>{error}</p>
        </div>
      ) : !calendarData || calendarData.days.length === 0 ? (
        <div className="flex items-center justify-center h-64 text-muted-foreground">
          <p>No hay presupuestos para este período.</p>
        </div>
      ) : (
        <>
          {/* Calendar grid */}
          <Card>
            <CardContent className="pt-4">
              <PaymentCalendarGrid
                month={calendarData.month}
                year={calendarData.year}
                days={calendarData.days}
                selectedDate={selectedDate}
                filter={filter}
                onSelectDate={setSelectedDate}
              />
            </CardContent>
          </Card>

          {/* Day detail panel */}
          {selectedDay && (
            <PaymentCalendarDetail
              day={selectedDay}
              filter={filter}
              onClose={() => setSelectedDate(null)}
            />
          )}
        </>
      )}
    </div>
  );
}
