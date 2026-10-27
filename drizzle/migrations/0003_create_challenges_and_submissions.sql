CREATE TABLE public.challenges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recruiter_id uuid NOT NULL,
  title text NOT NULL DEFAULT 'Untitled challenge',
  problem_statement text,
  target_user text,
  primary_goal text,
  constraints text,
  evaluation_criteria jsonb NOT NULL DEFAULT '[]'::jsonb,
  status text NOT NULL DEFAULT 'draft',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.challenges TO authenticated;
GRANT ALL ON public.challenges TO service_role;

ALTER TABLE public.challenges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Recruiters can insert their own challenges"
ON public.challenges FOR INSERT TO authenticated
WITH CHECK (auth.uid() = recruiter_id AND private.has_role(auth.uid(), 'recruiter'::app_role));

CREATE POLICY "Recruiters can view their own challenges"
ON public.challenges FOR SELECT TO authenticated
USING (auth.uid() = recruiter_id);

CREATE POLICY "Designers can view published challenges"
ON public.challenges FOR SELECT TO authenticated
USING (status = 'published' AND private.has_role(auth.uid(), 'designer'::app_role));

CREATE POLICY "Recruiters can update their own challenges"
ON public.challenges FOR UPDATE TO authenticated
USING (auth.uid() = recruiter_id) WITH CHECK (auth.uid() = recruiter_id);

CREATE POLICY "Recruiters can delete their own challenges"
ON public.challenges FOR DELETE TO authenticated
USING (auth.uid() = recruiter_id);

CREATE TRIGGER challenges_updated_at
BEFORE UPDATE ON public.challenges
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.challenge_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  challenge_id uuid NOT NULL REFERENCES public.challenges(id) ON DELETE CASCADE,
  designer_id uuid NOT NULL,
  design_id uuid NOT NULL REFERENCES public.designs(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'submitted',
  ai_evaluation jsonb,
  ai_overall_score integer,
  recruiter_feedback jsonb,
  recruiter_recommendation text,
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (challenge_id, design_id)
);

CREATE INDEX challenge_submissions_challenge_idx ON public.challenge_submissions(challenge_id);
CREATE INDEX challenge_submissions_designer_idx ON public.challenge_submissions(designer_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.challenge_submissions TO authenticated;
GRANT ALL ON public.challenge_submissions TO service_role;

ALTER TABLE public.challenge_submissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Designers can insert their own submissions"
ON public.challenge_submissions FOR INSERT TO authenticated
WITH CHECK (auth.uid() = designer_id AND private.has_role(auth.uid(), 'designer'::app_role));

CREATE POLICY "Designers can view their own submissions"
ON public.challenge_submissions FOR SELECT TO authenticated
USING (auth.uid() = designer_id);

CREATE POLICY "Designers can update their own submissions"
ON public.challenge_submissions FOR UPDATE TO authenticated
USING (auth.uid() = designer_id) WITH CHECK (auth.uid() = designer_id);

CREATE POLICY "Challenge owners can view submissions"
ON public.challenge_submissions FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.challenges c WHERE c.id = challenge_submissions.challenge_id AND c.recruiter_id = auth.uid()));

CREATE POLICY "Challenge owners can review submissions"
ON public.challenge_submissions FOR UPDATE TO authenticated
USING (EXISTS (SELECT 1 FROM public.challenges c WHERE c.id = challenge_submissions.challenge_id AND c.recruiter_id = auth.uid()))
WITH CHECK (EXISTS (SELECT 1 FROM public.challenges c WHERE c.id = challenge_submissions.challenge_id AND c.recruiter_id = auth.uid()));

CREATE TRIGGER challenge_submissions_updated_at
BEFORE UPDATE ON public.challenge_submissions
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();