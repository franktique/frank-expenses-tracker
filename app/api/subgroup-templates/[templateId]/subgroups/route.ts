/**
 * Template Subgroups API Route
 * POST: Add a subgroup to a template
 */

import { NextRequest, NextResponse } from "next/server";
import { addSubgroupToTemplate } from "@/lib/subgroup-template-db-utils";

interface AddSubgroupRequest {
  name: string;
}

interface AddSubgroupResponse {
  success: boolean;
  subgroup?: {
    id: string;
    templateId: string;
    name: string;
    displayOrder: number;
    createdAt: string;
  };
  error?: string;
  statusCode: number;
}

/**
 * POST /api/subgroup-templates/[templateId]/subgroups
 * Add a subgroup to a template
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ templateId: string }> }
): Promise<NextResponse<AddSubgroupResponse>> {
  try {
    const { templateId } = await params;

    // Parse request body
    let requestBody: AddSubgroupRequest;
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
          error: "Subgroup name is required and must be a string",
          statusCode: 400,
        },
        { status: 400 }
      );
    }

    // Add subgroup to template
    const newSubgroup = await addSubgroupToTemplate(templateId, requestBody.name);

    return NextResponse.json(
      {
        success: true,
        subgroup: newSubgroup,
        statusCode: 201,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error adding subgroup to template:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Failed to add subgroup to template";

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
    if (errorMessage.includes("cannot be empty")) {
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
