import React, { useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import {
  Shield,
  LayoutDashboard,
  FileSearch,
  Activity,
  BarChart3,
  AlertTriangle,
  User,
  Settings,
  Menu,
  X,
  Bell,
  MessageSquare,
  TrendingDown,
  Wallet,
  BellRing
} from "lucide-react";
import SearchBar from "./SearchBar";
import { LiveAlertsPopup } from "./LiveAlertsPopup";
import { Button } from "./ui/button";
import { toast } from "@/hooks/use-toast";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/context/AuthContext";

interface DashboardLayoutProps {
  children: React.ReactNode;
  title: string;
  description?: string;
}

import UnifiedBackground from "./UnifiedBackground";

const DashboardLayout: React.FC<DashboardLayoutProps> = ({
  children,
  title,
  description
}) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isAlertsOpen, setIsAlertsOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, logout } = useAuth(); // Use global auth state

  const handleLogout = () => {
    logout();
    toast({
      title: "Logged out",
      description: "You have been successfully logged out.",
    });
    navigate('/login');
  };

  const navigationItems = [
    {
      name: "Smart Contract Audit",
      href: "/audit",
      icon: <FileSearch className="h-5 w-5" />
    },
    {
      name: "Liquidity Monitor",
      href: "/monitor",
      icon: <Activity className="h-5 w-5" />
    },
    {
      name: "Sentiment Analysis",
      href: "/sentiment-analysis",
      icon: <MessageSquare className="h-5 w-5" />
    },
    {
      name: "History",
      href: "/history",
      icon: <BarChart3 className="h-5 w-5" />
    }
  ];

  const bottomNavItems = [
    {
      name: "Settings",
      href: "/settings",
      icon: <Settings className="h-5 w-5" />
    },
    {
      name: "Profile",
      href: "/profile",
      icon: <User className="h-5 w-5" />
    },
  ];

  return (
    <UnifiedBackground>
      <div className="flex flex-col md:flex-row min-h-screen">
        {/* Mobile Sidebar Toggle */}
        <div className="md:hidden fixed top-4 left-4 z-50">
          <button
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="h-10 w-10 rounded-md bg-slate-900/50 backdrop-blur-md border border-slate-700 text-white flex items-center justify-center shadow-sm"
          >
            {isSidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>

        {/* Sidebar for Mobile */}
        <AnimatePresence>
          {isSidebarOpen && (
            <motion.div
              initial={{ x: -300, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -300, opacity: 0 }}
              transition={{ type: "spring", damping: 30, stiffness: 300 }}
              className="fixed inset-0 z-50 md:hidden"
            >
              <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setIsSidebarOpen(false)} />
              <div className="absolute inset-y-0 left-0 w-64 bg-slate-900/95 backdrop-blur-xl border-r border-slate-800 overflow-y-auto">
                {renderSidebarContent()}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Sidebar for Desktop */}
        <div className="hidden md:flex flex-col w-64 bg-slate-900/40 backdrop-blur-md border-r border-slate-800/50 h-screen sticky top-0 overflow-y-auto shrink-0">
          {renderSidebarContent()}
        </div>

        {/* Main Content */}
        <main className="flex-1 flex flex-col min-w-0">
          {/* Header */}
          <header className="h-16 md:h-20 bg-slate-900/40 backdrop-blur-md border-b border-slate-800/50 flex items-center justify-between px-4 lg:px-8 sticky top-0 z-40">
            <div>
              <h1 className="font-display text-xl md:text-2xl font-medium text-white">{title}</h1>
              {description && <p className="text-slate-400 text-sm md:text-base hidden md:block">{description}</p>}
            </div>
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                size="sm"
                className="hidden md:flex items-center gap-2 border-slate-700 text-slate-300 hover:bg-slate-800 hover:text-white"
                onClick={() => setIsAlertsOpen(true)}
              >
                <BellRing className="h-4 w-4" />
                <span>Live Alerts</span>
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger>
                  <div className="h-10 w-10 rounded-full bg-blue-500/10 border border-blue-500/20 flex items-center justify-center hover:bg-blue-500/20 transition-colors">
                    <User className="h-5 w-5 text-blue-400" />
                  </div>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-64 bg-slate-900 border-slate-800 text-slate-200">
                  <div className="px-3 py-2">
                    <p className="text-sm font-medium text-white">{user?.username || 'User'}</p>
                    <p className="text-xs text-slate-400">{user?.email || 'user@example.com'}</p>
                  </div>
                  <DropdownMenuSeparator className="bg-slate-800" />
                  <DropdownMenuItem onClick={handleLogout} className="text-red-400 focus:text-red-400 focus:bg-red-400/10 cursor-pointer">
                    <TrendingDown className="h-4 w-4 mr-2" />
                    <span>Logout</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </header>

          {/* Mobile Quick Actions */}
          <div className="md:hidden flex items-center justify-end px-4 py-2 border-b border-slate-800/50 bg-slate-900/40 backdrop-blur-md sticky top-16 z-30">
            <Button
              variant="outline"
              size="sm"
              className="flex items-center gap-2 border-slate-700 text-slate-300 hover:bg-slate-800 hover:text-white"
              onClick={() => setIsAlertsOpen(true)}
            >
              <BellRing className="h-4 w-4" />
              <span>Alerts</span>
            </Button>
          </div>

          {/* Page Content */}
          <div className="p-4 lg:p-8">
            {children}
          </div>
        </main>

        {/* Live Alerts Popup */}
        <LiveAlertsPopup isOpen={isAlertsOpen} onClose={() => setIsAlertsOpen(false)} />
      </div>
    </UnifiedBackground>
  );

  function renderSidebarContent() {
    return (
      <>
        {/* Sidebar Header */}
        <div className="h-16 md:h-20 px-4 border-b border-slate-800/50 flex items-center">
          <Link to="/" className="flex items-center gap-2">
            <div className="flex items-center justify-center h-8 w-8 rounded-md bg-transparent">
              <Shield className="h-6 w-6 text-blue-400" />
            </div>
            <span className="font-display font-bold text-xl text-white">AssureFi</span>
          </Link>
        </div>

        {/* Navigation */}
        <nav className="p-4">
          <div className="space-y-1">
            {navigationItems.map((item) => (
              <Link
                key={item.name}
                to={item.href}
                className={cn(
                  "flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors",
                  location.pathname === item.href
                    ? "bg-blue-500/10 text-blue-400"
                    : "text-slate-400 hover:bg-slate-800/50 hover:text-white"
                )}
              >
                {item.icon}
                {item.name}
              </Link>
            ))}
          </div>
        </nav>

        {/* Bottom Navigation */}
        <div className="mt-auto p-4 border-t border-slate-800/50 bg-transparent">
          <div className="space-y-1">
            {bottomNavItems.map((item) => (
              <Link
                key={item.name}
                to={item.href}
                className={cn(
                  "flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors",
                  location.pathname === item.href
                    ? "bg-blue-500/10 text-blue-400"
                    : "text-slate-400 hover:bg-slate-800/50 hover:text-white"
                )}
              >
                {item.icon}
                {item.name}
              </Link>
            ))}
          </div>
        </div>
      </>
    );
  }
};

export default DashboardLayout;
