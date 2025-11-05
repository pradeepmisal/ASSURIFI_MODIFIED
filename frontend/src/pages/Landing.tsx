import React from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Github, Shield, BarChart3, Activity } from "lucide-react";
import PageTransition from "@/components/PageTransition";

const Landing: React.FC = () => {
  return (
    <div className="min-h-screen relative overflow-hidden flex items-center justify-center bg-gradient-to-br from-slate-900 via-blue-900 to-purple-900">
      {/* Background Elements */}
      <div className="absolute inset-0">
        {/* Blockchain Chain Links */}
        <div className="absolute bottom-0 left-0 w-96 h-96 opacity-20">
          <svg viewBox="0 0 400 400" className="w-full h-full">
            <defs>
              <pattern id="chainPattern" x="0" y="0" width="40" height="40" patternUnits="userSpaceOnUse">
                <rect x="0" y="0" width="40" height="40" fill="none" stroke="rgba(147, 51, 234, 0.3)" strokeWidth="2"/>
                <rect x="10" y="10" width="20" height="20" fill="none" stroke="rgba(147, 51, 234, 0.3)" strokeWidth="2"/>
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#chainPattern)"/>
          </svg>
        </div>
        
        <div className="absolute top-0 right-0 w-80 h-80 opacity-15">
          <svg viewBox="0 0 400 400" className="w-full h-full">
            <rect width="100%" height="100%" fill="url(#chainPattern)"/>
          </svg>
        </div>
        
        {/* Candlestick Charts */}
        <div className="absolute top-1/4 left-1/4 w-64 h-32 opacity-30">
          <svg viewBox="0 0 256 128" className="w-full h-full">
            <defs>
              <linearGradient id="chartGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#3b82f6" />
                <stop offset="50%" stopColor="#8b5cf6" />
                <stop offset="100%" stopColor="#06b6d4" />
              </linearGradient>
            </defs>
            <polyline
              points="0,100 32,80 64,90 96,60 128,70 160,50 192,65 224,55 256,75"
              fill="none"
              stroke="url(#chartGradient)"
              strokeWidth="3"
              className="animate-pulse"
            />
            {/* Candlestick bars */}
            <rect x="20" y="70" width="4" height="30" fill="#10b981" opacity="0.8"/>
            <rect x="52" y="60" width="4" height="40" fill="#ef4444" opacity="0.8"/>
            <rect x="84" y="40" width="4" height="60" fill="#10b981" opacity="0.8"/>
            <rect x="116" y="50" width="4" height="50" fill="#10b981" opacity="0.8"/>
            <rect x="148" y="30" width="4" height="70" fill="#10b981" opacity="0.8"/>
            <rect x="180" y="45" width="4" height="55" fill="#ef4444" opacity="0.8"/>
            <rect x="212" y="35" width="4" height="65" fill="#10b981" opacity="0.8"/>
          </svg>
        </div>
        
        {/* Floating Crypto Logos */}
        {/* Bitcoin - Top Left */}
        <div className="absolute top-20 left-20 w-20 h-20 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full flex items-center justify-center text-white font-bold text-2xl shadow-2xl shadow-yellow-500/50 animate-float">
          
        </div>
        
        {/* Solana - Top Right */}
        <div className="absolute top-32 right-24 w-16 h-16 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center text-white font-bold text-lg shadow-2xl shadow-purple-500/50 animate-float" style={{animationDelay: "1s"}}>
          
        </div>
        
        {/* Polygon - Bottom Right */}
        <div className="absolute bottom-24 right-32 w-14 h-14 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold text-sm shadow-2xl shadow-indigo-500/50 animate-float" style={{animationDelay: "2s"}}>
          
        </div>
        
        {/* Ethereum - Bottom Left */}
        <div className="absolute bottom-32 left-32 w-12 h-12 bg-gradient-to-br from-blue-400 to-purple-500 rounded-full flex items-center justify-center text-white font-bold text-sm shadow-2xl shadow-blue-500/50 animate-float" style={{animationDelay: "1.5s"}}>
          ?
        </div>
      </div>
      
      {/* Main Content */}
      <PageTransition>
        <div className="relative z-10 text-center px-6 max-w-4xl mx-auto">
          {/* Title */}
          <h1 className="text-7xl md:text-8xl font-bold text-white mb-6 tracking-tight">
            ASSUREFI
          </h1>
          
          {/* Tagline */}
          <p className="text-xl md:text-2xl text-gray-300 mb-12 max-w-2xl mx-auto leading-relaxed">
            AI-driven Security for Smart Contracts & DeFi
          </p>
          
          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-6 justify-center items-center mb-20">
            <Link 
              to="/features" 
              className="group px-10 py-4 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold rounded-lg transition-all duration-300 transform hover:scale-105 hover:shadow-2xl hover:shadow-purple-500/25 flex items-center gap-2 text-lg"
            >
              Start Analysis
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </Link>
            
            <a 
              href="https://github.com/pradeepmisal/ASSUREFI" 
              target="_blank" 
              rel="noopener noreferrer"
              className="group px-10 py-4 border-2 border-white/30 hover:border-white/60 text-white font-semibold rounded-lg transition-all duration-300 transform hover:scale-105 hover:bg-white/10 flex items-center gap-2 text-lg"
            >
              <Github className="w-5 h-5" />
              Explore GitHub
            </a>
          </div>
          
          {/* Feature Highlights */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-12 text-gray-400">
            {/* Smart Contract Analysis */}
            <div className="flex flex-col items-center group">
              <div className="w-20 h-20 rounded-full bg-blue-500/20 flex items-center justify-center mb-4 group-hover:bg-blue-500/30 transition-colors">
                <div className="relative">
                  <Shield className="w-10 h-10 text-blue-400" />
                  <div className="absolute -top-1 -right-1 w-4 h-4 bg-green-400 rounded-full flex items-center justify-center">
                    <div className="w-2 h-2 bg-white rounded-full"></div>
                  </div>
                </div>
              </div>
              <p className="text-sm font-medium text-white">Smart Contract Analysis</p>
            </div>
            
            {/* Risk Assessment */}
            <div className="flex flex-col items-center group">
              <div className="w-20 h-20 rounded-full bg-purple-500/20 flex items-center justify-center mb-4 group-hover:bg-purple-500/30 transition-colors">
                <div className="relative">
                  <div className="w-10 h-10 border-2 border-purple-400 rounded-lg flex items-center justify-center">
                    <div className="w-4 h-4 bg-purple-400 rounded-sm"></div>
                  </div>
                  <div className="absolute -top-1 -right-1 w-4 h-4 bg-yellow-400 rounded-full flex items-center justify-center">
                    <div className="w-2 h-2 bg-white rounded-full"></div>
                  </div>
                </div>
              </div>
              <p className="text-sm font-medium text-white">Risk Assessment</p>
            </div>
            
            {/* Real-time Monitoring */}
            <div className="flex flex-col items-center group">
              <div className="w-20 h-20 rounded-full bg-cyan-500/20 flex items-center justify-center mb-4 group-hover:bg-cyan-500/30 transition-colors">
                <div className="relative">
                  <BarChart3 className="w-10 h-10 text-cyan-400" />
                  <div className="absolute -top-1 -right-1 w-4 h-4 bg-red-400 rounded-full flex items-center justify-center">
                    <div className="w-2 h-2 bg-white rounded-full"></div>
                  </div>
                </div>
              </div>
              <p className="text-sm font-medium text-white">Real-time Monitoring</p>
            </div>
          </div>
        </div>
      </PageTransition>
      
      {/* Floating particles effect */}
      <div className="absolute inset-0 pointer-events-none">
        {[...Array(20)].map((_, i) => (
          <div
            key={i}
            className="absolute w-1 h-1 bg-white/20 rounded-full animate-pulse"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 3}s`,
              animationDuration: `${2 + Math.random() * 2}s`
            }}
          />
        ))}
      </div>
    </div>
  );
};

export default Landing;
