"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/components/ui/use-toast";
import { Loader2, Calendar, DollarSign, FolderOpen, AlertCircle, Info, CheckCircle2 } from "lucide-react";
import {
  type PeriodData,
  generateCopySummary,
  validatePeriodHasData,
  formatCurrencyDisplay,
} from "@/lib/period-to-simulation-transform";

// Types
type Period = {
  id: string;
  name: string;
  month: number;
  year: number;
  is_open: boolean;
};

interface PeriodSelectorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  simulationId: number;
  simulationName: string;
  onSuccess: (periodId: string, periodName: string, mode: "merge" | "replace") => void;
  existingDataCount?: {
    incomes: number;
    budgets: number;
  };
}

export function PeriodSelectorDialog({
  open,
  onOpenChange,
  simulationId,
  simulationName,
  onSuccess,
  existingDataCount = { incomes: 0, budgets: 0 },
}: PeriodSelectorDialogProps) {
  const { toast } = useToast();

  // State
  const [periods, setPeriods] = useState<Period[]>([]);
  const [selectedPeriodId, setSelectedPeriodId] = useState<string | null>(null);
  const [periodData, setPeriodData] = useState<PeriodData | null>(null);
  const [copyMode, setCopyMode] = useState<"merge" | "replace">("merge");
  const [isLoadingPeriods, setIsLoadingPeriods] = useState(false);
  const [isLoadingPeriodData, setIsLoadingPeriodData] = useState(false);
  const [isCopying, setIsCopying] = useState(false);
  const [step, setStep] = useState<"select" | "confirm">("select");

  const hasExistingData = existingDataCount.incomes > 0 || existingDataCount.budgets > 0;

  // Load periods when dialog opens
  useEffect(() => {
    if (open) {
      loadPeriods();
      setStep("select");
      setSelectedPeriodId(null);
      setPeriodData(null);
      setCopyMode("merge");
    }
  }, [open]);

  // Load available periods
  const loadPeriods = async () => {
    setIsLoadingPeriods(true);
    try {
      const response = await fetch("/api/periods");
      if (!response.ok) {
        throw new Error("Error al cargar períodos");
      }
      const data = await response.json();
      setPeriods(data);
    } catch (error) {
      toast({
        title: "Error",
        description:
          (error as Error).message || "No se pudieron cargar los períodos",
        variant: "destructive",
      });
    } finally {
      setIsLoadingPeriods(false);
    }
  };

  // Load period data when a period is selected
  const loadPeriodData = async (periodId: string) => {
    setIsLoadingPeriodData(true);
    setPeriodData(null);
    try {
      const response = await fetch(`/api/periods/${periodId}/data`);
      if (!response.ok) {
        throw new Error("Error al cargar datos del período");
      }
      const data = await response.json();
      setPeriodData(data);

      // Validate period has data
      const validation = validatePeriodHasData(data);
      if (!validation.valid) {
        toast({
          title: "Período vacío",
          description: validation.message,
          variant: "destructive",
        });
        setSelectedPeriodId(null);
        return;
      }

      // Show warning if period has incomplete data
      if (validation.message) {
        toast({
          title: "Advertencia",
          description: validation.message,
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description:
          (error as Error).message || "No se pudieron cargar los datos del período",
        variant: "destructive",
      });
      setSelectedPeriodId(null);
    } finally {
      setIsLoadingPeriodData(false);
    }
  };

  // Handle period selection
  const handlePeriodSelect = async (periodId: string) => {
    setSelectedPeriodId(periodId);
    await loadPeriodData(periodId);
  };

  // Handle proceed to confirmation
  const handleProceedToConfirm = () => {
    if (!selectedPeriodId || !periodData) {
      toast({
        title: "Error",
        description: "Por favor selecciona un período",
        variant: "destructive",
      });
      return;
    }
    setStep("confirm");
  };

  // Handle copy operation
  const handleCopy = async () => {
    if (!selectedPeriodId) return;

    setIsCopying(true);
    try {
      const response = await fetch(
        `/api/simulations/${simulationId}/copy-from-period`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            period_id: selectedPeriodId,
            mode: copyMode,
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Error al copiar datos");
      }

      const result = await response.json();

      // Get period name for success message
      const selectedPeriod = periods.find((p) => p.id === selectedPeriodId);
      const periodName = selectedPeriod?.name || "Período";

      toast({
        title: "Datos copiados exitosamente",
        description: `${result.copied.incomes_count} ingresos y ${result.copied.budgets_count} presupuestos copiados desde ${periodName}`,
      });

      // Call success callback
      onSuccess(selectedPeriodId, periodName, copyMode);

      // Close dialog
      onOpenChange(false);
    } catch (error) {
      toast({
        title: "Error al copiar",
        description:
          (error as Error).message || "No se pudieron copiar los datos",
        variant: "destructive",
      });
    } finally {
      setIsCopying(false);
    }
  };

  // Get month name
  const getMonthName = (month: number): string => {
    const monthNames = [
      "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
      "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
    ];
    return monthNames[month] || "";
  };

  // Render period list (step 1)
  const renderPeriodSelection = () => (
    <>
      <DialogHeader>
        <DialogTitle>Copiar datos desde un Período</DialogTitle>
        <DialogDescription>
          Selecciona el período del cual deseas copiar ingresos y presupuestos a{" "}
          <span className="font-medium">{simulationName}</span>
        </DialogDescription>
      </DialogHeader>

      <div className="py-4 space-y-4">
        {/* Existing data warning */}
        {hasExistingData && (
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              Esta simulación ya tiene datos (
              {existingDataCount.incomes} ingresos, {existingDataCount.budgets} presupuestos).
              Podrás elegir si agregar o reemplazar en el siguiente paso.
            </AlertDescription>
          </Alert>
        )}

        {/* Periods list */}
        {isLoadingPeriods ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin mr-2" />
            <span>Cargando períodos...</span>
          </div>
        ) : periods.length === 0 ? (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              No hay períodos disponibles para copiar
            </AlertDescription>
          </Alert>
        ) : (
          <div className="space-y-2 max-h-[400px] overflow-y-auto">
            {periods.map((period) => (
              <Card
                key={period.id}
                className={`cursor-pointer transition-colors hover:bg-accent ${
                  selectedPeriodId === period.id
                    ? "border-primary bg-accent"
                    : ""
                }`}
                onClick={() => handlePeriodSelect(period.id)}
              >
                <CardHeader className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <CardTitle className="text-base">{period.name}</CardTitle>
                    </div>
                    <div className="flex items-center gap-2">
                      {period.is_open && (
                        <Badge variant="default">Abierto</Badge>
                      )}
                      {selectedPeriodId === period.id && (
                        <CheckCircle2 className="h-5 w-5 text-primary" />
                      )}
                    </div>
                  </div>
                  <CardDescription>
                    {getMonthName(period.month)} {period.year}
                  </CardDescription>
                </CardHeader>

                {/* Show period data preview if selected and loaded */}
                {selectedPeriodId === period.id &&
                  (isLoadingPeriodData ? (
                    <CardContent className="p-4 pt-0">
                      <div className="flex items-center text-sm text-muted-foreground">
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        Cargando datos...
                      </div>
                    </CardContent>
                  ) : periodData ? (
                    <CardContent className="p-4 pt-0">
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div className="flex items-center gap-1">
                          <DollarSign className="h-3 w-3 text-green-600" />
                          <span className="text-muted-foreground">Ingresos:</span>
                          <span className="font-medium">
                            {periodData.incomes.length}
                          </span>
                        </div>
                        <div className="flex items-center gap-1">
                          <FolderOpen className="h-3 w-3 text-blue-600" />
                          <span className="text-muted-foreground">Presupuestos:</span>
                          <span className="font-medium">
                            {periodData.budgets.length}
                          </span>
                        </div>
                        <div className="col-span-2 text-xs text-muted-foreground mt-1">
                          Total: {formatCurrencyDisplay(periodData.totals.total_income + periodData.totals.total_budget)}
                        </div>
                      </div>
                    </CardContent>
                  ) : null)}
              </Card>
            ))}
          </div>
        )}
      </div>

      <DialogFooter>
        <Button variant="outline" onClick={() => onOpenChange(false)}>
          Cancelar
        </Button>
        <Button
          onClick={handleProceedToConfirm}
          disabled={!selectedPeriodId || !periodData || isLoadingPeriodData}
        >
          Continuar
        </Button>
      </DialogFooter>
    </>
  );

  // Render confirmation (step 2)
  const renderConfirmation = () => {
    if (!periodData) return null;

    const summary = generateCopySummary(periodData);

    return (
      <>
        <DialogHeader>
          <DialogTitle>Confirmar copia de datos</DialogTitle>
          <DialogDescription>
            Revisa los datos que se copiarán y elige cómo manejar los datos existentes
          </DialogDescription>
        </DialogHeader>

        <div className="py-4 space-y-4">
          {/* Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Datos a copiar</CardTitle>
              <CardDescription>
                Desde: {summary.period_name} ({summary.period_date})
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Ingresos:</span>
                <span className="font-medium">{summary.income_entries} entradas</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Total ingresos:</span>
                <span className="font-medium text-green-600">
                  {formatCurrencyDisplay(summary.total_income)}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Presupuestos:</span>
                <span className="font-medium">{summary.budget_categories} categorías</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Total presupuestos:</span>
                <span className="font-medium text-blue-600">
                  {formatCurrencyDisplay(summary.total_budget)}
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Copy mode selection */}
          {hasExistingData && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">¿Cómo manejar datos existentes?</CardTitle>
              </CardHeader>
              <CardContent>
                <RadioGroup value={copyMode} onValueChange={(value) => setCopyMode(value as "merge" | "replace")}>
                  <div className="flex items-center space-x-2 p-3 border rounded-lg cursor-pointer hover:bg-accent" onClick={() => setCopyMode("merge")}>
                    <RadioGroupItem value="merge" id="merge" />
                    <Label htmlFor="merge" className="cursor-pointer flex-1">
                      <div className="font-medium">Agregar (Merge)</div>
                      <div className="text-xs text-muted-foreground">
                        Los nuevos datos se sumarán a los existentes
                      </div>
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2 p-3 border rounded-lg cursor-pointer hover:bg-accent mt-2" onClick={() => setCopyMode("replace")}>
                    <RadioGroupItem value="replace" id="replace" />
                    <Label htmlFor="replace" className="cursor-pointer flex-1">
                      <div className="font-medium">Reemplazar (Replace)</div>
                      <div className="text-xs text-muted-foreground">
                        Los datos existentes serán eliminados y reemplazados
                      </div>
                    </Label>
                  </div>
                </RadioGroup>
              </CardContent>
            </Card>
          )}

          {/* Warning for replace mode */}
          {copyMode === "replace" && hasExistingData && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <strong>Advertencia:</strong> Esta acción eliminará todos los datos existentes
                de la simulación ({existingDataCount.incomes} ingresos y {existingDataCount.budgets} presupuestos).
                Esta operación no se puede deshacer.
              </AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setStep("select")}>
            Atrás
          </Button>
          <Button onClick={handleCopy} disabled={isCopying}>
            {isCopying ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Copiando...
              </>
            ) : (
              <>Confirmar y Copiar</>
            )}
          </Button>
        </DialogFooter>
      </>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        {step === "select" ? renderPeriodSelection() : renderConfirmation()}
      </DialogContent>
    </Dialog>
  );
}
