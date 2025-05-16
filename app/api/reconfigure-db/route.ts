import { type NextRequest, NextResponse } from "next/server"
import { testConnection, reconfigureConnection } from "@/lib/db"

// Helper function to delay execution
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

export async function POST(request: NextRequest) {
  try {
    const { connectionString } = await request.json()

    if (!connectionString) {
      return NextResponse.json({ success: false, message: "Connection string is required" }, { status: 400 })
    }

    // First test the connection with retries built in
    const testResult = await testConnection(connectionString)

    if (!testResult.connected) {
      return NextResponse.json(
        {
          success: false,
          message: "Failed to connect with the provided connection string",
          error: testResult.error,
        },
        { status: 400 },
      )
    }

    // If test is successful, reconfigure the connection
    const result = await reconfigureConnection(connectionString)

    if (result.success) {
      return NextResponse.json({
        success: true,
        message: "Database connection reconfigured successfully",
      })
    } else {
      return NextResponse.json(
        {
          success: false,
          message: "Failed to reconfigure database connection",
          error: result.error,
        },
        { status: 500 },
      )
    }
  } catch (error) {
    console.error("Error reconfiguring database:", error)

    // Check if it's a rate limit error
    const errorMessage = (error as Error).message
    if (errorMessage.includes("rate limit") || errorMessage.includes("exceeded the rate limit")) {
      return NextResponse.json(
        {
          success: false,
          message: "Rate limit exceeded. Please wait a moment and try again.",
          error: errorMessage,
          isRateLimit: true,
        },
        { status: 429 }, // Use proper rate limit status code
      )
    }

    return NextResponse.json(
      {
        success: false,
        message: "Error reconfiguring database",
        error: errorMessage,
      },
      { status: 500 },
    )
  }
}
