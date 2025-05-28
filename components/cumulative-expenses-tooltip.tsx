import { formatCurrency } from "@/lib/utils"

export const CumulativeExpensesTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    const hasCumulative = typeof data.cumulative === 'number';

    return (
      <div className="bg-background border rounded p-2 shadow-md">
        <p className="font-medium mb-1">Fecha: {data.date}</p>
        <div className="space-y-1">
          {hasCumulative && (
            <p className="text-primary flex items-center justify-between">
              <span>Acumulado:</span>
              <span className="font-semibold ml-4">{formatCurrency(data.cumulative)}</span>
            </p>
          )}
          <p className={`${hasCumulative ? 'text-muted-foreground text-sm' : 'text-primary'} flex items-center justify-between`}>
            <span>{hasCumulative ? 'Gasto diario:' : 'Total:'}</span>
            <span className="font-medium ml-4">{formatCurrency(data.total)}</span>
          </p>
        </div>
      </div>
    );
  }
  return null;
}
