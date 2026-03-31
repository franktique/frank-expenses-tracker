import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';

/**
 * POST /api/migrate-cotizaciones
 * Creates cotizaciones and cotizacion_items tables. Idempotent.
 */
export async function POST() {
  try {
    const existing = await sql`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      AND table_name IN ('cotizaciones', 'cotizacion_items')
    `;

    const tableNames = existing.map((t: any) => t.table_name);
    const cotizacionesExists = tableNames.includes('cotizaciones');
    const itemsExists = tableNames.includes('cotizacion_items');

    if (!cotizacionesExists) {
      await sql`
        CREATE TABLE cotizaciones (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          name VARCHAR(255) NOT NULL,
          description TEXT,
          currency VARCHAR(3) NOT NULL DEFAULT 'COP',
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        )
      `;
    }

    if (!itemsExists) {
      await sql`
        CREATE TABLE cotizacion_items (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          cotizacion_id UUID NOT NULL REFERENCES cotizaciones(id) ON DELETE CASCADE,
          category_id UUID NOT NULL REFERENCES categories(id),
          amount DECIMAL(15, 2) NOT NULL DEFAULT 0,
          quantity INTEGER NOT NULL DEFAULT 1,
          notes TEXT,
          display_order INTEGER NOT NULL DEFAULT 0,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        )
      `;

      await sql`
        CREATE INDEX idx_cotizacion_items_cotizacion
        ON cotizacion_items(cotizacion_id)
      `;
    }

    const verification = await sql`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      AND table_name IN ('cotizaciones', 'cotizacion_items')
      ORDER BY table_name
    `;

    return NextResponse.json({
      success: true,
      message: 'Migración de cotizaciones completada',
      tables: verification.map((t: any) => t.table_name),
      created: {
        cotizaciones: !cotizacionesExists,
        cotizacion_items: !itemsExists,
      },
    });
  } catch (error) {
    if (
      error instanceof Error &&
      (error.message.includes('already exists') ||
        error.message.includes('duplicate key'))
    ) {
      return NextResponse.json({
        success: true,
        message: 'Las tablas ya existen',
      });
    }

    console.error('Error en migración de cotizaciones:', error);
    return NextResponse.json(
      {
        error: 'Error interno durante la migración',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const tables = await sql`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      AND table_name IN ('cotizaciones', 'cotizacion_items')
      ORDER BY table_name
    `;

    const existingTables = tables.map((t: any) => t.table_name);
    return NextResponse.json({
      success: true,
      tables: existingTables,
      status:
        existingTables.length === 2
          ? 'fully_migrated'
          : existingTables.length === 0
            ? 'not_migrated'
            : 'partially_migrated',
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Error al verificar estado de migración' },
      { status: 500 }
    );
  }
}
