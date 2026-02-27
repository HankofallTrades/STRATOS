-- Drop the redundant existing policies
DROP POLICY IF EXISTS "Authenticated users can select movement archetypes" ON "public"."movement_archetypes";
DROP POLICY IF EXISTS "read_archetypes" ON "public"."movement_archetypes";

-- Create a new comprehensive policy that allows both authenticated and anonymous access
CREATE POLICY "allow_public_read_movement_archetypes" 
ON "public"."movement_archetypes" 
FOR SELECT 
TO public 
USING (auth.role() IN ('authenticated', 'anon'));;
