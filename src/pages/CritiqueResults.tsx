import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useParams, useNavigate } from "react-router-dom";
import { 
  ArrowLeft, 
  Trophy, 
  Target, 
  CheckCircle2, 
  Lightbulb,
  ChevronDown,
  AlertCircle,
  Palette,
  Layout,
  Type,
  RefreshCw
} from "lucide-react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { resolveDesignScreenUrls } from "@/lib/designData";
import { analyzeStoredDesign } from "@/lib/functions";
import { useAuth } from "@/contexts/AuthContext";
import type { DesignFeedback } from "@/hooks/useDesignAnalysis";
import { toast } from "sonner";
import { AnalysisHistory } from "@/components/AnalysisHistory";
import { AnnotatedFeedback } from "@/components/AnnotatedFeedback";
import { MeasuredChecks } from "@/components/MeasuredChecks";
import { FlowReview } from "@/components/FlowReview";
import { VerifiedBadge } from "@/components/VerifiedBadge";
import { VersionComparison } from "@/components/VersionComparison";

interface Critique {
  id: string;
  design_id: string;
  overall_score: number | null;
  layout_score: number | null;
  color_score: number | null;
  typography_score: number | null;
  strengths: string[];
  improvements: string[];
  quick_wins: string[];
  detailed_feedback: any;
  verified: boolean;
  created_at: string;
}

interface Design {
  id: string;
  title: string;
  description: string | null;
  image_url: string;
  storage_path: string | null;
  storage_paths: unknown;
  parent_design_id: string | null;
  category: string | null;
}

const getScoreColor = (score: number | null) => {
  if (!score) return "text-muted-foreground";
  if (score >= 80) return "text-accent";
  if (score >= 60) return "text-yellow-400";
  return "text-orange-400";
};

const ScoreCard = ({ 
  label, 
  score, 
  icon: Icon 
}: { 
  label: string; 
  score: number | null; 
  icon: React.ElementType;
}) => (
  <div className="glass rounded-xl p-4 text-center">
    <div className={`inline-flex p-2 rounded-lg bg-secondary mb-2 ${getScoreColor(score)}`}>
      <Icon className="w-5 h-5" />
    </div>
    <div className={`font-display text-2xl font-bold ${getScoreColor(score)}`}>
      {score ?? "—"}
    </div>
    <div className="text-sm text-muted-foreground">{label}</div>
  </div>
);

const CritiqueResults = () => {
  const { designId } = useParams<{ designId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [design, setDesign] = useState<Design | null>(null);
  const [screens, setScreens] = useState<string[]>([]);
  const [parent, setParent] = useState<{ id: string; title: string } | null>(null);
  const [allCritiques, setAllCritiques] = useState<Critique[]>([]);
  const [selectedCritiqueId, setSelectedCritiqueId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [reanalyzing, setReanalyzing] = useState(false);
  const [expandedSection, setExpandedSection] = useState<string>("Typography");

  const critique = allCritiques.find(c => c.id === selectedCritiqueId) || allCritiques[0] || null;

  useEffect(() => {
    const fetchData = async () => {
      if (!designId) return;

      try {
        const { data: designData, error: designError } = await supabase
          .from("designs")
          .select("*")
          .eq("id", designId)
          .maybeSingle();

        if (designError) throw designError;
        if (designData) {
          const urls = await resolveDesignScreenUrls(designData);
          setScreens(urls);
          setDesign({ ...designData, image_url: urls[0] ?? designData.image_url });
          if (designData.parent_design_id) {
            const { data: parentData } = await supabase
              .from("designs")
              .select("id, title")
              .eq("id", designData.parent_design_id)
              .maybeSingle();
            setParent(parentData ?? null);
          }
        } else {
          setDesign(null);
        }

        const { data: critiquesData, error: critiqueError } = await supabase
          .from("ai_critiques")
          .select("*")
          .eq("design_id", designId)
          .order("created_at", { ascending: false });

        if (critiqueError) throw critiqueError;
        setAllCritiques(critiquesData || []);
        if (critiquesData && critiquesData.length > 0) {
          setSelectedCritiqueId(critiquesData[0].id);
        }
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [designId]);

  const handleReanalyze = async () => {
    if (!design || !designId) return;
    setReanalyzing(true);
    try {
      // The server re-reads the stored files and saves a new verified critique
      await analyzeStoredDesign(designId);

      // Refetch all critiques
      const { data: newCritiques } = await supabase
        .from("ai_critiques")
        .select("*")
        .eq("design_id", designId)
        .order("created_at", { ascending: false });
      setAllCritiques(newCritiques || []);
      if (newCritiques && newCritiques.length > 0) {
        setSelectedCritiqueId(newCritiques[0].id);
      }
      setExpandedSection("Typography");
      toast.success("Design re-analyzed successfully!");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to re-analyze";
      toast.error(msg);
    } finally {
      setReanalyzing(false);
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="max-w-4xl mx-auto">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-secondary rounded w-1/3" />
            <div className="aspect-video bg-secondary rounded-xl" />
            <div className="grid grid-cols-4 gap-4">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="h-24 bg-secondary rounded-xl" />
              ))}
            </div>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (!design) {
    return (
      <DashboardLayout>
        <div className="max-w-4xl mx-auto text-center py-12">
          <h1 className="font-display text-2xl font-bold text-foreground mb-4">
            Design not found
          </h1>
          <Button variant="glass" onClick={() => navigate("/my-designs")}>
            Back to My Designs
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <Button
            variant="ghost"
            onClick={() => navigate("/my-designs")}
            className="mb-4 gap-2 text-muted-foreground"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to My Designs
          </Button>

          <div className="flex items-center justify-between">
            <h1 className="font-display text-3xl font-bold text-foreground mb-2">
              {design.title}
            </h1>
            <Button
              variant="glass"
              onClick={handleReanalyze}
              disabled={reanalyzing}
              className="gap-2"
            >
              <RefreshCw className={`w-4 h-4 ${reanalyzing ? "animate-spin" : ""}`} />
              {reanalyzing ? "Analyzing..." : "Re-analyze"}
            </Button>
          </div>
          {design.description && (
            <p className="text-muted-foreground">{design.description}</p>
          )}
        </motion.div>

        {/* Design with feedback pinned to the spots it's about */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          {critique?.detailed_feedback?.categories?.length ? (
            <AnnotatedFeedback
              screens={screens}
              categories={(critique.detailed_feedback as DesignFeedback).categories}
              alt={design.title}
            />
          ) : (
            <div className="glass rounded-xl overflow-hidden">
              <img
                src={design.image_url}
                alt={design.title}
                className="w-full h-auto max-h-[500px] object-contain bg-secondary"
              />
            </div>
          )}
        </motion.div>

        {parent && user && (
          <VersionComparison userId={user.id} designId={design.id} previous={parent} />
        )}

        {critique ? (
          <>
            {/* Overall Score */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="glass rounded-2xl p-8 text-center"
            >
              <div className="flex flex-wrap items-center justify-center gap-2 mb-6">
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/20">
                  <Trophy className="w-4 h-4 text-primary" />
                  <span className="text-sm font-medium text-foreground/80">
                    AI Analysis Complete
                  </span>
                </div>
                <VerifiedBadge verified={critique.verified} />
              </div>

              <div className={`font-display text-7xl font-bold mb-4 ${getScoreColor(critique.overall_score)}`}>
                {critique.overall_score ?? "—"}
                <span className="text-3xl text-muted-foreground">/100</span>
              </div>

              {critique.detailed_feedback?.summary && (
                <p className="text-muted-foreground max-w-2xl mx-auto text-lg">
                  {critique.detailed_feedback.summary}
                </p>
              )}
            </motion.div>

            {/* Score Breakdown */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
              className="grid grid-cols-3 gap-4"
            >
              <ScoreCard label="Layout" score={critique.layout_score} icon={Layout} />
              <ScoreCard label="Color" score={critique.color_score} icon={Palette} />
              <ScoreCard label="Typography" score={critique.typography_score} icon={Type} />
            </motion.div>

            {critique.detailed_feedback?.flow && screens.length > 1 && (
              <FlowReview flow={critique.detailed_feedback.flow} screens={screens} />
            )}

            <MeasuredChecks screens={screens} textElements={critique.detailed_feedback?.textElements} />

            {/* Quick Wins */}
            {critique.quick_wins && critique.quick_wins.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.4 }}
                className="glass rounded-xl p-6"
              >
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 rounded-lg bg-orange-400/20">
                    <AlertCircle className="w-5 h-5 text-orange-400" />
                  </div>
                  <h3 className="font-display font-semibold text-foreground">
                    Top Priorities
                  </h3>
                </div>
                <ol className="space-y-3">
                  {critique.quick_wins.map((priority, i) => (
                    <li key={i} className="flex items-start gap-3">
                      <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-sm font-medium text-primary">
                        {i + 1}
                      </span>
                      <span className="text-foreground/90">{priority}</span>
                    </li>
                  ))}
                </ol>
              </motion.div>
            )}

            {/* Detailed Category Feedback */}
            {critique.detailed_feedback?.categories && critique.detailed_feedback.categories.length > 0 ? (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.5 }}
                className="space-y-4"
              >
                <h2 className="font-display text-xl font-semibold text-foreground">
                  Detailed Breakdown
                </h2>
                {critique.detailed_feedback.categories.map((category: any, catIndex: number) => {
                  const strengths = category.findings?.filter((f: any) => f.type === "strength") || [];
                  const improvements = category.findings?.filter((f: any) => f.type === "improvement") || [];
                  const isExpanded = expandedSection === category.name;

                  return (
                    <div key={catIndex} className="glass rounded-xl overflow-hidden">
                      <button
                        onClick={() => setExpandedSection(isExpanded ? "" : category.name)}
                        className="w-full p-5 flex items-center justify-between hover:bg-secondary/30 transition-colors"
                      >
                        <div className="flex items-center gap-4">
                          {category.status === "excellent" ? (
                            <Trophy className="w-5 h-5 text-accent" />
                          ) : category.status === "good" ? (
                            <CheckCircle2 className="w-5 h-5 text-yellow-400" />
                          ) : (
                            <Target className="w-5 h-5 text-orange-400" />
                          )}
                          <div className="text-left">
                            <h3 className="font-display font-semibold text-foreground">
                              {category.name}
                            </h3>
                            <p className="text-sm text-muted-foreground capitalize">
                              {category.status?.replace("-", " ")}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <span className={`font-display text-2xl font-bold ${getScoreColor((category.score || 0) * 10)}`}>
                            {category.score}/10
                          </span>
                          <ChevronDown className={`w-5 h-5 text-muted-foreground transition-transform ${isExpanded ? "rotate-180" : ""}`} />
                        </div>
                      </button>

                      {isExpanded && (
                        <div className="px-5 pb-5 space-y-3">
                          {strengths.map((finding: any, i: number) => (
                            <div key={`s-${i}`} className="p-4 rounded-lg bg-accent/10 border border-accent/20">
                              <div className="flex items-start gap-3">
                                <CheckCircle2 className="w-5 h-5 text-accent mt-0.5 flex-shrink-0" />
                                <div>
                                  <h4 className="font-medium text-foreground mb-1">{finding.title}</h4>
                                  <p className="text-sm text-muted-foreground leading-relaxed">{finding.description}</p>
                                </div>
                              </div>
                            </div>
                          ))}
                          {improvements.map((finding: any, i: number) => (
                            <div key={`i-${i}`} className="p-4 rounded-lg bg-primary/10 border border-primary/20">
                              <div className="flex items-start gap-3">
                                <Lightbulb className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                                <div>
                                  <h4 className="font-medium text-foreground mb-1">{finding.title}</h4>
                                  <p className="text-sm text-muted-foreground leading-relaxed">{finding.description}</p>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </motion.div>
            ) : (
              /* Fallback to flat strengths/improvements if no detailed categories */
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.5 }}
                className="space-y-4"
              >
                {critique.strengths && critique.strengths.length > 0 && (
                  <div className="glass rounded-xl overflow-hidden">
                    <button
                      onClick={() => setExpandedSection(expandedSection === "strengths" ? "" : "strengths")}
                      className="w-full p-5 flex items-center justify-between hover:bg-secondary/30 transition-colors"
                    >
                      <div className="flex items-center gap-4">
                        <CheckCircle2 className="w-5 h-5 text-accent" />
                        <h3 className="font-display font-semibold text-foreground">Strengths</h3>
                      </div>
                      <ChevronDown className={`w-5 h-5 text-muted-foreground transition-transform ${expandedSection === "strengths" ? "rotate-180" : ""}`} />
                    </button>
                    {expandedSection === "strengths" && (
                      <div className="px-5 pb-5 space-y-2">
                        {critique.strengths.map((s, i) => (
                          <div key={i} className="p-3 rounded-lg bg-accent/10 border border-accent/20">
                            <div className="flex items-start gap-3">
                              <CheckCircle2 className="w-4 h-4 text-accent mt-0.5 flex-shrink-0" />
                              <span className="text-sm text-foreground/90">{s}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
                {critique.improvements && critique.improvements.length > 0 && (
                  <div className="glass rounded-xl overflow-hidden">
                    <button
                      onClick={() => setExpandedSection(expandedSection === "improvements" ? "" : "improvements")}
                      className="w-full p-5 flex items-center justify-between hover:bg-secondary/30 transition-colors"
                    >
                      <div className="flex items-center gap-4">
                        <Lightbulb className="w-5 h-5 text-primary" />
                        <h3 className="font-display font-semibold text-foreground">Areas for Improvement</h3>
                      </div>
                      <ChevronDown className={`w-5 h-5 text-muted-foreground transition-transform ${expandedSection === "improvements" ? "rotate-180" : ""}`} />
                    </button>
                    {expandedSection === "improvements" && (
                      <div className="px-5 pb-5 space-y-2">
                        {critique.improvements.map((imp, i) => (
                          <div key={i} className="p-3 rounded-lg bg-primary/10 border border-primary/20">
                            <div className="flex items-start gap-3">
                              <Lightbulb className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                              <span className="text-sm text-foreground/90">{imp}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </motion.div>
            )}


            {/* Analysis History */}
            <AnalysisHistory
              history={allCritiques}
              selectedId={selectedCritiqueId || ""}
              onSelect={(id) => {
                setSelectedCritiqueId(id);
                setExpandedSection("Typography");
              }}
            />
          </>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="glass rounded-xl p-12 text-center"
          >
            <Target className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
            <h2 className="font-display text-xl font-semibold text-foreground mb-2">
              No AI critique yet
            </h2>
            <p className="text-muted-foreground">
              This design hasn't been analyzed yet.
            </p>
          </motion.div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default CritiqueResults;
