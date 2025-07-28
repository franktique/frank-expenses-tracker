import { type NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; grouperId: string }> }
) {
  try {
    const { id, grouperId } = await params;
    const estudioId = parseInt(id);
    const grouperIdInt = parseInt(grouperId);

    if (isNaN(estudioId) || isNaN(grouperIdInt)) {
      return NextResponse.json(
        { error: "ID de estudio o agrupador inválido" },
        { status: 400 }
      );
    }

    if (estudioId <= 0 || grouperIdInt <= 0) {
      return NextResponse.json(
        { error: "Los IDs deben ser números positivos" },
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

    // Verify grouper exists
    const [grouper] = await sql`
      SELECT id, name FROM groupers WHERE id = ${grouperIdInt}
    `;

    if (!grouper) {
      return NextResponse.json(
        { error: "Agrupador no encontrado" },
        { status: 404 }
      );
    }

    // Check if the assignment exists
    const [existingAssignment] = await sql`
      SELECT * FROM estudio_groupers
      WHERE estudio_id = ${estudioId} AND grouper_id = ${grouperIdInt}
    `;

    if (!existingAssignment) {
      return NextResponse.json(
        { error: "El agrupador no está asignado a este estudio" },
        { status: 404 }
      );
    }

    // Remove the grouper from the estudio
    const [deletedRelation] = await sql`
      DELETE FROM estudio_groupers
      WHERE estudio_id = ${estudioId} AND grouper_id = ${grouperIdInt}
      RETURNING *
    `;

    if (!deletedRelation) {
      return NextResponse.json(
        { error: "Error al remover el agrupador del estudio" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      removedGrouper: {
        id: grouperIdInt,
        name: grouper.name,
      },
    });
  } catch (error) {
    console.error(
      `Error removing grouper ${grouperId} from estudio ${id}:`,
      error
    );

    // Handle specific database errors
    if (error instanceof Error) {
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
