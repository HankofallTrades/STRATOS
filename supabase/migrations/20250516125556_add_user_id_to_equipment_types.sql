ALTER TABLE public.equipment_types ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;;
