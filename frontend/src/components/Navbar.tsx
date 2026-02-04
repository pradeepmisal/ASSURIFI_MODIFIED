
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Shield } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';

const Navbar: React.FC = () => {
  const { isAuthenticated, user, logout } = useAuth();
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 px-6 md:px-12 py-5
        ${isScrolled ? 'bg-slate-950/95 backdrop-blur-md border-b border-slate-800/50' : 'bg-slate-950/60 backdrop-blur-sm'}
      `}
    >
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <Link
          to="/"
          className="flex items-center space-x-2 text-2xl font-bold text-white hover:text-blue-400 transition-colors"
        >
          <Shield className="h-8 w-8" />
          <span className="font-display">AssureFi</span>
        </Link>

        {/* Right side - Login/Logout */}
        <div className="flex items-center gap-4">
          {isAuthenticated ? (
            <>
              <span className="text-sm font-medium text-slate-400 hidden sm:block">
                Hello, <span className="text-white">{user?.username}</span>
              </span>
              <button
                onClick={logout}
                className="px-4 py-2 text-sm font-medium text-white bg-slate-800 hover:bg-red-600 rounded-lg transition-all duration-200"
              >
                Logout
              </button>
            </>
          ) : (
            <Link to="/login">
              <Button
                className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-6 py-2 rounded-lg shadow-lg shadow-blue-500/30"
              >
                Login
              </Button>
            </Link>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
