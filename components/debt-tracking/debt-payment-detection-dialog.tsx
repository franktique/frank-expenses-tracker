'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { applyOnePayment } from '@/lib/debt-tracking-calculations';
import type {
  CategoryPaymentDetection,
  DebtObligation,
} from '@/types/debt-tracking';

interface DebtPaymentDetectionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  periodId: string;
  detections: CategoryPaymentDetection[];
  onApplied: () => void;
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

export function DebtPaymentDetectionDialog({
  open,
  onOpenChange,
  periodId,
  detections,
  onApplied,
}: DebtPaymentDetectionDialogProps) {
  const [selected, setSelected] = useState<Set<string>>(
    () => new Set(detections.flatMap((d) => d.debts.map((db) => db.id)))
  );
  const [applying, setApplying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function toggleDebt(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  async function handleApply() {
    const debtIds = Array.from(selected);
    if (debtIds.length === 0) return;

    setApplying(true);
    setError(null);
    try {
      const res = await fetch('/api/debt-obligations/apply-period-payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ period_id: periodId, debt_ids: debtIds }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? 'Error al aplicar los pagos');
        return;
      }

      onApplied();
      onOpenChange(false);
    } finally {
      setApplying(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Pagos detectados en el periodo</DialogTitle>
          <DialogDescription>
            Se encontraron gastos en categorías asociadas a tus deudas. Selecciona
            las deudas que deseas actualizar (aplicar un período de amortización).
          </DialogDescription>
        </DialogHeader>

        {error && (
          <p className="text-sm text-destructive">{error}</p>
        )}

        <div className="space-y-4">
          {detections.map((detection) => (
            <div key={detection.category_id} className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="font-medium text-sm">{detection.category_name}</span>
                <Badge variant="outline" className="text-xs">
                  {detection.expense_count} gasto(s) · {formatCurrency(detection.expense_total)}
                </Badge>
              </div>
              <div className="space-y-1 pl-3">
                {detection.debts.map((debt) => {
                  const preview = applyOnePayment(debt);
                  const isSelected = selected.has(debt.id);
                  return (
                    <label
                      key={debt.id}
                      className="flex items-start gap-2 cursor-pointer rounded p-2 hover:bg-muted/50"
                    >
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleDebt(debt.id)}
                        className="mt-0.5 cursor-pointer"
                      />
                      <div className="flex-1 text-sm">
                        <div className="font-medium">{debt.name}</div>
                        <div className="text-xs text-muted-foreground space-y-0.5">
                          <div>
                            Saldo: {formatCurrency(debt.saldo_actual)} →{' '}
                            <span className="text-green-600 font-medium">
                              {formatCurrency(preview.saldo_actual)}
                            </span>
                          </div>
                          <div>
                            Cuotas: {debt.cuotas_pendientes} →{' '}
                            <span className="text-green-600 font-medium">
                              {preview.cuotas_pendientes}
                            </span>
                          </div>
                        </div>
                      </div>
                    </label>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            onClick={handleApply}
            disabled={applying || selected.size === 0}
          >
            {applying
              ? 'Aplicando...'
              : `Aplicar ${selected.size} deuda(s)`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
