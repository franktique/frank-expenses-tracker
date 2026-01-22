import { TrendingUp } from "lucide-react";
import { InvestCalculator } from "@/components/invest-simulator";

export const metadata = {
  title: "Simulador de Inversiones | Budget Tracker",
  description: "Simula el rendimiento de tus inversiones con interés compuesto",
};

export default function SimularInversionesPage() {
  return (
    <div className="container mx-auto py-6 px-4 max-w-6xl">
      {/* Page Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
            <TrendingUp className="h-6 w-6 text-purple-600 dark:text-purple-400" />
          </div>
          <h1 className="text-2xl font-bold">Simulador de Inversiones</h1>
        </div>
        <p className="text-muted-foreground">
          Configura los parámetros de tu inversión y visualiza el crecimiento proyectado con interés compuesto.
          Los cálculos se actualizan en tiempo real mientras ajustas los valores.
        </p>
      </div>

      {/* Calculator */}
      <InvestCalculator />
    </div>
  );
}
