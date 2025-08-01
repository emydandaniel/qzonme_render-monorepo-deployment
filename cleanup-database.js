import { Pool } from 'pg';

async function cleanupDatabase() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    console.log('Connecting to database...');
    
    // Drop all tables and sequences
    const dropCommands = [
      'DROP TABLE IF EXISTS auto_create_generation_log CASCADE;',
      'DROP TABLE IF EXISTS content_cache CASCADE;',
      'DROP TABLE IF EXISTS auto_create_usage CASCADE;',
      'DROP TABLE IF EXISTS quiz_attempts CASCADE;',
      'DROP TABLE IF EXISTS questions CASCADE;',
      'DROP TABLE IF EXISTS quizzes CASCADE;',
      'DROP TABLE IF EXISTS users CASCADE;',
      
      // Drop sequences that might exist
      'DROP SEQUENCE IF EXISTS content_cache_id_seq CASCADE;',
      'DROP SEQUENCE IF EXISTS auto_create_usage_id_seq CASCADE;',
      'DROP SEQUENCE IF EXISTS auto_create_generation_log_id_seq CASCADE;',
      'DROP SEQUENCE IF EXISTS quiz_attempts_id_seq CASCADE;',
      'DROP SEQUENCE IF EXISTS questions_id_seq CASCADE;',
      'DROP SEQUENCE IF EXISTS quizzes_id_seq CASCADE;',
      'DROP SEQUENCE IF EXISTS users_id_seq CASCADE;',
    ];

    for (const command of dropCommands) {
      try {
        console.log(`Executing: ${command}`);
        await pool.query(command);
      } catch (err) {
        console.log(`Skipped (doesn't exist): ${command}`);
      }
    }

    console.log('Database cleanup completed successfully!');
    
  } catch (error) {
    console.error('Database cleanup failed:', error);
  } finally {
    await pool.end();
  }
}

cleanupDatabase();
