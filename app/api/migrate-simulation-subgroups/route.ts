/**
 * Database Migration Endpoint
 * Creates the simulation_subgroups and subgroup_categories tables
 * This should be called once during deployment or initial setup
 */

import { NextRequest, NextResponse } from "next/server";
import { ensureSubgroupTablesExist } from "@/lib/subgroup-db-utils";

export async function POST(request: NextRequest) {
  try {
    // Call the function to create tables if they don't exist
    const tablesCreated = await ensureSubgroupTablesExist();

    if (tablesCreated) {
      return NextResponse.json(
        {
          success: true,
          message: "Database tables created successfully",
          tables: ["simulation_subgroups", "subgroup_categories"],
          statusCode: 200,
        },
        { status: 200 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        message: "Database tables already exist",
        tables: ["simulation_subgroups", "subgroup_categories"],
        statusCode: 200,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error running migration:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Migration failed";

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

export async function GET(request: NextRequest) {
  return NextResponse.json(
    {
      success: false,
      error:
        "This endpoint only accepts POST requests. Use POST /api/migrate-simulation-subgroups to run the migration.",
      statusCode: 405,
    },
    { status: 405 }
  );
}
