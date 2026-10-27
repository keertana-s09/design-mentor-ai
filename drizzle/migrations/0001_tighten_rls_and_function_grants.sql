-- 1. profiles: no longer expose every user's email/personal data to all authenticated users
DROP POLICY IF EXISTS "Users can view all profiles" ON public.profiles;

CREATE POLICY "Users can view their own profile"
ON public.profiles FOR SELECT TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Recruiters can view designer profiles"
ON public.profiles FOR SELECT TO authenticated
USING (
  public.has_role(auth.uid(), 'recruiter')
  AND public.has_role(user_id, 'designer')
);

-- 2. designs: only the owning designer and recruiters can read
DROP POLICY IF EXISTS "Anyone can view designs" ON public.designs;

CREATE POLICY "Designers can view their own designs"
ON public.designs FOR SELECT TO authenticated
USING (auth.uid() = designer_id);

CREATE POLICY "Recruiters can view designs"
ON public.designs FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'recruiter'));

-- 3. ai_critiques: scope to the design owner and recruiters
DROP POLICY IF EXISTS "Authenticated users can view critiques" ON public.ai_critiques;

CREATE POLICY "Designers can view critiques for their own designs"
ON public.ai_critiques FOR SELECT TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.designs d
  WHERE d.id = ai_critiques.design_id AND d.designer_id = auth.uid()
));

CREATE POLICY "Recruiters can view critiques"
ON public.ai_critiques FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'recruiter'));

-- 4. user_roles: recruiters only need to see designer role rows
DROP POLICY IF EXISTS "Recruiters can view all roles" ON public.user_roles;

CREATE POLICY "Recruiters can view designer roles"
ON public.user_roles FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'recruiter') AND role = 'designer');

-- 5. SECURITY DEFINER function exposure: remove API-role EXECUTE where not needed
REVOKE ALL ON FUNCTION public.has_role(uuid, public.app_role) FROM anon, public;
REVOKE ALL ON FUNCTION public.get_user_role(uuid) FROM anon, authenticated, public;
REVOKE ALL ON FUNCTION public.update_updated_at_column() FROM anon, authenticated, public;
