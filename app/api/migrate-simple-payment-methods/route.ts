import { NextResponse } from "next/server";
import { sql } from "@/lib/db";

export async function POST() {
  try {
    console.log("Starting simple payment methods migration...");

    // Check if column already exists
    const columnExists = await sql`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'estudio_groupers' 
      AND column_name = 'payment_methods'
    `;

    if (columnExists.length > 0) {
      return NextResponse.json({
        success: true,
        message: "Payment methods column already exists",
        skipped: true,
      });
    }

    // Add payment_methods column
    await sql`
      ALTER TABLE estudio_groupers 
      ADD COLUMN payment_methods TEXT[] DEFAULT NULL
    `;

    // Create index for efficient querying
    await sql`
      CREATE INDEX IF NOT EXISTS idx_estudio_groupers_payment_methods 
      ON estudio_groupers USING GIN(payment_methods)
    `;

    // Add column comment
    await sql`
      COMMENT ON COLUMN estudio_groupers.payment_methods IS 'Array of payment methods to include for this agrupador (cash, credit, debit). NULL means all methods are included.'
    `;

    console.log("Simple payment methods migration completed successfully");

    return NextResponse.json({
      success: true,
      message: "Payment methods column added successfully",
    });
  } catch (error) {
    console.error("Simple payment methods migration failed:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Migration failed",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
