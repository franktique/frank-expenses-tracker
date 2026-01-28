import { type NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; grouperId: string }> }
) {
  try {
    const { id, grouperId } = await params;
    const estudioId = parseInt(id);
    const grouperIdNum = parseInt(grouperId);

    if (isNaN(estudioId) || isNaN(grouperIdNum)) {
      return NextResponse.json(
        { error: "IDs de estudio y agrupador inválidos" },
        { status: 400 }
      );
    }

    const { percentage, payment_methods } = await request.json();

    // Validate percentage value
    if (percentage !== null && percentage !== undefined) {
      if (
        typeof percentage !== "number" ||
        percentage < 0 ||
        percentage > 100
      ) {
        return NextResponse.json(
          { error: "El porcentaje debe ser un número entre 0 y 100" },
          { status: 400 }
        );
      }
    }

    // Enhanced payment methods validation
    if (payment_methods !== null && payment_methods !== undefined) {
      // Type validation
      if (!Array.isArray(payment_methods)) {
        return NextResponse.json(
          {
            error: "Los métodos de pago deben ser un array",
            code: "INVALID_TYPE",
            details: {
              received: typeof payment_methods,
              expected: "array",
            },
          },
          { status: 400 }
        );
      }

      // Empty array validation (not allowed, use null for "all methods")
      if (payment_methods.length === 0) {
        return NextResponse.json(
          {
            error:
              "El array de métodos de pago no puede estar vacío. Use null para incluir todos los métodos",
            code: "EMPTY_ARRAY",
            suggestion:
              "Para incluir todos los métodos de pago, envíe null en lugar de un array vacío",
          },
          { status: 400 }
        );
      }

      // Validate individual payment method values
      const validMethods = ["cash", "credit", "debit"];
      const invalidMethods = payment_methods.filter(
        (method) => typeof method !== "string" || !validMethods.includes(method)
      );

      if (invalidMethods.length > 0) {
        return NextResponse.json(
          {
            error: `Métodos de pago inválidos encontrados`,
            code: "INVALID_METHODS",
            details: {
              invalidMethods: invalidMethods,
              validMethods: validMethods,
              message: `Los siguientes valores no son válidos: ${invalidMethods.join(
                ", "
              )}`,
            },
          },
          { status: 400 }
        );
      }

      // Check for duplicates
      const uniqueMethods = [...new Set(payment_methods)];
      if (uniqueMethods.length !== payment_methods.length) {
        const duplicates = payment_methods.filter(
          (method, index) => payment_methods.indexOf(method) !== index
        );

        return NextResponse.json(
          {
            error: "No se permiten métodos de pago duplicados",
            code: "DUPLICATE_METHODS",
            details: {
              duplicates: [...new Set(duplicates)],
              suggestion: "Elimine los métodos duplicados de la selección",
            },
          },
          { status: 400 }
        );
      }

      // Validate array length (should not exceed valid methods count)
      if (payment_methods.length > validMethods.length) {
        return NextResponse.json(
          {
            error: "Demasiados métodos de pago especificados",
            code: "TOO_MANY_METHODS",
            details: {
              received: payment_methods.length,
              maximum: validMethods.length,
              suggestion:
                "Verifique que no haya métodos duplicados o inválidos",
            },
          },
          { status: 400 }
        );
      }
    }

    // Verify the estudio-grouper relationship exists
    const [existing] = await sql`
      SELECT id FROM estudio_groupers 
      WHERE estudio_id = ${estudioId} AND grouper_id = ${grouperIdNum}
    `;

    if (!existing) {
      return NextResponse.json(
        { error: "La relación estudio-agrupador no existe" },
        { status: 404 }
      );
    }

    // Update the percentage and payment methods
    await sql`
      UPDATE estudio_groupers 
      SET 
        percentage = ${percentage},
        payment_methods = ${payment_methods}
      WHERE estudio_id = ${estudioId} AND grouper_id = ${grouperIdNum}
    `;

    // Get the updated grouper info
    const [updatedGrouper] = await sql`
      SELECT g.id, g.name, eg.percentage, eg.payment_methods
      FROM groupers g
      JOIN estudio_groupers eg ON g.id = eg.grouper_id
      WHERE eg.estudio_id = ${estudioId} AND eg.grouper_id = ${grouperIdNum}
    `;

    // Build response message
    let message = "";
    if (
      percentage !== null &&
      percentage !== undefined &&
      payment_methods !== null &&
      payment_methods !== undefined
    ) {
      message = `Porcentaje actualizado a ${percentage}% y métodos de pago configurados`;
    } else if (percentage !== null && percentage !== undefined) {
      message = `Porcentaje actualizado a ${percentage}%`;
    } else if (payment_methods !== null && payment_methods !== undefined) {
      message = "Métodos de pago configurados";
    } else {
      message =
        percentage === null
          ? "Porcentaje removido"
          : "Métodos de pago removidos";
    }

    return NextResponse.json({
      success: true,
      grouper: updatedGrouper,
      message,
    });
  } catch (error) {
    console.error(
      `Error updating grouper percentage and payment methods:`,
      error
    );

    // Enhanced error handling with specific error types
    if (error instanceof Error) {
      // Database connection errors
      if (
        error.message.includes("connection") ||
        error.message.includes("ECONNREFUSED")
      ) {
        return NextResponse.json(
          {
            error: "Error de conexión con la base de datos",
            code: "DATABASE_CONNECTION_ERROR",
            details:
              "No se pudo conectar con la base de datos. Intente nuevamente en unos momentos.",
            retryable: true,
          },
          { status: 503 }
        );
      }

      // Database constraint violations
      if (
        error.message.includes("constraint") ||
        error.message.includes("violates")
      ) {
        return NextResponse.json(
          {
            error: "Error de validación en la base de datos",
            code: "DATABASE_CONSTRAINT_ERROR",
            details:
              "Los datos no cumplen con las restricciones de la base de datos. Verifique los valores enviados.",
            retryable: false,
          },
          { status: 400 }
        );
      }

      // Timeout errors
      if (error.message.includes("timeout")) {
        return NextResponse.json(
          {
            error: "Tiempo de espera agotado",
            code: "TIMEOUT_ERROR",
            details: "La operación tardó demasiado tiempo. Intente nuevamente.",
            retryable: true,
          },
          { status: 408 }
        );
      }
    }

    // Generic server error
    return NextResponse.json(
      {
        error: "Error interno del servidor",
        code: "INTERNAL_SERVER_ERROR",
        details:
          "Ocurrió un error inesperado. Si el problema persiste, contacte al administrador.",
        retryable: true,
      },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; grouperId: string }> }
) {
  let id = "";
  let grouperId = "";
  try {
    const p = await params;
    id = p.id;
    grouperId = p.grouperId;
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
