import { type NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import {
  CreateCotizacionItemSchema,
  COTIZACION_ERROR_MESSAGES,
  type CotizacionItem,
} from '@/types/cotizaciones';

/**
 * GET /api/cotizaciones/[id]/items
 * List items for a cotización.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const rows = await sql`
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

    const items: CotizacionItem[] = rows.map((r: any) => ({
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

    return NextResponse.json({ items });
  } catch (error) {
    console.error('Error fetching cotización items:', error);
    return NextResponse.json(
      { error: 'Error al obtener ítems' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/cotizaciones/[id]/items
 * Add an item to a cotización.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    const validation = CreateCotizacionItemSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Datos inválidos', details: validation.error.errors },
        { status: 400 }
      );
    }

    const { categoryId, amount, quantity, notes } = validation.data;

    // Verify cotización exists
    const [cotizacion] = await sql`
      SELECT id FROM cotizaciones WHERE id = ${id}
    `;
    if (!cotizacion) {
      return NextResponse.json(
        { error: COTIZACION_ERROR_MESSAGES.NOT_FOUND },
        { status: 404 }
      );
    }

    // Verify category exists
    const [category] = await sql`
      SELECT id, name FROM categories WHERE id = ${categoryId}
    `;
    if (!category) {
      return NextResponse.json(
        { error: 'La categoría no existe' },
        { status: 404 }
      );
    }

    // Get next display_order
    const [orderRow] = await sql`
      SELECT COALESCE(MAX(display_order), -1) + 1 AS next_order
      FROM cotizacion_items
      WHERE cotizacion_id = ${id}
    `;

    const [row] = await sql`
      INSERT INTO cotizacion_items (cotizacion_id, category_id, amount, quantity, notes, display_order)
      VALUES (${id}, ${categoryId}, ${amount}, ${quantity}, ${notes ?? null}, ${orderRow.next_order})
      RETURNING id, cotizacion_id, category_id, amount, quantity, notes, display_order, created_at, updated_at
    `;

    const item: CotizacionItem = {
      id: row.id,
      cotizacionId: row.cotizacion_id,
      categoryId: row.category_id,
      categoryName: category.name,
      amount: parseFloat(row.amount),
      quantity: row.quantity,
      notes: row.notes ?? undefined,
      displayOrder: row.display_order,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };

    // Update cotización updated_at
    await sql`
      UPDATE cotizaciones SET updated_at = CURRENT_TIMESTAMP WHERE id = ${id}
    `;

    return NextResponse.json(item, { status: 201 });
  } catch (error) {
    console.error('Error adding cotización item:', error);
    return NextResponse.json(
      { error: 'Error al agregar ítem' },
      { status: 500 }
    );
  }
}
