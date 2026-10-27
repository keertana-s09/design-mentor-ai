-- Fix overly permissive INSERT policy on ai_critiques
DROP POLICY IF EXISTS "System can insert critiques" ON public.ai_critiques;

-- Only allow inserting critiques for designs owned by the authenticated user
CREATE POLICY "Designers can insert critiques for their own designs"
ON public.ai_critiques
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.designs 
    WHERE designs.id = design_id 
    AND designs.designer_id = auth.uid()
  )
);