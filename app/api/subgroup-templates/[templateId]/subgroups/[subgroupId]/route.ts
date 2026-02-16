/**
 * Individual Template Subgroup API Route
 * DELETE: Remove a subgroup from a template
 */

import { NextRequest, NextResponse } from 'next/server';
import { removeSubgroupFromTemplate } from '@/lib/subgroup-template-db-utils';

interface DeleteSubgroupResponse {
  success: boolean;
  message?: string;
  error?: string;
  statusCode: number;
}

/**
 * DELETE /api/subgroup-templates/[templateId]/subgroups/[subgroupId]
 * Remove a subgroup from a template
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ templateId: string; subgroupId: string }> }
): Promise<NextResponse<DeleteSubgroupResponse>> {
  try {
    const { templateId, subgroupId } = await params;

    await removeSubgroupFromTemplate(templateId, subgroupId);

    return NextResponse.json(
      {
        success: true,
        message: 'Subgroup removed from template successfully',
        statusCode: 200,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error removing subgroup from template:', error);
    const errorMessage =
      error instanceof Error
        ? error.message
        : 'Failed to remove subgroup from template';

    // Check if subgroup not found
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
