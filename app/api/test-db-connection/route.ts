import { NextResponse } from "next/server"
import { sql, testConnection } from "@/lib/db"

export async function GET() {
  try {
    // Test basic connection
    const connectionTest = await testConnection()

    if (!connectionTest.connected) {
      return NextResponse.json({
        success: false,
        message: "Failed to connect to the database: " + connectionTest.error,
        details: {
          databaseUrl: process.env.DATABASE_URL ? "Configured (masked for security)" : "Not configured",
          postgresUrl: process.env.POSTGRES_URL ? "Configured (masked for security)" : "Not configured",
          pgHost: process.env.PGHOST || "Not configured",
          pgUser: process.env.PGUSER || "Not configured",
          pgDatabase: process.env.PGDATABASE || "Not configured",
        },
      })
    }

    // If connected, try a simple query
    try {
      const result = await sql`SELECT current_database() as db_name, current_user as username, version() as version`

      return NextResponse.json({
        success: true,
        message: "Successfully connected to the database",
        details: {
          database: result[0].db_name,
          user: result[0].username,
          version: result[0].version,
        },
      })
    } catch (error) {
      return NextResponse.json({
        success: false,
        message: "Connected to database but failed to execute query",
        details: {
          error: (error as Error).message,
        },
      })
    }
  } catch (error) {
    return NextResponse.json({
      success: false,
      message: "Error testing database connection",
      details: {
        error: (error as Error).message,
      },
    })
  }
}
