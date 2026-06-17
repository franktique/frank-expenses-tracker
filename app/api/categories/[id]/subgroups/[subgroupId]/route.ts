import { type NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { UpdateCategorySubgroupSchema } from '@/types/funds';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; subgroupId: string }> }
) {
  try {
    const { subgroupId } = await params;
    const body = await request.json();

    const validationResult = UpdateCategorySubgroupSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validationResult.error.errors },
        { status: 400 }
      );
    }

    const { name, display_order } = validationResult.data;

    const [existing] = await sql`
      SELECT * FROM category_subgroups WHERE id = ${subgroupId}
    `;

    if (!existing) {
      return NextResponse.json(
        { error: 'Sub-grupo no encontrado' },
        { status: 404 }
      );
    }

    const [updated] = await sql`
      UPDATE category_subgroups
      SET
        name = ${name ?? existing.name},
        display_order = ${display_order ?? existing.display_order},
        updated_at = NOW()
      WHERE id = ${subgroupId}
      RETURNING *
    `;

    return NextResponse.json(updated);
  } catch (error) {
    console.error('Error updating subgroup:', error);
    if ((error as any)?.code === '23505') {
      return NextResponse.json(
        { error: 'Ya existe un sub-grupo con este nombre en esta categoría' },
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
  { params }: { params: Promise<{ id: string; subgroupId: string }> }
) {
  try {
    const { subgroupId } = await params;

    // Check if any expense_details reference items in this subgroup
    const linkedDetails = await sql`
      SELECT COUNT(*) as count
      FROM expense_details ed
      INNER JOIN category_items ci ON ed.item_id = ci.id
      WHERE ci.subgroup_id = ${subgroupId}
    `;

    if (parseInt(linkedDetails[0].count) > 0) {
      return NextResponse.json(
        {
          error:
            'Este sub-grupo tiene ítems con detalles de gasto registrados y no puede eliminarse',
        },
        { status: 409 }
      );
    }

    const [deleted] = await sql`
      DELETE FROM category_subgroups WHERE id = ${subgroupId} RETURNING *
    `;

    if (!deleted) {
      return NextResponse.json(
        { error: 'Sub-grupo no encontrado' },
        { status: 404 }
      );
    }

    return NextResponse.json(deleted);
  } catch (error) {
    console.error('Error deleting subgroup:', error);
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    );
  }
}
