import { neon, neonConfig } from '@neondatabase/serverless';

// Configure neon with more resilient settings
neonConfig.fetchConnectionCache = true;

// currentConnectionString removed to avoid stale values before dotenv loads

// Helper function to implement exponential backoff for retries
async function withRetry<T>(
  fn: () => Promise<T>,
  maxRetries = 3,
  initialDelay = 1000,
  factor = 2
): Promise<T> {
  let retries = 0;
  let delay = initialDelay;

  while (true) {
    try {
      return await fn();
    } catch (error) {
      retries++;

      // Check if we've hit the rate limit
      const isRateLimit =
        error instanceof Error &&
        (error.message.includes('rate limit') ||
          error.message.includes('exceeded the rate limit'));

      // If we've exceeded max retries or it's not a rate limit error, throw
      if (retries > maxRetries || !isRateLimit) {
        throw error;
      }

      // Wait with exponential backoff
      console.log(
        `Rate limit hit, retrying in ${delay}ms (attempt ${retries}/${maxRetries})`
      );
      await new Promise((resolve) => setTimeout(resolve, delay));

      // Increase delay for next retry
      delay = delay * factor;
    }
  }
}

// Create a safer SQL client that handles connection errors
export function createSafeClient(connectionString?: string) {
  try {
    // Use provided connection string or fall back to process.env.DATABASE_URL_NEW
    const dbUrl = connectionString || process.env.DATABASE_URL_NEW || '';

    // Validate that we have a connection string
    if (!dbUrl) {
      console.error('Database connection string is not defined');
      // Return a dummy client that reflects the error state
      const dummySql = async () => {
        throw new Error('Database connection string is not defined');
      };
      (dummySql as any).query = async () => {
        throw new Error('Database connection string is not defined');
      };
      return {
        sql: dummySql as any, // Cast to any to satisfy NeonQueryFunction type if needed
        connected: false,
        error: 'Database connection string is not defined',
      };
    }

    // Create the SQL client from neon
    const client = neon(dbUrl); // client is NeonQueryFunction<false, false>

    // Wrapper for the tagged template usage: client`...`
    const sqlTaggedTemplate = async (...args: Parameters<typeof client>) => {
      try {
        return await withRetry(() => client(...args));
      } catch (error) {
        console.error('SQL tagged template query failed after retries:', error);
        throw error;
      }
    };

    // Wrapper for the conventional query usage: client.query(...)
    const sqlQuery = async (queryText: string, values?: any[]) => {
      try {
        return await withRetry(() => client.query(queryText, values));
      } catch (error) {
        console.error('SQL conventional query failed after retries:', error);
        throw error;
      }
    };

    // Assign the .query method to the tagged template function object
    // This makes the returned `sql` object behave like the original `neon` client
    const sql = Object.assign(sqlTaggedTemplate, { query: sqlQuery });

    return {
      sql: sql as any, // Cast to any to satisfy external type expectations if necessary, internally it's structured correctly
      connected: true,
      error: null,
    };
  } catch (error) {
    console.error('Failed to initialize database client:', error);
    const dummySql = async () => {
      throw error;
    };
    (dummySql as any).query = async () => {
      throw error;
    };
    return {
      sql: dummySql as any,
      connected: false,
      error: (error as Error).message,
    };
  }
}

// Create a function to test the database connection
export async function testConnection(connectionString?: string) {
  try {
    const { sql, connected, error } = createSafeClient(connectionString);

    if (!connected) {
      return { connected: false, error };
    }

    // Try a simple query with retry logic
    try {
      const result = await withRetry(async () => {
        return await sql`SELECT 1 as test`;
      });
      return { connected: true, error: null };
    } catch (dbError) {
      console.error('Database query failed:', dbError);
      return { connected: false, error: (dbError as Error).message };
    }
  } catch (error) {
    console.error('Database connection test failed:', error);
    return { connected: false, error: (error as Error).message };
  }
}

// Function to reconfigure the database connection
export async function reconfigureConnection(connectionString: string) {
  try {
    // Test with retry logic
    const testResult = await testConnection(connectionString);

    if (testResult.connected) {
      // Return a new client configured with the new connection string
      const { sql, error: clientError } = createSafeClient(connectionString);
      if (clientError) {
        return { success: false, error: clientError };
      }
      return { success: true, sql, error: null };
    } else {
      return { success: false, error: testResult.error };
    }
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : 'Unknown error reconfiguring connection',
    };
  }
}

// Export the SQL client
const { sql, connected, error } = createSafeClient();
export { sql, connected, error };
