import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useParams, useNavigate } from "react-router-dom";
import { 
  ArrowLeft, 
  Star, 
  Mail, 
  Briefcase, 
  ExternalLink,
  FileImage,
  Maximize2,
  Check,
  X,
  MessageSquare,
  Calendar,
  Brain,
  TrendingUp,
  Lightbulb,
  EyeOff,
  UserRound,
  GitBranch,
  Scale
} from "lucide-react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { resolveDesignImageUrls } from "@/lib/designData";
import { averageScore, pickCritique, scoreToStars } from "@/lib/critiques";
import { buildVersionChains, chainGrowth } from "@/lib/versions";
import { useBlindReview, candidateLabel } from "@/hooks/useBlindReview";
import { Switch } from "@/components/ui/switch";
import { VerifiedBadge } from "@/components/VerifiedBadge";
import { toast } from "sonner";

interface Profile {
  id: string;
  user_id: string;
  full_name: string | null;
  email: string;
  bio: string | null;
  avatar_url: string | null;
  portfolio_url: string | null;
  specializations: string[];
  years_experience: number | null;
}

interface CritiqueFinding {
  type?: string;
  title?: string;
  description?: string;
}

interface CritiqueCategory {
  name?: string;
  score?: number;
  status?: string;
  findings?: CritiqueFinding[];
}

interface DetailedFeedback {
  summary?: string;
  categories?: CritiqueCategory[];
  topPriorities?: string[];
}

interface Design {
  id: string;
  title: string;
  image_url: string;
  storage_path: string | null;
  parent_design_id: string | null;
  category: string | null;
  created_at: string;
  critique?: {
    overall_score: number | null;
    verified?: boolean | null;
    typography_score?: number | null;
    layout_score?: number | null;
    color_score?: number | null;
    model?: string | null;
    strengths?: string[] | null;
    improvements?: string[] | null;
    detailed_feedback?: DetailedFeedback | null;
  };
}

const EVALUATION_CRITERIA = [
  { name: "Typography", detail: "Font choices, sizing, hierarchy and readability of text." },
  { name: "Visual Hierarchy", detail: "Whether the layout guides the eye to what matters first." },
  { name: "Spacing & Layout", detail: "Margins, padding, whitespace, alignment and grid consistency." },
  { name: "Color & Contrast", detail: "Palette harmony plus contrast levels for legibility." },
  { name: "Accessibility", detail: "WCAG-style checks: contrast ratios, tap targets, inclusive design." },
  { name: "Usability", detail: "How intuitive the interactions and flows appear." },
  { name: "Overall Impression", detail: "Craft, polish and how professional the screen reads as a whole." },
];

interface Evaluation {
  rating: number | null;
  status: string;
  notes: string | null;
}

/** Shows how far the recruiter's star rating sits from the AI's verified average, to catch bias either way. */
const CalibrationNote = ({ rating, aiScore, verified }: { rating: number; aiScore: number; verified: boolean }) => {
  const aiStars = scoreToStars(aiScore);
  const gap = Math.round((rating - aiStars) * 10) / 10;
  const close = Math.abs(gap) < 1;
  return (
    <div className="mt-3 flex items-start gap-2 rounded-lg bg-secondary/40 p-3 text-sm">
      <Scale className="w-4 h-4 mt-0.5 text-primary flex-shrink-0" />
      <p className="text-muted-foreground">
        The AI's {verified ? "verified" : "unverified"} average is {aiScore}/100 (about {aiStars}★).{" "}
        {close ? (
          <>Your {rating}★ is in line with it.</>
        ) : (
          <>
            Your {rating}★ is {Math.abs(gap)}★ {gap > 0 ? "higher" : "lower"}. Worth a second look at what's driving
            the difference: the AI can miss context, and so can people.
          </>
        )}
      </p>
    </div>
  );
};

const DesignerEvaluation = () => {
  const { designerId } = useParams<{ designerId: string }>();
  const navigate = useNavigate();
  const { user, role } = useAuth();
  
  const [profile, setProfile] = useState<Profile | null>(null);
  const [designs, setDesigns] = useState<Design[]>([]);
  const [evaluation, setEvaluation] = useState<Evaluation | null>(null);
  const [loading, setLoading] = useState(true);
  const [rating, setRating] = useState<number>(0);
  const [notes, setNotes] = useState("");
  const [status, setStatus] = useState<string>("pending");
  const [saving, setSaving] = useState(false);
  const [previewDesign, setPreviewDesign] = useState<Design | null>(null);
  const [zoomed, setZoomed] = useState(false);
  const [blind, setBlind] = useBlindReview();
  const isBlind = blind && role === "recruiter";

  useEffect(() => {
    const fetchData = async () => {
      if (!designerId) return;

      try {
        // Fetch profile
        const { data: profileData, error: profileError } = await supabase
          .from("profiles")
          .select("*")
          .eq("user_id", designerId)
          .maybeSingle();

        if (profileError) throw profileError;
        setProfile(profileData);

        // Fetch designs
        const { data: designsData, error: designsError } = await supabase
          .from("designs")
          .select(`
            id,
            title,
            image_url,
            storage_path,
            parent_design_id,
            category,
            created_at,
            ai_critiques (
              overall_score,
              verified,
              typography_score,
              layout_score,
              color_score,
              model,
              strengths,
              improvements,
              detailed_feedback,
              created_at
            )
          `)
          .eq("designer_id", designerId)
          .order("created_at", { ascending: false });

        if (designsError) throw designsError;

        const formattedDesigns: Design[] = designsData?.map(d => {
          const c = pickCritique(d.ai_critiques);
          return {
            ...d,
            critique: c
              ? {
                  ...c,
                  detailed_feedback: (c.detailed_feedback ?? null) as DetailedFeedback | null,
                }
              : undefined,
          };
        }) || [];
        setDesigns(await resolveDesignImageUrls(formattedDesigns));

        // Fetch existing evaluation (for recruiters)
        if (user && role === "recruiter") {
          const { data: evalData, error: evalError } = await supabase
            .from("recruiter_evaluations")
            .select("*")
            .eq("recruiter_id", user.id)
            .eq("designer_id", designerId)
            .is("design_id", null)
            .maybeSingle();

          if (!evalError && evalData) {
            setEvaluation(evalData);
            setRating(evalData.rating || 0);
            setNotes(evalData.notes || "");
            setStatus(evalData.status || "pending");
          }
        }
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [designerId, user, role]);

  const saveEvaluation = async () => {
    if (!user || !designerId || role !== "recruiter") return;

    setSaving(true);
    try {
      const evaluationData = {
        recruiter_id: user.id,
        designer_id: designerId,
        rating: rating || null,
        notes: notes || null,
        status,
      };

      if (evaluation) {
        // Update existing
        const { error } = await supabase
          .from("recruiter_evaluations")
          .update(evaluationData)
          .eq("recruiter_id", user.id)
          .eq("designer_id", designerId)
          .is("design_id", null);

        if (error) throw error;
      } else {
        // Insert new
        const { error } = await supabase
          .from("recruiter_evaluations")
          .insert(evaluationData);

        if (error) throw error;
      }

      toast.success("Evaluation saved!");
    } catch (error) {
      console.error("Error saving evaluation:", error);
      toast.error("Failed to save evaluation");
    } finally {
      setSaving(false);
    }
  };

  const aiAverage = averageScore(designs.map((d) => d.critique));
  const versionChains = buildVersionChains(
    designs.map((d) => ({ ...d, score: d.critique?.overall_score ?? null }))
  ).filter((chain) => chain.length > 1);

  const getScoreColor = (score: number | null) => {
    if (!score) return "text-muted-foreground";
    if (score >= 80) return "text-accent";
    if (score >= 60) return "text-yellow-400";
    return "text-orange-400";
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="max-w-5xl mx-auto animate-pulse space-y-6">
          <div className="h-8 bg-secondary rounded w-1/3" />
          <div className="glass rounded-xl p-6 flex gap-6">
            <div className="w-24 h-24 rounded-full bg-secondary" />
            <div className="space-y-3 flex-1">
              <div className="h-6 bg-secondary rounded w-1/3" />
              <div className="h-4 bg-secondary rounded w-1/2" />
              <div className="h-16 bg-secondary rounded" />
            </div>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (!profile) {
    return (
      <DashboardLayout>
        <div className="max-w-5xl mx-auto text-center py-12">
          <h1 className="font-display text-2xl font-bold text-foreground mb-4">
            Designer not found
          </h1>
          <Button variant="glass" onClick={() => navigate("/designers")}>
            Back to Designers
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="max-w-5xl mx-auto space-y-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <Button
            variant="ghost"
            onClick={() => navigate("/designers")}
            className="mb-4 gap-2 text-muted-foreground"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Designers
          </Button>
        </motion.div>

        {/* Profile Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="glass rounded-xl p-6"
        >
          {role === "recruiter" && (
            <label className="flex items-center justify-end gap-2 text-sm text-muted-foreground cursor-pointer mb-4">
              <EyeOff className="w-4 h-4" />
              Blind review
              <Switch checked={blind} onCheckedChange={setBlind} />
            </label>
          )}
          <div className="flex flex-col md:flex-row gap-6">
            <div className="w-24 h-24 rounded-full bg-gradient-primary flex items-center justify-center flex-shrink-0">
              {isBlind ? (
                <UserRound className="w-10 h-10 text-primary-foreground" />
              ) : profile.avatar_url ? (
                <img 
                  src={profile.avatar_url} 
                  alt={profile.full_name || "Designer"} 
                  className="w-full h-full rounded-full object-cover"
                />
              ) : (
                <span className="text-3xl font-bold text-primary-foreground">
                  {(profile.full_name || profile.email)[0].toUpperCase()}
                </span>
              )}
            </div>

            <div className="flex-1">
              <h1 className="font-display text-2xl font-bold text-foreground mb-1">
                {isBlind ? candidateLabel(profile.user_id) : profile.full_name || "Designer"}
              </h1>
              
              <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground mb-4">
                {!isBlind && (
                  <div className="flex items-center gap-1">
                    <Mail className="w-4 h-4" />
                    {profile.email}
                  </div>
                )}
                {profile.years_experience && (
                  <div className="flex items-center gap-1">
                    <Briefcase className="w-4 h-4" />
                    {profile.years_experience} years experience
                  </div>
                )}
                {profile.portfolio_url && !isBlind && (
                  <a 
                    href={profile.portfolio_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-primary hover:underline"
                  >
                    <ExternalLink className="w-4 h-4" />
                    Portfolio
                  </a>
                )}
              </div>

              {profile.bio && !isBlind && (
                <p className="text-muted-foreground mb-4">{profile.bio}</p>
              )}
              {isBlind && (
                <p className="text-sm text-muted-foreground mb-4">
                  Name, photo, contact details and bio are hidden so the work is judged first. Turn off blind
                  review once you've rated it.
                </p>
              )}

              {profile.specializations && profile.specializations.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {profile.specializations.map((spec, i) => (
                    <span 
                      key={i}
                      className="text-xs px-3 py-1 rounded-full bg-primary/10 text-primary"
                    >
                      {spec}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        </motion.div>

        {/* Recruiter Evaluation Panel */}
        {role === "recruiter" && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="glass rounded-xl p-6"
          >
            <h2 className="font-display text-lg font-semibold text-foreground mb-4">
              Your Evaluation
            </h2>

            <div className="space-y-4">
              {/* Rating */}
              <div>
                <label className="text-sm text-muted-foreground mb-2 block">Rating</label>
                <div className="flex gap-2">
                  {[1, 2, 3, 4, 5].map((value) => (
                    <button
                      key={value}
                      onClick={() => setRating(value)}
                      className="p-2 transition-colors"
                    >
                      <Star 
                        className={`w-6 h-6 ${
                          value <= rating 
                            ? "text-yellow-400 fill-yellow-400" 
                            : "text-muted-foreground"
                        }`} 
                      />
                    </button>
                  ))}
                </div>
                {rating > 0 && aiAverage.score !== null && (
                  <CalibrationNote rating={rating} aiScore={aiAverage.score} verified={aiAverage.verified} />
                )}
              </div>

              {/* Status */}
              <div>
                <label className="text-sm text-muted-foreground mb-2 block">Status</label>
                <div className="flex flex-wrap gap-2">
                  {["pending", "shortlisted", "contacted", "rejected"].map((s) => (
                    <button
                      key={s}
                      onClick={() => setStatus(s)}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                        status === s 
                          ? "bg-primary text-primary-foreground" 
                          : "bg-secondary text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {s.charAt(0).toUpperCase() + s.slice(1)}
                    </button>
                  ))}
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="text-sm text-muted-foreground mb-2 block">Notes</label>
                <Textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Add your notes about this designer..."
                  rows={3}
                  className="bg-secondary/50 border-border resize-none"
                />
              </div>

              <Button 
                variant="hero" 
                onClick={saveEvaluation}
                disabled={saving}
                className="gap-2"
              >
                {saving ? "Saving..." : "Save Evaluation"}
              </Button>
            </div>
          </motion.div>
        )}

        {/* How the AI scores designs */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.25 }}
          className="glass rounded-xl p-6"
        >
          <h2 className="font-display text-lg font-semibold text-foreground mb-2 flex items-center gap-2">
            <Brain className="w-5 h-5 text-primary" />
            How the AI reviews these designs
          </h2>
          <p className="text-sm text-muted-foreground mb-4 leading-relaxed">
            Every uploaded screen is read by a vision model (Gemini 2.5 Flash) acting as a senior
            design mentor. It looks at the actual pixels — text, layout, colour and controls — and
            judges the same seven criteria every time. There is no hand-written scoring formula: for
            each criterion the model gives a 1–10 rating plus exactly one strength and one
            improvement, each explained in a short paragraph, and the headline score out of 100
            reflects those criteria together. Because it is a judgement rather than a measurement,
            treat it as a consistent second opinion, not a pass/fail test. Scores marked{" "}
            <span className="text-accent font-medium">Verified</span> were produced on the server from the
            files exactly as uploaded, and neither the score nor the images can be edited afterwards. Contrast
            ratios on each critique are measured from the pixels, not judged.
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            {EVALUATION_CRITERIA.map((c) => (
              <div key={c.name} className="rounded-lg bg-secondary/40 p-3">
                <p className="text-sm font-medium text-foreground">{c.name}</p>
                <p className="text-xs text-muted-foreground mt-1">{c.detail}</p>
              </div>
            ))}
          </div>
          <p className="text-xs text-muted-foreground mt-4">
            Open any design below to read its full feedback, criterion by criterion.
          </p>
        </motion.div>

        {/* Growth across versions */}
        {versionChains.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.28 }}
            className="glass rounded-xl p-6 space-y-4"
          >
            <div>
              <h2 className="font-display text-lg font-semibold text-foreground flex items-center gap-2">
                <GitBranch className="w-5 h-5 text-primary" />
                Growth across versions
              </h2>
              <p className="text-sm text-muted-foreground">
                Designs this person iterated on, and how the AI score moved from first to latest version.
              </p>
            </div>
            {versionChains.map((chain) => {
              const growth = chainGrowth(chain);
              return (
                <div key={chain[0].id} className="flex flex-wrap items-center gap-2">
                  {chain.map((d, i) => (
                    <div key={d.id} className="flex items-center gap-2">
                      {i > 0 && <span className="text-muted-foreground">→</span>}
                      <button
                        onClick={() => {
                          setZoomed(false);
                          setPreviewDesign(d);
                        }}
                        className="flex items-center gap-2 rounded-lg bg-secondary/40 hover:bg-secondary px-3 py-1.5 text-sm"
                      >
                        <span className="text-muted-foreground">v{i + 1}</span>
                        <span className={`font-medium ${getScoreColor(d.score)}`}>{d.score ?? "—"}</span>
                      </button>
                    </div>
                  ))}
                  <span className="text-sm text-muted-foreground truncate max-w-[12rem]">{chain[chain.length - 1].title}</span>
                  {growth !== null && growth !== 0 && (
                    <span className={`ml-auto text-sm font-medium ${growth > 0 ? "text-accent" : "text-orange-400"}`}>
                      {growth > 0 ? "+" : ""}
                      {growth} overall
                    </span>
                  )}
                </div>
              );
            })}
          </motion.div>
        )}

        {/* Designer's Work */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
        >
          <h2 className="font-display text-xl font-semibold text-foreground mb-4">
            Portfolio ({designs.length} designs)
          </h2>

          {designs.length === 0 ? (
            <div className="glass rounded-xl p-12 text-center">
              <FileImage className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
              <p className="text-muted-foreground">No designs uploaded yet</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {designs.map((design, index) => (
                <motion.div
                  key={design.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: 0.3 + index * 0.05 }}
                  className="glass rounded-xl overflow-hidden group cursor-zoom-in"
                  onClick={() => {
                    setZoomed(false);
                    setPreviewDesign(design);
                  }}
                >
                  <div className="aspect-video relative overflow-hidden bg-secondary">
                    <img
                      src={design.image_url}
                      alt={design.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    <div className="absolute inset-0 flex items-center justify-center bg-background/60 opacity-0 group-hover:opacity-100 transition-opacity">
                      <span className="flex items-center gap-2 text-sm font-medium text-foreground">
                        <Maximize2 className="w-4 h-4" />
                        View full design
                      </span>
                    </div>
                  </div>
                  
                  <div className="p-4">
                    <h3 className="font-display font-semibold text-foreground mb-1 truncate">
                      {design.title}
                    </h3>
                    
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-1 text-muted-foreground">
                        <Calendar className="w-3 h-3" />
                        {new Date(design.created_at).toLocaleDateString()}
                      </div>
                      
                      {design.critique?.overall_score && (
                        <div className={`flex items-center gap-2 font-medium ${getScoreColor(design.critique.overall_score)}`}>
                          <span className="flex items-center gap-1">
                            <Star className="w-3 h-3" />
                            {design.critique.overall_score}/100
                          </span>
                          <VerifiedBadge verified={design.critique.verified} />
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </motion.div>
      </div>

      <Dialog open={!!previewDesign} onOpenChange={(open) => !open && setPreviewDesign(null)}>
        <DialogContent className="max-w-5xl glass border-border">
          <DialogHeader>
            <DialogTitle className="font-display flex items-center justify-between gap-4 pr-8">
              <span className="truncate">{previewDesign?.title}</span>
              {previewDesign?.critique?.overall_score && (
                <span className={`flex items-center gap-2 text-sm font-medium ${getScoreColor(previewDesign.critique.overall_score)}`}>
                  AI score {previewDesign.critique.overall_score}/100
                  <VerifiedBadge verified={previewDesign.critique.verified} />
                </span>
              )}
            </DialogTitle>
          </DialogHeader>

          <div className={`rounded-lg bg-secondary/40 ${zoomed ? "overflow-auto max-h-[70vh]" : "overflow-hidden"}`}>
            {previewDesign && (
              <img
                src={previewDesign.image_url}
                alt={previewDesign.title}
                onClick={() => setZoomed((z) => !z)}
                className={
                  zoomed
                    ? "w-auto max-w-none cursor-zoom-out"
                    : "w-full max-h-[70vh] object-contain cursor-zoom-in"
                }
                style={zoomed ? { width: "180%" } : undefined}
              />
            )}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-xs text-muted-foreground">
              Click the image to {zoomed ? "zoom out" : "magnify"}
            </p>
            {previewDesign && (
              <Button variant="glass" size="sm" asChild className="gap-2">
                <a href={previewDesign.image_url} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="w-4 h-4" />
                  Open original
                </a>
              </Button>
            )}
          </div>

          {/* AI feedback for this design */}
          <div className="border-t border-border pt-4 space-y-4 max-h-[50vh] overflow-y-auto pr-1">
            <h3 className="font-display font-semibold text-foreground flex items-center gap-2">
              <Brain className="w-4 h-4 text-primary" />
              AI feedback
            </h3>

            {!previewDesign?.critique ? (
              <p className="text-sm text-muted-foreground">
                This design hasn't been analysed yet, so there is no AI feedback to show.
              </p>
            ) : (
              <>
                {previewDesign.critique.detailed_feedback?.summary && (
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {previewDesign.critique.detailed_feedback.summary}
                  </p>
                )}

                {previewDesign.critique.detailed_feedback?.categories?.map((cat, i) => (
                  <div key={i} className="rounded-lg bg-secondary/40 p-4 space-y-3">
                    <div className="flex items-center justify-between gap-3">
                      <span className="font-medium text-foreground">{cat.name}</span>
                      <span className="text-xs text-muted-foreground">
                        {cat.score != null ? `${cat.score}/10` : ""} {cat.status ? `· ${cat.status}` : ""}
                      </span>
                    </div>
                    {cat.findings?.map((f, j) => (
                      <div key={j} className="space-y-1">
                        <p className="text-sm font-medium flex items-center gap-2 text-foreground">
                          {f.type === "improvement" ? (
                            <TrendingUp className="w-3.5 h-3.5 text-yellow-400" />
                          ) : (
                            <Check className="w-3.5 h-3.5 text-accent" />
                          )}
                          {f.title}
                        </p>
                        <p className="text-sm text-muted-foreground leading-relaxed">
                          {f.description}
                        </p>
                      </div>
                    ))}
                  </div>
                ))}

                {previewDesign.critique.detailed_feedback?.topPriorities?.length ? (
                  <div className="rounded-lg bg-primary/10 p-4">
                    <p className="text-sm font-medium text-foreground mb-2 flex items-center gap-2">
                      <Lightbulb className="w-4 h-4 text-primary" />
                      Top priorities the AI suggested
                    </p>
                    <ul className="space-y-1 text-sm text-muted-foreground list-disc pl-5">
                      {previewDesign.critique.detailed_feedback.topPriorities.map((p, i) => (
                        <li key={i}>{p}</li>
                      ))}
                    </ul>
                  </div>
                ) : null}

                {!previewDesign.critique.detailed_feedback?.categories?.length && (
                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <p className="text-sm font-medium text-foreground mb-1">Strengths</p>
                      <ul className="space-y-1 text-sm text-muted-foreground list-disc pl-5">
                        {previewDesign.critique.strengths?.map((s, i) => <li key={i}>{s}</li>)}
                      </ul>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground mb-1">Areas to improve</p>
                      <ul className="space-y-1 text-sm text-muted-foreground list-disc pl-5">
                        {previewDesign.critique.improvements?.map((s, i) => <li key={i}>{s}</li>)}
                      </ul>
                    </div>
                  </div>
                )}

                <p className="text-xs text-muted-foreground">
                  Reviewed by {previewDesign.critique.model || "Gemini 2.5 Flash"} · scores are the
                  model's judgement on a 1–10 scale per criterion, averaged into the headline score.
                </p>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
};

export default DesignerEvaluation;
