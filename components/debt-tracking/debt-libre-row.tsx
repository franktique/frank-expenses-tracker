'use client';

import { useState } from 'react';
import { ChevronDown, ChevronRight, Pencil, Trash2, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { DebtProjectionTable } from './debt-projection-table';
import { calculateDebtMonthlyBreakdown } from '@/lib/debt-tracking-calculations';
import type { DebtObligation } from '@/types/debt-tracking';

interface DebtLibreRowProps {
  debt: DebtObligation;
  onEdit: (debt: DebtObligation) => void;
  onDelete: (debt: DebtObligation) => void;
  onApplyPayment: (debt: DebtObligation) => void;
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

export function DebtLibreRow({
  debt,
  onEdit,
  onDelete,
  onApplyPayment,
}: DebtLibreRowProps) {
  const [expanded, setExpanded] = useState(false);

  const breakdown = calculateDebtMonthlyBreakdown(debt);

  return (
    <div className="border rounded-lg overflow-hidden">
      {/* Summary row */}
      <div
        className="flex items-center gap-2 px-4 py-3 cursor-pointer hover:bg-muted/50 select-none"
        onClick={() => setExpanded((v) => !v)}
      >
        <span className="text-muted-foreground">
          {expanded ? (
            <ChevronDown className="h-4 w-4" />
          ) : (
            <ChevronRight className="h-4 w-4" />
          )}
        </span>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-medium truncate">{debt.name}</span>
            {debt.category && (
              <Badge variant="outline" className="text-xs">
                {debt.category.name}
              </Badge>
            )}
            {debt.cuotas_pendientes === 0 && (
              <Badge className="text-xs bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100">
                Liquidada
              </Badge>
            )}
          </div>
          <div className="text-xs text-muted-foreground mt-0.5">
            Tasa: {debt.tasa_interes}% {debt.tipo_tasa}
            {debt.dia_pago ? ` · Día de pago: ${debt.dia_pago}` : ''}
          </div>
        </div>

        <div className="hidden sm:flex items-center gap-5 text-sm text-right shrink-0">
          <div>
            <div className="text-xs text-muted-foreground">Saldo</div>
            <div className="font-semibold">{formatCurrency(debt.saldo_actual)}</div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground">Cuotas pend.</div>
            <div className="font-semibold">{debt.cuotas_pendientes}</div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground">Pago mensual</div>
            <div className="font-semibold">{formatCurrency(debt.pago_mensual)}</div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground">Capital</div>
            <div className="font-semibold text-blue-600">{formatCurrency(breakdown.capital)}</div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground">Intereses</div>
            <div className="font-semibold text-amber-600">{formatCurrency(breakdown.intereses)}</div>
          </div>
          {breakdown.seguro > 0 && (
            <div>
              <div className="text-xs text-muted-foreground">Seguro</div>
              <div className="font-semibold text-purple-600">{formatCurrency(breakdown.seguro)}</div>
            </div>
          )}
        </div>

        {/* Actions */}
        <div
          className="flex items-center gap-1 shrink-0"
          onClick={(e) => e.stopPropagation()}
        >
          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0"
            title="Aplicar pago del periodo"
            onClick={() => onApplyPayment(debt)}
            disabled={debt.cuotas_pendientes === 0}
          >
            <CheckCircle className="h-4 w-4 text-green-600" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0"
            onClick={() => onEdit(debt)}
          >
            <Pencil className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0 text-destructive hover:text-destructive"
            onClick={() => onDelete(debt)}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Mobile summary */}
      <div className="sm:hidden px-4 pb-2 flex gap-4 text-sm">
        <div>
          <span className="text-muted-foreground">Saldo: </span>
          <span className="font-medium">{formatCurrency(debt.saldo_actual)}</span>
        </div>
        <div>
          <span className="text-muted-foreground">Cuotas: </span>
          <span className="font-medium">{debt.cuotas_pendientes}</span>
        </div>
        <div>
          <span className="text-muted-foreground">Pago: </span>
          <span className="font-medium">{formatCurrency(debt.pago_mensual)}</span>
        </div>
      </div>

      {/* Expanded projection */}
      {expanded && (
        <div className="border-t px-4 py-4 bg-muted/20">
          <DebtProjectionTable debt={debt} />
        </div>
      )}
    </div>
  );
}
