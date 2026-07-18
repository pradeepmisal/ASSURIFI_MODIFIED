import React from 'react';
import { Link } from 'react-router-dom';
import { Sparkles, ArrowRight } from 'lucide-react';
import AnimatedBackground from './AnimatedBackground.tsx';
import { Button } from './ui/button';

interface HeroProps {
  onAnalyze?: (token: string) => void;
}

const Hero: React.FC<HeroProps> = () => {
  return (
    <div className="relative min-h-[85vh] flex flex-col items-center justify-center overflow-hidden pt-32 pb-20">
      {/* Animated background */}
      <AnimatedBackground />

      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-mesh -z-10"></div>

      <div className="max-w-4xl mx-auto px-6 w-full relative z-10 flex flex-col items-center text-center fade-in">

        {/* Dynamic Badge */}
        <div className="inline-flex items-center gap-2 px-6 py-2 rounded-full border border-blue-500/30 bg-blue-500/10 text-slate-300 mb-8 backdrop-blur-md shadow-lg shadow-blue-500/5">
          <Sparkles className="h-4 w-4 text-blue-400" />
          <span className="text-sm font-medium tracking-wide">AI-Powered DeFi Security Platform</span>
        </div>

        {/* Headline */}
        <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-5 tracking-tight text-white drop-shadow-lg text-center leading-tight">
          Protect Your <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-cyan-400 to-purple-400">DeFi Investments</span><br />
          with AI-Powered Security
        </h1>

        {/* Subheadline */}
        <p className="text-lg md:text-xl text-slate-400 mb-12 max-w-3xl mx-auto leading-relaxed text-center font-light">
          Analyze smart contracts, monitor liquidity, and detect risks before you invest. Make informed decisions with real-time AI analysis.
        </p>

        {/* Main Action Button Section */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-5 z-50">
          <Link to="/audit">
            <Button
              size="lg"
              className="rounded-2xl bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-500 hover:via-indigo-500 hover:to-purple-500 text-white shadow-2xl shadow-blue-500/30 px-10 py-7 text-xl font-semibold tracking-wide flex items-center gap-3 transition-all duration-300 hover:scale-105 active:scale-95 border border-blue-400/20"
            >
              <Sparkles className="h-6 w-6 text-cyan-300 animate-pulse" />
              <span>Start Now</span>
              <ArrowRight className="h-6 w-6 ml-1 group-hover:translate-x-1 transition-transform" />
            </Button>
          </Link>
        </div>

      </div>
    </div>
  );
};

export default Hero;
