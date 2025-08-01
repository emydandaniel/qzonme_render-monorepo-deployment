import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from "@shared/schema";

console.log('🔍 Environment:', process.env.NODE_ENV);
console.log('🔍 DATABASE_URL present:', !!process.env.DATABASE_URL);

if (!process.env.DATABASE_URL) {
  console.error('❌ DATABASE_URL is not set');
  console.error('Please ensure the database is properly configured in render.yaml');
  throw new Error("DATABASE_URL must be set. Check your Render database configuration.");
}

const databaseUrl = process.env.DATABASE_URL;

console.log('🔗 Connecting to PostgreSQL database...');

// Allow self-signed certificates for Render deployment
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

// Configure pool for PostgreSQL
const pool = new Pool({
  connectionString: databaseUrl,
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
    console.log('✅ Successfully connected to PostgreSQL database');
  })
  .catch(err => {
    console.error('❌ Error connecting to PostgreSQL database:', err);
    console.error('Check if the database is properly provisioned in Render');
    process.exit(-1);
  });

const db = drizzle(pool, { schema });

export { db };
