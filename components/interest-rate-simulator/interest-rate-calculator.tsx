'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { RefreshCw } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import {
  InterestRateForm,
  type InterestRateFormData,
} from './interest-rate-form';
import { InterestRateResults } from './interest-rate-results';
import { SaveRateDialog } from './save-rate-dialog';
import { InterestRateScenarioList } from './interest-rate-scenario-list';
import type {
  InterestRateScenario,
  InterestRateScenarioWithConversions,
  RateConversionResult,
  RateType,
} from '@/types/interest-rate-simulator';
import {
  convertRate,
  getConversionDisplay,
} from '@/lib/interest-rate-calculations';

interface InterestRateCalculatorProps {
  initialScenario?: InterestRateScenario;
}

const DEFAULT_FORM_DATA: InterestRateFormData = {
  inputRate: 12, // 12% displayed, stored as 0.12 internally for calculations
  inputRateType: 'EA',
};

export function InterestRateCalculator({
  initialScenario,
}: InterestRateCalculatorProps) {
  const { toast } = useToast();

  // Form state
  const [formData, setFormData] = useState<InterestRateFormData>(
    initialScenario
      ? {
          inputRate: initialScenario.inputRate * 100, // Convert decimal to percentage for display
          inputRateType: initialScenario.inputRateType,
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

  // Saved scenarios list
  const [savedScenarios, setSavedScenarios] = useState<
    InterestRateScenarioWithConversions[]
  >([]);
  const [isLoadingScenarios, setIsLoadingScenarios] = useState(true);

  // Calculate conversions in real-time
  const conversions: RateConversionResult = useMemo(() => {
    const rateDecimal = formData.inputRate / 100; // Convert percentage to decimal
    return convertRate(rateDecimal, formData.inputRateType);
  }, [formData.inputRate, formData.inputRateType]);

  // Get conversion display data with formulas
  const conversionDisplay = useMemo(() => {
    const rateDecimal = formData.inputRate / 100;
    return getConversionDisplay(rateDecimal, formData.inputRateType);
  }, [formData.inputRate, formData.inputRateType]);

  // Load saved scenarios
  const loadScenarios = useCallback(async () => {
    setIsLoadingScenarios(true);
    try {
      const response = await fetch('/api/interest-rate-scenarios');
      if (!response.ok) {
        const errorData = await response.json();
        if (errorData.code === 'TABLES_NOT_FOUND') {
          // Run migration automatically
          const migrationResponse = await fetch(
            '/api/migrate-interest-rate-simulator',
            {
              method: 'POST',
            }
          );
          if (migrationResponse.ok) {
            // Retry loading after migration
            const retryResponse = await fetch('/api/interest-rate-scenarios');
            if (retryResponse.ok) {
              const data = await retryResponse.json();
              setSavedScenarios(data.scenarios || []);
            }
          }
        } else {
          throw new Error(errorData.error || 'Error al cargar escenarios');
        }
      } else {
        const data = await response.json();
        setSavedScenarios(data.scenarios || []);
      }
    } catch (error) {
      console.error('Error loading scenarios:', error);
      toast({
        title: 'Error',
        description: 'No se pudieron cargar los escenarios guardados',
        variant: 'destructive',
      });
    } finally {
      setIsLoadingScenarios(false);
    }
  }, [toast]);

  useEffect(() => {
    loadScenarios();
  }, [loadScenarios]);

  // Save scenario handler
  const handleSaveScenario = async (name: string, notes?: string) => {
    try {
      const rateDecimal = formData.inputRate / 100;
      const payload = {
        name,
        inputRate: rateDecimal,
        inputRateType: formData.inputRateType,
        notes: notes || undefined,
      };

      let response: Response;

      if (loadedScenarioId) {
        // Update existing scenario
        response = await fetch(
          `/api/interest-rate-scenarios/${loadedScenarioId}`,
          {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          }
        );
      } else {
        // Create new scenario
        response = await fetch('/api/interest-rate-scenarios', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      }

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Error al guardar');
      }

      const savedScenario: InterestRateScenarioWithConversions =
        await response.json();

      // Update state
      setLoadedScenarioId(savedScenario.id);
      setLoadedScenarioName(savedScenario.name);
      setLoadedScenarioNotes(savedScenario.notes || '');

      // Refresh scenarios list
      await loadScenarios();

      toast({
        title: 'Guardado',
        description: loadedScenarioId
          ? 'Escenario actualizado correctamente'
          : 'Escenario guardado correctamente',
      });
    } catch (error) {
      console.error('Error saving scenario:', error);
      toast({
        title: 'Error',
        description:
          error instanceof Error
            ? error.message
            : 'No se pudo guardar el escenario',
        variant: 'destructive',
      });
    }
  };

  // Load scenario handler
  const handleLoadScenario = (
    scenario: InterestRateScenarioWithConversions
  ) => {
    setFormData({
      inputRate: scenario.inputRate * 100, // Convert decimal to percentage
      inputRateType: scenario.inputRateType,
    });
    setLoadedScenarioId(scenario.id);
    setLoadedScenarioName(scenario.name);
    setLoadedScenarioNotes(scenario.notes || '');

    toast({
      title: 'Escenario cargado',
      description: `Se cargó "${scenario.name}"`,
    });
  };

  // Delete scenario handler
  const handleDeleteScenario = async (scenarioId: string) => {
    try {
      const response = await fetch(
        `/api/interest-rate-scenarios/${scenarioId}`,
        {
          method: 'DELETE',
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Error al eliminar');
      }

      // Clear loaded state if we deleted the loaded scenario
      if (loadedScenarioId === scenarioId) {
        setLoadedScenarioId(null);
        setLoadedScenarioName(null);
        setLoadedScenarioNotes('');
      }

      // Refresh scenarios list
      await loadScenarios();

      toast({
        title: 'Eliminado',
        description: 'Escenario eliminado correctamente',
      });
    } catch (error) {
      console.error('Error deleting scenario:', error);
      toast({
        title: 'Error',
        description:
          error instanceof Error
            ? error.message
            : 'No se pudo eliminar el escenario',
        variant: 'destructive',
      });
    }
  };

  // Reset to new scenario
  const handleNewScenario = () => {
    setFormData(DEFAULT_FORM_DATA);
    setLoadedScenarioId(null);
    setLoadedScenarioName(null);
    setLoadedScenarioNotes('');
  };

  return (
    <Tabs defaultValue="calculator" className="w-full">
      <TabsList className="mb-6 grid w-full grid-cols-2">
        <TabsTrigger value="calculator">Calculadora</TabsTrigger>
        <TabsTrigger value="scenarios">
          Mis Simulaciones ({savedScenarios.length})
        </TabsTrigger>
      </TabsList>

      <TabsContent value="calculator" className="space-y-6">
        {/* Loaded scenario indicator */}
        {loadedScenarioName && (
          <div className="flex items-center justify-between rounded-lg border border-purple-200 bg-purple-50 p-3 dark:border-purple-800 dark:bg-purple-950/30">
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Editando:</span>
              <span className="font-medium text-purple-700 dark:text-purple-300">
                {loadedScenarioName}
              </span>
            </div>
            <Button variant="ghost" size="sm" onClick={handleNewScenario}>
              Nueva simulación
            </Button>
          </div>
        )}

        {/* Form */}
        <InterestRateForm data={formData} onChange={setFormData} />

        {/* Results */}
        <InterestRateResults
          conversions={conversions}
          conversionDisplay={conversionDisplay}
          inputRateType={formData.inputRateType}
        />

        {/* Save button */}
        <div className="flex justify-end gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={loadScenarios}
            disabled={isLoadingScenarios}
          >
            <RefreshCw
              className={`mr-2 h-4 w-4 ${isLoadingScenarios ? 'animate-spin' : ''}`}
            />
            Actualizar lista
          </Button>
          <SaveRateDialog
            onSave={handleSaveScenario}
            defaultName={loadedScenarioName || ''}
            defaultNotes={loadedScenarioNotes}
            isUpdate={!!loadedScenarioId}
          />
        </div>
      </TabsContent>

      <TabsContent value="scenarios">
        <InterestRateScenarioList
          scenarios={savedScenarios}
          isLoading={isLoadingScenarios}
          onLoad={handleLoadScenario}
          onDelete={handleDeleteScenario}
          onRefresh={loadScenarios}
          loadedScenarioId={loadedScenarioId}
        />
      </TabsContent>
    </Tabs>
  );
}
