/**
 * Debt Tracking Period Sync
 *
 * Server-side helper that catches debt obligations up to a period: applies
 * every amortization payment that elapsed since the debt was last synced
 * (last_updated_period_id, falling back to fecha_inicio) and stamps the
 * period it was synced to. Forward-only: never restores cuotas.
 *
 * Shared by POST /api/debt-obligations/sync-to-period and the automatic
 * catch-up in POST /api/periods/open/[id].
 */

import { sql } from '@/lib/db';
import {
  applyCatchUp,
  computeCatchUpCount,
  type PeriodPoint,
} from '@/lib/debt-tracking-calculations';
import type { DebtObligation } from '@/types/debt-tracking';

export type DebtSyncSkipReason = 'sin_fecha' | 'pagada' | 'al_dia';

export interface DebtSyncEntry {
  debt_id: string;
  applied: number;
  previous_saldo: number;
  new_saldo: number;
  previous_cuotas: number;
  new_cuotas: number;
}

export interface DebtSyncSkip {
  debt_id: string;
  reason: DebtSyncSkipReason;
}

export interface DebtSyncResult {
  synced: DebtSyncEntry[];
  skipped: DebtSyncSkip[];
}

/**
 * Map a debt_obligations row (with optional joined last-period columns) to
 * the DebtObligation domain type. Matches the mapping used by the
 * debt-obligations API routes. Note: postgres DATE columns arrive as Date
 * objects even though the type says string.
 */
function mapDebtRow(row: Record<string, unknown>): DebtObligation & {
  last_period_month: number | null;
  last_period_year: number | null;
} {
  return {
    id: row.id as string,
    name: row.name as string,
    credit_card_id: (row.credit_card_id as string | null) ?? null,
    category_id: (row.category_id as string | null) ?? null,
    monto_original: parseFloat(row.monto_original as string),
    plazo_original: row.plazo_original as number,
    fecha_inicio: (row.fecha_inicio as string | null) ?? null,
    cuotas_pendientes: row.cuotas_pendientes as number,
    tasa_interes: parseFloat(row.tasa_interes as string),
    tipo_tasa: row.tipo_tasa as 'EA' | 'EM',
    saldo_actual: parseFloat(row.saldo_actual as string),
    pago_mensual: parseFloat(row.pago_mensual as string),
    valor_seguro: parseFloat((row.valor_seguro as string | null) ?? '0'),
    dia_pago: (row.dia_pago as number | null) ?? null,
    last_updated_period_id:
      (row.last_updated_period_id as string | null) ?? null,
    is_active: row.is_active as boolean,
    created_at: row.created_at as string,
    updated_at: row.updated_at as string,
    last_period_month: (row.last_period_month as number | null) ?? null,
    last_period_year: (row.last_period_year as number | null) ?? null,
  };
}

/**
 * Bring the given debts (or every active debt when debt_ids is omitted or
 * empty) up to the period, applying as many amortization payments as months
 * have elapsed since each debt was last synced. Debts without any date
 * anchor (no last_updated_period_id and no fecha_inicio) are skipped and
 * reported as 'sin_fecha' — they keep being managed manually.
 *
 * Only debts that actually advance are written; the rest are reported in
 * `skipped` without touching the database.
 *
 * @param periodId - Period to sync debts up to
 * @param debtIds - Optional subset of debt ids; all active debts when absent
 * @returns Per-debt summary of applied payments and skips
 */
export async function syncDebtsToPeriod(
  periodId: string,
  debtIds?: string[]
): Promise<DebtSyncResult> {
  const [period] = await sql`
    SELECT id, month, year FROM periods WHERE id = ${periodId}
  `;
  if (!period) {
    throw new Error('Periodo no encontrado');
  }

  const activePeriod: PeriodPoint = {
    year: Number(period.year),
    month: Number(period.month),
  };

  const ids = debtIds && debtIds.length > 0 ? debtIds : null;

  const rows = await sql`
    SELECT
      d.*,
      p.month AS last_period_month,
      p.year AS last_period_year
    FROM debt_obligations d
    LEFT JOIN periods p ON p.id = d.last_updated_period_id
    WHERE d.is_active = true
      AND (${ids}::uuid[] IS NULL OR d.id = ANY(${ids}::uuid[]))
    ORDER BY d.created_at
  `;

  const synced: DebtSyncEntry[] = [];
  const skipped: DebtSyncSkip[] = [];

  for (const row of rows) {
    const debt = mapDebtRow(row);

    if (debt.cuotas_pendientes <= 0) {
      skipped.push({ debt_id: debt.id, reason: 'pagada' });
      continue;
    }

    const lastPeriod: PeriodPoint | null =
      debt.last_period_year !== null
        ? {
            year: Number(debt.last_period_year),
            month: Number(debt.last_period_month),
          }
        : null;

    const count = computeCatchUpCount(debt, lastPeriod, activePeriod);

    if (count <= 0) {
      skipped.push({
        debt_id: debt.id,
        reason: !lastPeriod && !debt.fecha_inicio ? 'sin_fecha' : 'al_dia',
      });
      continue;
    }

    const { saldo_actual: newSaldo, cuotas_pendientes: newCuotas } =
      applyCatchUp(debt, count);

    await sql`
      UPDATE debt_obligations
      SET
        saldo_actual = ${newSaldo},
        cuotas_pendientes = ${newCuotas},
        last_updated_period_id = ${periodId},
        updated_at = NOW()
      WHERE id = ${debt.id}
    `;

    synced.push({
      debt_id: debt.id,
      applied: count,
      previous_saldo: debt.saldo_actual,
      new_saldo: newSaldo,
      previous_cuotas: debt.cuotas_pendientes,
      new_cuotas: newCuotas,
    });
  }

  return { synced, skipped };
}
