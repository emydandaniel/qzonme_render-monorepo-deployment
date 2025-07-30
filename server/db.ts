import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";
import * as schema from "@shared/schema";
import { mockDb } from './mock-db';

neonConfig.webSocketConstructor = ws;

// Use mock database for development if DATABASE_URL is not properly configured
const useMockDb = !process.env.DATABASE_URL || process.env.DATABASE_URL.includes('localhost:5432');

if (useMockDb) {
  console.log('🔧 Using mock database for development...');
}

export const db = useMockDb ? (mockDb as any) : drizzle({ client: new Pool({ connectionString: process.env.DATABASE_URL }), schema });
export const pool = useMockDb ? null : new Pool({ connectionString: process.env.DATABASE_URL });
