/**
 * Subgroup Templates Migration API
 * Creates new tables and adds columns to existing tables for template functionality
 */

import { NextResponse } from "next/server";
import { sql } from "@/lib/db";

/**
 * POST /api/migrate-subgroup-templates
 * Run database migration to create template tables and add columns
 */
export async function POST() {
  try {
    console.log("Starting subgroup templates migration...");

    // Step 1: Create subgroup_templates table
    await sql`
      CREATE TABLE IF NOT EXISTS subgroup_templates (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(255) NOT NULL UNIQUE,
        description TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `;
    console.log("✓ Created subgroup_templates table");

    // Step 2: Create template_subgroups table
    await sql`
      CREATE TABLE IF NOT EXISTS template_subgroups (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        template_id UUID NOT NULL REFERENCES subgroup_templates(id) ON DELETE CASCADE,
        name VARCHAR(255) NOT NULL,
        display_order INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT unique_template_subgroup_name UNIQUE(template_id, name)
      );
    `;
    console.log("✓ Created template_subgroups table");

    // Step 3: Create simulation_applied_templates table
    await sql`
      CREATE TABLE IF NOT EXISTS simulation_applied_templates (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        simulation_id INTEGER NOT NULL REFERENCES simulations(id) ON DELETE CASCADE,
        template_id UUID REFERENCES subgroup_templates(id) ON DELETE SET NULL,
        applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT unique_simulation_template UNIQUE(simulation_id)
      );
    `;
    console.log("✓ Created simulation_applied_templates table");

    // Step 4: Add columns to simulation_subgroups (check if columns exist first)
    try {
      await sql`
        ALTER TABLE simulation_subgroups
        ADD COLUMN IF NOT EXISTS template_subgroup_id UUID REFERENCES template_subgroups(id) ON DELETE SET NULL;
      `;
      console.log("✓ Added template_subgroup_id column to simulation_subgroups");
    } catch (error) {
      console.log("  Column template_subgroup_id may already exist");
    }

    try {
      await sql`
        ALTER TABLE simulation_subgroups
        ADD COLUMN IF NOT EXISTS custom_order INTEGER;
      `;
      console.log("✓ Added custom_order column to simulation_subgroups");
    } catch (error) {
      console.log("  Column custom_order may already exist");
    }

    try {
      await sql`
        ALTER TABLE simulation_subgroups
        ADD COLUMN IF NOT EXISTS custom_visibility BOOLEAN DEFAULT TRUE;
      `;
      console.log("✓ Added custom_visibility column to simulation_subgroups");
    } catch (error) {
      console.log("  Column custom_visibility may already exist");
    }

    // Step 5: Create indexes
    await sql`
      CREATE INDEX IF NOT EXISTS idx_template_subgroups_template_id
      ON template_subgroups(template_id);
    `;
    console.log("✓ Created index idx_template_subgroups_template_id");

    await sql`
      CREATE INDEX IF NOT EXISTS idx_simulation_applied_templates_simulation
      ON simulation_applied_templates(simulation_id);
    `;
    console.log("✓ Created index idx_simulation_applied_templates_simulation");

    await sql`
      CREATE INDEX IF NOT EXISTS idx_simulation_subgroups_template_id
      ON simulation_subgroups(template_subgroup_id);
    `;
    console.log("✓ Created index idx_simulation_subgroups_template_id");

    console.log("Migration completed successfully!");

    return NextResponse.json(
      {
        success: true,
        message: "Subgroup templates migration completed successfully",
        statusCode: 200,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error running subgroup templates migration:", error);
    const errorMessage =
      error instanceof Error
        ? error.message
        : "Failed to run subgroup templates migration";

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
