'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { RefreshCw } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import {
  InvestCalculatorForm,
  type InvestmentFormData,
} from './invest-calculator-form';
import { InvestSummaryCards } from './invest-summary-cards';
import { InvestProjectionChart } from './invest-projection-chart';
import { InvestmentScheduleTable } from './investment-schedule-table';
import { RateComparisonPanel } from './rate-comparison-panel';
import { SaveScenarioDialog } from './save-scenario-dialog';
import { InvestScenarioList } from './invest-scenario-list';
import type {
  InvestmentScenario,
  InvestmentSummary,
  InvestmentPeriodDetail,
  RateComparisonResult,
} from '@/types/invest-simulator';
import {
  calculateInvestmentSummary,
  generateMonthlySummarySchedule,
  compareRates,
} from '@/lib/invest-calculations';

interface InvestCalculatorProps {
  initialScenario?: InvestmentScenario;
}

const DEFAULT_FORM_DATA: InvestmentFormData = {
  initialAmount: 500000,
  monthlyContribution: 100000,
  termMonths: 12,
  annualRate: 8.25,
  compoundingFrequency: 'monthly',
  currency: 'COP',
};

export function InvestCalculator({ initialScenario }: InvestCalculatorProps) {
  const { toast } = useToast();

  // Form state
  const [formData, setFormData] = useState<InvestmentFormData>(
    initialScenario
      ? {
          initialAmount: initialScenario.initialAmount,
          monthlyContribution: initialScenario.monthlyContribution,
          termMonths: initialScenario.termMonths,
          annualRate: initialScenario.annualRate,
          compoundingFrequency: initialScenario.compoundingFrequency,
          currency: initialScenario.currency,
        }
      : DEFAULT_FORM_DATA
  );

  // Loaded scenario tracking
  const [loadedScenarioId, setLoadedScenarioId] = useState<string | null>(
    initialScenario?.id || null
  );
  const [loadedScenarioName, setLoadedScenarioName] = useState<string | null>(
    initialScenario?.name || null
  );
  const [loadedScenarioNotes, setLoadedScenarioNotes] = useState<string>(
    initialScenario?.notes || ''
  );

  // Rate comparisons (local state for real-time comparison)
  const [additionalRates, setAdditionalRates] = useState<
    Array<{ rate: number; label?: string }>
  >([]);

  // Saved scenarios list
  const [savedScenarios, setSavedScenarios] = useState<
    (InvestmentScenario & { projectedFinalBalance?: number })[]
  >([]);
  const [isLoadingScenarios, setIsLoadingScenarios] = useState(true);

  // Calculate summary in real-time
  const summary: InvestmentSummary = useMemo(() => {
    return calculateInvestmentSummary({
      initialAmount: formData.initialAmount,
      monthlyContribution: formData.monthlyContribution,
      termMonths: formData.termMonths,
      annualRate: formData.annualRate,
      compoundingFrequency: formData.compoundingFrequency,
    });
  }, [formData]);

  // Generate schedule for chart and table (monthly summary for performance)
  const schedule: InvestmentPeriodDetail[] = useMemo(() => {
    return generateMonthlySummarySchedule({
      initialAmount: formData.initialAmount,
      monthlyContribution: formData.monthlyContribution,
      termMonths: formData.termMonths,
      annualRate: formData.annualRate,
      compoundingFrequency: formData.compoundingFrequency,
    });
  }, [formData]);

  // Calculate rate comparisons in real-time
  const rateComparisons: RateComparisonResult[] = useMemo(() => {
    return compareRates(
      {
        initialAmount: formData.initialAmount,
        monthlyContribution: formData.monthlyContribution,
        termMonths: formData.termMonths,
        annualRate: formData.annualRate,
        compoundingFrequency: formData.compoundingFrequency,
      },
      additionalRates
    );
  }, [formData, additionalRates]);

  // Fetch saved scenarios
  const fetchScenarios = useCallback(async () => {
    try {
      const response = await fetch('/api/invest-scenarios');
      if (!response.ok) {
        const error = await response.json();
        if (error.code === 'TABLES_NOT_FOUND') {
          // Tables don't exist yet, try to migrate
          const migrateResponse = await fetch('/api/migrate-invest-simulator', {
            method: 'POST',
          });
          if (migrateResponse.ok) {
            // Retry fetching after migration
            const retryResponse = await fetch('/api/invest-scenarios');
            if (retryResponse.ok) {
              const data = await retryResponse.json();
              setSavedScenarios(data.scenarios || []);
              return;
            }
          }
        }
        throw new Error(error.error || 'Error fetching scenarios');
      }
      const data = await response.json();
      setSavedScenarios(data.scenarios || []);
    } catch (error) {
      console.error('Error fetching scenarios:', error);
      // Don't show error toast on initial load if tables don't exist
    } finally {
      setIsLoadingScenarios(false);
    }
  }, []);

  useEffect(() => {
    fetchScenarios();
  }, [fetchScenarios]);

  // Save scenario
  const handleSave = async (name: string, notes?: string) => {
    const payload = {
      name,
      initialAmount: formData.initialAmount,
      monthlyContribution: formData.monthlyContribution,
      termMonths: formData.termMonths,
      annualRate: formData.annualRate,
      compoundingFrequency: formData.compoundingFrequency,
      currency: formData.currency,
      notes,
    };

    let response: Response;

    if (loadedScenarioId) {
      // Update existing scenario
      response = await fetch(`/api/invest-scenarios/${loadedScenarioId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
    } else {
      // Create new scenario
      response = await fetch('/api/invest-scenarios', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
    }

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Error saving scenario');
    }

    const saved = await response.json();
    setLoadedScenarioId(saved.id);
    setLoadedScenarioName(saved.name);
    setLoadedScenarioNotes(saved.notes || '');

    // Refresh the list
    fetchScenarios();
  };

  // Load scenario
  const handleLoad = (scenario: InvestmentScenario) => {
    setFormData({
      initialAmount: scenario.initialAmount,
      monthlyContribution: scenario.monthlyContribution,
      termMonths: scenario.termMonths,
      annualRate: scenario.annualRate,
      compoundingFrequency: scenario.compoundingFrequency,
      currency: scenario.currency,
    });
    setLoadedScenarioId(scenario.id);
    setLoadedScenarioName(scenario.name);
    setLoadedScenarioNotes(scenario.notes || '');
    setAdditionalRates([]); // Reset rate comparisons when loading

    toast({
      title: 'Simulación cargada',
      description: `"${scenario.name}" ha sido cargada en la calculadora`,
    });
  };

  // Delete scenario
  const handleDelete = async (id: string) => {
    const response = await fetch(`/api/invest-scenarios/${id}`, {
      method: 'DELETE',
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Error deleting scenario');
    }

    // Clear loaded scenario if it was deleted
    if (loadedScenarioId === id) {
      setLoadedScenarioId(null);
      setLoadedScenarioName(null);
    }

    // Refresh the list
    fetchScenarios();

    toast({
      title: 'Simulación eliminada',
      description: 'La simulación ha sido eliminada exitosamente',
    });
  };

  // Reset to new simulation
  const handleReset = () => {
    setFormData(DEFAULT_FORM_DATA);
    setLoadedScenarioId(null);
    setLoadedScenarioName(null);
    setLoadedScenarioNotes('');
    setAdditionalRates([]);
  };

  // Add rate comparison
  const handleAddRate = (rate: number, label?: string) => {
    // Don't add if it's the base rate
    if (Math.abs(rate - formData.annualRate) < 0.0001) {
      toast({
        title: 'Tasa duplicada',
        description: 'No puedes agregar la tasa base como comparación',
        variant: 'destructive',
      });
      return;
    }

    // Don't add duplicates
    if (additionalRates.some((r) => Math.abs(r.rate - rate) < 0.0001)) {
      toast({
        title: 'Tasa duplicada',
        description: 'Esta tasa ya existe en la comparación',
        variant: 'destructive',
      });
      return;
    }

    setAdditionalRates([...additionalRates, { rate, label }]);
  };

  // Remove rate comparison
  const handleRemoveRate = (rate: number) => {
    setAdditionalRates(
      additionalRates.filter((r) => Math.abs(r.rate - rate) >= 0.0001)
    );
  };

  return (
    <div className="space-y-6">
      {/* Header with loaded scenario info and reset button */}
      <div className="flex items-center justify-between">
        <div>
          {loadedScenarioName ? (
            <p className="text-sm text-muted-foreground">
              Editando:{' '}
              <span className="font-medium">{loadedScenarioName}</span>
            </p>
          ) : (
            <p className="text-sm text-muted-foreground">Nueva simulación</p>
          )}
        </div>
        <div className="flex items-center gap-2">
          {(loadedScenarioId || formData !== DEFAULT_FORM_DATA) && (
            <Button variant="outline" size="sm" onClick={handleReset}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Nueva Simulación
            </Button>
          )}
          <SaveScenarioDialog
            onSave={handleSave}
            defaultName={loadedScenarioName || ''}
            defaultNotes={loadedScenarioNotes}
            isUpdate={!!loadedScenarioId}
          />
        </div>
      </div>

      {/* Main calculator area */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Left: Form inputs */}
        <InvestCalculatorForm data={formData} onChange={setFormData} />

        {/* Right: Summary results */}
        <InvestSummaryCards
          summary={summary}
          currency={formData.currency}
          termMonths={formData.termMonths}
        />
      </div>

      {/* Tabs for detailed views */}
      <Tabs defaultValue="chart" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="chart">Gráfico</TabsTrigger>
          <TabsTrigger value="detail">Detalle por Periodo</TabsTrigger>
          <TabsTrigger value="compare">Comparar Tasas</TabsTrigger>
        </TabsList>

        <TabsContent value="chart" className="mt-4">
          <InvestProjectionChart
            schedule={schedule}
            currency={formData.currency}
            compoundingFrequency={formData.compoundingFrequency}
          />
        </TabsContent>

        <TabsContent value="detail" className="mt-4">
          <InvestmentScheduleTable
            schedule={schedule}
            currency={formData.currency}
            compoundingFrequency={formData.compoundingFrequency}
          />
        </TabsContent>

        <TabsContent value="compare" className="mt-4">
          <RateComparisonPanel
            comparisons={rateComparisons}
            currency={formData.currency}
            onAddRate={handleAddRate}
            onRemoveRate={handleRemoveRate}
          />
        </TabsContent>
      </Tabs>

      {/* Saved scenarios list */}
      <InvestScenarioList
        scenarios={savedScenarios}
        onLoad={handleLoad}
        onDelete={handleDelete}
        isLoading={isLoadingScenarios}
      />
    </div>
  );
}
