import { useLocation, useNavigate } from "react-router-dom";
import { 
  LayoutDashboard, 
  Upload, 
  Users, 
  UserCircle, 
  Sparkles,
  LogOut,
  FileImage
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";

const designerItems = [
  { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
  { title: "Upload Design", url: "/upload", icon: Upload },
  { title: "My Designs", url: "/my-designs", icon: FileImage },
  { title: "Profile", url: "/profile", icon: UserCircle },
];

const recruiterItems = [
  { title: "Dashboard", url: "/recruiter-dashboard", icon: LayoutDashboard },
  { title: "Browse Designers", url: "/designers", icon: Users },
  { title: "Profile", url: "/profile", icon: UserCircle },
];

export function AppSidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { role, signOut, user } = useAuth();

  const items = role === "recruiter" ? recruiterItems : designerItems;

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  return (
    <Sidebar className="border-r border-border">
      <SidebarHeader className="border-b border-border p-4">
        <a href="/" className="flex items-center gap-2 group">
          <div className="p-1.5 rounded-lg bg-gradient-primary">
            <Sparkles className="w-5 h-5 text-primary-foreground" />
          </div>
          <span className="font-display font-semibold text-lg text-foreground">
            DesignCritique
          </span>
        </a>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="text-muted-foreground">
            {role === "recruiter" ? "Recruiter Menu" : "Designer Menu"}
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    isActive={location.pathname === item.url}
                  >
                    <a
                      href={item.url}
                      className="flex items-center gap-3"
                      onClick={(e) => {
                        e.preventDefault();
                        navigate(item.url);
                      }}
                    >
                      <item.icon className="w-5 h-5" />
                      <span>{item.title}</span>
                    </a>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-border p-4">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
            <UserCircle className="w-5 h-5 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium text-foreground truncate">
              {user?.email}
            </div>
            <div className="text-xs text-muted-foreground capitalize">
              {role}
            </div>
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleSignOut}
          className="w-full justify-start gap-2 text-muted-foreground hover:text-foreground"
        >
          <LogOut className="w-4 h-4" />
          Sign Out
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
}
