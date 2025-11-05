import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Landing from "./pages/Landing";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import Dashboard from "./pages/Dashboard";
import Audit from "./pages/Audit";
import Monitor from "./pages/Monitor";
import TrustScore from "./pages/TrustScore";
import SentimentAnalysis from "./pages/SentimentAnalysis";
import RiskAnalysis from "./pages/RiskAnalysis";
import WalletAnalysis from "./pages/WalletAnalysis";
import Profile from "./pages/Profile";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          {/* New Landing Page - Default Route */}
          <Route path="/" element={<Landing />} />
          
          {/* Features/Dashboard Page - Main app after landing */}
          <Route path="/features" element={<Index />} />
          
          {/* Individual Feature Pages */}
          <Route path="/audit" element={<Audit />} />
          <Route path="/monitor" element={<Monitor />} />
          <Route path="/sentiment-analysis" element={<SentimentAnalysis />} />
          <Route path="/risk-analysis" element={<RiskAnalysis />} />
          <Route path="/wallet-analysis" element={<WalletAnalysis />} />
          
          {/* User Pages */}
          <Route path="/profile" element={<Profile />} />
          <Route path="/settings" element={<Profile />} />
          
          {/* Catch-all route */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
