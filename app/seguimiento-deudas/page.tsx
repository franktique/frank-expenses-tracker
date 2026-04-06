import { Landmark } from 'lucide-react';
import { DebtTrackingMain } from '@/components/debt-tracking/debt-tracking-main';

export const metadata = {
  title: 'Seguimiento de Deudas | Budget Tracker',
  description: 'Seguimiento y proyección de deudas y obligaciones financieras',
};

export default function SeguimientoDeudasPage() {
  return (
    <div className="container mx-auto max-w-5xl px-4 py-6">
      <div className="mb-6">
        <div className="flex items-center gap-3">
          <Landmark className="h-6 w-6" />
          <h1 className="text-2xl font-bold">Seguimiento de Deudas</h1>
        </div>
        <p className="text-muted-foreground mt-1">
          Registra y proyecta tus deudas activas, visualiza la amortización y
          detecta pagos del periodo automáticamente.
        </p>
      </div>
      <DebtTrackingMain />
    </div>
  );
}
