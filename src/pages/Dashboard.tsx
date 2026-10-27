import { motion } from "framer-motion";
import { 
  Upload, 
  Users, 
  FileImage, 
  Star, 
  TrendingUp,
  Eye,
  Clock
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

interface Stats {
  totalDesigns: number;
  totalEvaluations: number;
  averageScore: number;
  recentViews: number;
}

const Dashboard = () => {
  const { role, user } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState<Stats>({
    totalDesigns: 0,
    totalEvaluations: 0,
    averageScore: 0,
    recentViews: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      if (!user) return;

      try {
        if (role === "designer") {
          // Fetch designer stats
          const { data: designs } = await supabase
            .from("designs")
            .select("id")
            .eq("designer_id", user.id);

          const { data: critiques } = await supabase
            .from("ai_critiques")
            .select("overall_score, design_id")
            .in("design_id", designs?.map(d => d.id) || []);

          const avgScore = critiques?.length 
            ? critiques.reduce((acc, c) => acc + (c.overall_score || 0), 0) / critiques.length
            : 0;

          setStats({
            totalDesigns: designs?.length || 0,
            totalEvaluations: critiques?.length || 0,
            averageScore: Math.round(avgScore),
            recentViews: 0,
          });
        } else {
          // Fetch recruiter stats
          const { data: evaluations } = await supabase
            .from("recruiter_evaluations")
            .select("id")
            .eq("recruiter_id", user.id);

          const { data: designers } = await supabase
            .from("profiles")
            .select("id");

          setStats({
            totalDesigns: 0,
            totalEvaluations: evaluations?.length || 0,
            averageScore: 0,
            recentViews: designers?.length || 0,
          });
        }
      } catch (error) {
        console.error("Error fetching stats:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, [user, role]);

  const designerStats = [
    { label: "Total Designs", value: stats.totalDesigns, icon: FileImage, color: "text-primary" },
    { label: "AI Critiques", value: stats.totalEvaluations, icon: Star, color: "text-accent" },
    { label: "Avg. Score", value: stats.averageScore || "—", icon: TrendingUp, color: "text-yellow-400" },
    { label: "Recent Views", value: stats.recentViews, icon: Eye, color: "text-orange-400" },
  ];

  const recruiterStats = [
    { label: "Designers Available", value: stats.recentViews, icon: Users, color: "text-primary" },
    { label: "My Evaluations", value: stats.totalEvaluations, icon: Star, color: "text-accent" },
    { label: "This Week", value: "—", icon: Clock, color: "text-yellow-400" },
    { label: "Shortlisted", value: "—", icon: TrendingUp, color: "text-orange-400" },
  ];

  const statItems = role === "recruiter" ? recruiterStats : designerStats;

  return (
    <DashboardLayout>
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Welcome Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <h1 className="font-display text-3xl font-bold text-foreground mb-2">
            Welcome back! 👋
          </h1>
          <p className="text-muted-foreground">
            {role === "designer" 
              ? "Upload your designs and get AI-powered feedback to improve your skills."
              : "Browse talented designers and their AI-critiqued work."}
          </p>
        </motion.div>

        {/* Stats Grid */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"
        >
          {statItems.map((stat, index) => (
            <div
              key={stat.label}
              className="glass rounded-xl p-6 hover:bg-secondary/30 transition-colors"
            >
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

        {/* Quick Actions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="glass rounded-xl p-6"
        >
          <h2 className="font-display text-xl font-semibold text-foreground mb-4">
            Quick Actions
          </h2>
          <div className="flex flex-wrap gap-4">
            {role === "designer" ? (
              <>
                <Button variant="hero" onClick={() => navigate("/upload")} className="gap-2">
                  <Upload className="w-4 h-4" />
                  Upload New Design
                </Button>
                <Button variant="glass" onClick={() => navigate("/my-designs")} className="gap-2">
                  <FileImage className="w-4 h-4" />
                  View My Designs
                </Button>
              </>
            ) : (
              <>
                <Button variant="hero" onClick={() => navigate("/designers")} className="gap-2">
                  <Users className="w-4 h-4" />
                  Browse Designers
                </Button>
              </>
            )}
          </div>
        </motion.div>

        {/* Recent Activity */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="glass rounded-xl p-6"
        >
          <h2 className="font-display text-xl font-semibold text-foreground mb-4">
            Recent Activity
          </h2>
          <div className="text-center py-12 text-muted-foreground">
            <Clock className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>No recent activity yet</p>
            <p className="text-sm mt-1">
              {role === "designer" 
                ? "Upload your first design to get started!"
                : "Start reviewing designers to see activity here."}
            </p>
          </div>
        </motion.div>
      </div>
    </DashboardLayout>
  );
};

export default Dashboard;
