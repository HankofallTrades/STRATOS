CREATE POLICY "Allow users to read their own and global equipment types" 
ON public.equipment_types FOR SELECT 
USING (
  (auth.uid() = user_id) OR (user_id IS NULL)
);;
