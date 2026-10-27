CREATE POLICY "Designers can update critiques for their own designs"
ON public.ai_critiques
FOR UPDATE
TO authenticated
USING (EXISTS (
  SELECT 1 FROM designs
  WHERE designs.id = ai_critiques.design_id
  AND designs.designer_id = auth.uid()
))
WITH CHECK (EXISTS (
  SELECT 1 FROM designs
  WHERE designs.id = ai_critiques.design_id
  AND designs.designer_id = auth.uid()
));