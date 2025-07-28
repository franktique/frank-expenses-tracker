import { NextResponse } from "next/server";
import { sql, testConnection } from "@/lib/db";

export async function POST() {
  try {
    // Test database connection
    const connectionTest = await testConnection();

    if (!connectionTest.connected) {
      return NextResponse.json(
        {
          success: false,
          message: "Could not connect to the database: " + connectionTest.error,
        },
        { status: 500 }
      );
    }

    try {
      // Create estudios table
      await sql`
        CREATE TABLE IF NOT EXISTS estudios (
          id SERIAL PRIMARY KEY,
          name VARCHAR(255) NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `;
      console.log("Estudios table created or already exists");

      // Create estudio_groupers junction table
      await sql`
        CREATE TABLE IF NOT EXISTS estudio_groupers (
          id SERIAL PRIMARY KEY,
          estudio_id INTEGER NOT NULL REFERENCES estudios(id) ON DELETE CASCADE,
          grouper_id INTEGER NOT NULL REFERENCES groupers(id) ON DELETE CASCADE,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(estudio_id, grouper_id)
        )
      `;
      console.log("Estudio_groupers table created or already exists");

      // Create indexes for faster lookups
      await sql`
        CREATE INDEX IF NOT EXISTS idx_estudio_groupers_estudio_id ON estudio_groupers(estudio_id)
      `;
      console.log("Index on estudio_id created or already exists");

      await sql`
        CREATE INDEX IF NOT EXISTS idx_estudio_groupers_grouper_id ON estudio_groupers(grouper_id)
      `;
      console.log("Index on grouper_id created or already exists");

      return NextResponse.json({
        success: true,
        message: "Estudios database schema created successfully",
      });
    } catch (error) {
      console.error("Error creating estudios schema:", error);
      return NextResponse.json(
        {
          success: false,
          message:
            "Error creating estudios schema: " + (error as Error).message,
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("Error in estudios migration:", error);
    return NextResponse.json(
      {
        success: false,
        error: (error as Error).message,
      },
      { status: 500 }
    );
  }
}
