-- Create storage bucket for design images
INSERT INTO storage.buckets (id, name, public) VALUES ('designs', 'designs', true);

-- Storage policies for designs bucket
CREATE POLICY "Anyone can view design images"
ON storage.objects FOR SELECT
USING (bucket_id = 'designs');

CREATE POLICY "Designers can upload their own design images"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'designs' 
  AND auth.uid() IS NOT NULL 
  AND public.has_role(auth.uid(), 'designer')
);

CREATE POLICY "Designers can update their own design images"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'designs' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Designers can delete their own design images"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'designs' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);