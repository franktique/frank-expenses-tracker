import { formatCurrency } from '@/lib/utils';

export const DailyExpensesTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="rounded border bg-background p-2 shadow-md">
        <p className="mb-1 font-medium">Fecha: {payload[0].payload.date}</p>
        <div className="space-y-1">
          <p className="flex items-center justify-between text-primary">
            <span>Total:</span>
            <span className="ml-4 font-semibold">
              {formatCurrency(payload[0].payload.total)}
            </span>
          </p>
        </div>
      </div>
    );
  }
  return null;
};
