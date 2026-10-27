import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { SidebarProvider, SidebarTrigger, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Clock } from "lucide-react";

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export const DashboardLayout = ({ children }: DashboardLayoutProps) => {
  const { user, loading, recruiterPending, signOut } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !user) {
      navigate("/auth");
    }
  }, [user, loading, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  // Recruiters can see every designer's work, so their accounts are approved by hand.
  if (recruiterPending) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <div className="glass rounded-2xl p-8 max-w-md text-center space-y-4">
          <div className="inline-flex p-3 rounded-xl bg-primary/20">
            <Clock className="w-6 h-6 text-primary" />
          </div>
          <h1 className="font-display text-2xl font-bold text-foreground">Recruiter account pending</h1>
          <p className="text-muted-foreground">
            Recruiters can see designers' profiles and portfolios, so every recruiter account is checked before it
            opens. Sign in again once an admin has approved {user.email}.
          </p>
          <Button variant="glass" onClick={() => signOut().then(() => navigate("/"))}>
            Sign out
          </Button>
        </div>
      </div>
    );
  }

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AppSidebar />
        <SidebarInset className="flex-1">
          <header className="h-14 border-b border-border flex items-center px-4 gap-4">
            <SidebarTrigger />
          </header>
          <main className="p-6 bg-background min-h-[calc(100vh-3.5rem)]">
            {children}
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
};
