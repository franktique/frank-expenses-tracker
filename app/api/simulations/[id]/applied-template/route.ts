/**
 * Applied Template API Route
 * GET: Get information about the currently applied template for a simulation
 * DELETE: Remove the applied template from a simulation
 */

import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { getAppliedTemplate } from '@/lib/subgroup-template-db-utils';
import type { AppliedTemplateResponse } from '@/types/subgroup-templates';

/**
 * GET /api/simulations/[id]/applied-template
 * Get the currently applied template for a simulation
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse<AppliedTemplateResponse>> {
  try {
    const { id } = await params;
    const simulationId = parseInt(id, 10);

    if (isNaN(simulationId)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid simulation ID',
          statusCode: 400,
        },
        { status: 400 }
      );
    }

    const appliedTemplate = await getAppliedTemplate(simulationId);

    return NextResponse.json(
      {
        success: true,
        appliedTemplate,
        statusCode: 200,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error getting applied template:', error);
    const errorMessage =
      error instanceof Error ? error.message : 'Failed to get applied template';

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
 * DELETE /api/simulations/[id]/applied-template
 * Remove the applied template from a simulation
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  try {
    const { id } = await params;
    const simulationId = parseInt(id, 10);

    if (isNaN(simulationId)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid simulation ID',
          statusCode: 400,
        },
        { status: 400 }
      );
    }

    // Delete the applied template record
    await sql`
      DELETE FROM simulation_applied_templates
      WHERE simulation_id = ${simulationId}
    `;

    return NextResponse.json(
      {
        success: true,
        message:
          'Applied template removed successfully. You can now apply a different template.',
        statusCode: 200,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error removing applied template:', error);
    const errorMessage =
      error instanceof Error
        ? error.message
        : 'Failed to remove applied template';

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
