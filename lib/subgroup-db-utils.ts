/**
 * Sub-Group Database Utilities
 * Handles database operations for simulation sub-groups
 */

import { sql } from "@/lib/db";
import type {
  Subgroup,
  CreateSubgroupRequest,
  UpdateSubgroupRequest,
} from "@/types/simulation";

/**
 * Helper to normalize SQL query results
 * The Neon client can return results either as an array directly or wrapped in { rows: [...] }
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
 * Fetch all sub-groups for a simulation
 */
export async function getSubgroupsBySimulation(
  simulationId: number
): Promise<Subgroup[]> {
  try {
    const result = await sql`
      SELECT
        sg.id,
        sg.simulation_id as "simulationId",
        sg.name,
        sg.display_order as "displayOrder",
        sg.created_at as "createdAt",
        sg.updated_at as "updatedAt",
        COALESCE(
          json_agg(
            json_build_object(
              'categoryId', sc.category_id,
              'order', sc.order_within_subgroup
            ) ORDER BY sc.order_within_subgroup
          ) FILTER (WHERE sc.id IS NOT NULL),
          '[]'::json
        ) as categories
      FROM simulation_subgroups sg
      LEFT JOIN subgroup_categories sc ON sg.id = sc.subgroup_id
      WHERE sg.simulation_id = ${simulationId}
      GROUP BY sg.id, sg.simulation_id, sg.name, sg.display_order, sg.created_at, sg.updated_at
      ORDER BY sg.display_order ASC
    `;

    return normalizeQueryResult(result).map((row: any) => ({
      id: row.id,
      simulationId: row.simulationId,
      name: row.name,
      displayOrder: row.displayOrder,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
      categoryIds: (row.categories as any[]).map((cat: any) => cat.categoryId),
    }));
  } catch (error) {
    console.error(
      `Error fetching sub-groups for simulation ${simulationId}:`,
      error
    );
    throw error;
  }
}

/**
 * Create a new sub-group with associated categories
 */
export async function createSubgroup(
  simulationId: number,
  request: CreateSubgroupRequest
): Promise<Subgroup> {
  try {
    // Validate input
    if (!request.name || request.name.trim().length === 0) {
      throw new Error("Sub-group name cannot be empty");
    }

    if (!request.categoryIds || request.categoryIds.length === 0) {
      throw new Error("Sub-group must contain at least one category");
    }

    // Check for duplicate name within simulation
    const existingSubgroup = await sql`
      SELECT id FROM simulation_subgroups
      WHERE simulation_id = ${simulationId}
      AND LOWER(name) = LOWER(${request.name.trim()})
    `;

    const existingArray = normalizeQueryResult(existingSubgroup);
    if (existingArray.length > 0) {
      throw new Error(
        `Sub-group with name "${request.name}" already exists in this simulation`
      );
    }

    // Get the next display order
    const maxOrderResult = await sql`
      SELECT COALESCE(MAX(display_order), -1) + 1 as next_order
      FROM simulation_subgroups
      WHERE simulation_id = ${simulationId}
    `;

    const maxOrderArray = normalizeQueryResult(maxOrderResult);
    const nextDisplayOrder = (maxOrderArray[0] as any).next_order;

    // Create the sub-group
    const subgroupResult = await sql`
      INSERT INTO simulation_subgroups (
        simulation_id,
        name,
        display_order,
        created_at,
        updated_at
      )
      VALUES (
        ${simulationId},
        ${request.name.trim()},
        ${nextDisplayOrder},
        NOW(),
        NOW()
      )
      RETURNING id, simulation_id as "simulationId", name, display_order as "displayOrder", created_at as "createdAt", updated_at as "updatedAt"
    `;

    const subgroupArray = normalizeQueryResult(subgroupResult);
    const subgroupData = subgroupArray[0] as any;
    const subgroupId = subgroupData.id;

    // Insert category associations
    if (request.categoryIds.length > 0) {
      for (let i = 0; i < request.categoryIds.length; i++) {
        await sql`
          INSERT INTO subgroup_categories (
            subgroup_id,
            category_id,
            order_within_subgroup
          )
          VALUES (
            ${subgroupId},
            ${request.categoryIds[i]},
            ${i}
          )
        `;
      }
    }

    return {
      id: subgroupData.id,
      simulationId: subgroupData.simulationId,
      name: subgroupData.name,
      displayOrder: subgroupData.displayOrder,
      createdAt: subgroupData.createdAt.toISOString(),
      updatedAt: subgroupData.updatedAt.toISOString(),
      categoryIds: request.categoryIds,
    };
  } catch (error) {
    console.error("Error creating sub-group:", error);
    throw error;
  }
}

/**
 * Update a sub-group
 */
export async function updateSubgroup(
  simulationId: number,
  subgroupId: string,
  request: UpdateSubgroupRequest
): Promise<Subgroup> {
  try {
    // Check if sub-group exists
    const existingSubgroup = await sql`
      SELECT id, name, display_order as "displayOrder", created_at as "createdAt", updated_at as "updatedAt"
      FROM simulation_subgroups
      WHERE id = ${subgroupId}
      AND simulation_id = ${simulationId}
    `;

    const existingArray = normalizeQueryResult(existingSubgroup);
    if (existingArray.length === 0) {
      throw new Error("Sub-group not found");
    }

    const currentSubgroup = existingArray[0] as any;

    // Validate name if provided
    if (request.name !== undefined && request.name.trim().length === 0) {
      throw new Error("Sub-group name cannot be empty");
    }

    // Check for duplicate name if updating name
    if (request.name !== undefined && request.name !== currentSubgroup.name) {
      const duplicateName = await sql`
        SELECT id FROM simulation_subgroups
        WHERE simulation_id = ${simulationId}
        AND LOWER(name) = LOWER(${request.name.trim()})
        AND id != ${subgroupId}
      `;

      const duplicateArray = normalizeQueryResult(duplicateName);
      if (duplicateArray.length > 0) {
        throw new Error(
          `Sub-group with name "${request.name}" already exists in this simulation`
        );
      }
    }

    // Validate categoryIds if provided
    if (
      request.categoryIds !== undefined &&
      request.categoryIds.length === 0
    ) {
      throw new Error("Sub-group must contain at least one category");
    }

    // Update sub-group
    const updateData: any = {
      updated_at: new Date(),
    };

    if (request.name !== undefined) {
      updateData.name = request.name.trim();
    }

    if (request.displayOrder !== undefined) {
      updateData.display_order = request.displayOrder;
    }

    const updateResult = await sql`
      UPDATE simulation_subgroups
      SET ${
        request.name !== undefined
          ? sql`name = ${request.name.trim()},`
          : sql``
      }
      ${
        request.displayOrder !== undefined
          ? sql`display_order = ${request.displayOrder},`
          : sql``
      }
      updated_at = NOW()
      WHERE id = ${subgroupId}
      AND simulation_id = ${simulationId}
      RETURNING id, simulation_id as "simulationId", name, display_order as "displayOrder", created_at as "createdAt", updated_at as "updatedAt"
    `;

    const updateArray = normalizeQueryResult(updateResult);
    if (updateArray.length === 0) {
      throw new Error("Failed to update sub-group");
    }

    const updatedData = updateArray[0] as any;

    // Update category associations if provided
    if (request.categoryIds !== undefined) {
      // Delete existing associations
      await sql`
        DELETE FROM subgroup_categories
        WHERE subgroup_id = ${subgroupId}
      `;

      // Insert new associations
      for (let i = 0; i < request.categoryIds.length; i++) {
        await sql`
          INSERT INTO subgroup_categories (
            subgroup_id,
            category_id,
            order_within_subgroup
          )
          VALUES (
            ${subgroupId},
            ${request.categoryIds[i]},
            ${i}
          )
        `;
      }
    }

    return {
      id: updatedData.id,
      simulationId: updatedData.simulationId,
      name: updatedData.name,
      displayOrder: updatedData.displayOrder,
      createdAt: updatedData.createdAt.toISOString(),
      updatedAt: updatedData.updatedAt.toISOString(),
      categoryIds: request.categoryIds || [],
    };
  } catch (error) {
    console.error("Error updating sub-group:", error);
    throw error;
  }
}

/**
 * Delete a sub-group and all associated categories
 */
export async function deleteSubgroup(
  simulationId: number,
  subgroupId: string
): Promise<void> {
  try {
    // Check if sub-group exists
    const existingSubgroup = await sql`
      SELECT id FROM simulation_subgroups
      WHERE id = ${subgroupId}
      AND simulation_id = ${simulationId}
    `;

    const existingArray = normalizeQueryResult(existingSubgroup);
    if (existingArray.length === 0) {
      throw new Error("Sub-group not found");
    }

    // Delete associated categories (cascade is handled by DB, but we do it explicitly)
    await sql`
      DELETE FROM subgroup_categories
      WHERE subgroup_id = ${subgroupId}
    `;

    // Delete the sub-group
    await sql`
      DELETE FROM simulation_subgroups
      WHERE id = ${subgroupId}
      AND simulation_id = ${simulationId}
    `;
  } catch (error) {
    console.error("Error deleting sub-group:", error);
    throw error;
  }
}

/**
 * Check if tables exist and create them if needed
 * Ensures both simulation_subgroups and subgroup_categories tables exist
 * Handles partial migrations by creating any missing tables
 */
export async function ensureSubgroupTablesExist(): Promise<boolean> {
  try {
    // Check if simulation_subgroups table exists
    const simulationSubgroupsCheckResult = await sql`
      SELECT EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_name = 'simulation_subgroups'
      ) as exists;
    `;

    const simulationSubgroupsArray = normalizeQueryResult(simulationSubgroupsCheckResult);
    const simulationSubgroupsExists = simulationSubgroupsArray.length > 0 && (simulationSubgroupsArray[0] as any).exists;

    // Check if subgroup_categories table exists
    const subgroupCategoriesCheckResult = await sql`
      SELECT EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_name = 'subgroup_categories'
      ) as exists;
    `;

    const subgroupCategoriesArray = normalizeQueryResult(subgroupCategoriesCheckResult);
    const subgroupCategoriesExists = subgroupCategoriesArray.length > 0 && (subgroupCategoriesArray[0] as any).exists;

    // If both tables exist, we're done
    if (simulationSubgroupsExists && subgroupCategoriesExists) {
      return true;
    }

    // Create or ensure simulation_subgroups table exists
    await sql`
      CREATE TABLE IF NOT EXISTS simulation_subgroups (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        simulation_id INTEGER NOT NULL REFERENCES simulations(id) ON DELETE CASCADE,
        name VARCHAR(255) NOT NULL,
        display_order INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(simulation_id, name)
      );
    `;

    // Create or ensure subgroup_categories table exists
    await sql`
      CREATE TABLE IF NOT EXISTS subgroup_categories (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        subgroup_id UUID NOT NULL REFERENCES simulation_subgroups(id) ON DELETE CASCADE,
        category_id INTEGER NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
        order_within_subgroup INTEGER DEFAULT 0,
        UNIQUE(subgroup_id, category_id)
      );
    `;

    // Create or ensure all indexes exist
    await sql`
      CREATE INDEX IF NOT EXISTS idx_simulation_subgroups_simulation_id
      ON simulation_subgroups(simulation_id);
    `;

    await sql`
      CREATE INDEX IF NOT EXISTS idx_subgroup_categories_subgroup_id
      ON subgroup_categories(subgroup_id);
    `;

    await sql`
      CREATE INDEX IF NOT EXISTS idx_subgroup_categories_category_id
      ON subgroup_categories(category_id);
    `;

    return true;
  } catch (error) {
    console.error("Error ensuring sub-group tables exist:", error);
    throw error;
  }
}
