import { type NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { getProjectionWindow } from '@/lib/credit-card-projection-utils';
import { getNextPaymentCuota } from '@/lib/debt-tracking-calculations';
import type {
  CreditCardProjectionResponse,
  CreditCardProjectionRow,
} from '@/types/credit-cards';

/**
 * GET /api/credit-cards/projection?period_id={id}
 *
 * Returns the projected credit-card payment for next month's budget, per card.
 * The statement cycle window is (corte of month M-1, corte of month M], where
 * M is the requested period's month; the payment falls in month M+1. Charges
 * are summed from expenses.credit_card_id with payment_method 'credit',
 * excluding pending expenses (app-wide convention).
 *
 * Each row also carries the cuotas of the card's active debts that will
 * still be running on the payment month (debt_payment / debt_count), merged
 * into projected_total.
 *
 * Cards without a cutoff_day are returned with has_cutoff_day: false so the UI
 * can prompt the user to configure it. Read-only: never writes to the database.
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const periodId = searchParams.get('period_id');

    // Resolve the period: explicit period_id, or the active (open) period
    let period;
    if (periodId) {
      [period] = await sql`
        SELECT id, name, month, year FROM periods WHERE id = ${periodId}
      `;
      if (!period) {
        return NextResponse.json(
          { error: 'Period not found' },
          { status: 404 }
        );
      }
    } else {
      [period] = await sql`
        SELECT id, name, month, year FROM periods WHERE is_open = true
      `;
      if (!period) {
        return NextResponse.json(
          { error: 'No hay un periodo activo' },
          { status: 404 }
        );
      }
    }

    // All active credit cards
    const cards = await sql`
      SELECT id, bank_name, franchise, last_four_digits, is_active, cutoff_day, created_at, updated_at
      FROM credit_cards
      WHERE is_active = true
      ORDER BY bank_name, franchise, last_four_digits
    `;

    const periodYear = Number(period.year);
    const periodMonth = Number(period.month); // 0-indexed

    // Debt cuotas per card for the payment month (M+1): every active debt
    // with cuotas left beyond the active period contributes one installment.
    // Independent of the corte window, so it applies to every card.
    const debtRows = await sql`
      SELECT
        saldo_actual,
        cuotas_pendientes,
        pago_mensual,
        tasa_interes,
        tipo_tasa,
        valor_seguro,
        credit_card_id
      FROM debt_obligations
      WHERE is_active = true
        AND cuotas_pendientes >= 2
        AND credit_card_id IS NOT NULL
    `;

    const debtCuotasByCard = new Map<
      string,
      { payment: number; count: number }
    >();
    for (const row of debtRows) {
      const cardId = row.credit_card_id as string;
      const cuota = getNextPaymentCuota({
        saldo_actual: parseFloat(row.saldo_actual as string),
        cuotas_pendientes: row.cuotas_pendientes as number,
        tasa_interes: parseFloat(row.tasa_interes as string),
        tipo_tasa: row.tipo_tasa as 'EA' | 'EM',
        pago_mensual: parseFloat(row.pago_mensual as string),
        valor_seguro: parseFloat((row.valor_seguro as string | null) ?? '0'),
      });
      const existing = debtCuotasByCard.get(cardId) ?? { payment: 0, count: 0 };
      existing.payment = Math.round((existing.payment + cuota) * 100) / 100;
      existing.count += 1;
      debtCuotasByCard.set(cardId, existing);
    }

    const rows: CreditCardProjectionRow[] = [];
    let totalProjected = 0;
    let totalDebtPayment = 0;

    for (const card of cards) {
      const cutoffDay = card.cutoff_day;
      const cardDebts = debtCuotasByCard.get(card.id) ?? {
        payment: 0,
        count: 0,
      };

      if (cutoffDay === null || cutoffDay === undefined) {
        // Cannot project without a corte day; surface for the UI prompt
        rows.push({
          credit_card: card,
          has_cutoff_day: false,
          window_start: null,
          window_end: null,
          next_payment_month: null,
          next_payment_year: null,
          projected_amount: 0,
          expense_count: 0,
          debt_payment: cardDebts.payment,
          debt_count: cardDebts.count,
          projected_total: cardDebts.payment,
        });
        totalDebtPayment += cardDebts.payment;
        continue;
      }

      const window = getProjectionWindow(
        periodYear,
        periodMonth,
        Number(cutoffDay)
      );

      // Charges in (corte M-1, corte M], excluding pending expenses
      const [agg] = await sql`
        SELECT
          COALESCE(SUM(e.amount), 0) AS projected_amount,
          COUNT(e.id) AS expense_count
        FROM expenses e
        WHERE e.credit_card_id = ${card.id}
          AND e.payment_method = 'credit'
          AND e.date > ${window.windowStart}
          AND e.date <= ${window.windowEnd}
          AND (e.pending IS NULL OR e.pending = false)
      `;

      const projectedAmount = parseFloat(agg.projected_amount) || 0;
      totalProjected += projectedAmount;
      totalDebtPayment += cardDebts.payment;

      rows.push({
        credit_card: card,
        has_cutoff_day: true,
        window_start: window.windowStart,
        window_end: window.windowEnd,
        next_payment_month: window.nextPaymentMonth,
        next_payment_year: window.nextPaymentYear,
        projected_amount: projectedAmount,
        expense_count: parseInt(agg.expense_count) || 0,
        debt_payment: cardDebts.payment,
        debt_count: cardDebts.count,
        projected_total: projectedAmount + cardDebts.payment,
      });
    }

    const response: CreditCardProjectionResponse = {
      period_id: period.id,
      period_name: period.name,
      cards: rows,
      total_projected: totalProjected,
      total_debt_payment: totalDebtPayment,
      total_projected_with_debts: totalProjected + totalDebtPayment,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error fetching credit card projection:', error);
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    );
  }
}
