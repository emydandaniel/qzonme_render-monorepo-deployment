#!/usr/bin/env node

// Debug script to test and fix auto-create rate limiting
// Run with: node debug-rate-limiting.js

import { db } from './server/db.js';
import { autoCreateUsage } from './shared/schema.js';
import { eq, and } from 'drizzle-orm';

async function debugRateLimiting() {
  console.log('🔍 Debugging Auto-Create Rate Limiting...');
  
  try {
    // Check if the table exists and its structure
    const testQuery = await db.select().from(autoCreateUsage).limit(1);
    console.log('✅ autoCreateUsage table exists and is accessible');
    
    // Get current date
    const today = new Date().toISOString().split('T')[0];
    console.log(`📅 Today's date: ${today}`);
    
    // Check all records in the table
    const allRecords = await db.select().from(autoCreateUsage);
    console.log(`📊 Total records in autoCreateUsage table: ${allRecords.length}`);
    
    if (allRecords.length > 0) {
      console.log('📋 All records:');
      allRecords.forEach((record, index) => {
        console.log(`  ${index + 1}. IP: ${record.ipAddress}, Date: ${record.usageDate}, Count: ${record.usageCount}`);
      });
      
      // Check today's records
      const todayRecords = allRecords.filter(r => r.usageDate === today);
      console.log(`📅 Today's records (${today}): ${todayRecords.length}`);
      todayRecords.forEach((record, index) => {
        console.log(`  ${index + 1}. IP: ${record.ipAddress}, Count: ${record.usageCount}`);
      });
    } else {
      console.log('📋 No records found in autoCreateUsage table');
    }
    
    // Test IP addresses that might be in use
    const testIPs = ['127.0.0.1', '::1', '::ffff:127.0.0.1', 'unknown'];
    
    for (const ip of testIPs) {
      const records = await db
        .select()
        .from(autoCreateUsage)
        .where(
          and(
            eq(autoCreateUsage.ipAddress, ip),
            eq(autoCreateUsage.usageDate, today)
          )
        );
      
      if (records.length > 0) {
        console.log(`🎯 Found records for IP ${ip} today: ${records[0].usageCount} uses`);
      } else {
        console.log(`❌ No records found for IP ${ip} today`);
      }
    }
    
    console.log('✅ Rate limiting debug completed');
    
  } catch (error) {
    console.error('❌ Error during debugging:', error);
    
    // Check if it's a column type error
    if (error.message && error.message.includes('invalid input syntax for type date')) {
      console.log('🔧 Detected DATE type issue - the usage_date column needs to be converted to TEXT');
      console.log('🔧 Please run the fix_auto_create_usage_date_type.sql migration');
    }
  }
  
  process.exit(0);
}

debugRateLimiting();
