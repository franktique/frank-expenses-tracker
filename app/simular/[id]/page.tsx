'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/components/ui/use-toast';
import { SimulationBudgetForm } from '@/components/simulation-budget-form';
import { SimulationIncomeInput } from '@/components/simulation-income-input';
import { SimulationBreadcrumb } from '@/components/simulation-breadcrumb';
import { SimulationNavigation } from '@/components/simulation-navigation';
import { SimulationQuickActions } from '@/components/simulation-quick-actions';
import { PeriodSelectorDialog } from '@/components/period-selector-dialog';
import { ArrowLeft, Settings, BarChart3, Loader2, Copy } from 'lucide-react';

// Types
type Simulation = {
  id: number;
  name: string;
  description: string | null;
  created_at: string;
  updated_at: string;
  budget_count: number;
};

export default function SimulationConfigPage() {
  const router = useRouter();
  const params = useParams();
  const { toast } = useToast();

  const simulationId = parseInt(params.id as string);

  // State
  const [simulation, setSimulation] = useState<Simulation | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('budget');
  const [totalIncome, setTotalIncome] = useState(0);
  const [isPeriodSelectorOpen, setIsPeriodSelectorOpen] = useState(false);
  const [existingDataCount, setExistingDataCount] = useState({
    incomes: 0,
    budgets: 0,
  });

  // Load simulation data
  useEffect(() => {
    const loadSimulation = async () => {
      if (isNaN(simulationId)) {
        toast({
          title: 'Error',
          description: 'ID de simulación inválido',
          variant: 'destructive',
        });
        router.push('/simular');
        return;
      }

      setIsLoading(true);
      try {
        const response = await fetch(`/api/simulations/${simulationId}`);
        if (!response.ok) {
          if (response.status === 404) {
            toast({
              title: 'Simulación no encontrada',
              description: 'La simulación solicitada no existe',
              variant: 'destructive',
            });
            router.push('/simular');
            return;
          }
          throw new Error('Error al cargar la simulación');
        }

        const simulationData = await response.json();
        setSimulation(simulationData);
      } catch (error) {
        toast({
          title: 'Error',
          description:
            (error as Error).message || 'Error al cargar la simulación',
          variant: 'destructive',
        });
        router.push('/simular');
      } finally {
        setIsLoading(false);
      }
    };

    loadSimulation();
  }, [simulationId, router, toast]);

  // Handle navigation back to simulation list
  const handleBackToList = () => {
    router.push('/simular');
  };

  // Load existing data count for period selector
  useEffect(() => {
    if (simulationId) {
      loadExistingDataCount();
    }
  }, [simulationId]);

  const loadExistingDataCount = async () => {
    try {
      // Load incomes count
      const incomesResponse = await fetch(
        `/api/simulations/${simulationId}/incomes`
      );
      if (incomesResponse.ok) {
        const incomesData = await incomesResponse.json();
        setExistingDataCount((prev) => ({
          ...prev,
          incomes: incomesData.incomes?.length || 0,
        }));
      }

      // Load budgets count
      const budgetsResponse = await fetch(
        `/api/simulations/${simulationId}/budgets`
      );
      if (budgetsResponse.ok) {
        const budgetsData = await budgetsResponse.json();
        setExistingDataCount((prev) => ({
          ...prev,
          budgets: budgetsData.budgets?.length || 0,
        }));
      }
    } catch (error) {
      console.error('Error loading existing data count:', error);
    }
  };

  // Handle successful save
  const handleSaveSuccess = () => {
    // Refresh simulation data to update budget_count
    if (simulation) {
      fetch(`/api/simulations/${simulationId}`)
        .then((response) => response.json())
        .then((updatedSimulation) => {
          setSimulation(updatedSimulation);
        })
        .catch((error) => {
          console.error('Error refreshing simulation data:', error);
        });
    }
  };

  // Handle successful period copy
  const handlePeriodCopySuccess = (
    periodId: string,
    periodName: string,
    mode: 'merge' | 'replace'
  ) => {
    toast({
      title: 'Datos copiados exitosamente',
      description: `Los datos del período "${periodName}" han sido copiados a la simulación`,
    });

    // Refresh data count
    loadExistingDataCount();

    // Force reload of income and budget components by triggering save success
    handleSaveSuccess();

    // Reload page to refresh all data
    setTimeout(() => {
      window.location.reload();
    }, 1000);
  };

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-4 sm:px-6 sm:py-6 lg:px-8">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin" />
          <span className="ml-2">Cargando simulación...</span>
        </div>
      </div>
    );
  }

  if (!simulation) {
    return (
      <div className="container mx-auto px-4 py-4 sm:px-6 sm:py-6 lg:px-8">
        <Card>
          <CardHeader>
            <CardTitle>Simulación no encontrada</CardTitle>
            <CardDescription>
              La simulación solicitada no existe o ha sido eliminada.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={handleBackToList}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Volver a Simulaciones
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto space-y-6 px-4 py-4 sm:px-6 sm:py-6 lg:px-8">
      {/* Enhanced Breadcrumb Navigation */}
      <SimulationBreadcrumb
        simulationId={simulation.id}
        simulationName={simulation.name}
        currentPage="config"
        showQuickActions={true}
      />

      {/* Quick Navigation */}
      <SimulationNavigation
        currentSimulationId={simulation.id}
        showRecentList={false}
        maxRecentItems={3}
      />

      {/* Quick Actions */}
      <SimulationQuickActions
        currentSimulation={simulation}
        onNavigateToAnalytics={() =>
          router.push(`/simular/${simulation.id}/analytics`)
        }
        onNavigateToList={() => router.push('/simular')}
        onDuplicate={async () => {
          try {
            const response = await fetch('/api/simulations', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                name: `${simulation.name} (Copia)`,
                description: simulation.description,
                copyFrom: simulation.id,
              }),
            });
            if (response.ok) {
              const newSimulation = await response.json();
              router.push(`/simular/${newSimulation.id}`);
              toast({
                title: 'Simulación duplicada',
                description: 'Se ha creado una copia de la simulación',
              });
            }
          } catch (error) {
            toast({
              title: 'Error',
              description: 'No se pudo duplicar la simulación',
              variant: 'destructive',
            });
          }
        }}
        onRefresh={() => window.location.reload()}
        showWorkflowSuggestions={true}
      />

      {/* Header with navigation */}
      <div className="flex flex-col space-y-4 sm:flex-row sm:items-center sm:justify-between sm:space-y-0">
        <div className="flex flex-col space-y-2 sm:flex-row sm:items-center sm:space-x-4 sm:space-y-0">
          <Button variant="ghost" onClick={handleBackToList} className="w-fit">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Simulaciones
          </Button>
          <div>
            <h1 className="text-xl font-bold sm:text-2xl">{simulation.name}</h1>
            {simulation.description && (
              <p className="text-sm text-muted-foreground sm:text-base">
                {simulation.description}
              </p>
            )}
          </div>
        </div>
        <div className="text-sm text-muted-foreground">
          {simulation.budget_count > 0 ? (
            <span className="text-green-600">
              {simulation.budget_count} categorías configuradas
            </span>
          ) : (
            <span>Sin presupuestos configurados</span>
          )}
        </div>
      </div>

      {/* Tabs for different sections */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger
            value="budget"
            className="flex items-center space-x-1 sm:space-x-2"
          >
            <Settings className="h-4 w-4" />
            <span className="hidden sm:inline">Configuración</span>
            <span className="sm:hidden">Config</span>
          </TabsTrigger>
          <TabsTrigger
            value="analytics"
            disabled
            className="flex cursor-not-allowed items-center space-x-1 opacity-50 sm:space-x-2"
          >
            <BarChart3 className="h-4 w-4" />
            <span>Análisis</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="budget" className="space-y-6">
          {/* Copy from Period Button */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Datos de la Simulación</CardTitle>
                  <CardDescription>
                    Configura los ingresos y presupuestos, o cópialos desde un
                    período existente
                  </CardDescription>
                </div>
                <Button
                  variant="outline"
                  onClick={() => setIsPeriodSelectorOpen(true)}
                  className="flex items-center gap-2"
                >
                  <Copy className="h-4 w-4" />
                  Copiar desde Período
                </Button>
              </div>
            </CardHeader>
          </Card>

          <SimulationIncomeInput
            simulationId={simulation.id}
            simulationName={simulation.name}
            onIncomeChange={setTotalIncome}
          />
          <SimulationBudgetForm
            simulationId={simulation.id}
            simulationName={simulation.name}
            totalIncome={totalIncome}
            onSave={handleSaveSuccess}
            onCancel={handleBackToList}
          />

          {/* Period Selector Dialog */}
          <PeriodSelectorDialog
            open={isPeriodSelectorOpen}
            onOpenChange={setIsPeriodSelectorOpen}
            simulationId={simulation.id}
            simulationName={simulation.name}
            onSuccess={handlePeriodCopySuccess}
            existingDataCount={existingDataCount}
          />
        </TabsContent>

        <TabsContent value="analytics" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Análisis de Simulación</CardTitle>
              <CardDescription>
                Visualización y comparación de datos de simulación con análisis
                histórico
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="py-8 text-center">
                <BarChart3 className="mx-auto mb-4 h-16 w-16 text-blue-600" />
                <h3 className="mb-2 text-lg font-semibold">
                  Análisis Avanzado Disponible
                </h3>
                <p className="mx-auto mb-6 max-w-md text-muted-foreground">
                  Accede al análisis completo con gráficos comparativos,
                  métricas de variación y herramientas de exportación
                </p>
                <Button
                  onClick={() =>
                    router.push(`/simular/${simulation.id}/analytics`)
                  }
                  className="flex items-center gap-2"
                >
                  <BarChart3 className="h-4 w-4" />
                  Ir al Análisis Completo
                </Button>
              </div>

              {/* Quick preview of simulation status */}
              <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
                <h4 className="mb-2 font-medium text-blue-900">Vista Previa</h4>
                <div className="grid grid-cols-1 gap-4 text-sm sm:grid-cols-3">
                  <div>
                    <span className="font-medium text-blue-600">Estado:</span>
                    <p className="text-blue-800">
                      {simulation.budget_count > 0
                        ? `${simulation.budget_count} categorías configuradas`
                        : 'Sin presupuestos configurados'}
                    </p>
                  </div>
                  <div>
                    <span className="font-medium text-blue-600">Análisis:</span>
                    <p className="text-blue-800">
                      Comparación histórica disponible
                    </p>
                  </div>
                  <div>
                    <span className="font-medium text-blue-600">
                      Exportación:
                    </span>
                    <p className="text-blue-800">Datos CSV y resúmenes</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
