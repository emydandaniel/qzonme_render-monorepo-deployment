import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";
import * as schema from "@shared/schema";

neonConfig.webSocketConstructor = ws;

// Check if DATABASE_URL is available
export let pool: Pool | null = null;
export let db: any = null;
export const isDbAvailable = !!process.env.DATABASE_URL;

// Initialize database if URL is available, otherwise db will be null
// and the app will fall back to in-memory storage
if (process.env.DATABASE_URL) {
  try {
    console.log("Database URL found, initializing PostgreSQL connection...");
    pool = new Pool({ connectionString: process.env.DATABASE_URL });
    db = drizzle({ client: pool, schema });
    console.log("PostgreSQL connection established successfully.");
  } catch (error) {
    console.error("Failed to connect to PostgreSQL:", error);
    pool = null;
    db = null;
  }
} else {
  console.warn("DATABASE_URL not set, falling back to in-memory storage.");
}
