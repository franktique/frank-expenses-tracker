'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { Plus, ScanSearch, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useBudget } from '@/context/budget-context';
import { DebtFormDialog } from './debt-form-dialog';
import { DebtLibreRow } from './debt-libre-row';
import { DebtCardGroup } from './debt-card-group';
import { DebtPaymentDetectionDialog } from './debt-payment-detection-dialog';
import type {
  DebtObligation,
  CreditCardDebtGroup,
  CategoryPaymentDetection,
} from '@/types/debt-tracking';

export function DebtTrackingMain() {
  const { activePeriod } = useBudget();

  const [debts, setDebts] = useState<DebtObligation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [formOpen, setFormOpen] = useState(false);
  const [editingDebt, setEditingDebt] = useState<DebtObligation | null>(null);

  const [detectionOpen, setDetectionOpen] = useState(false);
  const [detections, setDetections] = useState<CategoryPaymentDetection[]>([]);
  const [detecting, setDetecting] = useState(false);
  const [detectError, setDetectError] = useState<string | null>(null);

  const fetchDebts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/debt-obligations');
      if (!res.ok) {
        const data = await res.json();
        if (data.error?.includes('no inicializadas')) {
          // Auto-migrate
          await fetch('/api/migrate-debt-tracking', { method: 'POST' });
          const res2 = await fetch('/api/debt-obligations');
          const data2 = await res2.json();
          setDebts(data2.debts ?? []);
          return;
        }
        setError(data.error ?? 'Error al cargar las deudas');
        return;
      }
      const data = await res.json();
      setDebts(data.debts ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error de conexión');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDebts();
  }, [fetchDebts]);

  // Split debts into libre and credit-card
  const libreDebts = useMemo(
    () => debts.filter((d) => !d.credit_card_id),
    [debts]
  );

  const cardGroups = useMemo<CreditCardDebtGroup[]>(() => {
    const cardDebts = debts.filter((d) => d.credit_card_id);
    const groupMap = new Map<string, CreditCardDebtGroup>();

    for (const debt of cardDebts) {
      const cardId = debt.credit_card_id!;
      if (!groupMap.has(cardId)) {
        groupMap.set(cardId, {
          credit_card: debt.credit_card!,
          debts: [],
          totals: { saldo_total: 0, capital_mensual: 0, intereses_mensual: 0, seguro_mensual: 0, pago_mensual_total: 0 },
        });
      }
      groupMap.get(cardId)!.debts.push(debt);
    }

    // Sort groups by oldest debt first within each group
    for (const group of groupMap.values()) {
      group.debts.sort(
        (a, b) =>
          new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      );
    }

    return Array.from(groupMap.values());
  }, [debts]);

  function handleEdit(debt: DebtObligation) {
    setEditingDebt(debt);
    setFormOpen(true);
  }

  async function handleDelete(debt: DebtObligation) {
    if (!confirm(`¿Eliminar la deuda "${debt.name}"?`)) return;
    await fetch(`/api/debt-obligations/${debt.id}`, { method: 'DELETE' });
    fetchDebts();
  }

  async function handleApplyPayment(debt: DebtObligation) {
    if (!activePeriod) {
      alert('No hay un periodo activo seleccionado');
      return;
    }
    if (
      !confirm(
        `¿Aplicar un período de amortización a "${debt.name}"?\n\nEsto reducirá el saldo y las cuotas pendientes en un período.`
      )
    ) {
      return;
    }
    await fetch('/api/debt-obligations/apply-period-payments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        period_id: activePeriod.id,
        debt_ids: [debt.id],
      }),
    });
    fetchDebts();
  }

  async function handleDetectPayments() {
    if (!activePeriod) {
      alert('No hay un periodo activo seleccionado');
      return;
    }
    setDetecting(true);
    setDetectError(null);
    try {
      const res = await fetch(
        `/api/debt-obligations/detect-category-payments?period_id=${activePeriod.id}`
      );
      const data = await res.json();
      if (!res.ok) {
        setDetectError(data.error ?? 'Error al detectar pagos');
        return;
      }
      if (data.detections.length === 0) {
        alert('No se encontraron pagos de categorías asociadas a deudas en el periodo actual que no hayan sido aplicados.');
        return;
      }
      setDetections(data.detections);
      setDetectionOpen(true);
    } finally {
      setDetecting(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="py-8 text-center space-y-2">
        <p className="text-destructive">{error}</p>
        <Button variant="outline" onClick={fetchDebts}>
          Reintentar
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center gap-2 flex-wrap">
        <Button
          onClick={() => {
            setEditingDebt(null);
            setFormOpen(true);
          }}
          size="sm"
        >
          <Plus className="h-4 w-4 mr-1" />
          Nueva deuda
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={handleDetectPayments}
          disabled={detecting || !activePeriod}
          title={!activePeriod ? 'Selecciona un periodo activo primero' : undefined}
        >
          {detecting ? (
            <Loader2 className="h-4 w-4 mr-1 animate-spin" />
          ) : (
            <ScanSearch className="h-4 w-4 mr-1" />
          )}
          Detectar pagos del periodo
        </Button>
        {activePeriod && (
          <span className="text-xs text-muted-foreground">
            Periodo: {activePeriod.name}
          </span>
        )}
        {detectError && (
          <span className="text-xs text-destructive">{detectError}</span>
        )}
      </div>

      {/* Tabs */}
      <Tabs defaultValue="libre">
        <TabsList>
          <TabsTrigger value="libre">
            Crédito libre / Inversión
            {libreDebts.length > 0 && (
              <span className="ml-1.5 text-xs bg-muted rounded-full px-1.5 py-0.5">
                {libreDebts.length}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="tarjetas">
            Tarjetas de crédito
            {cardGroups.length > 0 && (
              <span className="ml-1.5 text-xs bg-muted rounded-full px-1.5 py-0.5">
                {cardGroups.reduce((s, g) => s + g.debts.length, 0)}
              </span>
            )}
          </TabsTrigger>
        </TabsList>

        {/* ── Libre tab ── */}
        <TabsContent value="libre" className="space-y-3 mt-4">
          {libreDebts.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <p>No hay deudas de crédito libre registradas.</p>
              <p className="text-sm mt-1">
                Haz clic en "Nueva deuda" para agregar una.
              </p>
            </div>
          ) : (
            libreDebts.map((debt) => (
              <DebtLibreRow
                key={debt.id}
                debt={debt}
                onEdit={handleEdit}
                onDelete={handleDelete}
                onApplyPayment={handleApplyPayment}
              />
            ))
          )}
        </TabsContent>

        {/* ── Tarjetas tab ── */}
        <TabsContent value="tarjetas" className="space-y-4 mt-4">
          {cardGroups.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <p>No hay deudas asociadas a tarjetas de crédito.</p>
              <p className="text-sm mt-1">
                Al crear una deuda, selecciona una tarjeta de crédito para que aparezca aquí.
              </p>
            </div>
          ) : (
            cardGroups.map((group) => (
              <DebtCardGroup
                key={group.credit_card.id}
                group={group}
                onEdit={handleEdit}
                onDelete={handleDelete}
              />
            ))
          )}
        </TabsContent>
      </Tabs>

      {/* Dialogs */}
      <DebtFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        debt={editingDebt}
        onSave={fetchDebts}
      />

      {detectionOpen && (
        <DebtPaymentDetectionDialog
          open={detectionOpen}
          onOpenChange={setDetectionOpen}
          periodId={activePeriod?.id ?? ''}
          detections={detections}
          onApplied={fetchDebts}
        />
      )}
    </div>
  );
}
