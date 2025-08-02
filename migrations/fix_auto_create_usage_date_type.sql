-- Migration: Fix auto_create_usage table date type
-- This fixes the mismatch between SQL migration (DATE) and Drizzle schema (TEXT)
-- Created: 2025-08-02

-- Check if the table exists and what the current column type is
DO $$
BEGIN
    -- Try to alter the column type if it exists as DATE
    IF EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'auto_create_usage' 
        AND column_name = 'usage_date' 
        AND data_type = 'date'
    ) THEN
        -- Convert DATE to TEXT format
        ALTER TABLE auto_create_usage 
        ALTER COLUMN usage_date TYPE TEXT 
        USING usage_date::TEXT;
        
        RAISE NOTICE 'Converted auto_create_usage.usage_date from DATE to TEXT';
    ELSE
        RAISE NOTICE 'auto_create_usage.usage_date is already TEXT or table does not exist';
    END IF;
    
    -- Also fix ip_address column to be TEXT instead of VARCHAR(45)
    IF EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'auto_create_usage' 
        AND column_name = 'ip_address' 
        AND data_type = 'character varying'
    ) THEN
        ALTER TABLE auto_create_usage 
        ALTER COLUMN ip_address TYPE TEXT;
        
        RAISE NOTICE 'Converted auto_create_usage.ip_address from VARCHAR to TEXT';
    ELSE
        RAISE NOTICE 'auto_create_usage.ip_address is already TEXT or table does not exist';
    END IF;
END $$;
