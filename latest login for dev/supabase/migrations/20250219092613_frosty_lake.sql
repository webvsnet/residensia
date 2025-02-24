/*
  # Update landlord profile fields

  1. Changes
    - Add new `company_name` column to profiles table
    - Copy data from `company_email` to `company_name` (if exists)
    - Add `company_name` to existing policies

  2. Security
    - Maintain existing RLS policies
*/

-- Add new company_name column
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'profiles' AND column_name = 'company_name'
  ) THEN
    ALTER TABLE profiles ADD COLUMN company_name text;
  END IF;
END $$;

-- Copy existing data if company_email exists
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'profiles' AND column_name = 'company_email'
  ) THEN
    UPDATE profiles 
    SET company_name = company_email 
    WHERE company_email IS NOT NULL;
  END IF;
END $$;