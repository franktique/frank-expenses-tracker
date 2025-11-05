/**
 * Sub-Group Database Utilities
 * Handles database operations for simulation sub-groups
 */

import { sql } from "@neondatabase/serverless";
import type {
  Subgroup,
  CreateSubgroupRequest,
  UpdateSubgroupRequest,
} from "@/types/simulation";

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

    return result.rows.map((row: any) => ({
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

    if (existingSubgroup.rows.length > 0) {
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

    const nextDisplayOrder = (maxOrderResult.rows[0] as any).next_order;

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

    const subgroupId = (subgroupResult.rows[0] as any).id;

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
      id: (subgroupResult.rows[0] as any).id,
      simulationId: (subgroupResult.rows[0] as any).simulationId,
      name: (subgroupResult.rows[0] as any).name,
      displayOrder: (subgroupResult.rows[0] as any).displayOrder,
      createdAt: (subgroupResult.rows[0] as any).createdAt.toISOString(),
      updatedAt: (subgroupResult.rows[0] as any).updatedAt.toISOString(),
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

    if (existingSubgroup.rows.length === 0) {
      throw new Error("Sub-group not found");
    }

    const currentSubgroup = existingSubgroup.rows[0] as any;

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

      if (duplicateName.rows.length > 0) {
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

    if (updateResult.rows.length === 0) {
      throw new Error("Failed to update sub-group");
    }

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
      id: (updateResult.rows[0] as any).id,
      simulationId: (updateResult.rows[0] as any).simulationId,
      name: (updateResult.rows[0] as any).name,
      displayOrder: (updateResult.rows[0] as any).displayOrder,
      createdAt: (updateResult.rows[0] as any).createdAt.toISOString(),
      updatedAt: (updateResult.rows[0] as any).updatedAt.toISOString(),
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

    if (existingSubgroup.rows.length === 0) {
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
 * Used for migration endpoint
 */
export async function ensureSubgroupTablesExist(): Promise<boolean> {
  try {
    // Check if simulation_subgroups table exists
    const tableCheckResult = await sql`
      SELECT EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_name = 'simulation_subgroups'
      ) as exists;
    `;

    const tableExists = (tableCheckResult.rows[0] as any).exists;

    if (tableExists) {
      return true;
    }

    // Create simulation_subgroups table
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

    // Create subgroup_categories table
    await sql`
      CREATE TABLE IF NOT EXISTS subgroup_categories (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        subgroup_id UUID NOT NULL REFERENCES simulation_subgroups(id) ON DELETE CASCADE,
        category_id INTEGER NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
        order_within_subgroup INTEGER DEFAULT 0,
        UNIQUE(subgroup_id, category_id)
      );
    `;

    // Create indexes
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
