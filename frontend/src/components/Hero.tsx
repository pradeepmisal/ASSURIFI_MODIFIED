import React, { useState } from 'react';
import { Search, Activity, Sparkles, ChevronRight } from 'lucide-react';
import AnimatedBackground from './AnimatedBackground.tsx';
import { Button } from './ui/button';

interface HeroProps {
  onAnalyze: (token: string) => void;
}

const SUGGESTIONS = [
  { name: 'Ethereum', symbol: 'ETH', address: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2' },
  { name: 'Tether USD', symbol: 'USDT', address: '0xdAC17F958D2ee523a2206206994597C13D831ec7' },
  { name: 'Pepe', symbol: 'PEPE', address: '0x6982508145454Ce325dDbE47a25d4ec3d2311933' },
  { name: 'Shiba Inu', symbol: 'SHIB', address: '0x95aD61b0a150d79219dCF64E1E6Cc01f0B64C4cE' },
  { name: 'Chainlink', symbol: 'LINK', address: '0x514910771AF9Ca656af840dff83E8264EcF986CA' },
  { name: 'Wrapped Bitcoin', symbol: 'WBTC', address: '0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599' },
  { name: 'Uniswap', symbol: 'UNI', address: '0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984' },
];

const Hero: React.FC<HeroProps> = ({ onAnalyze }) => {
  const [inputValue, setInputValue] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputValue.trim()) {
      setShowSuggestions(false);
      onAnalyze(inputValue.trim());
    }
  };

  const filteredSuggestions = SUGGESTIONS.filter(
    s => s.name.toLowerCase().includes(inputValue.toLowerCase()) ||
      s.symbol.toLowerCase().includes(inputValue.toLowerCase()) ||
      s.address.toLowerCase().includes(inputValue.toLowerCase())
  );

  const exampleTokens = ['USDT', 'PEPE', 'WETH'];

  return (
    <div className="relative min-h-[85vh] flex flex-col items-center justify-center overflow-hidden pt-32 pb-20">
      {/* Animated background */}
      <AnimatedBackground />

      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-mesh -z-10"></div>

      <div className="max-w-4xl mx-auto px-6 w-full relative z-10 flex flex-col items-center text-center fade-in">

        {/* Dynamic Badge */}
        <div className="inline-flex items-center gap-2 px-6 py-2 rounded-full border border-blue-500/30 bg-blue-500/10 text-slate-300 mb-8 backdrop-blur-md">
          <Sparkles className="h-4 w-4 text-blue-400" />
          <span className="text-sm font-medium tracking-wide">AI-Powered DeFi Security Platform</span>
        </div>

        {/* Headline */}
        <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-5 tracking-tight text-white drop-shadow-lg text-center leading-tight">
          Protect Your <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-cyan-400 to-purple-400">DeFi Investments</span><br />
          with AI-Powered Security
        </h1>

        {/* Subheadline */}
        <p className="text-lg md:text-xl text-slate-400 mb-10 max-w-3xl mx-auto leading-relaxed text-center font-light">
          Analyze smart contracts, monitor liquidity, and detect risks before you invest. Make informed decisions with real-time AI analysis.
        </p>

        {/* Main Input Box */}
        <div className="w-full max-w-2xl relative group mb-8 z-50">
          <div className="absolute -inset-1 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500 rounded-2xl blur opacity-30 group-hover:opacity-50 transition duration-500"></div>
          <div className="relative">
            <form onSubmit={handleSubmit} className="relative flex items-center w-full bg-slate-900/90 backdrop-blur-xl border border-slate-700/50 rounded-2xl overflow-hidden shadow-2xl transition-all hover:border-slate-500/50 focus-within:border-blue-500/50 focus-within:ring-1 focus-within:ring-blue-500/50 z-20">
              <div className="pl-6 pr-4 flex items-center justify-center pointer-events-none text-slate-400">
                <Search className="h-6 w-6" />
              </div>

              <input
                type="text"
                value={inputValue}
                onChange={(e) => {
                  setInputValue(e.target.value);
                  setShowSuggestions(true);
                }}
                onFocus={() => setShowSuggestions(true)}
                onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                className="flex-1 py-5 md:py-6 bg-transparent text-white text-lg md:text-xl placeholder:text-slate-500 focus:outline-none focus:ring-0"
                placeholder="Paste contract address, token name, or project..."
              />

              <div className="pr-3 pl-2 py-3">
                <Button
                  type="submit"
                  size="lg"
                  disabled={!inputValue.trim()}
                  className="rounded-xl bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-500/25 px-6 font-medium tracking-wide flex items-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Sparkles className="h-4 w-4" />
                  <span className="hidden sm:inline">Analyze</span>
                </Button>
              </div>
            </form>

            {/* Suggestions Dropdown */}
            {showSuggestions && inputValue.length > 0 && filteredSuggestions.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-slate-900/95 backdrop-blur-xl border border-slate-700 rounded-xl shadow-2xl overflow-hidden z-50 animate-in fade-in slide-in-from-top-2">
                <ul className="max-h-64 overflow-y-auto custom-scrollbar p-2">
                  {filteredSuggestions.map((suggestion, idx) => (
                    <li
                      key={idx}
                      onMouseDown={(e) => {
                        e.preventDefault(); // Prevent onBlur of input
                        setInputValue(suggestion.symbol);
                        setShowSuggestions(false);
                        onAnalyze(suggestion.address);
                      }}
                      className="flex items-center justify-between p-3 hover:bg-slate-800 rounded-lg cursor-pointer transition-colors"
                    >
                      <div className="flex flex-col text-left">
                        <span className="text-white font-medium flex items-center gap-2">
                          {suggestion.name} <span className="text-slate-400 text-xs px-2 py-0.5 rounded-md bg-slate-800 border border-slate-700">{suggestion.symbol}</span>
                        </span>
                        <span className="text-slate-500 text-xs font-mono mt-1 w-full truncate max-w-sm">{suggestion.address}</span>
                      </div>
                      <ChevronRight className="h-4 w-4 text-slate-500" />
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>

        {/* Example Chips */}
        <div className="flex flex-wrap items-center justify-center gap-3 scale-in delay-200 w-full">
          <span className="text-sm font-medium text-slate-400 mr-2">Try:</span>
          {exampleTokens.map((token) => (
            <button
              key={token}
              onClick={() => {
                setInputValue(token);
                onAnalyze(token);
              }}
              className="px-4 py-1.5 rounded-full bg-slate-800/50 hover:bg-slate-700/80 border border-slate-700/50 text-slate-300 hover:text-white text-sm font-medium transition-all hover:scale-105 active:scale-95 flex items-center gap-2 backdrop-blur-sm"
            >
              {token} <ChevronRight className="h-3 w-3 opacity-50" />
            </button>
          ))}
        </div>

      </div>
    </div>
  );
};

export default Hero;
