import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { generateDebtProjection } from '@/lib/debt-tracking-calculations';
import type { DebtObligation, ReductionMode } from '@/types/debt-tracking';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);

    const reductionMode = (searchParams.get('reductionMode') ?? 'reducir_plazo') as ReductionMode;
    const extraPaymentsParam = searchParams.get('extraPayments');
    const extraPayments: Record<number, number> = extraPaymentsParam
      ? JSON.parse(extraPaymentsParam)
      : {};

    const rows = await sql`
      SELECT * FROM debt_obligations
      WHERE id = ${id} AND is_active = true
    `;

    if (rows.length === 0) {
      return NextResponse.json({ error: 'Deuda no encontrada' }, { status: 404 });
    }

    const row = rows[0];
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

    const projection = generateDebtProjection(debt, extraPayments, reductionMode);

    return NextResponse.json(projection);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Error desconocido';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
