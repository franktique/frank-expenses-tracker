import { TrendingUp } from 'lucide-react';
import { InvestCalculator } from '@/components/invest-simulator';

export const metadata = {
  title: 'Simulador de Inversiones | Budget Tracker',
  description: 'Simula el rendimiento de tus inversiones con interés compuesto',
};

export default function SimularInversionesPage() {
  return (
    <div className="container mx-auto max-w-6xl px-4 py-6">
      {/* Page Header */}
      <div className="mb-8">
        <div className="mb-2 flex items-center gap-3">
          <div className="rounded-lg bg-purple-100 p-2 dark:bg-purple-900/30">
            <TrendingUp className="h-6 w-6 text-purple-600 dark:text-purple-400" />
          </div>
          <h1 className="text-2xl font-bold">Simulador de Inversiones</h1>
        </div>
        <p className="text-muted-foreground">
          Configura los parámetros de tu inversión y visualiza el crecimiento
          proyectado con interés compuesto. Los cálculos se actualizan en tiempo
          real mientras ajustas los valores.
        </p>
      </div>

      {/* Calculator */}
      <InvestCalculator />
    </div>
  );
}
