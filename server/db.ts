import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from "@shared/schema";

// Allow self-signed certificates for Render deployment
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

console.log('🔍 Environment:', process.env.NODE_ENV);
console.log('🔍 DATABASE_URL present:', !!process.env.DATABASE_URL);

if (!process.env.DATABASE_URL) {
  console.error('❌ DATABASE_URL is not set');
  console.error('Please ensure the database is properly configured in render.yaml');
  throw new Error("DATABASE_URL must be set. Check your Render database configuration.");
}

console.log('🔗 Connecting to Render PostgreSQL database...');

// Configure pool for Render PostgreSQL
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
  ssl: {
    rejectUnauthorized: false
  }
});

// Add error handling for the pool
pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err);
  process.exit(-1);
});

// Test the connection
pool.connect()
  .then(() => {
    console.log('✅ Successfully connected to Render PostgreSQL database');
  })
  .catch(err => {
    console.error('❌ Error connecting to Render PostgreSQL database:', err);
    console.error('Check if the database is properly provisioned in Render');
    process.exit(-1);
  });

export const db = drizzle(pool, { schema });
