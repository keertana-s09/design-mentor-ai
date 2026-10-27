-- Allow recruiters to view all user roles (needed to list designers)
CREATE POLICY "Recruiters can view all roles"
ON public.user_roles
FOR SELECT
USING (
  has_role(auth.uid(), 'recruiter'::app_role)
);
