import { neon, NeonQueryFunction } from '@neondatabase/serverless';

// Check if DATABASE_URL is configured
const DATABASE_URL = process.env.DATABASE_URL;

/**
 * Initialize Neon database connection
 * Uses DATABASE_URL from environment variables
 * 
 * IMPORTANT: Make sure DATABASE_URL is set in Vercel Environment Variables:
 * 1. Go to Vercel Dashboard > Your Project > Settings > Environment Variables
 * 2. Add DATABASE_URL with your Neon connection string
 * 3. The format should be: postgresql://user:password@host/database?sslmode=require
 */
function createDbConnection(): NeonQueryFunction<false, false> {
  if (!DATABASE_URL) {
    console.error('[DB] CRITICAL: DATABASE_URL environment variable is not set');
    console.error('[DB] Please configure DATABASE_URL in Vercel Environment Variables');
    // Return a dummy function that throws helpful errors
    return (async () => {
      throw new Error(
        'Database not configured. Please set DATABASE_URL environment variable in Vercel. ' +
        'Go to: Vercel Dashboard > Project Settings > Environment Variables'
      );
    }) as unknown as NeonQueryFunction<false, false>;
  }
  
  try {
    console.log('[DB] Initializing database connection...');
    const connection = neon(DATABASE_URL);
    console.log('[DB] Database connection initialized successfully');
    return connection;
  } catch (error) {
    console.error('[DB] Failed to initialize database connection:', error);
    throw error;
  }
}

export const sql = createDbConnection();

// Helper to check if database is configured
export function isDatabaseConfigured(): boolean {
  return !!DATABASE_URL;
}

// Re-export for convenience
export { neon };

