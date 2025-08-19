import { type NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const estudioId = parseInt(id);

    if (isNaN(estudioId)) {
      return NextResponse.json(
        { error: "Invalid estudio ID" },
        { status: 400 }
      );
    }

    // Get all groupers with their assignment status, percentage, and payment methods for this estudio
    const groupers = await sql`
      SELECT 
        g.id, 
        g.name,
        CASE WHEN eg.estudio_id IS NOT NULL THEN true ELSE false END as is_assigned,
        eg.percentage,
        COALESCE(eg.payment_methods, NULL) as payment_methods
      FROM groupers g
      LEFT JOIN estudio_groupers eg ON g.id = eg.grouper_id AND eg.estudio_id = ${estudioId}
      ORDER BY g.name
    `;

    // Separate assigned and available groupers
    const assignedGroupers = groupers.filter((g) => g.is_assigned);
    const availableGroupers = groupers.filter((g) => !g.is_assigned);

    return NextResponse.json({
      assignedGroupers,
      availableGroupers,
    });
  } catch (error) {
    const { id } = await params;
    console.error(`Error fetching groupers for estudio ${id}:`, error);
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const estudioId = parseInt(id);

    if (isNaN(estudioId)) {
      return NextResponse.json(
        { error: "ID de estudio inválido" },
        { status: 400 }
      );
    }

    const { grouperIds } = await request.json();

    if (!Array.isArray(grouperIds)) {
      return NextResponse.json(
        { error: "Se requiere un array de IDs de agrupadores" },
        { status: 400 }
      );
    }

    if (grouperIds.length === 0) {
      return NextResponse.json(
        { error: "Debe seleccionar al menos un agrupador" },
        { status: 400 }
      );
    }

    // Validate that all grouperIds are numbers
    const invalidIds = grouperIds.filter(
      (id) => !Number.isInteger(id) || id <= 0
    );
    if (invalidIds.length > 0) {
      return NextResponse.json(
        { error: "Algunos IDs de agrupadores son inválidos" },
        { status: 400 }
      );
    }

    // Verify estudio exists
    const [estudio] = await sql`
      SELECT id FROM estudios WHERE id = ${estudioId}
    `;

    if (!estudio) {
      return NextResponse.json(
        { error: "Estudio no encontrado" },
        { status: 404 }
      );
    }

    // Verify all groupers exist
    const existingGroupers = await sql`
      SELECT id FROM groupers WHERE id = ANY(${grouperIds})
    `;

    if (existingGroupers.length !== grouperIds.length) {
      const existingIds = existingGroupers.map((g) => g.id);
      const missingIds = grouperIds.filter((id) => !existingIds.includes(id));
      return NextResponse.json(
        { error: `Agrupadores no encontrados: ${missingIds.join(", ")}` },
        { status: 404 }
      );
    }

    // Check for existing assignments
    const existingAssignments = await sql`
      SELECT grouper_id FROM estudio_groupers 
      WHERE estudio_id = ${estudioId} AND grouper_id = ANY(${grouperIds})
    `;

    const alreadyAssignedIds = existingAssignments.map((a) => a.grouper_id);
    const newAssignments = grouperIds.filter(
      (id) => !alreadyAssignedIds.includes(id)
    );

    if (newAssignments.length === 0) {
      return NextResponse.json(
        {
          error:
            "Todos los agrupadores seleccionados ya están asignados a este estudio",
          alreadyAssigned: alreadyAssignedIds.length,
        },
        { status: 409 }
      );
    }

    // Insert new grouper assignments
    const insertPromises = newAssignments.map(
      (grouperId) =>
        sql`
        INSERT INTO estudio_groupers (estudio_id, grouper_id)
        VALUES (${estudioId}, ${grouperId})
      `
    );

    await Promise.all(insertPromises);

    return NextResponse.json({
      success: true,
      added: newAssignments.length,
      skipped: alreadyAssignedIds.length,
    });
  } catch (error) {
    const { id } = await params;
    console.error(`Error adding groupers to estudio ${id}:`, error);

    // Handle specific database errors
    if (error instanceof Error) {
      if (error.message.includes("foreign key")) {
        return NextResponse.json(
          { error: "Error de integridad: algunos agrupadores no existen" },
          { status: 409 }
        );
      }
      if (error.message.includes("connection")) {
        return NextResponse.json(
          {
            error:
              "Error de conexión con la base de datos. Intente nuevamente.",
          },
          { status: 503 }
        );
      }
    }

    return NextResponse.json(
      { error: "Error interno del servidor. Intente nuevamente." },
      { status: 500 }
    );
  }
}
