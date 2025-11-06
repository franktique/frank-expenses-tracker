/**
 * Individual Sub-Group API Routes
 * PATCH: Update a sub-group
 * DELETE: Delete a sub-group
 */

import { NextRequest, NextResponse } from "next/server";
import {
  updateSubgroup,
  deleteSubgroup,
  ensureSubgroupTablesExist,
} from "@/lib/subgroup-db-utils";
import type {
  UpdateSubgroupRequest,
  SubgroupResponse,
  DeleteSubgroupResponse,
} from "@/types/simulation";

/**
 * PATCH /api/simulations/[id]/subgroups/[subgroupId]
 * Update a sub-group
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; subgroupId: string }> }
): Promise<NextResponse<SubgroupResponse>> {
  try {
    const { id, subgroupId } = await params;
    const simulationId = parseInt(id, 10);

    if (isNaN(simulationId)) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid simulation ID",
          statusCode: 400,
        },
        { status: 400 }
      );
    }

    if (!subgroupId) {
      return NextResponse.json(
        {
          success: false,
          error: "Sub-group ID is required",
          statusCode: 400,
        },
        { status: 400 }
      );
    }

    // Parse request body
    let requestBody: UpdateSubgroupRequest;
    try {
      requestBody = await request.json();
    } catch (parseError) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid request body",
          statusCode: 400,
        },
        { status: 400 }
      );
    }

    // Ensure tables exist
    await ensureSubgroupTablesExist();

    // Update sub-group
    const updatedSubgroup = await updateSubgroup(
      simulationId,
      subgroupId,
      requestBody
    );

    return NextResponse.json(
      {
        success: true,
        data: updatedSubgroup,
        statusCode: 200,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error updating sub-group:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Failed to update sub-group";

    // Check if sub-group not found
    if (errorMessage.includes("not found")) {
      return NextResponse.json(
        {
          success: false,
          error: errorMessage,
          statusCode: 404,
        },
        { status: 404 }
      );
    }

    // Check if it's a duplicate name error
    if (errorMessage.includes("already exists")) {
      return NextResponse.json(
        {
          success: false,
          error: errorMessage,
          statusCode: 409,
        },
        { status: 409 }
      );
    }

    // Check if it's a validation error
    if (
      errorMessage.includes("cannot be empty") ||
      errorMessage.includes("must contain")
    ) {
      return NextResponse.json(
        {
          success: false,
          error: errorMessage,
          statusCode: 400,
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: errorMessage,
        statusCode: 500,
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/simulations/[id]/subgroups/[subgroupId]
 * Delete a sub-group
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; subgroupId: string }> }
): Promise<NextResponse<DeleteSubgroupResponse>> {
  try {
    const { id, subgroupId } = await params;
    const simulationId = parseInt(id, 10);

    if (isNaN(simulationId)) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid simulation ID",
          statusCode: 400,
        },
        { status: 400 }
      );
    }

    if (!subgroupId) {
      return NextResponse.json(
        {
          success: false,
          error: "Sub-group ID is required",
          statusCode: 400,
        },
        { status: 400 }
      );
    }

    // Ensure tables exist
    await ensureSubgroupTablesExist();

    // Delete sub-group
    await deleteSubgroup(simulationId, subgroupId);

    return NextResponse.json(
      {
        success: true,
        message: "Sub-group deleted successfully",
        statusCode: 200,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error deleting sub-group:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Failed to delete sub-group";

    // Check if sub-group not found
    if (errorMessage.includes("not found")) {
      return NextResponse.json(
        {
          success: false,
          error: errorMessage,
          statusCode: 404,
        },
        { status: 404 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: errorMessage,
        statusCode: 500,
      },
      { status: 500 }
    );
  }
}
