/**
 * Individual Template API Routes
 * GET: Get template details
 * PATCH: Update template metadata
 * DELETE: Delete template
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  getTemplateById,
  updateTemplate,
  deleteTemplate,
} from '@/lib/subgroup-template-db-utils';
import type {
  UpdateTemplateRequest,
  TemplateResponse,
  DeleteTemplateResponse,
} from '@/types/subgroup-templates';

/**
 * GET /api/subgroup-templates/[templateId]
 * Get template with all subgroups
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ templateId: string }> }
): Promise<NextResponse<TemplateResponse>> {
  try {
    const { templateId } = await params;

    const template = await getTemplateById(templateId);

    if (!template) {
      return NextResponse.json(
        {
          success: false,
          error: 'Template not found',
          statusCode: 404,
        },
        { status: 404 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        template,
        statusCode: 200,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error fetching template:', error);
    const errorMessage =
      error instanceof Error ? error.message : 'Failed to fetch template';

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
 * PATCH /api/subgroup-templates/[templateId]
 * Update template metadata (name, description)
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ templateId: string }> }
): Promise<NextResponse<TemplateResponse>> {
  try {
    const { templateId } = await params;

    // Parse request body
    let requestBody: UpdateTemplateRequest;
    try {
      requestBody = await request.json();
    } catch (parseError) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid request body',
          statusCode: 400,
        },
        { status: 400 }
      );
    }

    // Update template
    const updatedTemplate = await updateTemplate(templateId, requestBody);

    return NextResponse.json(
      {
        success: true,
        template: updatedTemplate,
        statusCode: 200,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error updating template:', error);
    const errorMessage =
      error instanceof Error ? error.message : 'Failed to update template';

    // Check if template not found
    if (errorMessage.includes('not found')) {
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
    if (errorMessage.includes('already exists')) {
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
    if (errorMessage.includes('cannot be empty')) {
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
 * DELETE /api/subgroup-templates/[templateId]
 * Delete a template
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ templateId: string }> }
): Promise<NextResponse<DeleteTemplateResponse>> {
  try {
    const { templateId } = await params;

    await deleteTemplate(templateId);

    return NextResponse.json(
      {
        success: true,
        message: 'Template deleted successfully',
        statusCode: 200,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error deleting template:', error);
    const errorMessage =
      error instanceof Error ? error.message : 'Failed to delete template';

    // Check if template not found
    if (errorMessage.includes('not found')) {
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
