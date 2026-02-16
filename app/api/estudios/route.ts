import { type NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';

export async function GET() {
  try {
    const estudios = await sql`
      SELECT e.id, e.name, e.created_at, e.updated_at, COUNT(eg.grouper_id) AS grouper_count
      FROM estudios e
      LEFT JOIN estudio_groupers eg ON e.id = eg.estudio_id
      GROUP BY e.id, e.name, e.created_at, e.updated_at
      ORDER BY e.name
    `;
    return NextResponse.json(estudios);
  } catch (error) {
    console.error('Error fetching estudios:', error);
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { name } = await request.json();

    if (!name || typeof name !== 'string') {
      return NextResponse.json(
        { error: 'El nombre del estudio es requerido' },
        { status: 400 }
      );
    }

    // Trim whitespace from name
    const trimmedName = name.trim();

    if (trimmedName.length === 0) {
      return NextResponse.json(
        { error: 'El nombre del estudio no puede estar vacío' },
        { status: 400 }
      );
    }

    if (trimmedName.length > 255) {
      return NextResponse.json(
        { error: 'El nombre del estudio no puede exceder 255 caracteres' },
        { status: 400 }
      );
    }

    // Check for duplicate names (optional business rule)
    const existingEstudio = await sql`
      SELECT id FROM estudios WHERE LOWER(name) = LOWER(${trimmedName})
    `;

    if (existingEstudio.length > 0) {
      return NextResponse.json(
        { error: 'Ya existe un estudio con este nombre' },
        { status: 409 }
      );
    }

    const [newEstudio] = await sql`
      INSERT INTO estudios (name)
      VALUES (${trimmedName})
      RETURNING *
    `;

    return NextResponse.json(newEstudio);
  } catch (error) {
    console.error('Error creating estudio:', error);

    // Handle specific database errors
    if (error instanceof Error) {
      if (error.message.includes('duplicate key')) {
        return NextResponse.json(
          { error: 'Ya existe un estudio con este nombre' },
          { status: 409 }
        );
      }
      if (error.message.includes('connection')) {
        return NextResponse.json(
          {
            error:
              'Error de conexión con la base de datos. Intente nuevamente.',
          },
          { status: 503 }
        );
      }
    }

    return NextResponse.json(
      { error: 'Error interno del servidor. Intente nuevamente.' },
      { status: 500 }
    );
  }
}
