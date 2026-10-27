import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { UserCircle, Save, Mail, Briefcase, Link as LinkIcon, FileText } from "lucide-react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface ProfileData {
  full_name: string;
  bio: string;
  portfolio_url: string;
  specializations: string[];
  years_experience: number | null;
}

const Profile = () => {
  const { user, role } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState<ProfileData>({
    full_name: "",
    bio: "",
    portfolio_url: "",
    specializations: [],
    years_experience: null,
  });
  const [specializationsInput, setSpecializationsInput] = useState("");

  useEffect(() => {
    const fetchProfile = async () => {
      if (!user) return;

      try {
        const { data, error } = await supabase
          .from("profiles")
          .select("*")
          .eq("user_id", user.id)
          .maybeSingle();

        if (error) throw error;

        if (data) {
          setProfile({
            full_name: data.full_name || "",
            bio: data.bio || "",
            portfolio_url: data.portfolio_url || "",
            specializations: data.specializations || [],
            years_experience: data.years_experience,
          });
          setSpecializationsInput((data.specializations || []).join(", "));
        }
      } catch (error) {
        console.error("Error fetching profile:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setSaving(true);
    try {
      const specializations = specializationsInput
        .split(",")
        .map(s => s.trim())
        .filter(s => s.length > 0);

      const { error } = await supabase
        .from("profiles")
        .update({
          full_name: profile.full_name,
          bio: profile.bio,
          portfolio_url: profile.portfolio_url,
          specializations,
          years_experience: profile.years_experience,
        })
        .eq("user_id", user.id);

      if (error) throw error;

      toast.success("Profile updated successfully!");
    } catch (error) {
      console.error("Error updating profile:", error);
      toast.error("Failed to update profile");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="max-w-2xl mx-auto animate-pulse space-y-6">
          <div className="h-8 bg-secondary rounded w-1/3" />
          <div className="glass rounded-xl p-6 space-y-4">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="space-y-2">
                <div className="h-4 bg-secondary rounded w-24" />
                <div className="h-10 bg-secondary rounded" />
              </div>
            ))}
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="max-w-2xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <h1 className="font-display text-3xl font-bold text-foreground mb-2">
            Your Profile
          </h1>
          <p className="text-muted-foreground mb-8">
            {role === "designer" 
              ? "Update your profile to help recruiters find you"
              : "Manage your account settings"}
          </p>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Profile Picture Placeholder */}
            <div className="glass rounded-xl p-6 flex items-center gap-6">
              <div className="w-20 h-20 rounded-full bg-gradient-primary flex items-center justify-center flex-shrink-0">
                <UserCircle className="w-12 h-12 text-primary-foreground" />
              </div>
              <div>
                <h3 className="font-display font-semibold text-foreground">
                  {profile.full_name || user?.email}
                </h3>
                <p className="text-sm text-muted-foreground capitalize">{role}</p>
                <p className="text-sm text-muted-foreground">{user?.email}</p>
              </div>
            </div>

            {/* Form Fields */}
            <div className="glass rounded-xl p-6 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="fullName" className="text-foreground">Full Name</Label>
                <div className="relative">
                  <UserCircle className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <Input
                    id="fullName"
                    value={profile.full_name}
                    onChange={(e) => setProfile({ ...profile, full_name: e.target.value })}
                    placeholder="John Doe"
                    className="pl-10 bg-secondary/50 border-border"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="bio" className="text-foreground">Bio</Label>
                <div className="relative">
                  <Textarea
                    id="bio"
                    value={profile.bio}
                    onChange={(e) => setProfile({ ...profile, bio: e.target.value })}
                    placeholder="Tell us about yourself..."
                    rows={4}
                    className="bg-secondary/50 border-border resize-none"
                  />
                </div>
              </div>

              {role === "designer" && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="portfolio" className="text-foreground">Portfolio URL</Label>
                    <div className="relative">
                      <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                      <Input
                        id="portfolio"
                        type="url"
                        value={profile.portfolio_url}
                        onChange={(e) => setProfile({ ...profile, portfolio_url: e.target.value })}
                        placeholder="https://yourportfolio.com"
                        className="pl-10 bg-secondary/50 border-border"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="specializations" className="text-foreground">
                      Specializations
                    </Label>
                    <div className="relative">
                      <FileText className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                      <Input
                        id="specializations"
                        value={specializationsInput}
                        onChange={(e) => setSpecializationsInput(e.target.value)}
                        placeholder="UI Design, Web Apps, Mobile (comma-separated)"
                        className="pl-10 bg-secondary/50 border-border"
                      />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Separate multiple specializations with commas
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="experience" className="text-foreground">
                      Years of Experience
                    </Label>
                    <div className="relative">
                      <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                      <Input
                        id="experience"
                        type="number"
                        min={0}
                        max={50}
                        value={profile.years_experience ?? ""}
                        onChange={(e) => setProfile({ 
                          ...profile, 
                          years_experience: e.target.value ? parseInt(e.target.value) : null 
                        })}
                        placeholder="5"
                        className="pl-10 bg-secondary/50 border-border"
                      />
                    </div>
                  </div>
                </>
              )}
            </div>

            <Button
              type="submit"
              variant="hero"
              size="lg"
              className="w-full gap-2"
              disabled={saving}
            >
              <Save className="w-4 h-4" />
              {saving ? "Saving..." : "Save Changes"}
            </Button>
          </form>
        </motion.div>
      </div>
    </DashboardLayout>
  );
};

export default Profile;
