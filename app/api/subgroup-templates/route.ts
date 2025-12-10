/**
 * Subgroup Templates API Routes
 * GET: List all templates
 * POST: Create a new template
 */

import { NextRequest, NextResponse } from "next/server";
import {
  getTemplates,
  createTemplate,
} from "@/lib/subgroup-template-db-utils";
import type {
  CreateTemplateRequest,
  TemplateListResponse,
  TemplateResponse,
} from "@/types/subgroup-templates";

/**
 * GET /api/subgroup-templates
 * Fetch all available templates
 */
export async function GET(
  request: NextRequest
): Promise<NextResponse<TemplateListResponse>> {
  try {
    const templates = await getTemplates();

    return NextResponse.json(
      {
        success: true,
        templates,
        statusCode: 200,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error fetching templates:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Failed to fetch templates";

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
 * POST /api/subgroup-templates
 * Create a new template
 */
export async function POST(
  request: NextRequest
): Promise<NextResponse<TemplateResponse>> {
  try {
    // Parse request body
    let requestBody: CreateTemplateRequest;
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

    if (!Array.isArray(requestBody.subgroups)) {
      return NextResponse.json(
        {
          success: false,
          error: "subgroups must be an array",
          statusCode: 400,
        },
        { status: 400 }
      );
    }

    if (requestBody.subgroups.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: "Template must contain at least one subgroup",
          statusCode: 400,
        },
        { status: 400 }
      );
    }

    // Create template
    const newTemplate = await createTemplate(requestBody);

    return NextResponse.json(
      {
        success: true,
        template: newTemplate,
        statusCode: 201,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating template:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Failed to create template";

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
