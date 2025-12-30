import { neon } from '@neondatabase/serverless';

// Initialize Neon database connection
// Uses DATABASE_URL from environment variables
export const sql = neon(process.env.DATABASE_URL!);

// Re-export for convenience
export { neon };

