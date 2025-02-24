/*
  # Add insert policy for profiles

  1. Security Changes
    - Add RLS policy to allow authenticated users to insert their own profile data
*/

-- Add policy for inserting profiles
CREATE POLICY "Users can insert their own profile"
  ON profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);