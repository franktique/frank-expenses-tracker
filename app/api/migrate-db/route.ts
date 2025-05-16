import { NextResponse } from "next/server"
import { sql, testConnection } from "@/lib/db"

export async function POST() {
  try {
    // Test database connection
    const connectionTest = await testConnection()
    
    if (!connectionTest.connected) {
      return NextResponse.json(
        {
          success: false,
          message: "Could not connect to the database: " + connectionTest.error,
        },
        { status: 500 },
      )
    }
    
    try {
      // Check if period_id column already exists
      const columnCheck = await sql`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'incomes' AND column_name = 'period_id'
      `
      
      // Only add the column if it doesn't exist
      if (columnCheck.length === 0) {
        await sql`
          ALTER TABLE incomes 
          ADD COLUMN period_id UUID REFERENCES periods(id)
        `
        console.log("Added period_id column to incomes table")
        
        return NextResponse.json({
          success: true,
          message: "Successfully added period_id column to incomes table",
        })
      } else {
        return NextResponse.json({
          success: true,
          message: "period_id column already exists in incomes table",
        })
      }
    } catch (error) {
      console.error("Error adding period_id to incomes table:", error)
      return NextResponse.json(
        {
          success: false,
          message: "Error adding period_id column: " + (error as Error).message,
        },
        { status: 500 },
      )
    }
  } catch (error) {
    console.error("Error in database migration:", error)
    return NextResponse.json(
      {
        success: false,
        error: (error as Error).message,
      },
      { status: 500 },
    )
  }
}
