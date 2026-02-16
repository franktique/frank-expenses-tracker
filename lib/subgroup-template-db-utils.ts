/**
 * Subgroup Template Database Utilities
 * Handles database operations for subgroup templates
 */

import { sql } from '@/lib/db';
import type {
  SubgroupTemplate,
  TemplateSubgroup,
  CreateTemplateRequest,
  UpdateTemplateRequest,
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
 * Get all templates (without subgroups)
 */
export async function getTemplates(): Promise<SubgroupTemplate[]> {
  try {
    const result = await sql`
      SELECT
        id,
        name,
        description,
        created_at as "createdAt",
        updated_at as "updatedAt"
      FROM subgroup_templates
      ORDER BY name ASC
    `;

    return normalizeQueryResult(result).map((row: any) => ({
      id: row.id,
      name: row.name,
      description: row.description,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    }));
  } catch (error) {
    console.error('Error fetching templates:', error);
    throw error;
  }
}

/**
 * Get a single template by ID with its subgroups and categories
 */
export async function getTemplateById(
  templateId: string
): Promise<SubgroupTemplate | null> {
  try {
    // Get template
    const templateResult = await sql`
      SELECT
        id,
        name,
        description,
        created_at as "createdAt",
        updated_at as "updatedAt"
      FROM subgroup_templates
      WHERE id = ${templateId}
    `;

    const templateArray = normalizeQueryResult(templateResult);
    if (templateArray.length === 0) {
      return null;
    }

    const templateData = templateArray[0] as any;

    // Get subgroups for this template with categories
    const subgroupsResult = await sql`
      SELECT
        ts.id,
        ts.template_id as "templateId",
        ts.name,
        ts.display_order as "displayOrder",
        ts.created_at as "createdAt",
        COALESCE(
          json_agg(
            json_build_object(
              'categoryId', tc.category_id,
              'order', tc.order_within_subgroup
            ) ORDER BY tc.order_within_subgroup
          ) FILTER (WHERE tc.id IS NOT NULL),
          '[]'::json
        ) as categories
      FROM template_subgroups ts
      LEFT JOIN template_categories tc ON ts.id = tc.template_subgroup_id
      WHERE ts.template_id = ${templateId}
      GROUP BY ts.id, ts.template_id, ts.name, ts.display_order, ts.created_at
      ORDER BY ts.display_order ASC
    `;

    const subgroups: TemplateSubgroup[] = normalizeQueryResult(
      subgroupsResult
    ).map((row: any) => ({
      id: row.id,
      templateId: row.templateId,
      name: row.name,
      displayOrder: row.displayOrder,
      createdAt: row.createdAt.toISOString(),
      categoryIds: (row.categories as any[]).map((cat: any) => cat.categoryId),
    }));

    return {
      id: templateData.id,
      name: templateData.name,
      description: templateData.description,
      createdAt: templateData.createdAt.toISOString(),
      updatedAt: templateData.updatedAt.toISOString(),
      subgroups,
    };
  } catch (error) {
    console.error(`Error fetching template ${templateId}:`, error);
    throw error;
  }
}

/**
 * Create a new template with subgroups and optional categories
 */
export async function createTemplate(
  request: CreateTemplateRequest
): Promise<SubgroupTemplate> {
  try {
    // Validate input
    if (!request.name || request.name.trim().length === 0) {
      throw new Error('Template name cannot be empty');
    }

    if (!request.subgroups || request.subgroups.length === 0) {
      throw new Error('Template must contain at least one subgroup');
    }

    // Check for duplicate name
    const existingTemplate = await sql`
      SELECT id FROM subgroup_templates
      WHERE LOWER(name) = LOWER(${request.name.trim()})
    `;

    const existingArray = normalizeQueryResult(existingTemplate);
    if (existingArray.length > 0) {
      throw new Error(`Template with name "${request.name}" already exists`);
    }

    // Create the template
    const templateResult = await sql`
      INSERT INTO subgroup_templates (
        name,
        description,
        created_at,
        updated_at
      )
      VALUES (
        ${request.name.trim()},
        ${request.description || null},
        NOW(),
        NOW()
      )
      RETURNING id, name, description, created_at as "createdAt", updated_at as "updatedAt"
    `;

    const templateArray = normalizeQueryResult(templateResult);
    const templateData = templateArray[0] as any;
    const templateId = templateData.id;

    // Insert subgroups
    const subgroups: TemplateSubgroup[] = [];
    for (let i = 0; i < request.subgroups.length; i++) {
      const subgroup = request.subgroups[i];
      const displayOrder =
        subgroup.displayOrder !== undefined ? subgroup.displayOrder : i;

      const subgroupResult = await sql`
        INSERT INTO template_subgroups (
          template_id,
          name,
          display_order,
          created_at
        )
        VALUES (
          ${templateId},
          ${subgroup.name.trim()},
          ${displayOrder},
          NOW()
        )
        RETURNING id, template_id as "templateId", name, display_order as "displayOrder", created_at as "createdAt"
      `;

      const subgroupArray = normalizeQueryResult(subgroupResult);
      const subgroupData = subgroupArray[0] as any;

      // Insert category associations if provided
      const categoryIds = subgroup.categoryIds || [];
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
        }
      }

      subgroups.push({
        id: subgroupData.id,
        templateId: subgroupData.templateId,
        name: subgroupData.name,
        displayOrder: subgroupData.displayOrder,
        createdAt: subgroupData.createdAt.toISOString(),
        categoryIds,
      });
    }

    return {
      id: templateData.id,
      name: templateData.name,
      description: templateData.description,
      createdAt: templateData.createdAt.toISOString(),
      updatedAt: templateData.updatedAt.toISOString(),
      subgroups,
    };
  } catch (error) {
    console.error('Error creating template:', error);
    throw error;
  }
}

/**
 * Update a template's metadata (name, description)
 */
export async function updateTemplate(
  templateId: string,
  request: UpdateTemplateRequest
): Promise<SubgroupTemplate> {
  try {
    // Check if template exists
    const existingTemplate = await sql`
      SELECT id, name FROM subgroup_templates
      WHERE id = ${templateId}
    `;

    const existingArray = normalizeQueryResult(existingTemplate);
    if (existingArray.length === 0) {
      throw new Error('Template not found');
    }

    const currentTemplate = existingArray[0] as any;

    // Validate name if provided
    if (request.name !== undefined && request.name.trim().length === 0) {
      throw new Error('Template name cannot be empty');
    }

    // Check for duplicate name if updating name
    if (request.name !== undefined && request.name !== currentTemplate.name) {
      const duplicateName = await sql`
        SELECT id FROM subgroup_templates
        WHERE LOWER(name) = LOWER(${request.name.trim()})
        AND id != ${templateId}
      `;

      const duplicateArray = normalizeQueryResult(duplicateName);
      if (duplicateArray.length > 0) {
        throw new Error(`Template with name "${request.name}" already exists`);
      }
    }

    // Build UPDATE query
    let updateResult;

    if (request.name !== undefined && request.description !== undefined) {
      updateResult = await sql`
        UPDATE subgroup_templates
        SET name = ${request.name.trim()},
            description = ${request.description},
            updated_at = NOW()
        WHERE id = ${templateId}
        RETURNING id, name, description, created_at as "createdAt", updated_at as "updatedAt"
      `;
    } else if (request.name !== undefined) {
      updateResult = await sql`
        UPDATE subgroup_templates
        SET name = ${request.name.trim()},
            updated_at = NOW()
        WHERE id = ${templateId}
        RETURNING id, name, description, created_at as "createdAt", updated_at as "updatedAt"
      `;
    } else if (request.description !== undefined) {
      updateResult = await sql`
        UPDATE subgroup_templates
        SET description = ${request.description},
            updated_at = NOW()
        WHERE id = ${templateId}
        RETURNING id, name, description, created_at as "createdAt", updated_at as "updatedAt"
      `;
    } else {
      // No updates provided, just return current template
      return getTemplateById(templateId) as Promise<SubgroupTemplate>;
    }

    const updateArray = normalizeQueryResult(updateResult);
    if (updateArray.length === 0) {
      throw new Error('Failed to update template');
    }

    const updatedData = updateArray[0] as any;

    return {
      id: updatedData.id,
      name: updatedData.name,
      description: updatedData.description,
      createdAt: updatedData.createdAt.toISOString(),
      updatedAt: updatedData.updatedAt.toISOString(),
    };
  } catch (error) {
    console.error('Error updating template:', error);
    throw error;
  }
}

/**
 * Delete a template and all its subgroups
 */
export async function deleteTemplate(templateId: string): Promise<void> {
  try {
    // Check if template exists
    const existingTemplate = await sql`
      SELECT id FROM subgroup_templates
      WHERE id = ${templateId}
    `;

    const existingArray = normalizeQueryResult(existingTemplate);
    if (existingArray.length === 0) {
      throw new Error('Template not found');
    }

    // Delete the template (CASCADE will delete template_subgroups)
    await sql`
      DELETE FROM subgroup_templates
      WHERE id = ${templateId}
    `;
  } catch (error) {
    console.error('Error deleting template:', error);
    throw error;
  }
}

/**
 * Add a subgroup to a template
 */
export async function addSubgroupToTemplate(
  templateId: string,
  subgroupName: string
): Promise<TemplateSubgroup> {
  try {
    // Validate input
    if (!subgroupName || subgroupName.trim().length === 0) {
      throw new Error('Subgroup name cannot be empty');
    }

    // Check if template exists
    const templateExists = await sql`
      SELECT id FROM subgroup_templates
      WHERE id = ${templateId}
    `;

    const templateArray = normalizeQueryResult(templateExists);
    if (templateArray.length === 0) {
      throw new Error('Template not found');
    }

    // Check for duplicate subgroup name in template
    const duplicateSubgroup = await sql`
      SELECT id FROM template_subgroups
      WHERE template_id = ${templateId}
      AND LOWER(name) = LOWER(${subgroupName.trim()})
    `;

    const duplicateArray = normalizeQueryResult(duplicateSubgroup);
    if (duplicateArray.length > 0) {
      throw new Error(
        `Subgroup with name "${subgroupName}" already exists in this template`
      );
    }

    // Get next display order
    const maxOrderResult = await sql`
      SELECT COALESCE(MAX(display_order), -1) + 1 as next_order
      FROM template_subgroups
      WHERE template_id = ${templateId}
    `;

    const maxOrderArray = normalizeQueryResult(maxOrderResult);
    const nextDisplayOrder = (maxOrderArray[0] as any).next_order;

    // Create subgroup
    const subgroupResult = await sql`
      INSERT INTO template_subgroups (
        template_id,
        name,
        display_order,
        created_at
      )
      VALUES (
        ${templateId},
        ${subgroupName.trim()},
        ${nextDisplayOrder},
        NOW()
      )
      RETURNING id, template_id as "templateId", name, display_order as "displayOrder", created_at as "createdAt"
    `;

    const subgroupArray = normalizeQueryResult(subgroupResult);
    const subgroupData = subgroupArray[0] as any;

    return {
      id: subgroupData.id,
      templateId: subgroupData.templateId,
      name: subgroupData.name,
      displayOrder: subgroupData.displayOrder,
      createdAt: subgroupData.createdAt.toISOString(),
    };
  } catch (error) {
    console.error('Error adding subgroup to template:', error);
    throw error;
  }
}

/**
 * Remove a subgroup from a template
 */
export async function removeSubgroupFromTemplate(
  templateId: string,
  subgroupId: string
): Promise<void> {
  try {
    // Check if subgroup exists and belongs to template
    const existingSubgroup = await sql`
      SELECT id FROM template_subgroups
      WHERE id = ${subgroupId}
      AND template_id = ${templateId}
    `;

    const existingArray = normalizeQueryResult(existingSubgroup);
    if (existingArray.length === 0) {
      throw new Error('Subgroup not found in template');
    }

    // Delete the subgroup
    await sql`
      DELETE FROM template_subgroups
      WHERE id = ${subgroupId}
      AND template_id = ${templateId}
    `;
  } catch (error) {
    console.error('Error removing subgroup from template:', error);
    throw error;
  }
}

/**
 * Apply a template to a simulation (replace mode)
 * Deletes existing subgroups and creates new ones from template
 * Optionally creates category associations based on template
 */
export async function applyTemplateToSimulation(
  simulationId: number,
  templateId: string
): Promise<{
  subgroupsCreated: number;
  categoriesApplied: number;
  categoryMatchResults: any[];
  missingCategories: (string | number)[];
}> {
  try {
    // Get template with subgroups and categories
    const template = await getTemplateById(templateId);
    if (!template) {
      throw new Error('Template not found');
    }

    if (!template.subgroups || template.subgroups.length === 0) {
      throw new Error('Template has no subgroups');
    }

    // Get available categories in the simulation for matching
    const categoriesResult = await sql`
      SELECT id, name
      FROM categories
      WHERE id IN (
        SELECT DISTINCT category_id
        FROM simulation_budgets
        WHERE simulation_id = ${simulationId}
      )
      ORDER BY name ASC
    `;
    const availableCategories = normalizeQueryResult(categoriesResult);

    // Build category lookup maps for matching
    const categoryById = new Map<string | number, any>();
    const categoryByName = new Map<string, any>();
    for (const cat of availableCategories) {
      categoryById.set(cat.id, cat);
      categoryByName.set(cat.name.toLowerCase(), cat);
    }

    // Delete existing simulation_subgroups (CASCADE will handle subgroup_categories)
    await sql`
      DELETE FROM simulation_subgroups
      WHERE simulation_id = ${simulationId}
    `;

    // Create new subgroups from template
    const createdSubgroups: Array<{ id: string; templateId: string }> = [];
    for (const templateSubgroup of template.subgroups) {
      const subgroupResult = await sql`
        INSERT INTO simulation_subgroups (
          simulation_id,
          name,
          display_order,
          template_subgroup_id,
          created_at,
          updated_at
        )
        VALUES (
          ${simulationId},
          ${templateSubgroup.name},
          ${templateSubgroup.displayOrder},
          ${templateSubgroup.id},
          NOW(),
          NOW()
        )
        RETURNING id
      `;
      const subgroupArray = normalizeQueryResult(subgroupResult);
      createdSubgroups.push({
        id: subgroupArray[0].id,
        templateId: templateSubgroup.id,
      });
    }

    // Apply categories to subgroups
    let categoriesApplied = 0;
    const categoryMatchResults: any[] = [];
    const missingCategories: (string | number)[] = [];

    for (const createdSubgroup of createdSubgroups) {
      const templateSubgroup = template.subgroups.find(
        (sg) => sg.id === createdSubgroup.templateId
      );
      if (!templateSubgroup || !templateSubgroup.categoryIds) continue;

      for (const templateCategoryId of templateSubgroup.categoryIds) {
        let matchedCategoryId: string | number | null = null;
        let matchType: 'exact' | 'name' | 'none' = 'none';
        let categoryName: string | undefined;

        // Try exact ID match first
        if (categoryById.has(templateCategoryId)) {
          matchedCategoryId = categoryById.get(templateCategoryId).id;
          matchType = 'exact';
          categoryName = categoryById.get(templateCategoryId).name;
        }
        // If no exact match, try to find by name (fetch category name from template_categories)
        else {
          // Get category name from template_categories for reference
          const catNameResult = await sql`
            SELECT c.name
            FROM template_categories tc
            JOIN categories c ON tc.category_id = c.id
            WHERE tc.template_subgroup_id = ${createdSubgroup.templateId}
            AND tc.category_id = ${templateCategoryId}
            LIMIT 1
          `;
          const catNameArray = normalizeQueryResult(catNameResult);
          if (catNameArray.length > 0) {
            categoryName = catNameArray[0].name;
            // Try to match by name in target simulation
            if (categoryByName.has(categoryName.toLowerCase())) {
              matchedCategoryId = categoryByName.get(
                categoryName.toLowerCase()
              ).id;
              matchType = 'name';
            }
          }
        }

        // Create category association if match found
        if (matchedCategoryId !== null) {
          await sql`
            INSERT INTO subgroup_categories (
              subgroup_id,
              category_id,
              order_within_subgroup
            )
            VALUES (
              ${createdSubgroup.id},
              ${matchedCategoryId},
              ${categoriesApplied}
            )
          `;
          categoriesApplied++;
        } else {
          missingCategories.push(templateCategoryId);
        }

        categoryMatchResults.push({
          templateCategoryId,
          matchedCategoryId,
          matchType,
          templateCategoryName: categoryName,
        });
      }
    }

    // Update or insert applied template record
    await sql`
      INSERT INTO simulation_applied_templates (
        simulation_id,
        template_id,
        applied_at
      )
      VALUES (
        ${simulationId},
        ${templateId},
        NOW()
      )
      ON CONFLICT (simulation_id)
      DO UPDATE SET
        template_id = ${templateId},
        applied_at = NOW()
    `;

    return {
      subgroupsCreated: createdSubgroups.length,
      categoriesApplied,
      categoryMatchResults,
      missingCategories,
    };
  } catch (error) {
    console.error('Error applying template to simulation:', error);
    throw error;
  }
}

/**
 * Get the currently applied template for a simulation
 */
export async function getAppliedTemplate(simulationId: number): Promise<{
  templateId: string | null;
  templateName: string | null;
  appliedAt: string | null;
}> {
  try {
    const result = await sql`
      SELECT
        sat.template_id as "templateId",
        st.name as "templateName",
        sat.applied_at as "appliedAt"
      FROM simulation_applied_templates sat
      LEFT JOIN subgroup_templates st ON sat.template_id = st.id
      WHERE sat.simulation_id = ${simulationId}
    `;

    const resultArray = normalizeQueryResult(result);
    if (resultArray.length === 0) {
      return {
        templateId: null,
        templateName: null,
        appliedAt: null,
      };
    }

    const data = resultArray[0] as any;
    return {
      templateId: data.templateId,
      templateName: data.templateName,
      appliedAt: data.appliedAt ? data.appliedAt.toISOString() : null,
    };
  } catch (error) {
    console.error(
      `Error getting applied template for simulation ${simulationId}:`,
      error
    );
    throw error;
  }
}
