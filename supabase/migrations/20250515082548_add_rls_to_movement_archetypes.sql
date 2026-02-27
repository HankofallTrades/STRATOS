CREATE POLICY "Authenticated users can select movement archetypes"
ON public.movement_archetypes FOR SELECT
USING (auth.role() = 'authenticated');;
