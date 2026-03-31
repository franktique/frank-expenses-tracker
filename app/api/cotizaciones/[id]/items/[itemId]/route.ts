import { type NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import {
  UpdateCotizacionItemSchema,
  COTIZACION_ERROR_MESSAGES,
  type CotizacionItem,
} from '@/types/cotizaciones';

/**
 * PUT /api/cotizaciones/[id]/items/[itemId]
 * Update a cotización item.
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; itemId: string }> }
) {
  try {
    const { id, itemId } = await params;
    const body = await request.json();

    const validation = UpdateCotizacionItemSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Datos inválidos', details: validation.error.errors },
        { status: 400 }
      );
    }

    const { categoryId, amount, quantity, notes } = validation.data;

    // If categoryId is being updated, verify it exists
    let categoryName: string | undefined;
    if (categoryId) {
      const [category] = await sql`
        SELECT id, name FROM categories WHERE id = ${categoryId}
      `;
      if (!category) {
        return NextResponse.json(
          { error: 'La categoría no existe' },
          { status: 404 }
        );
      }
      categoryName = category.name;
    }

    const [row] = await sql`
      UPDATE cotizacion_items
      SET
        category_id = COALESCE(${categoryId ?? null}, category_id),
        amount = COALESCE(${amount ?? null}, amount),
        quantity = COALESCE(${quantity ?? null}, quantity),
        notes = ${notes ?? null},
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ${itemId} AND cotizacion_id = ${id}
      RETURNING id, cotizacion_id, category_id, amount, quantity, notes, display_order, created_at, updated_at
    `;

    if (!row) {
      return NextResponse.json(
        { error: COTIZACION_ERROR_MESSAGES.ITEM_NOT_FOUND },
        { status: 404 }
      );
    }

    // Get category name if not already fetched
    if (!categoryName) {
      const [cat] =
        await sql`SELECT name FROM categories WHERE id = ${row.category_id}`;
      categoryName = cat?.name ?? '';
    }

    const item: CotizacionItem = {
      id: row.id,
      cotizacionId: row.cotizacion_id,
      categoryId: row.category_id,
      categoryName,
      amount: parseFloat(row.amount),
      quantity: row.quantity,
      notes: row.notes ?? undefined,
      displayOrder: row.display_order,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };

    await sql`
      UPDATE cotizaciones SET updated_at = CURRENT_TIMESTAMP WHERE id = ${id}
    `;

    return NextResponse.json(item);
  } catch (error) {
    console.error('Error updating cotización item:', error);
    return NextResponse.json(
      { error: 'Error al actualizar ítem' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/cotizaciones/[id]/items/[itemId]
 * Delete a cotización item.
 */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; itemId: string }> }
) {
  try {
    const { id, itemId } = await params;

    const [deleted] = await sql`
      DELETE FROM cotizacion_items
      WHERE id = ${itemId} AND cotizacion_id = ${id}
      RETURNING id
    `;

    if (!deleted) {
      return NextResponse.json(
        { error: COTIZACION_ERROR_MESSAGES.ITEM_NOT_FOUND },
        { status: 404 }
      );
    }

    await sql`
      UPDATE cotizaciones SET updated_at = CURRENT_TIMESTAMP WHERE id = ${id}
    `;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting cotización item:', error);
    return NextResponse.json(
      { error: 'Error al eliminar ítem' },
      { status: 500 }
    );
  }
}
