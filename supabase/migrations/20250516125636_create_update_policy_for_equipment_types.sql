CREATE POLICY "Allow users to update their own equipment types" 
ON public.equipment_types FOR UPDATE 
USING (
  auth.uid() = user_id
)
WITH CHECK (
  auth.uid() = user_id
);;
