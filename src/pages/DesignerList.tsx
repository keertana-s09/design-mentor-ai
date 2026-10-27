import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { 
  Users, 
  Search, 
  Star, 
  Briefcase, 
  ExternalLink,
  FileImage,
  EyeOff,
  UserRound
} from "lucide-react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { averageScore, pickCritique } from "@/lib/critiques";
import { useBlindReview, candidateLabel } from "@/hooks/useBlindReview";

interface Designer {
  id: string;
  user_id: string;
  full_name: string | null;
  email: string;
  bio: string | null;
  avatar_url: string | null;
  portfolio_url: string | null;
  specializations: string[];
  years_experience: number | null;
  design_count: number;
  avg_score: number | null;
  avg_verified: boolean;
}

const DesignerList = () => {
  const navigate = useNavigate();
  const [designers, setDesigners] = useState<Designer[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [blind, setBlind] = useBlindReview();

  useEffect(() => {
    const fetchDesigners = async () => {
      try {
        // Fetch profiles of designers
        const { data: profiles, error: profilesError } = await supabase
          .from("profiles")
          .select("*");

        if (profilesError) throw profilesError;

        // Fetch user roles to filter designers
        const { data: roles, error: rolesError } = await supabase
          .from("user_roles")
          .select("user_id, role")
          .eq("role", "designer");

        if (rolesError) throw rolesError;

        const designerUserIds = roles?.map(r => r.user_id) || [];

        // Fetch designs with critiques
        const { data: designs, error: designsError } = await supabase
          .from("designs")
          .select(`
            designer_id,
            ai_critiques (
              overall_score,
              verified,
              created_at
            )
          `)
          .in("designer_id", designerUserIds);

        if (designsError) throw designsError;

        // Aggregate data
        const designerData = profiles
          ?.filter(p => designerUserIds.includes(p.user_id))
          .map(profile => {
            const userDesigns = designs?.filter(d => d.designer_id === profile.user_id) || [];
            const avg = averageScore(userDesigns.map(d => pickCritique(d.ai_critiques)));

            return {
              ...profile,
              design_count: userDesigns.length,
              avg_score: avg.score,
              avg_verified: avg.verified,
            };
          }) || [];

        setDesigners(designerData);
      } catch (error) {
        console.error("Error fetching designers:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchDesigners();
  }, []);

  const query = searchQuery.toLowerCase();
  // In blind review, only skills are searchable so names can't be looked up.
  const filteredDesigners = designers.filter(designer =>
    designer.specializations?.some(s => s.toLowerCase().includes(query)) ||
    (!blind && (
      designer.full_name?.toLowerCase().includes(query) ||
      designer.email.toLowerCase().includes(query) ||
      designer.bio?.toLowerCase().includes(query)
    ))
  );

  const getScoreColor = (score: number | null) => {
    if (!score) return "text-muted-foreground";
    if (score >= 80) return "text-accent";
    if (score >= 60) return "text-yellow-400";
    return "text-orange-400";
  };

  return (
    <DashboardLayout>
      <div className="max-w-6xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
            <div>
              <h1 className="font-display text-3xl font-bold text-foreground mb-2">
                Browse Designers
              </h1>
              <p className="text-muted-foreground">
                Discover talented designers and their AI-critiqued portfolios
              </p>
            </div>

            <div className="flex flex-col sm:items-end gap-3 max-w-xs w-full">
            <label className="flex items-center gap-2 text-sm text-muted-foreground cursor-pointer">
              <EyeOff className="w-4 h-4" />
              Blind review
              <Switch checked={blind} onCheckedChange={setBlind} />
            </label>
            <div className="relative w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder={blind ? "Search skills..." : "Search designers..."}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 bg-secondary/50 border-border"
              />
            </div>
            </div>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="glass rounded-xl p-6 animate-pulse">
                  <div className="flex items-center gap-4 mb-4">
                    <div className="w-14 h-14 rounded-full bg-secondary" />
                    <div className="space-y-2">
                      <div className="h-5 bg-secondary rounded w-24" />
                      <div className="h-4 bg-secondary rounded w-32" />
                    </div>
                  </div>
                  <div className="h-16 bg-secondary rounded" />
                </div>
              ))}
            </div>
          ) : filteredDesigners.length === 0 ? (
            <div className="glass rounded-xl p-12 text-center">
              <Users className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-50" />
              <h2 className="font-display text-xl font-semibold text-foreground mb-2">
                No designers found
              </h2>
              <p className="text-muted-foreground">
                {searchQuery 
                  ? "Try a different search term"
                  : "No designers have joined yet"}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredDesigners.map((designer, index) => (
                <motion.div
                  key={designer.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: index * 0.05 }}
                  className="glass rounded-xl p-6 hover:bg-secondary/30 transition-colors cursor-pointer group"
                  onClick={() => navigate(`/designer/${designer.user_id}`)}
                >
                  <div className="flex items-start gap-4 mb-4">
                    <div className="w-14 h-14 rounded-full bg-gradient-primary flex items-center justify-center flex-shrink-0">
                      {blind ? (
                        <UserRound className="w-7 h-7 text-primary-foreground" />
                      ) : designer.avatar_url ? (
                        <img 
                          src={designer.avatar_url} 
                          alt={designer.full_name || "Designer"} 
                          className="w-full h-full rounded-full object-cover"
                        />
                      ) : (
                        <span className="text-xl font-bold text-primary-foreground">
                          {(designer.full_name || designer.email)[0].toUpperCase()}
                        </span>
                      )}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <h3 className="font-display font-semibold text-foreground truncate">
                        {blind ? candidateLabel(designer.user_id) : designer.full_name || "Designer"}
                      </h3>
                      {!blind && (
                        <p className="text-sm text-muted-foreground truncate">
                          {designer.email}
                        </p>
                      )}
                    </div>
                  </div>

                  {designer.bio && !blind && (
                    <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                      {designer.bio}
                    </p>
                  )}

                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-1 text-muted-foreground">
                        <FileImage className="w-4 h-4" />
                        <span>{designer.design_count}</span>
                      </div>
                      
                      {designer.years_experience && (
                        <div className="flex items-center gap-1 text-muted-foreground">
                          <Briefcase className="w-4 h-4" />
                          <span>{designer.years_experience}y</span>
                        </div>
                      )}
                    </div>

                    {designer.avg_score !== null && (
                      <div
                        className={`flex items-center gap-1 font-medium ${getScoreColor(designer.avg_score)}`}
                        title={designer.avg_verified ? "Average of verified AI scores" : "No verified scores yet"}
                      >
                        <Star className="w-4 h-4" />
                        <span>{designer.avg_score}</span>
                        {!designer.avg_verified && (
                          <span className="text-xs font-normal text-muted-foreground">unverified</span>
                        )}
                      </div>
                    )}
                  </div>

                  {designer.specializations && designer.specializations.length > 0 && (
                    <div className="mt-4 flex flex-wrap gap-2">
                      {designer.specializations.slice(0, 3).map((spec, i) => (
                        <span 
                          key={i}
                          className="text-xs px-2 py-1 rounded-full bg-primary/10 text-primary"
                        >
                          {spec}
                        </span>
                      ))}
                    </div>
                  )}

                  <div className="mt-4 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button variant="hero" size="sm" className="w-full gap-2">
                      View Portfolio
                      <ExternalLink className="w-3 h-3" />
                    </Button>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </motion.div>
      </div>
    </DashboardLayout>
  );
};

export default DesignerList;
