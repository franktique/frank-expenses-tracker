'use client';

import { useState } from 'react';
import { Check, Loader2, PiggyBank, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { SavingsChange, SavingsTotals } from '@/lib/simulation-savings';

export const SIMULATION_BUDGETS_UPDATED_EVENT = 'simulation-budgets-updated';

export interface SavingsProposalData {
  simulation_id: number;
  rationale?: string;
  changes: SavingsChange[];
  errors?: string[];
  totals_before: SavingsTotals;
  totals_after: SavingsTotals;
}

type Status = 'idle' | 'applying' | 'applied' | 'dismissed';

const fmt = (n: number) =>
  new Intl.NumberFormat('es-CO', { maximumFractionDigits: 0 }).format(n);

export function SavingsProposalCard({
  proposal,
}: {
  proposal: SavingsProposalData;
}) {
  const [status, setStatus] = useState<Status>('idle');
  const [error, setError] = useState<string | null>(null);

  const apply = async () => {
    setStatus('applying');
    setError(null);
    try {
      const res = await fetch(
        `/api/simulations/${proposal.simulation_id}/apply-savings`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            changes: proposal.changes.map((c) => ({
              category_id: c.category_id,
              ahorro_efectivo_amount: c.after.ahorro_efectivo_amount,
              ahorro_credito_amount: c.after.ahorro_credito_amount,
            })),
          }),
        }
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'No se pudo aplicar');
      setStatus('applied');
      window.dispatchEvent(
        new CustomEvent(SIMULATION_BUDGETS_UPDATED_EVENT, {
          detail: { simulationId: proposal.simulation_id },
        })
      );
    } catch (err) {
      setError((err as Error).message);
      setStatus('idle');
    }
  };

  const cell = (before: number, after: number) =>
    before === after ? (
      <span className="text-muted-foreground">{fmt(after)}</span>
    ) : (
      <span>
        <span className="text-muted-foreground line-through">
          {fmt(before)}
        </span>{' '}
        → <span className="font-medium text-purple-600">{fmt(after)}</span>
      </span>
    );

  return (
    <div className="ml-11 max-w-[92%] rounded-lg border bg-background p-3 text-xs">
      <div className="mb-2 flex items-center gap-2 font-medium">
        <PiggyBank className="h-4 w-4 text-primary" />
        Propuesta de ahorro
      </div>
      {proposal.rationale && (
        <p className="mb-2 text-muted-foreground">{proposal.rationale}</p>
      )}
      <table className="w-full">
        <thead>
          <tr className="text-left text-muted-foreground">
            <th className="pb-1 font-normal">Categoría</th>
            <th className="pb-1 font-normal">Ahorro efectivo</th>
            <th className="pb-1 font-normal">Ahorro crédito</th>
          </tr>
        </thead>
        <tbody>
          {proposal.changes.map((c) => (
            <tr key={c.category_id} className="border-t">
              <td className="py-1 pr-2">{c.category_name}</td>
              <td className="py-1 pr-2">
                {cell(
                  c.before.ahorro_efectivo_amount,
                  c.after.ahorro_efectivo_amount
                )}
              </td>
              <td className="py-1">
                {cell(
                  c.before.ahorro_credito_amount,
                  c.after.ahorro_credito_amount
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="mt-2 text-muted-foreground">
        Ahorro total: {fmt(proposal.totals_before.total_ahorro)} →{' '}
        <span className="font-medium text-foreground">
          {fmt(proposal.totals_after.total_ahorro)}
        </span>
      </p>
      {proposal.errors && proposal.errors.length > 0 && (
        <p className="mt-1 text-destructive">
          Omitidos: {proposal.errors.join(' ')}
        </p>
      )}
      {error && <p className="mt-1 text-destructive">{error}</p>}

      <div className="mt-3 flex items-center gap-2">
        {status === 'applied' ? (
          <span className="flex items-center gap-1 text-green-600">
            <Check className="h-3.5 w-3.5" /> Aplicado a la simulación
          </span>
        ) : status === 'dismissed' ? (
          <span className="text-muted-foreground">Descartada</span>
        ) : (
          <>
            <Button
              size="sm"
              className="h-7 gap-1 text-xs"
              onClick={apply}
              disabled={status === 'applying'}
            >
              {status === 'applying' ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <Check className="h-3 w-3" />
              )}
              Aplicar
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="h-7 gap-1 text-xs"
              onClick={() => setStatus('dismissed')}
              disabled={status === 'applying'}
            >
              <X className="h-3 w-3" />
              Descartar
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
