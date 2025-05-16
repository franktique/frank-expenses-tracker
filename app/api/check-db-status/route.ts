import { NextResponse } from "next/server"
import { sql, testConnection } from "@/lib/db"

export async function GET() {
  try {
    // First, test if we can connect to the database at all
    const connectionTest = await testConnection()

    if (!connectionTest.connected) {
      console.log("Database connection failed:", connectionTest.error)
      return NextResponse.json({
        initialized: false,
        connected: false,
        error: connectionTest.error,
      })
    }

    // If connected, check if tables exist
    try {
      // Use a simpler query that's less likely to fail
      const result = await sql`
        SELECT EXISTS (
          SELECT 1 FROM information_schema.tables 
          WHERE table_schema = 'public'
          AND table_name = 'categories'
        );
      `

      const initialized = result && result[0] && result[0].exists === true
      return NextResponse.json({ initialized, connected: true })
    } catch (error) {
      // If this query fails, it likely means tables don't exist yet
      console.error("Error checking tables:", error)
      return NextResponse.json({
        initialized: false,
        connected: true,
        error: "Could not check if tables exist: " + (error as Error).message,
      })
    }
  } catch (error) {
    console.error("Error checking database status:", error)
    return NextResponse.json({
      initialized: false,
      connected: false,
      error: "Database status check failed: " + (error as Error).message,
    })
  }
}
