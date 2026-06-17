import { type NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { UpsertExpenseDetailsSchema } from '@/types/funds';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: expenseId } = await params;

    const details = await sql`
      SELECT
        ed.id,
        ed.expense_id,
        ed.item_id,
        ed.amount,
        ed.quantity,
        ed.unit,
        ed.created_at,
        ed.updated_at,
        ci.name AS item_name,
        ci.subgroup_id,
        sg.name AS subgroup_name
      FROM expense_details ed
      JOIN category_items ci ON ed.item_id = ci.id
      JOIN category_subgroups sg ON ci.subgroup_id = sg.id
      WHERE ed.expense_id = ${expenseId}
      ORDER BY sg.display_order, sg.name, ci.display_order, ci.name
    `;

    return NextResponse.json(details);
  } catch (error) {
    console.error('Error fetching expense details:', error);
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: expenseId } = await params;
    const body = await request.json();

    const validationResult = UpsertExpenseDetailsSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validationResult.error.errors },
        { status: 400 }
      );
    }

    const { details } = validationResult.data;

    // Fetch expense to validate total
    const [expense] = await sql`
      SELECT id, amount FROM expenses WHERE id = ${expenseId}
    `;

    if (!expense) {
      return NextResponse.json(
        { error: 'Gasto no encontrado' },
        { status: 404 }
      );
    }

    // Full replace: delete then insert
    await sql`DELETE FROM expense_details WHERE expense_id = ${expenseId}`;

    if (details.length > 0) {
      for (const detail of details) {
        await sql`
          INSERT INTO expense_details (expense_id, item_id, amount, quantity, unit)
          VALUES (
            ${expenseId},
            ${detail.item_id},
            ${detail.amount},
            ${detail.quantity ?? null},
            ${detail.unit ?? null}
          )
        `;
      }
    }

    // Return the saved details
    const saved = await sql`
      SELECT
        ed.id,
        ed.expense_id,
        ed.item_id,
        ed.amount,
        ed.quantity,
        ed.unit,
        ed.created_at,
        ed.updated_at,
        ci.name AS item_name,
        ci.subgroup_id,
        sg.name AS subgroup_name
      FROM expense_details ed
      JOIN category_items ci ON ed.item_id = ci.id
      JOIN category_subgroups sg ON ci.subgroup_id = sg.id
      WHERE ed.expense_id = ${expenseId}
      ORDER BY sg.display_order, sg.name, ci.display_order, ci.name
    `;

    return NextResponse.json(saved);
  } catch (error) {
    console.error('Error saving expense details:', error);
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: expenseId } = await params;

    await sql`DELETE FROM expense_details WHERE expense_id = ${expenseId}`;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting expense details:', error);
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    );
  }
}
