import { Pool } from 'pg';

async function testConnection() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    console.log('🔍 Testing database connection...');
    
    // Test basic connection
    const client = await pool.connect();
    console.log('✅ Database connection successful!');
    
    // Test creating a user
    console.log('🧪 Testing user creation...');
    const result = await client.query(
      'INSERT INTO users (username) VALUES ($1) RETURNING *',
      ['test-user-' + Date.now()]
    );
    console.log('✅ User created successfully:', result.rows[0]);
    
    // Test querying users
    const usersResult = await client.query('SELECT * FROM users ORDER BY id DESC LIMIT 5');
    console.log('✅ Users in database:', usersResult.rows);
    
    client.release();
    console.log('🎉 All database tests passed! The database is working correctly.');
    
  } catch (error) {
    console.error('❌ Database test failed:', error);
  } finally {
    await pool.end();
  }
}

testConnection();
