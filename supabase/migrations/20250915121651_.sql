-- Create quests table to replace localStorage system
CREATE TABLE public.quests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  original_title TEXT NOT NULL,
  description TEXT NOT NULL,
  subtasks JSONB NOT NULL DEFAULT '[]'::jsonb,
  reward TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'ongoing' CHECK (status IN ('ongoing', 'completed', 'failed')),
  image_url TEXT,
  location TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE
);

-- Enable RLS for quests
ALTER TABLE public.quests ENABLE ROW LEVEL SECURITY;

-- Create policies for quests
CREATE POLICY "Users can view their own quests" 
ON public.quests 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own quests" 
ON public.quests 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own quests" 
ON public.quests 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own quests" 
ON public.quests 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create character sheet table for RPG attributes
CREATE TABLE public.character_sheet (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  character_name TEXT,
  level INTEGER NOT NULL DEFAULT 1,
  experience_points INTEGER NOT NULL DEFAULT 0,
  -- Core attributes
  strength INTEGER NOT NULL DEFAULT 10,
  dexterity INTEGER NOT NULL DEFAULT 10,
  constitution INTEGER NOT NULL DEFAULT 10,
  intelligence INTEGER NOT NULL DEFAULT 10,
  wisdom INTEGER NOT NULL DEFAULT 10,
  charisma INTEGER NOT NULL DEFAULT 10,
  -- Skills (tracking real-world progress)
  fitness_level INTEGER NOT NULL DEFAULT 1,
  mindfulness_level INTEGER NOT NULL DEFAULT 1,
  creativity_level INTEGER NOT NULL DEFAULT 1,
  productivity_level INTEGER NOT NULL DEFAULT 1,
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS for character sheet
ALTER TABLE public.character_sheet ENABLE ROW LEVEL SECURITY;

-- Create policies for character sheet
CREATE POLICY "Users can view their own character sheet" 
ON public.character_sheet 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own character sheet" 
ON public.character_sheet 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own character sheet" 
ON public.character_sheet 
FOR UPDATE 
USING (auth.uid() = user_id);

-- Create function to update character sheet timestamps
CREATE OR REPLACE FUNCTION public.update_character_sheet_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_character_sheet_updated_at
BEFORE UPDATE ON public.character_sheet
FOR EACH ROW
EXECUTE FUNCTION public.update_character_sheet_updated_at();;
