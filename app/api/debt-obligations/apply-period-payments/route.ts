import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { applyOnePayment } from '@/lib/debt-tracking-calculations';
import type { DebtObligation } from '@/types/debt-tracking';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { period_id, debt_ids } = body as {
      period_id: string;
      debt_ids: string[];
    };

    if (!period_id || !Array.isArray(debt_ids) || debt_ids.length === 0) {
      return NextResponse.json(
        { error: 'Se requieren period_id y debt_ids' },
        { status: 400 }
      );
    }

    // Fetch all requested debts
    const rows = await sql`
      SELECT * FROM debt_obligations
      WHERE id = ANY(${debt_ids}::uuid[])
        AND is_active = true
    `;

    const updated: Array<{
      debt_id: string;
      previous_saldo: number;
      new_saldo: number;
      previous_cuotas: number;
      new_cuotas: number;
    }> = [];

    for (const row of rows) {
      const debt: DebtObligation = {
        id: row.id,
        name: row.name,
        credit_card_id: row.credit_card_id,
        category_id: row.category_id,
        monto_original: parseFloat(row.monto_original),
        plazo_original: row.plazo_original,
        fecha_inicio: row.fecha_inicio,
        cuotas_pendientes: row.cuotas_pendientes,
        tasa_interes: parseFloat(row.tasa_interes),
        tipo_tasa: row.tipo_tasa,
        saldo_actual: parseFloat(row.saldo_actual),
        pago_mensual: parseFloat(row.pago_mensual),
        valor_seguro: parseFloat(row.valor_seguro ?? '0'),
        dia_pago: row.dia_pago,
        last_updated_period_id: row.last_updated_period_id,
        is_active: row.is_active,
        created_at: row.created_at,
        updated_at: row.updated_at,
      };

      const { saldo_actual: newSaldo, cuotas_pendientes: newCuotas } =
        applyOnePayment(debt);

      await sql`
        UPDATE debt_obligations
        SET
          saldo_actual = ${newSaldo},
          cuotas_pendientes = ${newCuotas},
          last_updated_period_id = ${period_id},
          updated_at = NOW()
        WHERE id = ${debt.id}
      `;

      updated.push({
        debt_id: debt.id,
        previous_saldo: debt.saldo_actual,
        new_saldo: newSaldo,
        previous_cuotas: debt.cuotas_pendientes,
        new_cuotas: newCuotas,
      });
    }

    return NextResponse.json({ updated });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Error desconocido';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
