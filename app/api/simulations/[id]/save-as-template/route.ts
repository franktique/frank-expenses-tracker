/**
 * Save As Template API Route
 * POST: Convert current simulation subgroups to a new template
 */

import { NextRequest, NextResponse } from "next/server";
import { getSubgroupsBySimulation } from "@/lib/subgroup-db-utils";
import { createTemplate } from "@/lib/subgroup-template-db-utils";
import type {
  SaveAsTemplateRequest,
  TemplateResponse,
} from "@/types/subgroup-templates";

/**
 * POST /api/simulations/[id]/save-as-template
 * Save the current simulation's subgroups as a new template
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse<TemplateResponse>> {
  try {
    const { id } = await params;
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

    // Parse request body
    let requestBody: SaveAsTemplateRequest;
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
          error: "Template name is required and must be a string",
          statusCode: 400,
        },
        { status: 400 }
      );
    }

    // Get existing subgroups from simulation
    const existingSubgroups = await getSubgroupsBySimulation(simulationId);

    if (existingSubgroups.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: "Simulation has no subgroups to save as template",
          statusCode: 400,
        },
        { status: 400 }
      );
    }

    // Convert simulation subgroups to template format
    const templateSubgroups = existingSubgroups.map((subgroup, index) => ({
      name: subgroup.name,
      displayOrder: subgroup.customOrder !== null && subgroup.customOrder !== undefined
        ? subgroup.customOrder
        : index,
    }));

    // Create the template
    const newTemplate = await createTemplate({
      name: requestBody.name,
      description: requestBody.description,
      subgroups: templateSubgroups,
    });

    return NextResponse.json(
      {
        success: true,
        template: newTemplate,
        statusCode: 201,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error saving simulation as template:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Failed to save simulation as template";

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
    if (errorMessage.includes("cannot be empty") || errorMessage.includes("must contain")) {
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
