-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Table for User Metrics (e.g., weight)
CREATE TABLE IF NOT EXISTS public.user_metrics (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    weight_kg NUMERIC(5, 2) CHECK (weight_kg > 0), -- Weight in kilograms, e.g., 70.25
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Add RLS policies for user_metrics
ALTER TABLE public.user_metrics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow users to see their own metrics"
ON public.user_metrics
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Allow users to insert their own metrics"
ON public.user_metrics
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Allow users to update their own metrics"
ON public.user_metrics
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.handle_user_metrics_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update updated_at on user_metrics update
CREATE TRIGGER on_user_metrics_updated
BEFORE UPDATE ON public.user_metrics
FOR EACH ROW
EXECUTE FUNCTION public.handle_user_metrics_updated_at();


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
CREATE INDEX IF NOT EXISTS idx_user_metrics_user_id ON public.user_metrics(user_id);

COMMENT ON TABLE public.user_metrics IS 'Stores user-specific metrics like weight.';
COMMENT ON COLUMN public.user_metrics.weight_kg IS 'User weight in kilograms.';
COMMENT ON TABLE public.protein_intake IS 'Tracks daily protein intake for users.';
COMMENT ON COLUMN public.protein_intake.amount_grams IS 'Protein consumed in grams.';
COMMENT ON COLUMN public.protein_intake.date IS 'Date of protein consumption (no time part).'; ;
