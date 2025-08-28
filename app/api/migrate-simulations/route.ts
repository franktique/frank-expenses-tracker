import { NextResponse } from "next/server";
import { sql, testConnection } from "@/lib/db";

export async function GET() {
  try {
    // First, test if we can connect to the database
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

    // Create simulations table
    try {
      await sql`
        CREATE TABLE IF NOT EXISTS simulations (
          id SERIAL PRIMARY KEY,
          name VARCHAR(255) NOT NULL,
          description TEXT,
          user_id INTEGER,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `;
      console.log("Simulations table created or already exists");
    } catch (error) {
      console.error("Error creating simulations table:", error);
      return NextResponse.json(
        {
          success: false,
          message:
            "Error creating simulations table: " + (error as Error).message,
        },
        { status: 500 }
      );
    }

    // Create simulation_budgets table
    try {
      await sql`
        CREATE TABLE IF NOT EXISTS simulation_budgets (
          id SERIAL PRIMARY KEY,
          simulation_id INTEGER NOT NULL REFERENCES simulations(id) ON DELETE CASCADE,
          category_id UUID NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
          efectivo_amount DECIMAL(10,2) DEFAULT 0,
          credito_amount DECIMAL(10,2) DEFAULT 0,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(simulation_id, category_id)
        )
      `;
      console.log("Simulation budgets table created or already exists");
    } catch (error) {
      console.error("Error creating simulation_budgets table:", error);
      return NextResponse.json(
        {
          success: false,
          message:
            "Error creating simulation_budgets table: " +
            (error as Error).message,
        },
        { status: 500 }
      );
    }

    // Create indexes for optimal query performance
    try {
      // Index for simulation_budgets lookups by simulation_id
      await sql`
        CREATE INDEX IF NOT EXISTS idx_simulation_budgets_simulation_id 
        ON simulation_budgets(simulation_id)
      `;

      // Index for simulation_budgets lookups by category_id
      await sql`
        CREATE INDEX IF NOT EXISTS idx_simulation_budgets_category_id 
        ON simulation_budgets(category_id)
      `;

      // Composite index for simulation-category lookups
      await sql`
        CREATE INDEX IF NOT EXISTS idx_simulation_budgets_simulation_category 
        ON simulation_budgets(simulation_id, category_id)
      `;

      // Index for simulations by creation date
      await sql`
        CREATE INDEX IF NOT EXISTS idx_simulations_created_at 
        ON simulations(created_at DESC)
      `;

      console.log("Database indexes created successfully");
    } catch (error) {
      console.error("Error creating indexes:", error);
      return NextResponse.json(
        {
          success: false,
          message: "Error creating indexes: " + (error as Error).message,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Simulation tables and indexes created successfully",
    });
  } catch (error) {
    console.error("Error setting up simulation tables:", error);
    return NextResponse.json(
      {
        success: false,
        error: (error as Error).message,
      },
      { status: 500 }
    );
  }
}
