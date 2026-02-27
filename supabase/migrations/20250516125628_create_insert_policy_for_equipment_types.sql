CREATE POLICY "Allow users to insert their own equipment types" 
ON public.equipment_types FOR INSERT 
WITH CHECK (
  auth.uid() = user_id
);;
