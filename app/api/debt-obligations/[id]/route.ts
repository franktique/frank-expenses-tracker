import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { UpdateDebtSchema } from '@/types/debt-tracking';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

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
      WHERE d.id = ${id} AND d.is_active = true
    `;

    if (rows.length === 0) {
      return NextResponse.json({ error: 'Deuda no encontrada' }, { status: 404 });
    }

    const row = rows[0];
    const debt = {
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
      category: row.cat_id ? { id: row.cat_id, name: row.cat_name } : null,
    };

    return NextResponse.json({ debt });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Error desconocido';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const parsed = UpdateDebtSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Datos inválidos', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const data = parsed.data;

    // Build dynamic update
    const updates: string[] = [];
    const values: (string | number | boolean | null)[] = [];
    let paramIndex = 1;

    if (data.name !== undefined) {
      updates.push(`name = $${paramIndex++}`);
      values.push(data.name);
    }
    if (data.credit_card_id !== undefined) {
      updates.push(`credit_card_id = $${paramIndex++}`);
      values.push(data.credit_card_id);
    }
    if (data.category_id !== undefined) {
      updates.push(`category_id = $${paramIndex++}`);
      values.push(data.category_id);
    }
    if (data.monto_original !== undefined) {
      updates.push(`monto_original = $${paramIndex++}`);
      values.push(data.monto_original);
    }
    if (data.plazo_original !== undefined) {
      updates.push(`plazo_original = $${paramIndex++}`);
      values.push(data.plazo_original);
    }
    if (data.fecha_inicio !== undefined) {
      updates.push(`fecha_inicio = $${paramIndex++}`);
      values.push(data.fecha_inicio);
    }
    if (data.cuotas_pendientes !== undefined) {
      updates.push(`cuotas_pendientes = $${paramIndex++}`);
      values.push(data.cuotas_pendientes);
    }
    if (data.tasa_interes !== undefined) {
      updates.push(`tasa_interes = $${paramIndex++}`);
      values.push(data.tasa_interes);
    }
    if (data.tipo_tasa !== undefined) {
      updates.push(`tipo_tasa = $${paramIndex++}`);
      values.push(data.tipo_tasa);
    }
    if (data.saldo_actual !== undefined) {
      updates.push(`saldo_actual = $${paramIndex++}`);
      values.push(data.saldo_actual);
    }
    if (data.pago_mensual !== undefined) {
      updates.push(`pago_mensual = $${paramIndex++}`);
      values.push(data.pago_mensual);
    }
    if (data.valor_seguro !== undefined) {
      updates.push(`valor_seguro = $${paramIndex++}`);
      values.push(data.valor_seguro);
    }
    if (data.dia_pago !== undefined) {
      updates.push(`dia_pago = $${paramIndex++}`);
      values.push(data.dia_pago);
    }

    if (updates.length === 0) {
      return NextResponse.json({ error: 'No hay campos para actualizar' }, { status: 400 });
    }

    updates.push(`updated_at = NOW()`);
    values.push(id);

    const query = `
      UPDATE debt_obligations
      SET ${updates.join(', ')}
      WHERE id = $${paramIndex} AND is_active = true
      RETURNING *
    `;

    const rows = await sql.query(query, values);

    if (rows.rows.length === 0) {
      return NextResponse.json({ error: 'Deuda no encontrada' }, { status: 404 });
    }

    return NextResponse.json({ debt: rows.rows[0] });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Error desconocido';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const rows = await sql`
      UPDATE debt_obligations
      SET is_active = false, updated_at = NOW()
      WHERE id = ${id} AND is_active = true
      RETURNING id
    `;

    if (rows.length === 0) {
      return NextResponse.json({ error: 'Deuda no encontrada' }, { status: 404 });
    }

    return NextResponse.json({ success: true, id });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Error desconocido';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
