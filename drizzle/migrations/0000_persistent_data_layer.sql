-- 1. Extend designs
ALTER TABLE public.designs
  ADD COLUMN IF NOT EXISTS source_type TEXT DEFAULT 'file',
  ADD COLUMN IF NOT EXISTS source_platform TEXT,
  ADD COLUMN IF NOT EXISTS source_url TEXT,
  ADD COLUMN IF NOT EXISTS storage_path TEXT;

-- 2. Extend ai_critiques
ALTER TABLE public.ai_critiques
  ADD COLUMN IF NOT EXISTS version INTEGER DEFAULT 1,
  ADD COLUMN IF NOT EXISTS model TEXT;

-- 3. Comparisons
CREATE TABLE public.design_comparisons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL,
  title TEXT NOT NULL DEFAULT 'Comparison',
  design_ids UUID[] NOT NULL DEFAULT '{}',
  result JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.design_comparisons TO authenticated;
GRANT ALL ON public.design_comparisons TO service_role;
ALTER TABLE public.design_comparisons ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owners can view their comparisons" ON public.design_comparisons
  FOR SELECT TO authenticated USING (auth.uid() = owner_id);
CREATE POLICY "Owners can insert their comparisons" ON public.design_comparisons
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "Owners can update their comparisons" ON public.design_comparisons
  FOR UPDATE TO authenticated USING (auth.uid() = owner_id) WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "Owners can delete their comparisons" ON public.design_comparisons
  FOR DELETE TO authenticated USING (auth.uid() = owner_id);
CREATE TRIGGER update_design_comparisons_updated_at
  BEFORE UPDATE ON public.design_comparisons
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 4. Per-design recruiter evaluations
CREATE TABLE public.design_evaluations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recruiter_id UUID NOT NULL,
  design_id UUID NOT NULL REFERENCES public.designs(id) ON DELETE CASCADE,
  designer_id UUID NOT NULL,
  rating INTEGER,
  notes TEXT,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (recruiter_id, design_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.design_evaluations TO authenticated;
GRANT ALL ON public.design_evaluations TO service_role;
ALTER TABLE public.design_evaluations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Recruiters can view their design evaluations" ON public.design_evaluations
  FOR SELECT TO authenticated USING (auth.uid() = recruiter_id OR auth.uid() = designer_id);
CREATE POLICY "Recruiters can insert design evaluations" ON public.design_evaluations
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = recruiter_id AND public.has_role(auth.uid(), 'recruiter'));
CREATE POLICY "Recruiters can update their design evaluations" ON public.design_evaluations
  FOR UPDATE TO authenticated USING (auth.uid() = recruiter_id AND public.has_role(auth.uid(), 'recruiter'))
  WITH CHECK (auth.uid() = recruiter_id);
CREATE TRIGGER update_design_evaluations_updated_at
  BEFORE UPDATE ON public.design_evaluations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 5. Analysis sessions (quick / landing-page analyses)
CREATE TABLE public.analysis_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  design_id UUID REFERENCES public.designs(id) ON DELETE SET NULL,
  image_url TEXT,
  source TEXT DEFAULT 'landing',
  feedback JSONB,
  overall_score INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.analysis_sessions TO authenticated;
GRANT ALL ON public.analysis_sessions TO service_role;
ALTER TABLE public.analysis_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their analysis sessions" ON public.analysis_sessions
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their analysis sessions" ON public.analysis_sessions
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their analysis sessions" ON public.analysis_sessions
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete their analysis sessions" ON public.analysis_sessions
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_designs_designer_id ON public.designs(designer_id);
CREATE INDEX IF NOT EXISTS idx_ai_critiques_design_id ON public.ai_critiques(design_id);
CREATE INDEX IF NOT EXISTS idx_design_evaluations_design_id ON public.design_evaluations(design_id);
CREATE INDEX IF NOT EXISTS idx_analysis_sessions_user_id ON public.analysis_sessions(user_id);
