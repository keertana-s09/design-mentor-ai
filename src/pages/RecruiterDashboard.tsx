import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Users, Clock, CheckCircle, FileImage, Star, MessageSquare, Filter } from "lucide-react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { DesignerCard } from "@/components/DesignerCard";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";

interface Evaluation {
  rating: number | null;
  status: string | null;
  notes: string | null;
  updated_at: string;
  designer_id: string;
}

interface DesignerInfo {
  user_id: string;
  full_name: string | null;
  email: string;
  avatar_url: string | null;
  design_count: number;
  pending_count: number;
  reviewed_count: number;
  latest_design_date: string | null;
  evaluation?: Evaluation | null;
}

type FilterType = "all" | "shortlisted" | "contacted" | "pending" | "rejected";

const RecruiterDashboard = () => {
  const { user } = useAuth();
  const [designers, setDesigners] = useState<DesignerInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterType>("all");

  useEffect(() => {
    const fetchData = async () => {
      if (!user) return;

      try {
        const { data: roles } = await supabase
          .from("user_roles")
          .select("user_id")
          .eq("role", "designer");

        const designerIds = roles?.map((r) => r.user_id) || [];
        if (designerIds.length === 0) {
          setDesigners([]);
          setLoading(false);
          return;
        }

        const [profilesRes, designsRes, evalsRes] = await Promise.all([
          supabase.from("profiles").select("*").in("user_id", designerIds),
          supabase.from("designs").select("id, designer_id, created_at").in("designer_id", designerIds),
          supabase
            .from("recruiter_evaluations")
            .select("designer_id, rating, status, notes, updated_at")
            .eq("recruiter_id", user.id)
            .is("design_id", null),
        ]);

        const profiles = profilesRes.data || [];
        const designs = designsRes.data || [];
        const evals = evalsRes.data || [];

        const evalMap = new Map<string, Evaluation>();
        evals.forEach((e) => evalMap.set(e.designer_id, e));

        const designerInfos: DesignerInfo[] = profiles.map((profile) => {
          const userDesigns = designs.filter((d) => d.designer_id === profile.user_id);
          const designCount = userDesigns.length;
          const evaluation = evalMap.get(profile.user_id) || null;
          const isReviewed = !!evaluation;
          const latestDesign = userDesigns.sort(
            (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
          )[0];

          return {
            user_id: profile.user_id,
            full_name: profile.full_name,
            email: profile.email,
            avatar_url: profile.avatar_url,
            design_count: designCount,
            pending_count: designCount > 0 && !isReviewed ? designCount : 0,
            reviewed_count: isReviewed ? designCount : 0,
            latest_design_date: latestDesign?.created_at || null,
            evaluation,
          };
        });

        designerInfos.sort((a, b) => {
          if (a.pending_count > 0 && b.pending_count === 0) return -1;
          if (a.pending_count === 0 && b.pending_count > 0) return 1;
          const ratingA = a.evaluation?.rating || 0;
          const ratingB = b.evaluation?.rating || 0;
          if (ratingB !== ratingA) return ratingB - ratingA;
          return b.design_count - a.design_count;
        });

        setDesigners(designerInfos);
      } catch (error) {
        console.error("Error fetching recruiter dashboard data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user]);

  const filteredDesigners = designers.filter((d) => {
    if (filter === "all") return true;
    if (filter === "shortlisted") return d.evaluation?.status === "shortlisted";
    if (filter === "contacted") return d.evaluation?.status === "contacted";
    if (filter === "rejected") return d.evaluation?.status === "rejected";
    if (filter === "pending") return !d.evaluation || d.evaluation.status === "pending";
    return true;
  });

  const totalDesigners = designers.length;
  const shortlisted = designers.filter((d) => d.evaluation?.status === "shortlisted").length;
  const contacted = designers.filter((d) => d.evaluation?.status === "contacted").length;
  const totalEvaluated = designers.filter((d) => !!d.evaluation).length;

  const stats = [
    { label: "Total Designers", value: totalDesigners, icon: Users, color: "text-primary" },
    { label: "Evaluated", value: totalEvaluated, icon: CheckCircle, color: "text-accent" },
    { label: "Shortlisted", value: shortlisted, icon: Star, color: "text-yellow-400" },
    { label: "Contacted", value: contacted, icon: MessageSquare, color: "text-orange-400" },
  ];

  const filters: { key: FilterType; label: string }[] = [
    { key: "all", label: "All" },
    { key: "pending", label: "Pending" },
    { key: "shortlisted", label: "Shortlisted" },
    { key: "contacted", label: "Contacted" },
    { key: "rejected", label: "Rejected" },
  ];

  return (
    <DashboardLayout>
      <div className="max-w-6xl mx-auto space-y-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <h1 className="font-display text-3xl font-bold text-foreground mb-2">
            Recruiter Dashboard 🧠
          </h1>
          <p className="text-muted-foreground">
            Your judging hub — review designer submissions and manage evaluations.
          </p>
        </motion.div>

        {/* Stats */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"
        >
          {stats.map((stat) => (
            <div key={stat.label} className="glass rounded-xl p-6 hover:bg-secondary/30 transition-colors">
              <div className="flex items-center gap-3 mb-4">
                <div className={`p-2 rounded-lg bg-secondary ${stat.color}`}>
                  <stat.icon className="w-5 h-5" />
                </div>
                <span className="text-sm text-muted-foreground">{stat.label}</span>
              </div>
              <div className="font-display text-3xl font-bold text-foreground">
                {loading ? "..." : stat.value}
              </div>
            </div>
          ))}
        </motion.div>

        {/* Filter bar */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.15 }}
          className="flex items-center gap-2 flex-wrap"
        >
          <Filter className="w-4 h-4 text-muted-foreground" />
          {filters.map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                filter === f.key
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary text-muted-foreground hover:text-foreground"
              }`}
            >
              {f.label}
            </button>
          ))}
        </motion.div>

        {/* Designer Cards */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <h2 className="font-display text-xl font-semibold text-foreground mb-4">
            Designer Submissions ({filteredDesigners.length})
          </h2>

          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3].map((i) => (
                <div key={i} className="glass rounded-xl p-6 animate-pulse h-52">
                  <div className="flex items-center gap-4 mb-4">
                    <div className="w-12 h-12 rounded-full bg-secondary" />
                    <div className="space-y-2 flex-1">
                      <div className="h-4 bg-secondary rounded w-3/4" />
                      <div className="h-3 bg-secondary rounded w-1/2" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : filteredDesigners.length === 0 ? (
            <div className="glass rounded-xl p-12 text-center">
              <Users className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-50" />
              <h3 className="font-display text-lg font-semibold text-foreground mb-2">
                {filter === "all" ? "No designers yet" : `No ${filter} designers`}
              </h3>
              <p className="text-muted-foreground">
                {filter === "all"
                  ? "Designers will appear here once they submit their work."
                  : "No designers match this filter."}
              </p>
              {filter !== "all" && (
                <Button
                  variant="ghost"
                  className="mt-4"
                  onClick={() => setFilter("all")}
                >
                  Show all designers
                </Button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredDesigners.map((designer, index) => (
                <motion.div
                  key={designer.user_id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: index * 0.05 }}
                >
                  <DesignerCard designer={designer} />
                </motion.div>
              ))}
            </div>
          )}
        </motion.div>
      </div>
    </DashboardLayout>
  );
};

export default RecruiterDashboard;
