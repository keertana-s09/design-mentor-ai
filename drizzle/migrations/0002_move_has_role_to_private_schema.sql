CREATE SCHEMA IF NOT EXISTS private;
REVOKE ALL ON SCHEMA private FROM anon;
GRANT USAGE ON SCHEMA private TO authenticated, service_role;

CREATE OR REPLACE FUNCTION private.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

REVOKE ALL ON FUNCTION private.has_role(uuid, public.app_role) FROM public, anon;
GRANT EXECUTE ON FUNCTION private.has_role(uuid, public.app_role) TO authenticated, service_role;

-- Repoint policies at the private helper
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Recruiters can view designer profiles" ON public.profiles;
CREATE POLICY "Users can view their own profile"
ON public.profiles FOR SELECT TO authenticated
USING (auth.uid() = user_id);
CREATE POLICY "Recruiters can view designer profiles"
ON public.profiles FOR SELECT TO authenticated
USING (private.has_role(auth.uid(), 'recruiter') AND private.has_role(user_id, 'designer'));

DROP POLICY IF EXISTS "Recruiters can view designs" ON public.designs;
CREATE POLICY "Recruiters can view designs"
ON public.designs FOR SELECT TO authenticated
USING (private.has_role(auth.uid(), 'recruiter'));

DROP POLICY IF EXISTS "Designers can insert their own designs" ON public.designs;
CREATE POLICY "Designers can insert their own designs"
ON public.designs FOR INSERT TO authenticated
WITH CHECK (auth.uid() = designer_id AND private.has_role(auth.uid(), 'designer'));

DROP POLICY IF EXISTS "Recruiters can view critiques" ON public.ai_critiques;
CREATE POLICY "Recruiters can view critiques"
ON public.ai_critiques FOR SELECT TO authenticated
USING (private.has_role(auth.uid(), 'recruiter'));

DROP POLICY IF EXISTS "Recruiters can view designer roles" ON public.user_roles;
CREATE POLICY "Recruiters can view designer roles"
ON public.user_roles FOR SELECT TO authenticated
USING (private.has_role(auth.uid(), 'recruiter') AND role = 'designer');

DROP POLICY IF EXISTS "Recruiters can insert design evaluations" ON public.design_evaluations;
CREATE POLICY "Recruiters can insert design evaluations"
ON public.design_evaluations FOR INSERT TO authenticated
WITH CHECK (auth.uid() = recruiter_id AND private.has_role(auth.uid(), 'recruiter'));

DROP POLICY IF EXISTS "Recruiters can update their design evaluations" ON public.design_evaluations;
CREATE POLICY "Recruiters can update their design evaluations"
ON public.design_evaluations FOR UPDATE TO authenticated
USING (auth.uid() = recruiter_id AND private.has_role(auth.uid(), 'recruiter'))
WITH CHECK (auth.uid() = recruiter_id);

DROP POLICY IF EXISTS "Recruiters can insert evaluations" ON public.recruiter_evaluations;
CREATE POLICY "Recruiters can insert evaluations"
ON public.recruiter_evaluations FOR INSERT TO authenticated
WITH CHECK (auth.uid() = recruiter_id AND private.has_role(auth.uid(), 'recruiter'));

DROP POLICY IF EXISTS "Recruiters can update their own evaluations" ON public.recruiter_evaluations;
CREATE POLICY "Recruiters can update their own evaluations"
ON public.recruiter_evaluations FOR UPDATE TO authenticated
USING (auth.uid() = recruiter_id AND private.has_role(auth.uid(), 'recruiter'));

DROP POLICY IF EXISTS "Recruiters can view their own evaluations" ON public.recruiter_evaluations;
CREATE POLICY "Recruiters can view their own evaluations"
ON public.recruiter_evaluations FOR SELECT TO authenticated
USING (auth.uid() = recruiter_id AND private.has_role(auth.uid(), 'recruiter'));

REVOKE ALL ON FUNCTION public.has_role(uuid, public.app_role) FROM authenticated;
