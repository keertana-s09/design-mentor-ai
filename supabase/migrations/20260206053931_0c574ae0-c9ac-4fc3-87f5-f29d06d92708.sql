-- Create app_role enum
CREATE TYPE public.app_role AS ENUM ('designer', 'recruiter');

-- Create user_roles table (critical for security - roles must be separate)
CREATE TABLE public.user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    role app_role NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE (user_id, role)
);

-- Enable RLS
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Create security definer function to check roles (prevents RLS recursion)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Create function to get user's role
CREATE OR REPLACE FUNCTION public.get_user_role(_user_id UUID)
RETURNS app_role
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role
  FROM public.user_roles
  WHERE user_id = _user_id
  LIMIT 1
$$;

-- RLS policies for user_roles
CREATE POLICY "Users can view their own role"
ON public.user_roles
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own role on signup"
ON public.user_roles
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Create profiles table
CREATE TABLE public.profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
    email TEXT NOT NULL,
    full_name TEXT,
    avatar_url TEXT,
    bio TEXT,
    portfolio_url TEXT,
    specializations TEXT[] DEFAULT '{}',
    years_experience INTEGER,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Profiles RLS policies
CREATE POLICY "Users can view all profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Users can update their own profile"
ON public.profiles
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own profile"
ON public.profiles
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Create designs table
CREATE TABLE public.designs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    designer_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    image_url TEXT NOT NULL,
    category TEXT,
    tags TEXT[] DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.designs ENABLE ROW LEVEL SECURITY;

-- Designs RLS policies
CREATE POLICY "Anyone can view designs"
ON public.designs
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Designers can insert their own designs"
ON public.designs
FOR INSERT
WITH CHECK (auth.uid() = designer_id AND public.has_role(auth.uid(), 'designer'));

CREATE POLICY "Designers can update their own designs"
ON public.designs
FOR UPDATE
USING (auth.uid() = designer_id);

CREATE POLICY "Designers can delete their own designs"
ON public.designs
FOR DELETE
USING (auth.uid() = designer_id);

-- Create AI critiques table
CREATE TABLE public.ai_critiques (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    design_id UUID REFERENCES public.designs(id) ON DELETE CASCADE NOT NULL,
    overall_score INTEGER CHECK (overall_score >= 0 AND overall_score <= 100),
    layout_score INTEGER CHECK (layout_score >= 0 AND layout_score <= 100),
    color_score INTEGER CHECK (color_score >= 0 AND color_score <= 100),
    typography_score INTEGER CHECK (typography_score >= 0 AND typography_score <= 100),
    strengths TEXT[] DEFAULT '{}',
    improvements TEXT[] DEFAULT '{}',
    quick_wins TEXT[] DEFAULT '{}',
    detailed_feedback JSONB,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.ai_critiques ENABLE ROW LEVEL SECURITY;

-- AI critiques RLS policies
CREATE POLICY "Authenticated users can view critiques"
ON public.ai_critiques
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "System can insert critiques"
ON public.ai_critiques
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Create recruiter evaluations table
CREATE TABLE public.recruiter_evaluations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    recruiter_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    designer_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    design_id UUID REFERENCES public.designs(id) ON DELETE CASCADE,
    rating INTEGER CHECK (rating >= 1 AND rating <= 5),
    notes TEXT,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'shortlisted', 'rejected', 'contacted')),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE (recruiter_id, designer_id, design_id)
);

ALTER TABLE public.recruiter_evaluations ENABLE ROW LEVEL SECURITY;

-- Recruiter evaluations RLS policies
CREATE POLICY "Recruiters can view their own evaluations"
ON public.recruiter_evaluations
FOR SELECT
USING (auth.uid() = recruiter_id AND public.has_role(auth.uid(), 'recruiter'));

CREATE POLICY "Recruiters can insert evaluations"
ON public.recruiter_evaluations
FOR INSERT
WITH CHECK (auth.uid() = recruiter_id AND public.has_role(auth.uid(), 'recruiter'));

CREATE POLICY "Recruiters can update their own evaluations"
ON public.recruiter_evaluations
FOR UPDATE
USING (auth.uid() = recruiter_id AND public.has_role(auth.uid(), 'recruiter'));

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create triggers for auto-updating timestamps
CREATE TRIGGER update_profiles_updated_at
BEFORE UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_designs_updated_at
BEFORE UPDATE ON public.designs
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_recruiter_evaluations_updated_at
BEFORE UPDATE ON public.recruiter_evaluations
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();