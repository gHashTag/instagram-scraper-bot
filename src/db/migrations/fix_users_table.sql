-- Migration to fix users table schema
-- Fix telegram_id type and add missing is_bot column

-- 1. Change telegram_id from INTEGER to BIGINT to support large Telegram IDs
ALTER TABLE users ALTER COLUMN telegram_id TYPE BIGINT;

-- 2. Add missing is_bot column
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_bot BOOLEAN DEFAULT false NOT NULL;

-- 3. Add missing language_code column if it doesn't exist
ALTER TABLE users ADD COLUMN IF NOT EXISTS language_code VARCHAR(10);

-- Update any existing test data to ensure compatibility
UPDATE users SET is_bot = false WHERE is_bot IS NULL; 