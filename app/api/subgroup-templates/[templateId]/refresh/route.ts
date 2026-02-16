/**
 * Refresh Template API Route
 * POST: Refresh a template with data from a source simulation
 */

import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { getSubgroupsBySimulation } from '@/lib/subgroup-db-utils';
import { getTemplateById } from '@/lib/subgroup-template-db-utils';
import type {
  RefreshTemplateRequest,
  RefreshTemplateResponse,
} from '@/types/subgroup-templates';

/**
 * Helper to normalize SQL query results
 */
function normalizeQueryResult(result: any): any[] {
  if (Array.isArray(result)) {
    return result;
  }
  if (result && Array.isArray(result.rows)) {
    return result.rows;
  }
  return [];
}

/**
 * POST /api/subgroup-templates/[templateId]/refresh
 * Refresh a template with current data from a source simulation
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ templateId: string }> }
): Promise<NextResponse<RefreshTemplateResponse>> {
  try {
    const { templateId } = await params;

    // Validate template ID format (basic UUID check)
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(templateId)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid template ID format',
          statusCode: 400,
        },
        { status: 400 }
      );
    }

    // Parse request body
    let requestBody: RefreshTemplateRequest;
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

    // Validate request body
    if (
      !requestBody.sourceSimulationId ||
      typeof requestBody.sourceSimulationId !== 'number'
    ) {
      return NextResponse.json(
        {
          success: false,
          error: 'sourceSimulationId is required and must be a number',
          statusCode: 400,
        },
        { status: 400 }
      );
    }

    // Check if template exists
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

    // Get subgroups from source simulation
    const sourceSubgroups = await getSubgroupsBySimulation(
      requestBody.sourceSimulationId
    );

    if (sourceSubgroups.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'Source simulation has no subgroups to copy from',
          statusCode: 400,
        },
        { status: 400 }
      );
    }

    // Delete existing template subgroups and their categories (CASCADE)
    await sql`
      DELETE FROM template_subgroups
      WHERE template_id = ${templateId}
    `;

    // Create new template subgroups with categories
    let categoriesUpdated = 0;
    const createdSubgroups = [];

    for (let i = 0; i < sourceSubgroups.length; i++) {
      const sourceSubgroup = sourceSubgroups[i];
      const displayOrder =
        sourceSubgroup.customOrder !== null &&
        sourceSubgroup.customOrder !== undefined
          ? sourceSubgroup.customOrder
          : i;

      // Create the template subgroup
      const subgroupResult = await sql`
        INSERT INTO template_subgroups (
          template_id,
          name,
          display_order,
          created_at
        )
        VALUES (
          ${templateId},
          ${sourceSubgroup.name},
          ${displayOrder},
          NOW()
        )
        RETURNING id, template_id as "templateId", name, display_order as "displayOrder", created_at as "createdAt"
      `;

      const subgroupArray = normalizeQueryResult(subgroupResult);
      const subgroupData = subgroupArray[0] as any;

      // Insert category associations if they exist
      const categoryIds = sourceSubgroup.categoryIds || [];
      if (categoryIds.length > 0) {
        for (let j = 0; j < categoryIds.length; j++) {
          await sql`
            INSERT INTO template_categories (
              template_subgroup_id,
              category_id,
              order_within_subgroup,
              created_at
            )
            VALUES (
              ${subgroupData.id},
              ${categoryIds[j]},
              ${j},
              NOW()
            )
          `;
          categoriesUpdated++;
        }
      }

      createdSubgroups.push({
        id: subgroupData.id,
        templateId: subgroupData.templateId,
        name: subgroupData.name,
        displayOrder: subgroupData.displayOrder,
        createdAt: subgroupData.createdAt.toISOString(),
        categoryIds,
      });
    }

    // Update template timestamp
    await sql`
      UPDATE subgroup_templates
      SET updated_at = NOW()
      WHERE id = ${templateId}
    `;

    // Fetch updated template
    const updatedTemplate = await getTemplateById(templateId);

    return NextResponse.json(
      {
        success: true,
        template: updatedTemplate!,
        message: `Template refreshed successfully. Updated ${createdSubgroups.length} subgroup(s) and ${categoriesUpdated} category association(s).`,
        categoriesUpdated,
        statusCode: 200,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error refreshing template:', error);
    const errorMessage =
      error instanceof Error ? error.message : 'Failed to refresh template';

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
