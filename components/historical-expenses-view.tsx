'use client';

import { useEffect, useState, Fragment, useMemo, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatCurrency } from '@/lib/utils';
import { HistoricalData } from '@/types/dashboard';

interface HistoricalExpensesViewProps {
  categoryIds?: string[];
  categoryOrder?: string[];
}

export function HistoricalExpensesView({
  categoryIds,
  categoryOrder,
}: HistoricalExpensesViewProps) {
  const [data, setData] = useState<HistoricalData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const tableRef = useRef<HTMLTableElement>(null);
  const topScrollRef = useRef<HTMLDivElement>(null);
  const bottomScrollRef = useRef<HTMLDivElement>(null);

  // Sync horizontal scroll between top mirror and bottom container,
  // and keep the top spacer width matching the table width
  useEffect(() => {
    const topEl = topScrollRef.current;
    const bottomEl = bottomScrollRef.current;
    const tableEl = tableRef.current;
    if (!topEl || !bottomEl || !tableEl) return;

    const syncTop = () => {
      if (topEl && bottomEl) topEl.scrollLeft = bottomEl.scrollLeft;
    };
    const syncBottom = () => {
      if (topEl && bottomEl) bottomEl.scrollLeft = topEl.scrollLeft;
    };

    bottomEl.addEventListener('scroll', syncTop);
    topEl.addEventListener('scroll', syncBottom);

    const observer = new ResizeObserver(() => {
      const spacer = topEl.firstElementChild as HTMLElement | null;
      if (spacer) spacer.style.width = `${tableEl.offsetWidth}px`;
    });
    observer.observe(tableEl);

    return () => {
      bottomEl.removeEventListener('scroll', syncTop);
      topEl.removeEventListener('scroll', syncBottom);
      observer.disconnect();
    };
  }, [data]);

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const url = new URL('/api/dashboard/history', window.location.origin);
        if (categoryIds && categoryIds.length > 0) {
          url.searchParams.set('categoryIds', categoryIds.join(','));
        }
        const res = await fetch(url.toString());
        if (!res.ok) throw new Error('Failed to fetch historical data');
        const json = (await res.json()) as HistoricalData;
        setData(json);
      } catch (e) {
        setError((e as Error).message);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [categoryIds]);

  const sortedCategories = useMemo(() => {
    if (!data) return [];
    if (!categoryOrder || categoryOrder.length === 0) return data.categories;
    const orderMap = new Map(categoryOrder.map((id, i) => [id, i]));
    return [...data.categories].sort(
      (a, b) =>
        (orderMap.get(a.category_id) ?? 999) -
        (orderMap.get(b.category_id) ?? 999)
    );
  }, [data, categoryOrder]);

  if (isLoading) {
    return (
      <div className="flex h-[300px] items-center justify-center">
        <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-[300px] items-center justify-center">
        <p className="text-destructive">Error: {error}</p>
      </div>
    );
  }

  if (!data || data.periods.length === 0) {
    return (
      <div className="flex h-[300px] items-center justify-center">
        <p className="text-muted-foreground">No hay historial disponible</p>
      </div>
    );
  }

  if (data.categories.length === 0) {
    return (
      <div className="flex h-[300px] items-center justify-center">
        <p className="text-muted-foreground">No hay categorias disponibles</p>
      </div>
    );
  }

  const currentPeriod = data.periods[0];
  const pastPeriods = data.periods.slice(1);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Historial de Gastos por Categoria</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        {/* Top horizontal scrollbar mirror — syncs with main container below */}
        <div
          ref={topScrollRef}
          className="overflow-x-auto"
          style={{ height: 16 }}
        >
          <div style={{ height: 1 }} />
        </div>
        {/* Main scrollable table area */}
        <div ref={bottomScrollRef} className="max-h-[65vh] overflow-auto">
          <table ref={tableRef} className="min-w-full border-collapse text-sm">
            <thead>
              <tr className="border-b">
                <th
                  rowSpan={2}
                  className="sticky left-0 z-[20] w-[180px] bg-background px-3 py-2 text-left font-medium"
                >
                  Categoria
                </th>
                {/* Current period group header */}
                <th
                  colSpan={2}
                  className="sticky left-[180px] z-[15] min-w-[220px] border-b bg-background px-3 py-2 text-center font-medium"
                >
                  {currentPeriod.period_name}
                  <span className="ml-1 rounded bg-primary/10 px-1 text-xs text-primary">
                    Actual
                  </span>
                </th>
                {/* Past period group headers */}
                {pastPeriods.map((p) => (
                  <th
                    key={p.period_id}
                    colSpan={2}
                    className="min-w-[220px] border-b px-3 py-2 text-center font-medium"
                  >
                    {p.period_name}
                  </th>
                ))}
              </tr>
              <tr className="border-b">
                {/* Current period sub-columns — sticky */}
                <th className="sticky left-[180px] z-[15] w-[110px] border-r bg-background px-3 py-2 text-right text-xs text-muted-foreground">
                  Credito
                </th>
                <th className="sticky left-[290px] z-[15] w-[110px] border-r bg-background px-3 py-2 text-right text-xs text-muted-foreground">
                  Efectivo
                </th>
                {/* Past period sub-columns — interleaved credit/cash per period */}
                {pastPeriods.map((p) => (
                  <Fragment key={p.period_id}>
                    <th className="w-[110px] border-r px-3 py-2 text-right text-xs text-muted-foreground">
                      Credito
                    </th>
                    <th className="w-[110px] border-r px-3 py-2 text-right text-xs text-muted-foreground">
                      Efectivo
                    </th>
                  </Fragment>
                ))}
              </tr>
            </thead>
            <tbody>
              {sortedCategories.map((cat) => (
                <tr
                  key={cat.category_id}
                  className="border-b hover:bg-muted/50"
                >
                  <td className="sticky left-0 z-[20] w-[180px] bg-background px-3 py-2 font-medium">
                    {cat.category_name}
                  </td>
                  {/* Current period — sticky */}
                  <td className="sticky left-[180px] z-[15] w-[110px] border-r bg-background px-3 py-2 text-right tabular-nums">
                    {formatCurrency(
                      cat.byPeriod[currentPeriod.period_id]?.credit_amount ?? 0
                    )}
                  </td>
                  <td className="sticky left-[290px] z-[15] w-[110px] border-r bg-background px-3 py-2 text-right tabular-nums">
                    {formatCurrency(
                      cat.byPeriod[currentPeriod.period_id]
                        ?.cash_debit_amount ?? 0
                    )}
                  </td>
                  {/* Past periods — interleaved credit/cash per period */}
                  {pastPeriods.map((p) => (
                    <Fragment key={p.period_id}>
                      <td className="w-[110px] border-r px-3 py-2 text-right tabular-nums">
                        {formatCurrency(
                          cat.byPeriod[p.period_id]?.credit_amount ?? 0
                        )}
                      </td>
                      <td className="w-[110px] border-r px-3 py-2 text-right tabular-nums">
                        {formatCurrency(
                          cat.byPeriod[p.period_id]?.cash_debit_amount ?? 0
                        )}
                      </td>
                    </Fragment>
                  ))}
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t-2 bg-muted/30 font-semibold">
                <td className="sticky left-0 z-[20] bg-muted/30 px-3 py-2">
                  TOTAL
                </td>
                <td className="sticky left-[180px] z-[15] border-r bg-muted/30 px-3 py-2 text-right tabular-nums">
                  {formatCurrency(
                    data.totals[currentPeriod.period_id]?.credit_amount ?? 0
                  )}
                </td>
                <td className="sticky left-[290px] z-[15] border-r bg-muted/30 px-3 py-2 text-right tabular-nums">
                  {formatCurrency(
                    data.totals[currentPeriod.period_id]?.cash_debit_amount ?? 0
                  )}
                </td>
                {pastPeriods.map((p) => (
                  <Fragment key={p.period_id}>
                    <td className="border-r px-3 py-2 text-right tabular-nums">
                      {formatCurrency(
                        data.totals[p.period_id]?.credit_amount ?? 0
                      )}
                    </td>
                    <td className="border-r px-3 py-2 text-right tabular-nums">
                      {formatCurrency(
                        data.totals[p.period_id]?.cash_debit_amount ?? 0
                      )}
                    </td>
                  </Fragment>
                ))}
              </tr>
            </tfoot>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
