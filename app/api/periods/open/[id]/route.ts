import { type NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import {
  syncDebtsToPeriod,
  type DebtSyncResult,
} from '@/lib/debt-tracking-sync';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // First, close all periods
    await sql`UPDATE periods SET is_open = false`;

    // Then, open the selected period
    const [openedPeriod] = await sql`
      UPDATE periods
      SET is_open = true
      WHERE id = ${id}
      RETURNING *
    `;

    if (!openedPeriod) {
      return NextResponse.json({ error: 'Period not found' }, { status: 404 });
    }

    // Catch debt obligations up to the newly opened period: apply every
    // amortization payment elapsed since each debt was last synced. A sync
    // failure must not fail the period open, so it is reported separately.
    let debts_synced: DebtSyncResult | null = null;
    let debts_sync_error: string | null = null;
    try {
      debts_synced = await syncDebtsToPeriod(openedPeriod.id);
    } catch (syncError) {
      console.error('Error syncing debts to period:', syncError);
      debts_sync_error =
        syncError instanceof Error ? syncError.message : 'Error desconocido';
    }

    return NextResponse.json({
      ...openedPeriod,
      debts_synced,
      debts_sync_error,
    });
  } catch (error) {
    console.error('Error opening period:', error);
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    );
  }
}
