-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Table for Protein Intake Logging
CREATE TABLE IF NOT EXISTS public.protein_intake (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    amount_grams INTEGER NOT NULL CHECK (amount_grams > 0),
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Add RLS policies for protein_intake
ALTER TABLE public.protein_intake ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow users to see their own protein intake"
ON public.protein_intake
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Allow users to insert their own protein intake"
ON public.protein_intake
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Allow users to update their own protein intake"
ON public.protein_intake
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Allow users to delete their own protein intake"
ON public.protein_intake
FOR DELETE
USING (auth.uid() = user_id);

-- Add indexes for frequent queries
CREATE INDEX IF NOT EXISTS idx_protein_intake_user_date ON public.protein_intake(user_id, date);

COMMENT ON TABLE public.protein_intake IS 'Tracks daily protein intake for users.';
COMMENT ON COLUMN public.protein_intake.amount_grams IS 'Protein consumed in grams.';
COMMENT ON COLUMN public.protein_intake.date IS 'Date of protein consumption (no time part).';

-- Note: We are relying on the existing public.profiles table for user weight.
-- Ensure RLS on public.profiles allows users to update their own 'weight' column.
-- Example policy that should ideally exist on profiles (if not already):
-- CREATE POLICY "Allow users to update their own profile"
-- ON public.profiles
-- FOR UPDATE
-- USING (auth.uid() = id)
-- WITH CHECK (auth.uid() = id); 