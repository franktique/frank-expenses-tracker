/**
 * Subgroup Template Database Utilities
 * Handles database operations for subgroup templates
 */

import { sql } from "@/lib/db";
import type {
  SubgroupTemplate,
  TemplateSubgroup,
  CreateTemplateRequest,
  UpdateTemplateRequest,
} from "@/types/subgroup-templates";

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
    console.error("Error fetching templates:", error);
    throw error;
  }
}

/**
 * Get a single template by ID with its subgroups
 */
export async function getTemplateById(templateId: string): Promise<SubgroupTemplate | null> {
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

    // Get subgroups for this template
    const subgroupsResult = await sql`
      SELECT
        id,
        template_id as "templateId",
        name,
        display_order as "displayOrder",
        created_at as "createdAt"
      FROM template_subgroups
      WHERE template_id = ${templateId}
      ORDER BY display_order ASC
    `;

    const subgroups: TemplateSubgroup[] = normalizeQueryResult(subgroupsResult).map((row: any) => ({
      id: row.id,
      templateId: row.templateId,
      name: row.name,
      displayOrder: row.displayOrder,
      createdAt: row.createdAt.toISOString(),
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
 * Create a new template with subgroups
 */
export async function createTemplate(request: CreateTemplateRequest): Promise<SubgroupTemplate> {
  try {
    // Validate input
    if (!request.name || request.name.trim().length === 0) {
      throw new Error("Template name cannot be empty");
    }

    if (!request.subgroups || request.subgroups.length === 0) {
      throw new Error("Template must contain at least one subgroup");
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
      const displayOrder = subgroup.displayOrder !== undefined ? subgroup.displayOrder : i;

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

      subgroups.push({
        id: subgroupData.id,
        templateId: subgroupData.templateId,
        name: subgroupData.name,
        displayOrder: subgroupData.displayOrder,
        createdAt: subgroupData.createdAt.toISOString(),
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
    console.error("Error creating template:", error);
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
      throw new Error("Template not found");
    }

    const currentTemplate = existingArray[0] as any;

    // Validate name if provided
    if (request.name !== undefined && request.name.trim().length === 0) {
      throw new Error("Template name cannot be empty");
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
      throw new Error("Failed to update template");
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
    console.error("Error updating template:", error);
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
      throw new Error("Template not found");
    }

    // Delete the template (CASCADE will delete template_subgroups)
    await sql`
      DELETE FROM subgroup_templates
      WHERE id = ${templateId}
    `;
  } catch (error) {
    console.error("Error deleting template:", error);
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
      throw new Error("Subgroup name cannot be empty");
    }

    // Check if template exists
    const templateExists = await sql`
      SELECT id FROM subgroup_templates
      WHERE id = ${templateId}
    `;

    const templateArray = normalizeQueryResult(templateExists);
    if (templateArray.length === 0) {
      throw new Error("Template not found");
    }

    // Check for duplicate subgroup name in template
    const duplicateSubgroup = await sql`
      SELECT id FROM template_subgroups
      WHERE template_id = ${templateId}
      AND LOWER(name) = LOWER(${subgroupName.trim()})
    `;

    const duplicateArray = normalizeQueryResult(duplicateSubgroup);
    if (duplicateArray.length > 0) {
      throw new Error(`Subgroup with name "${subgroupName}" already exists in this template`);
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
    console.error("Error adding subgroup to template:", error);
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
      throw new Error("Subgroup not found in template");
    }

    // Delete the subgroup
    await sql`
      DELETE FROM template_subgroups
      WHERE id = ${subgroupId}
      AND template_id = ${templateId}
    `;
  } catch (error) {
    console.error("Error removing subgroup from template:", error);
    throw error;
  }
}

/**
 * Apply a template to a simulation (replace mode)
 * Deletes existing subgroups and creates new ones from template
 */
export async function applyTemplateToSimulation(
  simulationId: number,
  templateId: string
): Promise<number> {
  try {
    // Get template with subgroups
    const template = await getTemplateById(templateId);
    if (!template) {
      throw new Error("Template not found");
    }

    if (!template.subgroups || template.subgroups.length === 0) {
      throw new Error("Template has no subgroups");
    }

    // Delete existing simulation_subgroups (CASCADE will handle subgroup_categories)
    await sql`
      DELETE FROM simulation_subgroups
      WHERE simulation_id = ${simulationId}
    `;

    // Create new subgroups from template
    let createdCount = 0;
    for (const templateSubgroup of template.subgroups) {
      await sql`
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
      `;
      createdCount++;
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

    return createdCount;
  } catch (error) {
    console.error("Error applying template to simulation:", error);
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
    console.error(`Error getting applied template for simulation ${simulationId}:`, error);
    throw error;
  }
}
