'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { RefreshCw, FolderOpen, Trash2 } from 'lucide-react';
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
import { InvestTargetIncomeForm } from './invest-target-income-form';
import { InvestTargetIncomeResults } from './invest-target-income-results';
import type {
  InvestmentScenario,
  InvestmentSummary,
  InvestmentPeriodDetail,
  RateComparisonResult,
  TargetIncomeFormData,
  CurrencyCode,
} from '@/types/invest-simulator';
import { formatCurrency } from '@/types/invest-simulator';
import {
  calculateInvestmentSummary,
  generateMonthlySummarySchedule,
  compareRates,
  calculateRequiredCapitalForMonthlyIncome,
  convertEAToMonthlyRate,
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

const DEFAULT_TARGET_INCOME_DATA: TargetIncomeFormData = {
  annualRate: 8.25,
  targetMonthlyIncome: 1000000,
  currency: 'COP',
};

type CalculatorMode = 'projection' | 'target-income';

type SavedTargetIncomeScenario = {
  id: string;
  name: string;
  notes?: string;
  annualRate: number;
  targetMonthlyIncome: number;
  currency: CurrencyCode;
  savedAt: string;
};

const TARGET_INCOME_STORAGE_KEY = 'invest_target_income_scenarios';

export function InvestCalculator({ initialScenario }: InvestCalculatorProps) {
  const { toast } = useToast();

  // Calculator mode
  const [calculatorMode, setCalculatorMode] =
    useState<CalculatorMode>('projection');

  // Target income form state
  const [targetIncomeData, setTargetIncomeData] =
    useState<TargetIncomeFormData>(DEFAULT_TARGET_INCOME_DATA);
  const [loadedTargetScenarioId, setLoadedTargetScenarioId] = useState<
    string | null
  >(null);
  const [loadedTargetScenarioName, setLoadedTargetScenarioName] = useState<
    string | null
  >(null);
  const [savedTargetScenarios, setSavedTargetScenarios] = useState<
    SavedTargetIncomeScenario[]
  >([]);

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

  // Target income calculation
  const targetIncomeResult = useMemo(() => {
    const requiredCapital = calculateRequiredCapitalForMonthlyIncome(
      targetIncomeData.annualRate,
      targetIncomeData.targetMonthlyIncome
    );
    const monthlyRate = convertEAToMonthlyRate(targetIncomeData.annualRate);
    return { requiredCapital, monthlyRate };
  }, [targetIncomeData]);

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

  // ── Target income localStorage helpers ────────────────────────────────────

  const loadTargetScenarios = useCallback(() => {
    try {
      const raw = localStorage.getItem(TARGET_INCOME_STORAGE_KEY);
      if (raw) setSavedTargetScenarios(JSON.parse(raw));
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    loadTargetScenarios();
  }, [loadTargetScenarios]);

  const handleSaveTargetIncome = async (
    name: string,
    notes?: string
  ): Promise<void> => {
    try {
      const raw = localStorage.getItem(TARGET_INCOME_STORAGE_KEY);
      const existing: SavedTargetIncomeScenario[] = raw ? JSON.parse(raw) : [];

      if (loadedTargetScenarioId) {
        // Update existing
        const updated = existing.map((s) =>
          s.id === loadedTargetScenarioId
            ? {
                ...s,
                name,
                notes,
                annualRate: targetIncomeData.annualRate,
                targetMonthlyIncome: targetIncomeData.targetMonthlyIncome,
                currency: targetIncomeData.currency,
              }
            : s
        );
        localStorage.setItem(
          TARGET_INCOME_STORAGE_KEY,
          JSON.stringify(updated)
        );
        setSavedTargetScenarios(updated);
        setLoadedTargetScenarioName(name);
      } else {
        // Create new
        const newScenario: SavedTargetIncomeScenario = {
          id: crypto.randomUUID(),
          name,
          notes,
          annualRate: targetIncomeData.annualRate,
          targetMonthlyIncome: targetIncomeData.targetMonthlyIncome,
          currency: targetIncomeData.currency,
          savedAt: new Date().toISOString(),
        };
        const updated = [newScenario, ...existing];
        localStorage.setItem(
          TARGET_INCOME_STORAGE_KEY,
          JSON.stringify(updated)
        );
        setSavedTargetScenarios(updated);
        setLoadedTargetScenarioId(newScenario.id);
        setLoadedTargetScenarioName(newScenario.name);
      }
    } catch {
      throw new Error('No se pudo guardar en el almacenamiento local');
    }
  };

  const handleLoadTargetScenario = (scenario: SavedTargetIncomeScenario) => {
    setTargetIncomeData({
      annualRate: scenario.annualRate,
      targetMonthlyIncome: scenario.targetMonthlyIncome,
      currency: scenario.currency,
    });
    setLoadedTargetScenarioId(scenario.id);
    setLoadedTargetScenarioName(scenario.name);
    toast({
      title: 'Renta Objetivo cargada',
      description: `"${scenario.name}" ha sido cargada`,
    });
  };

  const handleDeleteTargetScenario = (id: string) => {
    try {
      const raw = localStorage.getItem(TARGET_INCOME_STORAGE_KEY);
      const existing: SavedTargetIncomeScenario[] = raw ? JSON.parse(raw) : [];
      const updated = existing.filter((s) => s.id !== id);
      localStorage.setItem(TARGET_INCOME_STORAGE_KEY, JSON.stringify(updated));
      setSavedTargetScenarios(updated);
      if (loadedTargetScenarioId === id) {
        setLoadedTargetScenarioId(null);
        setLoadedTargetScenarioName(null);
      }
      toast({
        title: 'Eliminado',
        description: 'La simulación ha sido eliminada',
      });
    } catch {
      toast({
        title: 'Error',
        description: 'No se pudo eliminar la simulación',
        variant: 'destructive',
      });
    }
  };

  const handleResetTargetIncome = () => {
    setTargetIncomeData(DEFAULT_TARGET_INCOME_DATA);
    setLoadedTargetScenarioId(null);
    setLoadedTargetScenarioName(null);
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
          {calculatorMode === 'projection' && (
            <>
              {loadedScenarioName ? (
                <p className="text-sm text-muted-foreground">
                  Editando:{' '}
                  <span className="font-medium">{loadedScenarioName}</span>
                </p>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Nueva simulación
                </p>
              )}
            </>
          )}
          {calculatorMode === 'target-income' && (
            <>
              {loadedTargetScenarioName ? (
                <p className="text-sm text-muted-foreground">
                  Editando:{' '}
                  <span className="font-medium">
                    {loadedTargetScenarioName}
                  </span>
                </p>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Nueva renta objetivo
                </p>
              )}
            </>
          )}
        </div>
        <div className="flex items-center gap-2">
          {calculatorMode === 'projection' &&
            (loadedScenarioId || formData !== DEFAULT_FORM_DATA) && (
              <Button variant="outline" size="sm" onClick={handleReset}>
                <RefreshCw className="mr-2 h-4 w-4" />
                Nueva Simulación
              </Button>
            )}
          {calculatorMode === 'projection' && (
            <SaveScenarioDialog
              onSave={handleSave}
              defaultName={loadedScenarioName || ''}
              defaultNotes={loadedScenarioNotes}
              isUpdate={!!loadedScenarioId}
            />
          )}
          {calculatorMode === 'target-income' && loadedTargetScenarioId && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleResetTargetIncome}
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              Nueva
            </Button>
          )}
          {calculatorMode === 'target-income' && (
            <SaveScenarioDialog
              onSave={handleSaveTargetIncome}
              defaultName={loadedTargetScenarioName || ''}
              isUpdate={!!loadedTargetScenarioId}
            />
          )}
        </div>
      </div>

      {/* Mode switcher */}
      <Tabs
        value={calculatorMode}
        onValueChange={(v) => setCalculatorMode(v as CalculatorMode)}
        className="w-full"
      >
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="projection">Proyección</TabsTrigger>
          <TabsTrigger value="target-income">Renta Objetivo</TabsTrigger>
        </TabsList>

        {/* Projection mode */}
        <TabsContent value="projection" className="mt-6 space-y-6">
          {/* Main calculator area */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <InvestCalculatorForm data={formData} onChange={setFormData} />
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
        </TabsContent>

        {/* Target income mode */}
        <TabsContent value="target-income" className="mt-6 space-y-6">
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <InvestTargetIncomeForm
              data={targetIncomeData}
              onChange={setTargetIncomeData}
            />
            <InvestTargetIncomeResults
              requiredCapital={targetIncomeResult.requiredCapital}
              targetMonthlyIncome={targetIncomeData.targetMonthlyIncome}
              annualRate={targetIncomeData.annualRate}
              monthlyRate={targetIncomeResult.monthlyRate}
              currency={targetIncomeData.currency}
            />
          </div>

          {/* Saved target income scenarios */}
          {savedTargetScenarios.length > 0 && (
            <div className="rounded-lg border p-4">
              <h3 className="mb-3 text-sm font-semibold">
                Rentas guardadas ({savedTargetScenarios.length})
              </h3>
              <div className="space-y-2">
                {savedTargetScenarios.map((scenario) => (
                  <div
                    key={scenario.id}
                    className="flex items-center justify-between rounded-md border bg-card px-3 py-2 text-sm"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium">{scenario.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatCurrency(
                          scenario.targetMonthlyIncome,
                          scenario.currency
                        )}{' '}
                        / mes · {scenario.annualRate}% EA
                      </p>
                    </div>
                    <div className="ml-3 flex shrink-0 gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 px-2 text-xs"
                        onClick={() => handleLoadTargetScenario(scenario)}
                      >
                        <FolderOpen className="mr-1 h-3 w-3" />
                        Cargar
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 px-2 text-xs text-destructive hover:text-destructive"
                        onClick={() => handleDeleteTargetScenario(scenario.id)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
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
