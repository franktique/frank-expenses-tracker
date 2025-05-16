import { neon, neonConfig } from "@neondatabase/serverless"

// Configure neon with more resilient settings
neonConfig.fetchConnectionCache = true

// Store the current connection string
let currentConnectionString = process.env.DATABASE_URL_NEW || ""

// Helper function to implement exponential backoff for retries
async function withRetry<T>(fn: () => Promise<T>, maxRetries = 3, initialDelay = 1000, factor = 2): Promise<T> {
  let retries = 0
  let delay = initialDelay

  while (true) {
    try {
      return await fn()
    } catch (error) {
      retries++

      // Check if we've hit the rate limit
      const isRateLimit =
        error instanceof Error &&
        (error.message.includes("rate limit") || error.message.includes("exceeded the rate limit"))

      // If we've exceeded max retries or it's not a rate limit error, throw
      if (retries > maxRetries || !isRateLimit) {
        throw error
      }

      // Wait with exponential backoff
      console.log(`Rate limit hit, retrying in ${delay}ms (attempt ${retries}/${maxRetries})`)
      await new Promise((resolve) => setTimeout(resolve, delay))

      // Increase delay for next retry
      delay = delay * factor
    }
  }
}

// Create a safer SQL client that handles connection errors
export function createSafeClient(connectionString?: string) {
  try {
    // Use provided connection string or fall back to the current one
    const dbUrl = connectionString || currentConnectionString

    // Validate that we have a connection string
    if (!dbUrl) {
      console.error("Database connection string is not defined")
      return {
        sql: async () => [],
        connected: false,
        error: "Database connection string is not defined",
      }
    }

    // Create the SQL client
    const client = neon(dbUrl)

    // Wrap the client with retry logic
    const wrappedClient = async (...args: Parameters<typeof client>) => {
      try {
        return await withRetry(() => client(...args))
      } catch (error) {
        console.error("SQL query failed after retries:", error)
        throw error
      }
    }

    // If a new connection string was provided and it works, update the current one
    if (connectionString) {
      currentConnectionString = connectionString
    }

    return {
      sql: wrappedClient,
      connected: true,
      error: null,
    }
  } catch (error) {
    console.error("Failed to initialize database client:", error)
    return {
      sql: async () => [],
      connected: false,
      error: (error as Error).message,
    }
  }
}

// Create a function to test the database connection
export async function testConnection(connectionString?: string) {
  try {
    const { sql, connected, error } = createSafeClient(connectionString)

    if (!connected) {
      return { connected: false, error }
    }

    // Try a simple query with retry logic
    try {
      const result = await withRetry(async () => {
        return await sql`SELECT 1 as test`
      })
      return { connected: true, error: null }
    } catch (dbError) {
      console.error("Database query failed:", dbError)
      return { connected: false, error: (dbError as Error).message }
    }
  } catch (error) {
    console.error("Database connection test failed:", error)
    return { connected: false, error: (error as Error).message }
  }
}

// Function to reconfigure the database connection
export async function reconfigureConnection(connectionString: string) {
  try {
    // Test with retry logic
    const testResult = await withRetry(async () => {
      return await testConnection(connectionString)
    })

    if (testResult.connected) {
      // Update the client with the new connection
      const { sql } = createSafeClient(connectionString)
      return { success: true, sql, error: null }
    } else {
      return { success: false, error: testResult.error }
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error reconfiguring connection",
    }
  }
}

// Export the SQL client
const { sql, connected, error } = createSafeClient()
export { sql, connected, error }
