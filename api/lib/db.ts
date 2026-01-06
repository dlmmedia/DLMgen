import { neon } from '@neondatabase/serverless';

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

// Helper to check if database is configured
export function isDatabaseConfigured(): boolean {
  return !!DATABASE_URL;
}

// Create the database connection
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const sql: any = DATABASE_URL 
  ? neon(DATABASE_URL)
  : function(_strings: TemplateStringsArray, ..._values: unknown[]): Promise<never> {
      console.error('[DB] CRITICAL: DATABASE_URL environment variable is not set');
      console.error('[DB] Please configure DATABASE_URL in Vercel Environment Variables');
      return Promise.reject(new Error(
        'Database not configured. Please set DATABASE_URL environment variable in Vercel. ' +
        'Go to: Vercel Dashboard > Project Settings > Environment Variables'
      ));
    };

// Re-export for convenience
export { neon };

