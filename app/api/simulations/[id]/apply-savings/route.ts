import { type NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { sql } from '@/lib/db';
import {
  buildSavingsProposal,
  normalizeBudgetRow,
} from '@/lib/simulation-savings';

const ApplySavingsSchema = z.object({
  changes: z
    .array(
      z.object({
        category_id: z.string().min(1),
        ahorro_efectivo_amount: z.number().finite().optional(),
        ahorro_credito_amount: z.number().finite().optional(),
      })
    )
    .min(1, 'Debe incluir al menos un cambio'),
});

// POST /api/simulations/[id]/apply-savings
// Applies an approved savings proposal (from the AI assistant). Only the two
// savings columns are touched; amounts are re-validated against the current
// efectivo/crédito values, never trusted from the client.
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const simulationId = parseInt(id);
    if (isNaN(simulationId) || simulationId <= 0) {
      return NextResponse.json(
        { error: 'ID de simulación inválido' },
        { status: 400 }
      );
    }

    const parsed = ApplySavingsSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || 'Datos inválidos' },
        { status: 400 }
      );
    }

    const currentRows = (
      (await sql`
        SELECT
          sb.category_id,
          c.name AS category_name,
          sb.efectivo_amount,
          sb.credito_amount,
          sb.ahorro_efectivo_amount,
          sb.ahorro_credito_amount
        FROM simulation_budgets sb
        JOIN categories c ON c.id = sb.category_id
        WHERE sb.simulation_id = ${simulationId}
      `) as Record<string, unknown>[]
    ).map(normalizeBudgetRow);

    const proposal = buildSavingsProposal(currentRows, parsed.data.changes);
    if (proposal.errors.length > 0) {
      return NextResponse.json(
        { error: proposal.errors.join(' '), errors: proposal.errors },
        { status: 400 }
      );
    }
    if (proposal.changes.length === 0) {
      return NextResponse.json({ applied: 0, changes: [] });
    }

    for (const change of proposal.changes) {
      await sql`
        UPDATE simulation_budgets
        SET
          ahorro_efectivo_amount = ${change.after.ahorro_efectivo_amount},
          ahorro_credito_amount = ${change.after.ahorro_credito_amount},
          updated_at = CURRENT_TIMESTAMP
        WHERE simulation_id = ${simulationId}
          AND category_id = ${change.category_id}
      `;
    }

    return NextResponse.json({
      applied: proposal.changes.length,
      changes: proposal.changes,
      totals_after: proposal.totals_after,
    });
  } catch (error) {
    console.error('Error applying simulation savings:', error);
    return NextResponse.json(
      { error: 'Error interno al aplicar los cambios de ahorro' },
      { status: 500 }
    );
  }
}
