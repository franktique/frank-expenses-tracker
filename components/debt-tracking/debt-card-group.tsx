'use client';

import { useState, useMemo } from 'react';
import { Pencil, Trash2, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  calculateCreditCardGroupTotals,
  generateConsolidatedCardProjection,
  calculateDebtMonthlyBreakdown,
} from '@/lib/debt-tracking-calculations';
import type { CreditCardDebtGroup, DebtObligation } from '@/types/debt-tracking';

interface DebtCardGroupProps {
  group: CreditCardDebtGroup;
  onEdit: (debt: DebtObligation) => void;
  onDelete: (debt: DebtObligation) => void;
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

function FranchiseBadge({ franchise }: { franchise: string }) {
  const labels: Record<string, string> = {
    visa: 'Visa',
    mastercard: 'Mastercard',
    american_express: 'Amex',
    discover: 'Discover',
    other: 'Otra',
  };
  return (
    <Badge variant="outline" className="text-xs uppercase font-bold">
      {labels[franchise] ?? franchise}
    </Badge>
  );
}

export function DebtCardGroup({ group, onEdit, onDelete }: DebtCardGroupProps) {
  const [view, setView] = useState<'mensual' | 'proyeccion'>('mensual');
  const [liquidated, setLiquidated] = useState<Set<string>>(new Set());
  const [collapsed, setCollapsed] = useState(false);

  const { credit_card, debts } = group;

  const activeDebts = useMemo(
    () => debts.filter((d) => !liquidated.has(d.id)),
    [debts, liquidated]
  );

  const totals = useMemo(
    () => calculateCreditCardGroupTotals(activeDebts),
    [activeDebts]
  );

  const consolidatedProjection = useMemo(
    () => (view === 'proyeccion' ? generateConsolidatedCardProjection(activeDebts) : []),
    [activeDebts, view]
  );

  function toggleLiquidated(id: string) {
    setLiquidated((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  return (
    <div className="border rounded-lg overflow-hidden">
      {/* Card header */}
      <div className="flex items-center gap-3 px-4 py-3 bg-muted/30">
        <button
          onClick={() => setCollapsed((v) => !v)}
          className="text-muted-foreground hover:text-foreground"
        >
          {collapsed ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
        </button>

        <div className="flex items-center gap-2 flex-1 min-w-0">
          <FranchiseBadge franchise={credit_card.franchise} />
          <span className="font-semibold truncate">{credit_card.bank_name}</span>
          <span className="text-muted-foreground text-sm">···{credit_card.last_four_digits}</span>
          <Badge variant="secondary" className="text-xs">
            {debts.length} {debts.length === 1 ? 'deuda' : 'deudas'}
          </Badge>
        </div>

        <div className="hidden sm:flex items-center gap-4 text-sm shrink-0">
          <div className="text-right">
            <div className="text-xs text-muted-foreground">Saldo total</div>
            <div className="font-bold">{formatCurrency(totals.saldo_total)}</div>
          </div>
          <div className="text-right">
            <div className="text-xs text-muted-foreground">Pago mensual</div>
            <div className="font-bold text-primary">{formatCurrency(totals.pago_mensual_total)}</div>
          </div>
          <div className="text-right">
            <div className="text-xs text-muted-foreground">Capital</div>
            <div className="font-semibold text-blue-600">{formatCurrency(totals.capital_mensual)}</div>
          </div>
          <div className="text-right">
            <div className="text-xs text-muted-foreground">Intereses</div>
            <div className="font-semibold text-amber-600">{formatCurrency(totals.intereses_mensual)}</div>
          </div>
          {totals.seguro_mensual > 0 && (
            <div className="text-right">
              <div className="text-xs text-muted-foreground">Seguros</div>
              <div className="font-semibold text-purple-600">{formatCurrency(totals.seguro_mensual)}</div>
            </div>
          )}
        </div>
      </div>

      {!collapsed && (
        <>
          {/* View toggle */}
          <div className="flex items-center gap-2 px-4 pt-3">
            <div className="flex rounded-md border overflow-hidden text-sm">
              <button
                className={`px-3 py-1.5 ${
                  view === 'mensual'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-background hover:bg-muted'
                }`}
                onClick={() => setView('mensual')}
              >
                Vista mensual
              </button>
              <button
                className={`px-3 py-1.5 ${
                  view === 'proyeccion'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-background hover:bg-muted'
                }`}
                onClick={() => setView('proyeccion')}
              >
                Proyección consolidada
              </button>
            </div>
            {liquidated.size > 0 && (
              <span className="text-xs text-muted-foreground">
                {liquidated.size} deuda(s) marcada(s) como liquidada(s)
              </span>
            )}
          </div>

          <div className="px-4 pb-4 pt-3">
            {view === 'mensual' ? (
              <MensualView
                debts={debts}
                liquidated={liquidated}
                onToggleLiquidated={toggleLiquidated}
                onEdit={onEdit}
                onDelete={onDelete}
              />
            ) : (
              <ProyeccionView
                projection={consolidatedProjection}
                debts={activeDebts}
              />
            )}
          </div>
        </>
      )}
    </div>
  );
}

// ─── Mensual View ────────────────────────────────────────────────────────────

function MensualView({
  debts,
  liquidated,
  onToggleLiquidated,
  onEdit,
  onDelete,
}: {
  debts: DebtObligation[];
  liquidated: Set<string>;
  onToggleLiquidated: (id: string) => void;
  onEdit: (debt: DebtObligation) => void;
  onDelete: (debt: DebtObligation) => void;
}) {
  const activeDebts = debts.filter((d) => !liquidated.has(d.id));
  const totalTotals = calculateCreditCardGroupTotals(activeDebts);

  return (
    <div className="overflow-x-auto rounded border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-8">Liq.</TableHead>
            <TableHead>Deuda</TableHead>
            <TableHead className="text-right">Saldo</TableHead>
            <TableHead className="text-right">Cuotas pend.</TableHead>
            <TableHead className="text-right">Capital</TableHead>
            <TableHead className="text-right">Intereses</TableHead>
            <TableHead className="text-right">Seguro</TableHead>
            <TableHead className="text-right">Pago mensual</TableHead>
            <TableHead className="w-16"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {debts.map((debt) => {
            const isLiquidated = liquidated.has(debt.id);
            const breakdown = calculateDebtMonthlyBreakdown(debt);
            return (
              <TableRow
                key={debt.id}
                className={isLiquidated ? 'opacity-50' : ''}
              >
                <TableCell>
                  <input
                    type="checkbox"
                    checked={isLiquidated}
                    onChange={() => onToggleLiquidated(debt.id)}
                    className="cursor-pointer"
                  />
                </TableCell>
                <TableCell>
                  <span className={isLiquidated ? 'line-through text-muted-foreground' : ''}>
                    {debt.name}
                  </span>
                  {debt.category && (
                    <span className="text-xs text-muted-foreground ml-1">
                      · {debt.category.name}
                    </span>
                  )}
                </TableCell>
                <TableCell className="text-right font-mono">
                  {formatCurrency(debt.saldo_actual)}
                </TableCell>
                <TableCell className="text-right">{debt.cuotas_pendientes}</TableCell>
                <TableCell className="text-right font-mono text-blue-600">
                  {formatCurrency(breakdown.capital)}
                </TableCell>
                <TableCell className="text-right font-mono text-amber-600">
                  {formatCurrency(breakdown.intereses)}
                </TableCell>
                <TableCell className="text-right font-mono text-purple-600">
                  {breakdown.seguro > 0 ? formatCurrency(breakdown.seguro) : '—'}
                </TableCell>
                <TableCell className="text-right font-mono font-semibold">
                  {formatCurrency(debt.pago_mensual)}
                </TableCell>
                <TableCell>
                  <div className="flex gap-1 justify-end">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0"
                      onClick={() => onEdit(debt)}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0 text-destructive hover:text-destructive"
                      onClick={() => onDelete(debt)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
        {/* Totals row */}
        <tfoot>
          <TableRow className="font-semibold bg-muted/30">
            <TableCell colSpan={2} className="text-right">Totales activos:</TableCell>
            <TableCell className="text-right font-mono">{formatCurrency(totalTotals.saldo_total)}</TableCell>
            <TableCell />
            <TableCell className="text-right font-mono text-blue-600">{formatCurrency(totalTotals.capital_mensual)}</TableCell>
            <TableCell className="text-right font-mono text-amber-600">{formatCurrency(totalTotals.intereses_mensual)}</TableCell>
            <TableCell className="text-right font-mono text-purple-600">
              {totalTotals.seguro_mensual > 0 ? formatCurrency(totalTotals.seguro_mensual) : '—'}
            </TableCell>
            <TableCell className="text-right font-mono">{formatCurrency(totalTotals.pago_mensual_total)}</TableCell>
            <TableCell />
          </TableRow>
        </tfoot>
      </Table>
    </div>
  );
}

// ─── Proyeccion View ──────────────────────────────────────────────────────────

function ProyeccionView({
  projection,
  debts,
}: {
  projection: ReturnType<typeof generateConsolidatedCardProjection>;
  debts: DebtObligation[];
}) {
  if (projection.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No hay cuotas pendientes para proyectar.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground">
        Proyección consolidada de {debts.length} deuda(s) activa(s)
      </p>
      <div className="overflow-x-auto rounded border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Mes</TableHead>
              <TableHead className="text-right">Capital total</TableHead>
              <TableHead className="text-right">Intereses total</TableHead>
              <TableHead className="text-right">Seguros total</TableHead>
              <TableHead className="text-right">Pago total</TableHead>
              <TableHead>Desglose</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {projection.map((month) => (
              <TableRow key={month.month}>
                <TableCell className="whitespace-nowrap font-medium">
                  {new Date(month.month + '-01').toLocaleDateString('es-CO', {
                    month: 'long',
                    year: 'numeric',
                  })}
                </TableCell>
                <TableCell className="text-right font-mono text-blue-600">
                  {formatCurrency(month.totalPrincipal)}
                </TableCell>
                <TableCell className="text-right font-mono text-amber-600">
                  {formatCurrency(month.totalInterest)}
                </TableCell>
                <TableCell className="text-right font-mono text-purple-600">
                  {month.totalInsurance > 0 ? formatCurrency(month.totalInsurance) : '—'}
                </TableCell>
                <TableCell className="text-right font-mono font-semibold">
                  {formatCurrency(month.totalPayment)}
                </TableCell>
                <TableCell>
                  <div className="text-xs text-muted-foreground space-y-0.5">
                    {month.debtBreakdown.map((d, i) => (
                      <div key={i}>
                        {d.name}: {formatCurrency(d.payment)}
                      </div>
                    ))}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
