/**
 * Apply Template API Route
 * POST: Apply a template to a simulation (replace mode)
 */

import { NextRequest, NextResponse } from "next/server";
import { applyTemplateToSimulation } from "@/lib/subgroup-template-db-utils";
import type {
  ApplyTemplateRequest,
  ApplyTemplateResponse,
} from "@/types/subgroup-templates";

/**
 * POST /api/simulations/[id]/apply-template
 * Apply a template to a simulation
 * This will delete existing subgroups and replace them with template subgroups
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse<ApplyTemplateResponse>> {
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
    let requestBody: ApplyTemplateRequest;
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
    if (!requestBody.templateId || typeof requestBody.templateId !== "string") {
      return NextResponse.json(
        {
          success: false,
          error: "templateId is required and must be a string",
          statusCode: 400,
        },
        { status: 400 }
      );
    }

    // Apply template (replace mode)
    const subgroupsCreated = await applyTemplateToSimulation(
      simulationId,
      requestBody.templateId
    );

    return NextResponse.json(
      {
        success: true,
        message: `Template applied successfully. Created ${subgroupsCreated} subgroup(s).`,
        subgroupsCreated,
        statusCode: 200,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error applying template to simulation:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Failed to apply template";

    // Check if template not found
    if (errorMessage.includes("Template not found")) {
      return NextResponse.json(
        {
          success: false,
          error: errorMessage,
          statusCode: 404,
        },
        { status: 404 }
      );
    }

    // Check if template has no subgroups
    if (errorMessage.includes("has no subgroups")) {
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
