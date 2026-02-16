import { notFound } from 'next/navigation';
import { Percent } from 'lucide-react';
import { InterestRateCalculator } from '@/components/interest-rate-simulator';
import type { InterestRateScenario } from '@/types/interest-rate-simulator';

export const metadata = {
  title: 'Ver Simulación de Tasa | Budget Tracker',
  description: 'Editar simulación de tasa de interés guardada',
};

type PageParams = {
  params: Promise<{ id: string }>;
};

async function getScenario(id: string): Promise<InterestRateScenario | null> {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const response = await fetch(
      `${baseUrl}/api/interest-rate-scenarios/${id}`,
      {
        cache: 'no-store',
      }
    );

    if (!response.ok) {
      return null;
    }

    return response.json();
  } catch (error) {
    console.error('Error fetching scenario:', error);
    return null;
  }
}

export default async function ViewInterestRateScenarioPage({
  params,
}: PageParams) {
  const { id } = await params;
  const scenario = await getScenario(id);

  if (!scenario) {
    notFound();
  }

  return (
    <div className="container mx-auto max-w-6xl px-4 py-6">
      {/* Page Header */}
      <div className="mb-8">
        <div className="mb-2 flex items-center gap-3">
          <div className="rounded-lg bg-purple-100 p-2 dark:bg-purple-900/30">
            <Percent className="h-6 w-6 text-purple-600 dark:text-purple-400" />
          </div>
          <h1 className="text-2xl font-bold">{scenario.name}</h1>
        </div>
        <p className="text-muted-foreground">
          Editando simulación de tasa guardada. Los cambios se pueden guardar
          con el mismo nombre o con uno nuevo.
        </p>
      </div>

      {/* Calculator Component with pre-loaded scenario */}
      <InterestRateCalculator initialScenario={scenario} />
    </div>
  );
}
