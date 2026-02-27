CREATE POLICY "Allow users to delete their own equipment types" 
ON public.equipment_types FOR DELETE 
USING (
  auth.uid() = user_id
);;
