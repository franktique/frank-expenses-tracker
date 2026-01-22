"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { TrendingUp, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { InvestCalculator } from "@/components/invest-simulator";
import type { InvestmentScenario } from "@/types/invest-simulator";

export default function SimularInversionesDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [scenario, setScenario] = useState<InvestmentScenario | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchScenario = async () => {
      try {
        const response = await fetch(`/api/invest-scenarios/${params.id}`);
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || "Error loading scenario");
        }
        const data = await response.json();
        setScenario(data);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };

    if (params.id) {
      fetchScenario();
    }
  }, [params.id]);

  if (isLoading) {
    return (
      <div className="container mx-auto py-6 px-4 max-w-6xl">
        <div className="flex items-center justify-center h-64">
          <div className="text-muted-foreground">Cargando simulación...</div>
        </div>
      </div>
    );
  }

  if (error || !scenario) {
    return (
      <div className="container mx-auto py-6 px-4 max-w-6xl">
        <div className="flex flex-col items-center justify-center h-64 gap-4">
          <div className="text-destructive">{error || "Simulación no encontrada"}</div>
          <Button variant="outline" onClick={() => router.push("/simular-inversiones")}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Volver al simulador
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 px-4 max-w-6xl">
      {/* Page Header */}
      <div className="mb-8">
        <Button
          variant="ghost"
          className="mb-4 -ml-2"
          onClick={() => router.push("/simular-inversiones")}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Volver al simulador
        </Button>

        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
            <TrendingUp className="h-6 w-6 text-purple-600 dark:text-purple-400" />
          </div>
          <h1 className="text-2xl font-bold">{scenario.name}</h1>
        </div>
        <p className="text-muted-foreground">
          Edita los parámetros de tu simulación y guarda los cambios cuando estés listo.
        </p>
      </div>

      {/* Calculator with loaded scenario */}
      <InvestCalculator initialScenario={scenario} />
    </div>
  );
}
