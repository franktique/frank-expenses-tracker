import { type NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = params.id;

    // Validate that id is provided
    if (!id) {
      return NextResponse.json(
        {
          error: "Period ID is required",
          code: "MISSING_PERIOD_ID",
        },
        { status: 400 }
      );
    }

    // Validate that id is a valid UUID format
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(id)) {
      return NextResponse.json(
        {
          error: "Invalid period ID format",
          code: "INVALID_PERIOD_ID",
        },
        { status: 400 }
      );
    }

    // First check if the period exists and is currently open
    const [existingPeriod] = await sql`
      SELECT id, name, is_open
      FROM periods
      WHERE id = ${id}
    `;

    if (!existingPeriod) {
      return NextResponse.json(
        {
          error: "Period not found",
          code: "PERIOD_NOT_FOUND",
        },
        { status: 404 }
      );
    }

    if (!existingPeriod.is_open) {
      return NextResponse.json(
        {
          error: "Period is already inactive",
          code: "PERIOD_ALREADY_INACTIVE",
          period: existingPeriod,
        },
        { status: 409 }
      );
    }

    // Close the specified period
    const [closedPeriod] = await sql`
      UPDATE periods
      SET is_open = false
      WHERE id = ${id}
      RETURNING *
    `;

    // This should not happen given our previous checks, but handle it just in case
    if (!closedPeriod) {
      return NextResponse.json(
        {
          error:
            "Failed to close period - period may have been modified by another operation",
          code: "CONCURRENT_MODIFICATION",
        },
        { status: 409 }
      );
    }

    return NextResponse.json({
      success: true,
      period: closedPeriod,
      message: "Period closed successfully",
    });
  } catch (error) {
    console.error("Error closing period:", error);

    // Handle specific database errors
    if (error instanceof Error) {
      // Connection errors
      if (
        error.message.includes("connection") ||
        error.message.includes("ECONNREFUSED")
      ) {
        return NextResponse.json(
          {
            error: "Database connection failed. Please try again.",
            code: "DATABASE_CONNECTION_ERROR",
          },
          { status: 503 }
        );
      }

      // Timeout errors
      if (error.message.includes("timeout")) {
        return NextResponse.json(
          {
            error: "Operation timed out. Please try again.",
            code: "DATABASE_TIMEOUT",
          },
          { status: 504 }
        );
      }

      // Constraint violations or other database errors
      if (
        error.message.includes("constraint") ||
        error.message.includes("violates")
      ) {
        return NextResponse.json(
          {
            error:
              "Database constraint violation. Please refresh and try again.",
            code: "DATABASE_CONSTRAINT_ERROR",
          },
          { status: 409 }
        );
      }
    }

    // Generic server error
    return NextResponse.json(
      {
        error: "Internal server error occurred while closing period",
        code: "INTERNAL_SERVER_ERROR",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
