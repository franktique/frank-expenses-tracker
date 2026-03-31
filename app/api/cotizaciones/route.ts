import { type NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import {
  CreateCotizacionSchema,
  COTIZACION_ERROR_MESSAGES,
  type CotizacionListItem,
} from '@/types/cotizaciones';

/**
 * GET /api/cotizaciones
 * List all cotizaciones with item count and total.
 */
export async function GET() {
  try {
    const rows = await sql`
      SELECT
        c.id,
        c.name,
        c.description,
        c.currency,
        c.created_at,
        c.updated_at,
        COUNT(ci.id)::int AS item_count,
        COALESCE(SUM(ci.amount * ci.quantity), 0)::numeric AS total
      FROM cotizaciones c
      LEFT JOIN cotizacion_items ci ON ci.cotizacion_id = c.id
      GROUP BY c.id
      ORDER BY c.updated_at DESC
    `;

    const cotizaciones: CotizacionListItem[] = rows.map((r: any) => ({
      id: r.id,
      name: r.name,
      description: r.description ?? undefined,
      currency: r.currency,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
      itemCount: r.item_count,
      total: parseFloat(r.total),
    }));

    return NextResponse.json({ cotizaciones, totalCount: cotizaciones.length });
  } catch (error) {
    if (
      error instanceof Error &&
      error.message.includes('relation "cotizaciones" does not exist')
    ) {
      return NextResponse.json(
        {
          error: COTIZACION_ERROR_MESSAGES.TABLES_NOT_FOUND,
          code: 'TABLES_NOT_FOUND',
          migrationEndpoint: '/api/migrate-cotizaciones',
        },
        { status: 404 }
      );
    }
    console.error('Error fetching cotizaciones:', error);
    return NextResponse.json(
      { error: 'Error al obtener cotizaciones' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/cotizaciones
 * Create a new cotización.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validation = CreateCotizacionSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Datos inválidos', details: validation.error.errors },
        { status: 400 }
      );
    }

    const { name, description, currency } = validation.data;

    const [row] = await sql`
      INSERT INTO cotizaciones (name, description, currency)
      VALUES (${name.trim()}, ${description ?? null}, ${currency})
      RETURNING id, name, description, currency, created_at, updated_at
    `;

    return NextResponse.json(
      {
        id: row.id,
        name: row.name,
        description: row.description ?? undefined,
        currency: row.currency,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating cotización:', error);
    return NextResponse.json(
      { error: 'Error al crear cotización' },
      { status: 500 }
    );
  }
}
