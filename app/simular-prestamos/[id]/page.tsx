"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter, useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, ArrowLeft, RefreshCw } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import {
  LoanCalculatorForm,
  LoanSummaryCards,
  InterestRateComparison,
  PaymentScheduleTable,
  ExtraPaymentDialog,
} from "@/components/loan-simulator";
import {
  calculateLoanSummary,
  formatCurrency,
} from "@/lib/loan-calculations";
import type {
  LoanScenario,
  AmortizationPayment,
  ExtraPayment,
  LoanSummary,
} from "@/types/loan-simulator";
import type { CreateLoanData, ExtraPaymentData } from "@/components/loan-simulator";

export default function LoanScenarioDetailPage() {
  const router = useRouter();
  const params = useParams();
  const { toast } = useToast();

  const scenarioId = params.id as string;

  const [scenario, setScenario] = useState<LoanScenario | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState("calculator");

  // Schedule data
  const [payments, setPayments] = useState<AmortizationPayment[]>([]);
  const [extraPayments, setExtraPayments] = useState<ExtraPayment[]>([]);
  const [isLoadingSchedule, setIsLoadingSchedule] = useState(false);

  // Summary from API
  const [loanSummary, setLoanSummary] = useState<LoanSummary | null>(null);
  const [originalSummary, setOriginalSummary] = useState<LoanSummary | null>(
    null
  );
  const [monthsSaved, setMonthsSaved] = useState<number>(0);
  const [interestSaved, setInterestSaved] = useState<number>(0);

  // Comparison rates
  const [comparisonRates, setComparisonRates] = useState<number[]>([]);

  // Extra payment dialog
  const [extraPaymentDialogOpen, setExtraPaymentDialogOpen] = useState(false);
  const [selectedPaymentNumber, setSelectedPaymentNumber] = useState<
    number | null
  >(null);

  const isNew = scenarioId === "new";

  // Load scenario
  useEffect(() => {
    if (!isNew) {
      loadScenario();
      loadSchedule();
    } else {
      setIsLoading(false);
    }
  }, [scenarioId]);

  const loadScenario = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/loan-scenarios/${scenarioId}`);
      if (!response.ok) {
        throw new Error("Error al cargar el escenario");
      }
      const data = await response.json();
      setScenario(data);
      setExtraPayments(data.extraPayments || []);
    } catch (error) {
      toast({
        title: "Error",
        description: "Error al cargar el escenario de préstamo",
        variant: "destructive",
      });
      router.push("/simular-prestamos");
    } finally {
      setIsLoading(false);
    }
  };

  const loadSchedule = async () => {
    setIsLoadingSchedule(true);
    try {
      const response = await fetch(`/api/loan-scenarios/${scenarioId}/schedule`);
      if (!response.ok) {
        throw new Error("Error al cargar el calendario");
      }
      const data = await response.json();
      setPayments(data.payments || []);
      setExtraPayments(data.extraPayments || []);
      setLoanSummary(data.summary || null);
      setOriginalSummary(data.originalSummary || null);
      setMonthsSaved(data.monthsSaved || 0);
      setInterestSaved(data.interestSaved || 0);
    } catch (error) {
      toast({
        title: "Error",
        description: "Error al cargar el calendario de pagos",
        variant: "destructive",
      });
    } finally {
      setIsLoadingSchedule(false);
    }
  };

  const handleSave = async (data: CreateLoanData) => {
    setIsSaving(true);
    try {
      const url = isNew
        ? "/api/loan-scenarios"
        : `/api/loan-scenarios/${scenarioId}`;
      const method = isNew ? "POST" : "PUT";

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Error al guardar");
      }

      const saved = await response.json();

      if (isNew) {
        router.push(`/simular-prestamos/${saved.id}`);
      } else {
        setScenario(saved);
        await loadSchedule();
      }
    } catch (error) {
      throw error;
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    const response = await fetch(`/api/loan-scenarios/${scenarioId}`, {
      method: "DELETE",
    });

    if (!response.ok) {
      throw new Error("Error al eliminar");
    }
  };

  const handleAddExtraPayment = async (data: ExtraPaymentData) => {
    if (!selectedPaymentNumber) return;

    const response = await fetch(
      `/api/loan-scenarios/${scenarioId}/extra-payments`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          paymentNumber: selectedPaymentNumber,
          ...data,
        }),
      }
    );

    if (!response.ok) {
      throw new Error("Error al agregar pago extra");
    }

    await loadSchedule();
  };

  const handleRemoveExtraPayment = async (extraPaymentId: string) => {
    if (!confirm("¿Eliminar este pago extra?")) return;

    const response = await fetch(
      `/api/loan-scenarios/${scenarioId}/extra-payments/${extraPaymentId}`,
      {
        method: "DELETE",
      }
    );

    if (!response.ok) {
      throw new Error("Error al eliminar pago extra");
    }

    await loadSchedule();
  };

  const handleOpenExtraPaymentDialog = (paymentNumber: number) => {
    setSelectedPaymentNumber(paymentNumber);
    setExtraPaymentDialogOpen(true);
  };

  // Calculate summary for new scenarios
  const calculatedSummary = useMemo(() => {
    if (!scenario || isNew) return null;
    return calculateLoanSummary(
      scenario.principal,
      scenario.interestRate,
      scenario.termMonths,
      scenario.startDate
    );
  }, [scenario, isNew]);

  // Use API summary if available, otherwise calculate
  const summary = loanSummary || calculatedSummary;

  if (isLoading) {
    return (
      <div className="container mx-auto py-6 px-4">
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
            <p className="text-muted-foreground">Cargando escenario...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 px-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push("/simular-prestamos")}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold">
              {isNew ? "Nuevo Préstamo" : scenario?.name}
            </h1>
            {!isNew && scenario && (
              <p className="text-muted-foreground">
                {formatCurrency(scenario.principal, scenario.currency)} @ {scenario.interestRate}% EA
              </p>
            )}
          </div>
        </div>
        {!isNew && (
          <Button
            variant="outline"
            size="sm"
            onClick={loadSchedule}
            disabled={isLoadingSchedule}
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Actualizar
          </Button>
        )}
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-6">
          <TabsTrigger value="calculator">Calculadora</TabsTrigger>
          <TabsTrigger value="schedule" disabled={isNew}>
            Calendario de Pagos
          </TabsTrigger>
        </TabsList>

        {/* Calculator Tab */}
        <TabsContent value="calculator">
          <div className="space-y-6">
            <LoanCalculatorForm
              scenario={scenario || undefined}
              onSave={handleSave}
              onDelete={!isNew ? handleDelete : undefined}
              isLoading={isSaving}
            />

            {!isNew && summary && (
              <>
                <LoanSummaryCards
                  summary={summary}
                  originalSummary={originalSummary || undefined}
                  monthsSaved={monthsSaved || undefined}
                  interestSaved={interestSaved || undefined}
                  currency={scenario.currency}
                />
                <InterestRateComparison
                  scenario={scenario}
                  additionalRates={comparisonRates}
                  onRatesChange={setComparisonRates}
                />
              </>
            )}
          </div>
        </TabsContent>

        {/* Schedule Tab */}
        <TabsContent value="schedule">
          {isLoadingSchedule ? (
            <Card>
              <CardContent className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin" />
              </CardContent>
            </Card>
          ) : (
            <PaymentScheduleTable
              payments={payments}
              extraPayments={extraPayments}
              onAddExtraPayment={handleOpenExtraPaymentDialog}
              onRemoveExtraPayment={handleRemoveExtraPayment}
              currency={scenario?.currency}
            />
          )}
        </TabsContent>
      </Tabs>

      {/* Extra Payment Dialog */}
      <ExtraPaymentDialog
        open={extraPaymentDialogOpen}
        onOpenChange={setExtraPaymentDialogOpen}
        onSubmit={handleAddExtraPayment}
        paymentNumber={selectedPaymentNumber || 0}
        paymentDate={
          selectedPaymentNumber && payments[selectedPaymentNumber - 1]
            ? payments[selectedPaymentNumber - 1].date
            : undefined
        }
        remainingBalance={
          selectedPaymentNumber && payments[selectedPaymentNumber - 1]
            ? payments[selectedPaymentNumber - 1].remainingBalance
            : undefined
        }
        currency={scenario?.currency}
      />
    </div>
  );
}
