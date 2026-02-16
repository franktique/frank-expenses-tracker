import { Percent } from 'lucide-react';
import { InterestRateCalculator } from '@/components/interest-rate-simulator';

export const metadata = {
  title: 'Simulador de Tasas | Budget Tracker',
  description:
    'Convierte tasas de interés entre diferentes formatos: EA, Mensual, Diaria, Nominal',
};

export default function SimularTasasPage() {
  return (
    <div className="container mx-auto max-w-6xl px-4 py-6">
      {/* Page Header */}
      <div className="mb-8">
        <div className="mb-2 flex items-center gap-3">
          <div className="rounded-lg bg-purple-100 p-2 dark:bg-purple-900/30">
            <Percent className="h-6 w-6 text-purple-600 dark:text-purple-400" />
          </div>
          <h1 className="text-2xl font-bold">Simulador de Tasas de Interés</h1>
        </div>
        <p className="text-muted-foreground">
          Convierte tasas de interés entre diferentes formatos. Ingresa una tasa
          en cualquier formato (EA, Mensual, Diaria, Nominal) y obtén su
          equivalente en los demás. Los cálculos se actualizan en tiempo real.
        </p>
      </div>

      {/* Calculator Component */}
      <InterestRateCalculator />
    </div>
  );
}
