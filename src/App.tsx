import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import DesignUpload from "./pages/DesignUpload";
import MyDesigns from "./pages/MyDesigns";
import CritiqueResults from "./pages/CritiqueResults";
import DesignerList from "./pages/DesignerList";
import DesignerEvaluation from "./pages/DesignerEvaluation";
import RecruiterDashboard from "./pages/RecruiterDashboard";
import Profile from "./pages/Profile";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/upload" element={<DesignUpload />} />
            <Route path="/my-designs" element={<MyDesigns />} />
            <Route path="/critique/:designId" element={<CritiqueResults />} />
            <Route path="/designers" element={<DesignerList />} />
            <Route path="/recruiter-dashboard" element={<RecruiterDashboard />} />
            <Route path="/designer/:designerId" element={<DesignerEvaluation />} />
            <Route path="/profile" element={<Profile />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
