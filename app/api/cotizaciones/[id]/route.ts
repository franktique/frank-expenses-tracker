import { type NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import {
  UpdateCotizacionSchema,
  COTIZACION_ERROR_MESSAGES,
  type CotizacionItem,
  type CotizacionWithItems,
} from '@/types/cotizaciones';

/**
 * GET /api/cotizaciones/[id]
 * Get a single cotización with all its items.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const [cotizacion] = await sql`
      SELECT id, name, description, currency, created_at, updated_at
      FROM cotizaciones
      WHERE id = ${id}
    `;

    if (!cotizacion) {
      return NextResponse.json(
        { error: COTIZACION_ERROR_MESSAGES.NOT_FOUND },
        { status: 404 }
      );
    }

    const itemRows = await sql`
      SELECT
        ci.id,
        ci.cotizacion_id,
        ci.category_id,
        cat.name AS category_name,
        ci.amount,
        ci.quantity,
        ci.notes,
        ci.display_order,
        ci.created_at,
        ci.updated_at
      FROM cotizacion_items ci
      JOIN categories cat ON cat.id = ci.category_id
      WHERE ci.cotizacion_id = ${id}
      ORDER BY ci.display_order ASC, ci.created_at ASC
    `;

    const items: CotizacionItem[] = itemRows.map((r: any) => ({
      id: r.id,
      cotizacionId: r.cotizacion_id,
      categoryId: r.category_id,
      categoryName: r.category_name,
      amount: parseFloat(r.amount),
      quantity: r.quantity,
      notes: r.notes ?? undefined,
      displayOrder: r.display_order,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
    }));

    const total = items.reduce(
      (sum, item) => sum + item.amount * item.quantity,
      0
    );

    const result: CotizacionWithItems = {
      id: cotizacion.id,
      name: cotizacion.name,
      description: cotizacion.description ?? undefined,
      currency: cotizacion.currency,
      createdAt: cotizacion.created_at,
      updatedAt: cotizacion.updated_at,
      items,
      total,
      itemCount: items.length,
    };

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error fetching cotización:', error);
    return NextResponse.json(
      { error: 'Error al obtener cotización' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/cotizaciones/[id]
 * Update name/description of a cotización.
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    const validation = UpdateCotizacionSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Datos inválidos', details: validation.error.errors },
        { status: 400 }
      );
    }

    const { name, description, currency } = validation.data;

    const [updated] = await sql`
      UPDATE cotizaciones
      SET
        name = COALESCE(${name ?? null}, name),
        description = ${description !== undefined ? description : null},
        currency = COALESCE(${currency ?? null}, currency),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ${id}
      RETURNING id, name, description, currency, created_at, updated_at
    `;

    if (!updated) {
      return NextResponse.json(
        { error: COTIZACION_ERROR_MESSAGES.NOT_FOUND },
        { status: 404 }
      );
    }

    return NextResponse.json({
      id: updated.id,
      name: updated.name,
      description: updated.description ?? undefined,
      currency: updated.currency,
      createdAt: updated.created_at,
      updatedAt: updated.updated_at,
    });
  } catch (error) {
    console.error('Error updating cotización:', error);
    return NextResponse.json(
      { error: 'Error al actualizar cotización' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/cotizaciones/[id]
 * Delete a cotización (cascades to items).
 */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const [deleted] = await sql`
      DELETE FROM cotizaciones WHERE id = ${id} RETURNING id
    `;

    if (!deleted) {
      return NextResponse.json(
        { error: COTIZACION_ERROR_MESSAGES.NOT_FOUND },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting cotización:', error);
    return NextResponse.json(
      { error: 'Error al eliminar cotización' },
      { status: 500 }
    );
  }
}
