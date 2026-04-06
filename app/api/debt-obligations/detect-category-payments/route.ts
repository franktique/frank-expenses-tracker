import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const periodId = searchParams.get('period_id');

    if (!periodId) {
      return NextResponse.json(
        { error: 'Se requiere el parámetro period_id' },
        { status: 400 }
      );
    }

    // Get all expenses for the period that have a category, grouped by category
    const expensesByCategory = await sql`
      SELECT
        e.category_id,
        cat.name AS category_name,
        COUNT(*) AS expense_count,
        SUM(e.amount) AS expense_total
      FROM expenses e
      JOIN categories cat ON e.category_id = cat.id
      WHERE e.period_id = ${periodId}
        AND e.category_id IS NOT NULL
      GROUP BY e.category_id, cat.name
    `;

    if (expensesByCategory.length === 0) {
      return NextResponse.json({
        period_id: periodId,
        detections: [],
      });
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const categoryIds = expensesByCategory.map((r: any) => r.category_id);

    // Find active debts associated with those categories that haven't been
    // updated for this period yet
    const debts = await sql`
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
      WHERE d.category_id = ANY(${categoryIds}::uuid[])
        AND d.is_active = true
        AND (d.last_updated_period_id IS NULL OR d.last_updated_period_id != ${periodId})
        AND d.cuotas_pendientes > 0
    `;

    // Group debts by category
    const debtsByCategory = new Map<string, typeof debts>();
    for (const debt of debts) {
      const catId = debt.category_id as string;
      if (!debtsByCategory.has(catId)) {
        debtsByCategory.set(catId, []);
      }
      debtsByCategory.get(catId)!.push(debt);
    }

    const detections = expensesByCategory
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .filter((exp: any) => debtsByCategory.has(exp.category_id as string))
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .map((exp: any) => {
        const categoryDebts = debtsByCategory.get(exp.category_id as string)!;
        return {
          category_id: exp.category_id,
          category_name: exp.category_name,
          expense_count: parseInt(exp.expense_count as string),
          expense_total: parseFloat(exp.expense_total as string),
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          debts: categoryDebts.map((row: any) => ({
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
          })),
        };
      });

    return NextResponse.json({
      period_id: periodId,
      detections,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Error desconocido';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
