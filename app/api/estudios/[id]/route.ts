import { type NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  let id = '';
  try {
    const p = await params;
    id = p.id;
    const estudioId = parseInt(id);

    if (isNaN(estudioId)) {
      return NextResponse.json(
        { error: 'Invalid estudio ID' },
        { status: 400 }
      );
    }

    // Get estudio details
    const [estudio] = await sql`
      SELECT * FROM estudios WHERE id = ${estudioId}
    `;

    if (!estudio) {
      return NextResponse.json({ error: 'Estudio not found' }, { status: 404 });
    }

    // Get groupers assigned to this estudio
    const assignedGroupers = await sql`
      SELECT g.id, g.name
      FROM groupers g
      JOIN estudio_groupers eg ON g.id = eg.grouper_id
      WHERE eg.estudio_id = ${estudioId}
      ORDER BY g.name
    `;

    return NextResponse.json({
      ...estudio,
      assignedGroupers,
    });
  } catch (error) {
    console.error(`Error fetching estudio ${id}:`, error);
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
  let id = '';
  try {
    const p = await params;
    id = p.id;
    const estudioId = parseInt(id);

    if (isNaN(estudioId)) {
      return NextResponse.json(
        { error: 'ID de estudio inválido' },
        { status: 400 }
      );
    }

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

    // Check if estudio exists first
    const [existingEstudio] = await sql`
      SELECT id FROM estudios WHERE id = ${estudioId}
    `;

    if (!existingEstudio) {
      return NextResponse.json(
        { error: 'Estudio no encontrado' },
        { status: 404 }
      );
    }

    // Check for duplicate names (excluding current estudio)
    const duplicateEstudio = await sql`
      SELECT id FROM estudios 
      WHERE LOWER(name) = LOWER(${trimmedName}) AND id != ${estudioId}
    `;

    if (duplicateEstudio.length > 0) {
      return NextResponse.json(
        { error: 'Ya existe otro estudio con este nombre' },
        { status: 409 }
      );
    }

    const [updatedEstudio] = await sql`
      UPDATE estudios
      SET name = ${trimmedName}, updated_at = CURRENT_TIMESTAMP
      WHERE id = ${estudioId}
      RETURNING *
    `;

    if (!updatedEstudio) {
      return NextResponse.json(
        { error: 'Error al actualizar el estudio' },
        { status: 500 }
      );
    }

    return NextResponse.json(updatedEstudio);
  } catch (error) {
    console.error(`Error updating estudio ${id}:`, error);

    // Handle specific database errors
    if (error instanceof Error) {
      if (error.message.includes('duplicate key')) {
        return NextResponse.json(
          { error: 'Ya existe otro estudio con este nombre' },
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

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  let id = '';
  try {
    const p = await params;
    id = p.id;
    const estudioId = parseInt(id);

    if (isNaN(estudioId)) {
      return NextResponse.json(
        { error: 'ID de estudio inválido' },
        { status: 400 }
      );
    }

    // Check if estudio exists first
    const [existingEstudio] = await sql`
      SELECT id, name FROM estudios WHERE id = ${estudioId}
    `;

    if (!existingEstudio) {
      return NextResponse.json(
        { error: 'Estudio no encontrado' },
        { status: 404 }
      );
    }

    // Check if this is the last estudio
    const totalEstudios = await sql`
      SELECT COUNT(*) as count FROM estudios
    `;

    if (parseInt(totalEstudios[0].count) === 1) {
      return NextResponse.json(
        {
          error:
            'No se puede eliminar el último estudio. Debe existir al menos un estudio para usar el dashboard.',
          code: 'LAST_ESTUDIO',
        },
        { status: 409 }
      );
    }

    // Get grouper count for informational purposes
    const grouperCount = await sql`
      SELECT COUNT(*) as count FROM estudio_groupers WHERE estudio_id = ${estudioId}
    `;

    // Delete the estudio (cascade will remove associations)
    const [deletedEstudio] = await sql`
      DELETE FROM estudios
      WHERE id = ${estudioId}
      RETURNING *
    `;

    if (!deletedEstudio) {
      return NextResponse.json(
        { error: 'Error al eliminar el estudio' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      deletedEstudio,
      grouperCount: parseInt(grouperCount[0].count),
    });
  } catch (error) {
    console.error(`Error deleting estudio ${id}:`, error);

    // Handle specific database errors
    if (error instanceof Error) {
      if (error.message.includes('foreign key')) {
        return NextResponse.json(
          {
            error:
              'No se puede eliminar el estudio porque tiene dependencias activas',
          },
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
