import { type NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { UpdateCategoryItemSchema } from '@/types/funds';

export async function PUT(
  request: NextRequest,
  {
    params,
  }: { params: Promise<{ id: string; subgroupId: string; itemId: string }> }
) {
  try {
    const { itemId } = await params;
    const body = await request.json();

    const validationResult = UpdateCategoryItemSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validationResult.error.errors },
        { status: 400 }
      );
    }

    const { name, default_unit, display_order } = validationResult.data;

    const [existing] = await sql`
      SELECT * FROM category_items WHERE id = ${itemId}
    `;

    if (!existing) {
      return NextResponse.json(
        { error: 'Ítem no encontrado' },
        { status: 404 }
      );
    }

    const [updated] = await sql`
      UPDATE category_items
      SET
        name = ${name ?? existing.name},
        default_unit = ${default_unit !== undefined ? default_unit : existing.default_unit},
        display_order = ${display_order ?? existing.display_order},
        updated_at = NOW()
      WHERE id = ${itemId}
      RETURNING *
    `;

    return NextResponse.json(updated);
  } catch (error) {
    console.error('Error updating item:', error);
    if ((error as any)?.code === '23505') {
      return NextResponse.json(
        { error: 'Ya existe un ítem con este nombre en este sub-grupo' },
        { status: 409 }
      );
    }
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  {
    params,
  }: { params: Promise<{ id: string; subgroupId: string; itemId: string }> }
) {
  try {
    const { itemId } = await params;

    const linkedDetails = await sql`
      SELECT COUNT(*) as count FROM expense_details WHERE item_id = ${itemId}
    `;

    if (parseInt(linkedDetails[0].count) > 0) {
      return NextResponse.json(
        {
          error:
            'Este ítem tiene detalles de gasto registrados y no puede eliminarse',
        },
        { status: 409 }
      );
    }

    const [deleted] = await sql`
      DELETE FROM category_items WHERE id = ${itemId} RETURNING *
    `;

    if (!deleted) {
      return NextResponse.json(
        { error: 'Ítem no encontrado' },
        { status: 404 }
      );
    }

    return NextResponse.json(deleted);
  } catch (error) {
    console.error('Error deleting item:', error);
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    );
  }
}
