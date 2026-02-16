import { type NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const grouperId = parseInt(params.id);

    if (isNaN(grouperId)) {
      return NextResponse.json(
        { error: 'Invalid grouper ID' },
        { status: 400 }
      );
    }

    // Get categories assigned to this grouper
    const assignedCategories = await sql`
      SELECT c.id, c.name
      FROM categories c
      JOIN grouper_categories gc ON c.id = gc.category_id
      WHERE gc.grouper_id = ${grouperId}
      ORDER BY c.name
    `;

    return NextResponse.json(assignedCategories);
  } catch (error) {
    console.error(`Error fetching categories for grouper ${params.id}:`, error);
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const grouperId = parseInt(params.id);

    if (isNaN(grouperId)) {
      return NextResponse.json(
        { error: 'Invalid grouper ID' },
        { status: 400 }
      );
    }

    const body = await request.json();

    // Support both single categoryId (backward compatibility) and batch categoryIds
    let categoryIds: string[];

    if (body.categoryId && typeof body.categoryId === 'string') {
      // Backward compatibility: single category
      categoryIds = [body.categoryId];
    } else if (body.categoryIds && Array.isArray(body.categoryIds)) {
      // New batch functionality: multiple categories
      categoryIds = body.categoryIds;
    } else {
      return NextResponse.json(
        {
          error:
            'Valid categoryId (UUID string) or categoryIds (array of UUID strings) is required',
        },
        { status: 400 }
      );
    }

    // Validate all category IDs
    if (categoryIds.length === 0) {
      return NextResponse.json(
        { error: 'At least one category ID is required' },
        { status: 400 }
      );
    }

    for (const categoryId of categoryIds) {
      if (
        !categoryId ||
        typeof categoryId !== 'string' ||
        categoryId.trim() === ''
      ) {
        return NextResponse.json(
          {
            error: 'All category IDs must be valid UUID strings',
          },
          { status: 400 }
        );
      }
    }

    // Initialize response counters
    let added = 0;
    let skipped = 0;
    const errors: string[] = [];
    const addedCategories: any[] = [];

    // Process each category in a transaction-like manner with enhanced error handling
    for (const categoryId of categoryIds) {
      try {
        // Validate UUID format
        const uuidRegex =
          /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
        if (!uuidRegex.test(categoryId)) {
          errors.push(
            `ID de categoría inválido: ${categoryId} no es un UUID válido`
          );
          continue;
        }

        // Check if relationship already exists
        const [existingRelation] = await sql`
          SELECT * FROM grouper_categories
          WHERE grouper_id = ${grouperId} AND category_id = ${categoryId}
        `;

        if (existingRelation) {
          skipped++;
          continue;
        }

        // Verify category exists and get its details
        const [categoryExists] = await sql`
          SELECT id, name FROM categories WHERE id = ${categoryId}
        `;

        if (!categoryExists) {
          errors.push(
            `La categoría con ID ${categoryId} no existe en el sistema`
          );
          continue;
        }

        // Verify grouper exists
        const [grouperExists] = await sql`
          SELECT id, name FROM groupers WHERE id = ${grouperId}
        `;

        if (!grouperExists) {
          errors.push(`El agrupador con ID ${grouperId} no existe`);
          continue;
        }

        // Add the category to the grouper
        const [newRelation] = await sql`
          INSERT INTO grouper_categories (grouper_id, category_id)
          VALUES (${grouperId}, ${categoryId})
          RETURNING *
        `;

        if (newRelation) {
          added++;
          addedCategories.push({
            id: categoryExists.id,
            name: categoryExists.name,
            grouper_id: grouperId,
            category_id: categoryId,
          });
        } else {
          errors.push(
            `No se pudo crear la relación para la categoría: ${categoryExists.name}`
          );
        }
      } catch (categoryError) {
        const errorMessage = (categoryError as Error).message;

        // Provide more specific error messages based on common database errors
        if (errorMessage.includes('duplicate key')) {
          errors.push(
            `La categoría ${categoryId} ya está asignada a este agrupador`
          );
        } else if (errorMessage.includes('foreign key')) {
          errors.push(`Referencia inválida para la categoría ${categoryId}`);
        } else if (errorMessage.includes('connection')) {
          errors.push(
            `Error de conexión a la base de datos para la categoría ${categoryId}`
          );
        } else {
          errors.push(
            `Error al procesar la categoría ${categoryId}: ${errorMessage}`
          );
        }
      }
    }

    // For backward compatibility, return single relation format if only one category was processed
    if (body.categoryId && categoryIds.length === 1) {
      if (added === 1) {
        return NextResponse.json(addedCategories[0]);
      } else if (skipped === 1) {
        return NextResponse.json(
          { error: 'Category is already assigned to this grouper' },
          { status: 400 }
        );
      } else if (errors.length > 0) {
        return NextResponse.json({ error: errors[0] }, { status: 400 });
      }
    }

    // Return batch response format
    const response = {
      added,
      skipped,
      errors,
      addedCategories,
    };

    // If there were any errors but some succeeded, return 207 Multi-Status
    if (errors.length > 0 && added > 0) {
      return NextResponse.json(response, { status: 207 });
    }

    // If all failed, return 400
    if (errors.length > 0 && added === 0 && skipped === 0) {
      return NextResponse.json(response, { status: 400 });
    }

    // Success case
    return NextResponse.json(response);
  } catch (error) {
    console.error(`Error adding categories to grouper ${params.id}:`, error);
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const grouperId = parseInt(params.id);
    const url = new URL(request.url);
    const categoryId = url.searchParams.get('categoryId');

    if (isNaN(grouperId)) {
      return NextResponse.json(
        { error: 'ID de agrupador inválido. Debe ser un número.' },
        { status: 400 }
      );
    }

    if (
      !categoryId ||
      typeof categoryId !== 'string' ||
      categoryId.trim() === ''
    ) {
      return NextResponse.json(
        { error: 'ID de categoría requerido. Debe ser un UUID válido.' },
        { status: 400 }
      );
    }

    // Validate UUID format
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(categoryId)) {
      return NextResponse.json(
        {
          error: `ID de categoría inválido: ${categoryId} no es un UUID válido`,
        },
        { status: 400 }
      );
    }

    // Verify that both grouper and category exist before attempting deletion
    const [grouperExists] = await sql`
      SELECT id, name FROM groupers WHERE id = ${grouperId}
    `;

    if (!grouperExists) {
      return NextResponse.json(
        { error: `El agrupador con ID ${grouperId} no existe` },
        { status: 404 }
      );
    }

    const [categoryExists] = await sql`
      SELECT id, name FROM categories WHERE id = ${categoryId}
    `;

    if (!categoryExists) {
      return NextResponse.json(
        { error: `La categoría con ID ${categoryId} no existe` },
        { status: 404 }
      );
    }

    // Check if the relationship exists before deletion
    const [relationExists] = await sql`
      SELECT * FROM grouper_categories
      WHERE grouper_id = ${grouperId} AND category_id = ${categoryId}
    `;

    if (!relationExists) {
      return NextResponse.json(
        {
          error: `La categoría "${categoryExists.name}" no está asignada al agrupador "${grouperExists.name}"`,
        },
        { status: 404 }
      );
    }

    // Remove the category from the grouper
    const result = await sql`
      DELETE FROM grouper_categories
      WHERE grouper_id = ${grouperId} AND category_id = ${categoryId}
    `;

    // Verify deletion was successful
    if (!result || result.count === 0) {
      return NextResponse.json(
        { error: 'No se pudo eliminar la relación. Intente nuevamente.' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `Categoría "${categoryExists.name}" eliminada exitosamente del agrupador "${grouperExists.name}"`,
    });
  } catch (error) {
    console.error(`Error removing category from grouper ${params.id}:`, error);

    const errorMessage = (error as Error).message;
    let userFriendlyMessage = 'Error interno del servidor';

    // Provide more specific error messages based on common database errors
    if (errorMessage.includes('connection')) {
      userFriendlyMessage =
        'Error de conexión a la base de datos. Intente nuevamente.';
    } else if (errorMessage.includes('timeout')) {
      userFriendlyMessage = 'La operación tardó demasiado. Intente nuevamente.';
    } else if (errorMessage.includes('constraint')) {
      userFriendlyMessage =
        'Error de integridad de datos. Verifique que la relación sea válida.';
    }

    return NextResponse.json({ error: userFriendlyMessage }, { status: 500 });
  }
}
