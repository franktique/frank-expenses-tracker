import { NextRequest, NextResponse } from 'next/server';
import { syncDebtsToPeriod } from '@/lib/debt-tracking-sync';

/**
 * POST /api/debt-obligations/sync-to-period
 *
 * Body: { period_id: string, debt_ids?: string[] }
 *
 * Catches the given debts (or every active debt when debt_ids is omitted)
 * up to the period: applies each amortization payment elapsed since the
 * debt was last synced (last_updated_period_id, falling back to
 * fecha_inicio) and stamps the period. Forward-only — never restores
 * cuotas when the target period is earlier than the last synced one.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { period_id, debt_ids } = body as {
      period_id: string;
      debt_ids?: string[];
    };

    if (!period_id) {
      return NextResponse.json(
        { error: 'Se requiere period_id' },
        { status: 400 }
      );
    }

    const result = await syncDebtsToPeriod(period_id, debt_ids);
    return NextResponse.json(result);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Error desconocido';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
