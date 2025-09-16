import { NextResponse } from "next/server";
import { sql } from "@/lib/db";

export async function POST() {
  try {
    // Create the settings table if it doesn't exist
    await sql`
      CREATE TABLE IF NOT EXISTS settings (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        default_fund_id UUID REFERENCES funds(id) ON DELETE SET NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;

    // Check if settings already exist
    const existingSettings = await sql`SELECT id FROM settings LIMIT 1`;

    if (existingSettings.length === 0) {
      // Create initial settings record
      await sql`
        INSERT INTO settings (default_fund_id)
        VALUES (NULL)
      `;
    }

    return NextResponse.json({
      success: true,
      message: "Settings table created and initialized successfully",
    });
  } catch (error) {
    console.error("Error setting up settings table:", error);
    return NextResponse.json(
      { success: false, error: (error as Error).message },
      { status: 500 }
    );
  }
}