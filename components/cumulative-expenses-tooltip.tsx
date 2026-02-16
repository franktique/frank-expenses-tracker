import { formatCurrency } from '@/lib/utils';

export const CumulativeExpensesTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    const hasCumulative = typeof data.cumulative === 'number';

    return (
      <div className="rounded border bg-background p-2 shadow-md">
        <p className="mb-1 font-medium">Fecha: {data.date}</p>
        <div className="space-y-1">
          {hasCumulative && (
            <p className="flex items-center justify-between text-primary">
              <span>Acumulado:</span>
              <span className="ml-4 font-semibold">
                {formatCurrency(data.cumulative)}
              </span>
            </p>
          )}
          <p
            className={`${hasCumulative ? 'text-sm text-muted-foreground' : 'text-primary'} flex items-center justify-between`}
          >
            <span>{hasCumulative ? 'Gasto diario:' : 'Total:'}</span>
            <span className="ml-4 font-medium">
              {formatCurrency(data.total)}
            </span>
          </p>
        </div>
      </div>
    );
  }
  return null;
};
