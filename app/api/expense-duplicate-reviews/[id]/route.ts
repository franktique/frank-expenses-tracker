import { type NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import {
  ProposedExpenseSchema,
  ResolveDuplicateReviewSchema,
} from '@/types/duplicate-reviews';

/**
 * PATCH /api/expense-duplicate-reviews/[id]
 *  { action: 'dismiss' }                      → descarta la revisión
 *  { action: 'create' }                       → no era duplicado: crea lo
 *    escaneado (con su detalle) como un gasto nuevo
 *  { action: 'apply', fields: ['date', ...] } → aplica solo esos campos del
 *    gasto propuesto sobre el existente ('details' reemplaza el detalle).
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const validation = ResolveDuplicateReviewSchema.safeParse(
      await request.json()
    );
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validation.error.errors },
        { status: 400 }
      );
    }
    const body = validation.data;

    const [review] = await sql`
      SELECT id, expense_id, proposed, status
      FROM expense_duplicate_reviews WHERE id = ${id}
    `;
    if (!review) {
      return NextResponse.json(
        { error: 'Revisión no encontrada' },
        { status: 404 }
      );
    }
    if (review.status !== 'pending') {
      return NextResponse.json(
        { error: 'La revisión ya fue resuelta' },
        { status: 409 }
      );
    }

    if (body.action === 'dismiss') {
      await sql`
        UPDATE expense_duplicate_reviews
        SET status = 'dismissed', resolved_at = NOW()
        WHERE id = ${id}
      `;
      return NextResponse.json({ success: true, status: 'dismissed' });
    }

    const proposed = ProposedExpenseSchema.parse(review.proposed);

    if (body.action === 'create') {
      // No era duplicado: la revisión se descarta y lo escaneado se guarda como
      // gasto nuevo. Se marca antes de insertar para que un doble clic no cree
      // dos gastos; si el insert falla vuelve a 'pending'.
      const claimed = await sql`
        UPDATE expense_duplicate_reviews
        SET status = 'dismissed', resolved_at = NOW()
        WHERE id = ${id} AND status = 'pending'
        RETURNING id
      `;
      if (claimed.length === 0) {
        return NextResponse.json(
          { error: 'La revisión ya fue resuelta' },
          { status: 409 }
        );
      }
      try {
        // Sin fondos: lo escaneado no trae source/destination_fund_id, así que
        // no hay saldos que mover. Queda sin verificar, como todo lo del móvil.
        const [created] = await sql`
          INSERT INTO expenses (category_id, period_id, date, payment_method, description, amount, credit_card_id, pending, is_verified, store_name)
          VALUES (${proposed.category_id}, ${proposed.period_id}, ${proposed.date.split('T')[0]}, ${proposed.payment_method}, ${proposed.description}, ${proposed.amount}, ${proposed.credit_card_id ?? null}, false, false, ${proposed.store_name ?? null})
          RETURNING id
        `;
        for (const d of proposed.details) {
          await sql`
            INSERT INTO expense_details (expense_id, item_id, amount, quantity, unit)
            VALUES (${created.id}, ${d.item_id}, ${d.amount}, ${d.quantity ?? null}, ${d.unit ?? null})
          `;
        }
        return NextResponse.json({
          success: true,
          status: 'dismissed',
          expense_id: created.id,
        });
      } catch (error) {
        await sql`
          UPDATE expense_duplicate_reviews
          SET status = 'pending', resolved_at = NULL
          WHERE id = ${id}
        `;
        throw error;
      }
    }

    const expenseId = review.expense_id as string;
    const has = (field: (typeof body.fields)[number]) =>
      body.fields.includes(field);

    const scalarFields = body.fields.filter((f) => f !== 'details');
    if (scalarFields.length > 0) {
      await sql`
        UPDATE expenses SET
          date = CASE WHEN ${has('date')}::boolean
            THEN ${proposed.date.split('T')[0]}::date ELSE date END,
          description = CASE WHEN ${has('description')}::boolean
            THEN ${proposed.description}::text ELSE description END,
          amount = CASE WHEN ${has('amount')}::boolean
            THEN ${proposed.amount}::numeric ELSE amount END,
          category_id = CASE WHEN ${has('category_id')}::boolean
            THEN ${proposed.category_id}::uuid ELSE category_id END,
          payment_method = CASE WHEN ${has('payment_method')}::boolean
            THEN ${proposed.payment_method}::text ELSE payment_method END,
          credit_card_id = CASE WHEN ${has('credit_card_id')}::boolean
            THEN ${proposed.credit_card_id ?? null}::uuid ELSE credit_card_id END,
          store_name = CASE WHEN ${has('store_name')}::boolean
            THEN ${proposed.store_name ?? null}::text ELSE store_name END
        WHERE id = ${expenseId}
      `;
    }

    if (has('details')) {
      await sql`DELETE FROM expense_details WHERE expense_id = ${expenseId}`;
      for (const d of proposed.details) {
        await sql`
          INSERT INTO expense_details (expense_id, item_id, amount, quantity, unit)
          VALUES (${expenseId}, ${d.item_id}, ${d.amount}, ${d.quantity ?? null}, ${d.unit ?? null})
        `;
      }
    }

    await sql`
      UPDATE expense_duplicate_reviews
      SET status = 'applied', resolved_at = NOW(),
          applied_fields = ${JSON.stringify(body.fields)}::jsonb
      WHERE id = ${id}
    `;
    return NextResponse.json({ success: true, status: 'applied' });
  } catch (error) {
    console.error('Error resolving duplicate review:', error);
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    );
  }
}
