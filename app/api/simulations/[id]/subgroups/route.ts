/**
 * Sub-Groups API Routes
 * GET: Fetch all sub-groups for a simulation
 * POST: Create a new sub-group
 */

import { NextRequest, NextResponse } from "next/server";
import {
  getSubgroupsBySimulation,
  createSubgroup,
  ensureSubgroupTablesExist,
} from "@/lib/subgroup-db-utils";
import type {
  CreateSubgroupRequest,
  SubgroupsListResponse,
  SubgroupResponse,
} from "@/types/simulation";

/**
 * GET /api/simulations/[id]/subgroups
 * Fetch all sub-groups for a specific simulation
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse<SubgroupsListResponse>> {
  try {
    const simulationId = parseInt(params.id, 10);

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

    // Ensure tables exist before querying
    await ensureSubgroupTablesExist();

    const subgroups = await getSubgroupsBySimulation(simulationId);

    return NextResponse.json(
      {
        success: true,
        subgroups,
        statusCode: 200,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error fetching sub-groups:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Failed to fetch sub-groups";

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
 * POST /api/simulations/[id]/subgroups
 * Create a new sub-group
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse<SubgroupResponse>> {
  try {
    const simulationId = parseInt(params.id, 10);

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

    // Parse request body
    let requestBody: CreateSubgroupRequest;
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

    // Validate request body
    if (!requestBody.name || typeof requestBody.name !== "string") {
      return NextResponse.json(
        {
          success: false,
          error: "Sub-group name is required and must be a string",
          statusCode: 400,
        },
        { status: 400 }
      );
    }

    if (!Array.isArray(requestBody.categoryIds)) {
      return NextResponse.json(
        {
          success: false,
          error: "categoryIds must be an array",
          statusCode: 400,
        },
        { status: 400 }
      );
    }

    if (requestBody.categoryIds.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: "Sub-group must contain at least one category",
          statusCode: 400,
        },
        { status: 400 }
      );
    }

    // Ensure tables exist
    await ensureSubgroupTablesExist();

    // Create sub-group
    const newSubgroup = await createSubgroup(simulationId, requestBody);

    return NextResponse.json(
      {
        success: true,
        data: newSubgroup,
        statusCode: 201,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating sub-group:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Failed to create sub-group";

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
