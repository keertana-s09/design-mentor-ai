-- 1. Roles: clients can no longer grant themselves a role.
--    Designers are granted instantly through claim_role(); recruiters file an
--    application that an admin approves with approve_recruiter().
DROP POLICY IF EXISTS "Users can insert their own role on signup" ON public.user_roles;
REVOKE INSERT, UPDATE, DELETE ON public.user_roles FROM anon, authenticated;

CREATE TABLE IF NOT EXISTS public.recruiter_applications (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  created_at timestamptz NOT NULL DEFAULT now(),
  reviewed_at timestamptz
);
GRANT SELECT ON public.recruiter_applications TO authenticated;
GRANT ALL ON public.recruiter_applications TO service_role;
ALTER TABLE public.recruiter_applications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own recruiter application"
ON public.recruiter_applications FOR SELECT TO authenticated
USING (auth.uid() = user_id);

-- Returns the caller's role, 'recruiter_pending', or the role it just granted.
CREATE OR REPLACE FUNCTION public.claim_role(_role public.app_role)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
  existing public.app_role;
BEGIN
  IF uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT role INTO existing FROM public.user_roles WHERE user_id = uid LIMIT 1;
  IF existing IS NOT NULL THEN
    RETURN existing::text;
  END IF;

  IF _role = 'designer' THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (uid, 'designer');
    RETURN 'designer';
  END IF;

  INSERT INTO public.recruiter_applications (user_id) VALUES (uid)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN 'recruiter_pending';
END;
$$;
REVOKE ALL ON FUNCTION public.claim_role(public.app_role) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.claim_role(public.app_role) TO authenticated;

-- Admin-only: run from the SQL editor or with the service role key.
CREATE OR REPLACE FUNCTION public.approve_recruiter(_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.user_roles (user_id, role) VALUES (_user_id, 'recruiter')
  ON CONFLICT (user_id, role) DO NOTHING;
  UPDATE public.recruiter_applications
  SET status = 'approved', reviewed_at = now()
  WHERE user_id = _user_id;
END;
$$;
REVOKE ALL ON FUNCTION public.approve_recruiter(uuid) FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.approve_recruiter(uuid) TO service_role;

-- 2. AI scores are written only by edge functions using the service role.
--    Rows created before this migration were written from the browser, so
--    they stay unverified.
ALTER TABLE public.ai_critiques ADD COLUMN IF NOT EXISTS verified boolean NOT NULL DEFAULT false;
DROP POLICY IF EXISTS "Designers can insert critiques for their own designs" ON public.ai_critiques;
DROP POLICY IF EXISTS "Designers can update critiques for their own designs" ON public.ai_critiques;
REVOKE INSERT, UPDATE, DELETE ON public.ai_critiques FROM anon, authenticated;

ALTER TABLE public.challenge_submissions ADD COLUMN IF NOT EXISTS ai_verified boolean NOT NULL DEFAULT false;

-- Browser sessions cannot set AI fields, and designers cannot set recruiter fields.
CREATE OR REPLACE FUNCTION private.protect_submission_fields()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF coalesce(auth.role(), '') NOT IN ('anon', 'authenticated') THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
    NEW.ai_evaluation := NULL;
    NEW.ai_overall_score := NULL;
    NEW.ai_verified := false;
    NEW.recruiter_feedback := NULL;
    NEW.recruiter_recommendation := NULL;
    NEW.reviewed_at := NULL;
    RETURN NEW;
  END IF;

  NEW.ai_evaluation := OLD.ai_evaluation;
  NEW.ai_overall_score := OLD.ai_overall_score;
  NEW.ai_verified := OLD.ai_verified;
  NEW.challenge_id := OLD.challenge_id;
  NEW.design_id := OLD.design_id;
  NEW.designer_id := OLD.designer_id;

  IF NOT EXISTS (
    SELECT 1 FROM public.challenges c
    WHERE c.id = OLD.challenge_id AND c.recruiter_id = auth.uid()
  ) THEN
    NEW.recruiter_feedback := OLD.recruiter_feedback;
    NEW.recruiter_recommendation := OLD.recruiter_recommendation;
    NEW.reviewed_at := OLD.reviewed_at;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS protect_submission_fields ON public.challenge_submissions;
CREATE TRIGGER protect_submission_fields
BEFORE INSERT OR UPDATE ON public.challenge_submissions
FOR EACH ROW EXECUTE FUNCTION private.protect_submission_fields();

-- 3. A design's images cannot change after upload, so a verified critique
--    always describes the pixels it was given.
CREATE OR REPLACE FUNCTION private.lock_design_images()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF coalesce(auth.role(), '') IN ('anon', 'authenticated') AND (
    NEW.image_url IS DISTINCT FROM OLD.image_url
    OR NEW.storage_path IS DISTINCT FROM OLD.storage_path
    OR NEW.storage_paths IS DISTINCT FROM OLD.storage_paths
    OR NEW.source_url IS DISTINCT FROM OLD.source_url
    OR NEW.designer_id IS DISTINCT FROM OLD.designer_id
  ) THEN
    RAISE EXCEPTION 'Design images cannot be changed after upload. Upload a new version instead.';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS lock_design_images ON public.designs;
CREATE TRIGGER lock_design_images
BEFORE UPDATE ON public.designs
FOR EACH ROW EXECUTE FUNCTION private.lock_design_images();

-- Files in storage are immutable too, and uploads go into the uploader's own folder.
DROP POLICY IF EXISTS "Designers can update their own design images" ON storage.objects;
DROP POLICY IF EXISTS "Designers can upload their own design images" ON storage.objects;
CREATE POLICY "Designers can upload their own design images"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'designs'
  AND auth.uid()::text = (storage.foldername(name))[1]
  AND private.has_role(auth.uid(), 'designer')
);

-- 4. Version history: a design can be a new iteration of an earlier one.
ALTER TABLE public.designs
  ADD COLUMN IF NOT EXISTS parent_design_id uuid REFERENCES public.designs(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_designs_parent_design_id ON public.designs(parent_design_id);

CREATE OR REPLACE FUNCTION private.check_design_parent()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.parent_design_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.designs p
    WHERE p.id = NEW.parent_design_id
      AND p.designer_id = NEW.designer_id
      AND p.id <> NEW.id
  ) THEN
    RAISE EXCEPTION 'A new version must build on one of your own designs.';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS check_design_parent ON public.designs;
CREATE TRIGGER check_design_parent
BEFORE INSERT OR UPDATE OF parent_design_id ON public.designs
FOR EACH ROW EXECUTE FUNCTION private.check_design_parent();

-- 5. Rate limiting for anonymous analyses, called by edge functions only.
CREATE TABLE IF NOT EXISTS private.rate_limits (
  key text PRIMARY KEY,
  window_start timestamptz NOT NULL DEFAULT now(),
  hits integer NOT NULL DEFAULT 0
);

CREATE OR REPLACE FUNCTION public.hit_rate_limit(_key text, _max integer, _window_seconds integer)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_hits integer;
BEGIN
  INSERT INTO private.rate_limits AS r (key, window_start, hits)
  VALUES (_key, now(), 1)
  ON CONFLICT (key) DO UPDATE SET
    hits = CASE WHEN r.window_start < now() - make_interval(secs => _window_seconds) THEN 1 ELSE r.hits + 1 END,
    window_start = CASE WHEN r.window_start < now() - make_interval(secs => _window_seconds) THEN now() ELSE r.window_start END
  RETURNING hits INTO current_hits;
  RETURN current_hits <= _max;
END;
$$;
REVOKE ALL ON FUNCTION public.hit_rate_limit(text, integer, integer) FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.hit_rate_limit(text, integer, integer) TO service_role;
