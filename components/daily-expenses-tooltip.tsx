import { formatCurrency } from "@/lib/utils"

export const DailyExpensesTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-background border rounded p-2 shadow-md">
        <p className="font-medium mb-1">Fecha: {payload[0].payload.date}</p>
        <div className="space-y-1">
          <p className="text-primary flex items-center justify-between">
            <span>Total:</span>
            <span className="font-semibold ml-4">{formatCurrency(payload[0].payload.total)}</span>
          </p>
        </div>
      </div>
    );
  }
  return null;
}
