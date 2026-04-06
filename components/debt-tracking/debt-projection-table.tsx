'use client';

import { useState, useMemo } from 'react';
import { RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { generateDebtProjection } from '@/lib/debt-tracking-calculations';
import type { DebtObligation, ReductionMode } from '@/types/debt-tracking';

interface ExtraConfig {
  amount: number;
  isRecurring: boolean;
}

interface DebtProjectionTableProps {
  debt: DebtObligation;
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

function formatDate(dateStr: string): string {
  const [year, month, day] = dateStr.split('-').map(Number);
  const d = new Date(year, month - 1, day);
  return new Intl.DateTimeFormat('es-CO', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(d);
}

export function DebtProjectionTable({ debt }: DebtProjectionTableProps) {
  const [reductionMode, setReductionMode] = useState<ReductionMode>('reducir_plazo');
  const [extraConfigs, setExtraConfigs] = useState<Record<number, ExtraConfig>>({});

  // Build effective extras map: for each period P, use direct entry if present,
  // otherwise find the latest recurring anchor N ≤ P and inherit its amount.
  const effectiveExtras = useMemo<Record<number, number>>(() => {
    const maxPeriod = debt.cuotas_pendientes + 5;
    const result: Record<number, number> = {};
    for (let p = 1; p <= maxPeriod; p++) {
      const direct = extraConfigs[p];
      if (direct && direct.amount > 0) {
        result[p] = direct.amount;
      } else {
        // Find latest recurring anchor ≤ p
        let inherited = 0;
        for (let n = p - 1; n >= 1; n--) {
          const anchor = extraConfigs[n];
          if (anchor && anchor.isRecurring && anchor.amount > 0) {
            inherited = anchor.amount;
            break;
          }
        }
        if (inherited > 0) result[p] = inherited;
      }
    }
    return result;
  }, [extraConfigs, debt.cuotas_pendientes]);

  // Base projection (no extra payments) — used to compute original cost of credit
  const baseProjection = useMemo(
    () => generateDebtProjection(debt, {}, reductionMode),
    [debt, reductionMode]
  );

  const projection = useMemo(
    () => generateDebtProjection(debt, effectiveExtras, reductionMode),
    [debt, effectiveExtras, reductionMode]
  );

  const hasInsurance = (debt.valor_seguro ?? 0) > 0 || projection.summary.insurancePerMonth > 0;

  const baseCostOfCredit =
    baseProjection.summary.totalInterest + baseProjection.summary.totalInsurance;
  const currentCostOfCredit =
    projection.summary.totalInterest + projection.summary.totalInsurance;
  const hasExtras = projection.summary.totalExtraPayments > 0;

  function setExtra(paymentNumber: number, rawValue: number) {
    setExtraConfigs((prev) => {
      const next = { ...prev };
      const existing = prev[paymentNumber];
      const isRecurring = existing?.isRecurring ?? false;
      if (!rawValue || rawValue <= 0) {
        delete next[paymentNumber];
      } else {
        next[paymentNumber] = { amount: rawValue, isRecurring };
      }
      return next;
    });
  }

  function toggleRecurring(paymentNumber: number) {
    setExtraConfigs((prev) => {
      const existing = prev[paymentNumber];
      if (!existing || existing.amount <= 0) return prev;
      return {
        ...prev,
        [paymentNumber]: { ...existing, isRecurring: !existing.isRecurring },
      };
    });
  }

  // Determine if a period's value is inherited from a recurring anchor (not direct)
  function getInheritedAnchor(p: number): number | null {
    const direct = extraConfigs[p];
    if (direct && direct.amount > 0) return null; // direct entry, not inherited
    for (let n = p - 1; n >= 1; n--) {
      const anchor = extraConfigs[n];
      if (anchor && anchor.isRecurring && anchor.amount > 0) return anchor.amount;
    }
    return null;
  }

  if (projection.rows.length === 0) {
    return (
      <p className="text-sm text-muted-foreground py-2">
        Esta deuda no tiene cuotas pendientes.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {/* Reduction mode toggle */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-sm text-muted-foreground">Abono extra:</span>
        <div className="flex rounded-md border overflow-hidden text-sm">
          <button
            className={`px-3 py-1 ${
              reductionMode === 'reducir_plazo'
                ? 'bg-primary text-primary-foreground'
                : 'bg-background hover:bg-muted'
            }`}
            onClick={() => setReductionMode('reducir_plazo')}
          >
            Reducir plazo
          </button>
          <button
            className={`px-3 py-1 ${
              reductionMode === 'reducir_cuota'
                ? 'bg-primary text-primary-foreground'
                : 'bg-background hover:bg-muted'
            }`}
            onClick={() => setReductionMode('reducir_cuota')}
          >
            Reducir cuota
          </button>
        </div>
        {Object.keys(extraConfigs).length > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setExtraConfigs({})}
            className="text-xs h-7"
          >
            Limpiar abonos
          </Button>
        )}
      </div>

      {/* Breakdown info */}
      {hasInsurance && (
        <div className="text-xs text-muted-foreground bg-muted/40 rounded px-3 py-2">
          Cuota base (PMT):{' '}
          <span className="font-medium">{formatCurrency(projection.summary.baseMonthlyPayment)}</span>
          {' '}· Seguro:{' '}
          <span className="font-medium">{formatCurrency(projection.summary.insurancePerMonth)}</span>
          {' '}· Total cuota:{' '}
          <span className="font-medium">
            {formatCurrency(projection.summary.baseMonthlyPayment + projection.summary.insurancePerMonth)}
          </span>
        </div>
      )}

      {/* Summary cards — row 1: amortization stats */}
      <div className={`grid gap-2 text-sm ${hasInsurance ? 'grid-cols-2 sm:grid-cols-5' : 'grid-cols-2 sm:grid-cols-4'}`}>
        <div className="rounded border p-2">
          <div className="text-muted-foreground text-xs">Cuotas restantes</div>
          <div className="font-semibold">{projection.summary.totalPayments}</div>
        </div>
        <div className="rounded border p-2">
          <div className="text-muted-foreground text-xs">Total capital</div>
          <div className="font-semibold">{formatCurrency(projection.summary.totalPrincipal)}</div>
        </div>
        <div className="rounded border p-2">
          <div className="text-muted-foreground text-xs">Total intereses</div>
          <div className="font-semibold text-amber-600">{formatCurrency(projection.summary.totalInterest)}</div>
        </div>
        {hasInsurance && (
          <div className="rounded border p-2">
            <div className="text-muted-foreground text-xs">Total seguros</div>
            <div className="font-semibold text-purple-600">{formatCurrency(projection.summary.totalInsurance)}</div>
          </div>
        )}
        <div className="rounded border p-2">
          <div className="text-muted-foreground text-xs">Fecha pago final</div>
          <div className="font-semibold">{formatDate(projection.summary.payoffDate)}</div>
        </div>
      </div>

      {/* Summary cards — row 2: cost of credit analysis */}
      <div className={`grid gap-2 text-sm ${hasExtras ? 'grid-cols-1 sm:grid-cols-3' : 'grid-cols-1 sm:grid-cols-1'}`}>
        <div className="rounded border p-2 border-red-200 dark:border-red-900">
          <div className="text-muted-foreground text-xs">
            Costo del crédito{hasExtras ? ' (sin abonos)' : ''}
          </div>
          <div className="font-semibold text-red-600">{formatCurrency(baseCostOfCredit)}</div>
          <div className="text-xs text-muted-foreground mt-0.5">
            intereses{hasInsurance ? ' + seguros' : ''} sobre {formatCurrency(debt.saldo_actual)}
          </div>
        </div>
        {hasExtras && (
          <>
            <div className="rounded border p-2 border-green-300 dark:border-green-800">
              <div className="text-muted-foreground text-xs">Total abonos extra</div>
              <div className="font-semibold text-green-600">{formatCurrency(projection.summary.totalExtraPayments)}</div>
              <div className="text-xs text-muted-foreground mt-0.5">capital adicional adelantado</div>
            </div>
            <div className="rounded border p-2 border-green-300 dark:border-green-800">
              <div className="text-muted-foreground text-xs">Costo del crédito (con abonos)</div>
              <div className="font-semibold text-green-700 dark:text-green-400">{formatCurrency(currentCostOfCredit)}</div>
              <div className="text-xs text-green-600 font-medium mt-0.5">
                Ahorro: {formatCurrency(baseCostOfCredit - currentCostOfCredit)}
              </div>
            </div>
          </>
        )}
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10">#</TableHead>
              <TableHead>Fecha</TableHead>
              <TableHead className="text-right">Capital</TableHead>
              <TableHead className="text-right">Intereses</TableHead>
              {hasInsurance && <TableHead className="text-right">Seguro</TableHead>}
              <TableHead className="text-right">Cuota</TableHead>
              <TableHead className="text-right">Saldo</TableHead>
              <TableHead className="text-right w-48">
                Abono extra · <RefreshCw className="inline h-3 w-3 text-green-600" /> Recurrente
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {projection.rows.map((row) => {
              const p = row.paymentNumber;
              const directConfig = extraConfigs[p];
              const inheritedAmount = getInheritedAnchor(p);
              const isInherited = inheritedAmount !== null;
              const isDirect = directConfig && directConfig.amount > 0;
              const isRecurring = directConfig?.isRecurring ?? false;

              const rowBg = isInherited
                ? 'bg-green-50/50 dark:bg-green-950/10'
                : isDirect
                ? 'bg-green-50 dark:bg-green-950/20'
                : '';

              return (
                <TableRow key={p} className={rowBg}>
                  <TableCell className="text-muted-foreground">{p}</TableCell>
                  <TableCell className="whitespace-nowrap">{formatDate(row.date)}</TableCell>
                  <TableCell className="text-right font-mono text-blue-600">
                    {formatCurrency(row.principalPortion)}
                  </TableCell>
                  <TableCell className="text-right font-mono text-amber-600">
                    {formatCurrency(row.interestPortion)}
                  </TableCell>
                  {hasInsurance && (
                    <TableCell className="text-right font-mono text-purple-600">
                      {formatCurrency(row.insurancePortion)}
                    </TableCell>
                  )}
                  <TableCell className="text-right font-mono font-semibold">
                    {formatCurrency(row.paymentAmount)}
                  </TableCell>
                  <TableCell className="text-right font-mono">
                    {formatCurrency(row.remainingBalance)}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      {isInherited ? (
                        <>
                          <Input
                            type="number"
                            disabled
                            value={inheritedAmount}
                            className="h-7 w-24 text-right text-sm opacity-60"
                          />
                          <RefreshCw className="h-3 w-3 text-green-600 shrink-0" />
                        </>
                      ) : (
                        <>
                          <Input
                            type="number"
                            min="0"
                            step="any"
                            value={directConfig?.amount ?? ''}
                            onChange={(e) =>
                              setExtra(p, parseFloat(e.target.value) || 0)
                            }
                            className="h-7 w-24 text-right text-sm"
                            placeholder="0"
                          />
                          {isDirect && (
                            <label className="flex items-center gap-1 cursor-pointer shrink-0" title="Recurrente">
                              <input
                                type="checkbox"
                                checked={isRecurring}
                                onChange={() => toggleRecurring(p)}
                                className="cursor-pointer"
                              />
                              <RefreshCw className="h-3 w-3 text-green-600" />
                            </label>
                          )}
                        </>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
