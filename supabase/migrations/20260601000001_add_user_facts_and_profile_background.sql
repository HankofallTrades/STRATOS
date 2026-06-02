-- Living profile: user_facts table + profile background fields

-- 1. user_facts: one row per "model of you" item
CREATE TABLE public.user_facts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('goal','constraint','schedule','preference','equipment')),
  content TEXT NOT NULL CHECK (length(trim(content)) > 0),
  detail JSONB,
  source TEXT NOT NULL DEFAULT 'user' CHECK (source IN ('user','agent')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','pending','dismissed')),
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL
);

COMMENT ON TABLE public.user_facts IS 'Structured, user/agent-authored "model of you" facts the agent reasons over.';
COMMENT ON COLUMN public.user_facts.category IS 'goal | constraint | schedule | preference | equipment.';
COMMENT ON COLUMN public.user_facts.detail IS 'Optional structured payload; unused by v1 UI, reserved for later.';
COMMENT ON COLUMN public.user_facts.source IS 'Internal provenance for agent-write safety; never shown to the user.';
COMMENT ON COLUMN public.user_facts.status IS 'active | pending (reserved for agent proposals) | dismissed.';

ALTER TABLE public.user_facts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own facts"
  ON public.user_facts FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own facts"
  ON public.user_facts FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own facts"
  ON public.user_facts FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete their own facts"
  ON public.user_facts FOR DELETE USING (auth.uid() = user_id);

CREATE INDEX idx_user_facts_user_status ON public.user_facts(user_id, status);

-- 2. profiles: training background fields
ALTER TABLE public.profiles
  ADD COLUMN experience_level TEXT CHECK (experience_level IN ('beginner','intermediate','advanced')),
  ADD COLUMN training_age_years NUMERIC;

COMMENT ON COLUMN public.profiles.experience_level IS 'Self-reported training experience level.';
COMMENT ON COLUMN public.profiles.training_age_years IS 'Years of consistent training.';
