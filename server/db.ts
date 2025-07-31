import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from "@shared/schema";

// Allow self-signed certificates for production deployment
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL must be set. Did you forget to provision a database?");
}

// Configure pool with production-specific settings
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
    console.log('Successfully connected to PostgreSQL database');
  })
  .catch(err => {
    console.error('Error connecting to PostgreSQL database:', err);
    process.exit(-1);
  });

export const db = drizzle(pool, { schema });
