/**
 * localStorage Migration API
 * One-time migration of localStorage data to database
 */

import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";

interface MigrationRequest {
  subgroupOrder?: string[];
  visibilityState?: Record<string, boolean>;
}

/**
 * POST /api/simulations/[id]/migrate-localstorage
 * Migrate localStorage data (subgroup order and visibility) to database
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const simulationId = parseInt(id, 10);

    if (isNaN(simulationId)) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid simulation ID",
          statusCode: 400,
        },
        { status: 400 }
      );
    }

    // Parse request body
    let requestBody: MigrationRequest;
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

    const { subgroupOrder, visibilityState } = requestBody;

    let migratedOrderCount = 0;
    let migratedVisibilityCount = 0;

    // Migrate subgroup ordering
    if (subgroupOrder && Array.isArray(subgroupOrder)) {
      for (let i = 0; i < subgroupOrder.length; i++) {
        const subgroupId = subgroupOrder[i];
        try {
          const result = await sql`
            UPDATE simulation_subgroups
            SET custom_order = ${i}
            WHERE id = ${subgroupId} AND simulation_id = ${simulationId}
          `;

          // Count rows affected (Neon returns different formats)
          const rowCount = Array.isArray(result) ? result.length : (result.rowCount || 0);
          if (rowCount > 0) {
            migratedOrderCount++;
          }
        } catch (error) {
          console.error(`Failed to update order for subgroup ${subgroupId}:`, error);
          // Continue with other subgroups
        }
      }
      console.log(`Migrated order for ${migratedOrderCount} subgroups`);
    }

    // Migrate visibility state
    if (visibilityState && typeof visibilityState === "object") {
      for (const [itemId, isVisible] of Object.entries(visibilityState)) {
        try {
          // Try to update as subgroup first
          const result = await sql`
            UPDATE simulation_subgroups
            SET custom_visibility = ${isVisible}
            WHERE id = ${itemId} AND simulation_id = ${simulationId}
          `;

          // Count rows affected
          const rowCount = Array.isArray(result) ? result.length : (result.rowCount || 0);
          if (rowCount > 0) {
            migratedVisibilityCount++;
          }
        } catch (error) {
          console.error(`Failed to update visibility for item ${itemId}:`, error);
          // Continue with other items
        }
      }
      console.log(`Migrated visibility for ${migratedVisibilityCount} items`);
    }

    // Mark migration as complete (store in a migrations tracking table or just log)
    console.log(`localStorage migration completed for simulation ${simulationId}`);

    return NextResponse.json(
      {
        success: true,
        message: "localStorage migration completed",
        details: {
          subgroupsOrderMigrated: migratedOrderCount,
          visibilityMigrated: migratedVisibilityCount,
        },
        statusCode: 200,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error migrating localStorage data:", error);
    const errorMessage =
      error instanceof Error
        ? error.message
        : "Failed to migrate localStorage data";

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
