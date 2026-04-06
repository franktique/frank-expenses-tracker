import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { CreateDebtSchema } from '@/types/debt-tracking';

export async function GET() {
  try {
    const rows = await sql`
      SELECT
        d.*,
        cc.id AS cc_id,
        cc.bank_name,
        cc.franchise,
        cc.last_four_digits,
        cat.id AS cat_id,
        cat.name AS cat_name
      FROM debt_obligations d
      LEFT JOIN credit_cards cc ON d.credit_card_id = cc.id
      LEFT JOIN categories cat ON d.category_id = cat.id
      WHERE d.is_active = true
      ORDER BY d.created_at ASC
    `;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const debts = rows.map((row: any) => ({
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
      credit_card: row.cc_id
        ? {
            id: row.cc_id,
            bank_name: row.bank_name,
            franchise: row.franchise,
            last_four_digits: row.last_four_digits,
          }
        : null,
      category: row.cat_id
        ? { id: row.cat_id, name: row.cat_name }
        : null,
    }));

    return NextResponse.json({ debts, total: debts.length });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Error desconocido';
    if (message.includes('does not exist')) {
      return NextResponse.json(
        { error: 'Tablas no inicializadas. Ejecute POST /api/migrate-debt-tracking' },
        { status: 503 }
      );
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = CreateDebtSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Datos inválidos', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const data = parsed.data;

    const [debt] = await sql`
      INSERT INTO debt_obligations (
        name, credit_card_id, category_id, monto_original, plazo_original,
        fecha_inicio, cuotas_pendientes, tasa_interes, tipo_tasa,
        saldo_actual, pago_mensual, valor_seguro, dia_pago
      ) VALUES (
        ${data.name},
        ${data.credit_card_id ?? null},
        ${data.category_id ?? null},
        ${data.monto_original},
        ${data.plazo_original},
        ${data.fecha_inicio ?? null},
        ${data.cuotas_pendientes},
        ${data.tasa_interes},
        ${data.tipo_tasa ?? 'EA'},
        ${data.saldo_actual},
        ${data.pago_mensual},
        ${data.valor_seguro ?? 0},
        ${data.dia_pago ?? null}
      )
      RETURNING *
    `;

    return NextResponse.json({ debt }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Error desconocido';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
