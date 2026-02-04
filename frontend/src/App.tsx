import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Landing from "./pages/Landing";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import Audit from "./pages/Audit";
import Monitor from "./pages/Monitor";
import TrustScore from "./pages/TrustScore";
import SentimentAnalysis from "./pages/SentimentAnalysis";
import Profile from "./pages/Profile";
import History from "./pages/History";
import Report from "./pages/Report";

const queryClient = new QueryClient();

import { AuthProvider } from "./context/AuthContext";
import Login from "./pages/Login";
import Register from "./pages/Register";

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            {/* Modern Crypto Landing Page - Home */}
            <Route path="/" element={<Index />} />

            {/* Auth Routes */}
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />

            {/* Old Landing Page (backup) */}
            <Route path="/old-landing" element={<Landing />} />

            {/* Individual Feature Pages */}
            <Route path="/audit" element={<Audit />} />
            <Route path="/monitor" element={<Monitor />} />
            <Route path="/sentiment-analysis" element={<SentimentAnalysis />} />
            <Route path="/history" element={<History />} />
            <Route path="/report/:id" element={<Report />} />

            {/* User Pages */}
            <Route path="/profile" element={<Profile />} />
            <Route path="/settings" element={<Profile />} />

            {/* Catch-all route */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
