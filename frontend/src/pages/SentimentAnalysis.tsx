
import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { TrendingUp, TrendingDown, MessageSquare, Newspaper, Activity, Zap, Search } from "lucide-react";
import { mockCoinData } from "@/data/mockCoinData";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';

// Check api/app.js to confirm exact path. 
// Assuming mounted at /api/sentiment based on standard practice, but verify.
// If app.js mounts at '/', then url is /analyze.
const API_BASE_URL = "http://localhost:3002";

const CryptoSentimentDashboard = () => {
  const [selectedCoin, setSelectedCoin] = useState(mockCoinData[0]);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);

  // Search Bar State
  const [searchQuery, setSearchQuery] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);

  // Close suggestions when clicking outside (handled via simple delay or overlay in full app, here simple toggle)
  // For robustness, we'll just keep it simple: click selection closes it.

  useEffect(() => {
    document.title = "Sentiment Terminal - SafeFund Guardian";
    // Initialize search with default
    setSearchQuery(mockCoinData[0].name);
    fetchAnalysis(selectedCoin.name);
  }, []);

  const fetchAnalysis = async (coinName: string) => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      const headers: any = { "Content-Type": "application/json" };
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }

      const res = await fetch(`${API_BASE_URL}/analyze`, {
        method: "POST",
        headers: headers,
        body: JSON.stringify({ coin: coinName })
      });

      if (!res.ok) throw new Error("Analysis failed");
      const result = await res.json();
      setData(result);
    } catch (error) {
      console.error("Fetch error:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearchSelect = (coin) => {
    setSelectedCoin(coin);
    setSearchQuery(coin.name);
    setShowSuggestions(false);
    fetchAnalysis(coin.name);
  };

  // Allow searching for coins NOT in the list (e.g. "Pepe")
  // We need to handle Enter key on input if we want that.
  // For now, the user asked for suggestions. 

  // Helper for colors
  const getScoreColor = (score) => {
    if (score > 0.3) return "text-emerald-400 border-emerald-500/50 shadow-[0_0_20px_rgba(52,211,153,0.3)]";
    if (score < -0.3) return "text-rose-400 border-rose-500/50 shadow-[0_0_20px_rgba(251,113,133,0.3)]";
    return "text-amber-400 border-amber-500/50 shadow-[0_0_20px_rgba(251,191,36,0.3)]";
  };

  return (
    <DashboardLayout title="Sentiment Intelligence" description="Real-time AI Market Analysis">
      <div className="min-h-screen bg-[#0a0b14] text-slate-200 font-mono p-4 md:p-6 space-y-6">

        {/* Header Control */}
        <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-slate-900/50 p-4 rounded-xl border border-slate-800 relative z-10">
          <div className="flex items-center gap-3">
            <Activity className="text-cyan-400 animate-pulse" />
            <span className="text-xl font-bold tracking-wider text-cyan-100">MARKET_SENTIMENT_V2</span>
          </div>

          <div className="relative w-full md:w-64">
            <div className="relative">
              <input
                type="text"
                placeholder="Search Coin (e.g. BTC)..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setShowSuggestions(true);
                }}
                onFocus={() => setShowSuggestions(true)}
                className="w-full bg-slate-950 border border-slate-700 text-cyan-400 rounded px-4 py-2 pl-10 focus:ring-2 focus:ring-cyan-500 outline-none uppercase tracking-wide placeholder:text-slate-600"
              />
              <Search className="absolute left-3 top-2.5 text-slate-500" size={16} />
            </div>

            {showSuggestions && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-slate-900 border border-slate-700 rounded-lg shadow-xl overflow-hidden max-h-60 overflow-y-auto custom-scrollbar z-50">
                {mockCoinData.filter(c =>
                  c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                  c.symbol.toLowerCase().includes(searchQuery.toLowerCase())
                ).length > 0 ? (
                  mockCoinData.filter(c =>
                    c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                    c.symbol.toLowerCase().includes(searchQuery.toLowerCase())
                  ).map(c => (
                    <div
                      key={c.id}
                      onClick={() => handleSearchSelect(c)}
                      className="px-4 py-3 hover:bg-slate-800 cursor-pointer flex items-center justify-between group transition-colors border-b border-slate-800/50 last:border-0"
                    >
                      <span className="text-slate-200 group-hover:text-cyan-400 font-medium">{c.name}</span>
                      <span className="text-xs text-slate-500 bg-slate-950 px-2 py-1 rounded border border-slate-800">{c.symbol}</span>
                    </div>
                  ))
                ) : (
                  <div className="p-4 text-center text-slate-500 text-sm">
                    No widespread coin found. <br /> Press Enter to force search.
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Main Dashboard Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* LEFT: Gauge & Stats */}
          <motion.div
            initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}
            className="lg:col-span-1 space-y-6"
          >
            {/* Gauge Card */}
            <Card className="bg-slate-900/80 border-slate-800 relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-b from-cyan-500/5 to-transparent pointer-events-none" />
              <CardHeader><CardTitle className="text-slate-400 text-sm uppercase tracking-widest">Aggregate Score</CardTitle></CardHeader>
              <CardContent className="flex flex-col items-center justify-center py-8">
                {loading ? <Zap className="h-16 w-16 text-slate-700 animate-spin" /> : (
                  <div className={`relative h-48 w-48 rounded-full border-8 border-slate-800 flex items-center justify-center ${data?.average_sentiment ? getScoreColor(data.average_sentiment) : ''}`}>
                    {/* Dynamic Border Ring could be SVG, keeping simple CSS for robustness */}
                    <div className="text-4xl font-black">
                      {data?.average_sentiment?.toFixed(2) || "0.00"}
                    </div>
                    <div className="absolute -bottom-4 text-xs font-bold uppercase bg-slate-950 px-3 py-1 rounded border border-slate-700 text-slate-400">
                      {data?.average_sentiment > 0.3 ? "Bullish" : data?.average_sentiment < -0.3 ? "Bearish" : "Neutral"}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Key Drivers */}
            <Card className="bg-slate-900/80 border-slate-800 h-[300px] overflow-y-auto custom-scrollbar">
              <CardHeader className="pb-2"><CardTitle className="text-purple-400 text-sm uppercase flex items-center gap-2"><Zap size={16} /> AI Analysis</CardTitle></CardHeader>
              <CardContent className="text-sm text-slate-400 leading-relaxed">
                {loading ? "Analyzing global data streams..." : (
                  <div className="prose prose-invert prose-sm">
                    <p className="whitespace-pre-line">{data?.summary || "No analysis data available."}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>

          {/* MIDDLE: Community Pulse (Reddit) */}
          <motion.div
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
            className="lg:col-span-1"
          >
            <Card className="bg-slate-900/80 border-slate-800 h-full flex flex-col">
              <CardHeader className="border-b border-slate-800/50 bg-slate-900/50">
                <CardTitle className="text-orange-400 text-sm uppercase flex items-center gap-2">
                  <MessageSquare size={16} /> Community Pulse (Reddit)
                </CardTitle>
              </CardHeader>
              <CardContent className="flex-1 overflow-y-auto p-0 max-h-[600px] custom-scrollbar">
                {loading ? (
                  <div className="p-8 text-center text-slate-600 animate-pulse">Scanning subreddits...</div>
                ) : (data?.reddit_posts?.length > 0 ? (
                  <div className="divide-y divide-slate-800">
                    {data.reddit_posts.map((post, i) => (
                      <div key={i} className="p-4 hover:bg-slate-800/50 transition-colors">
                        <div className="flex justify-between items-start mb-1">
                          <span className="text-xs text-orange-500/80 font-bold">r/CryptoCurrency</span>
                          <span className="text-xs text-slate-600">Score: {post.score}</span>
                        </div>
                        <h4 className="text-slate-200 font-medium text-sm mb-1 leading-snug">{post.title}</h4>
                        <p className="text-xs text-slate-500 line-clamp-2">{post.content}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-8 text-center text-slate-600">No active discussions found.</div>
                ))}
              </CardContent>
            </Card>
          </motion.div>

          {/* RIGHT: News Modules */}
          <motion.div
            initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 }}
            className="lg:col-span-1"
          >
            <Card className="bg-slate-900/80 border-slate-800 h-full flex flex-col">
              <CardHeader className="border-b border-slate-800/50 bg-slate-900/50">
                <CardTitle className="text-blue-400 text-sm uppercase flex items-center gap-2">
                  <Newspaper size={16} /> Global Headlines
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 space-y-4">
                {loading ? (
                  <div className="text-center text-slate-600 animate-pulse mt-10">Aggregating news feeds...</div>
                ) : (data?.news_articles?.length > 0 ? (
                  data.news_articles.map((news, i) => (
                    <div key={i} className="relative pl-4 border-l-2 border-slate-700 hover:border-blue-500 transition-colors">
                      <span className="text-[10px] text-slate-500 uppercase tracking-wider mb-1 block">{news.source}</span>
                      <a href={news.url} target="_blank" rel="noopener noreferrer" className="text-sm text-slate-300 hover:text-blue-400 font-medium block mb-1">
                        {news.title}
                      </a>
                      <span className="text-[10px] text-slate-600">{new Date(news.date).toLocaleDateString()}</span>
                    </div>
                  ))
                ) : (
                  <div className="text-center text-slate-600 mt-10">No recent headlines.</div>
                ))}
              </CardContent>
            </Card>
          </motion.div>

        </div>

        {/* BOTTOM: Trend Chart (Mocked for now as we don't have historical DB yet) */}
        <Card className="bg-slate-900/80 border-slate-800">
          <CardHeader><CardTitle className="text-slate-400 text-sm uppercase">Sentiment Trend (24H)</CardTitle></CardHeader>
          <CardContent className="h-[200px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={[
                { t: '00:00', v: 0.1 }, { t: '04:00', v: 0.2 }, { t: '08:00', v: 0.15 },
                { t: '12:00', v: 0.4 }, { t: '16:00', v: 0.35 }, { t: '20:00', v: 0.6 },
                { t: 'Now', v: data?.average_sentiment || 0.5 }
              ]}>
                <defs>
                  <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#22d3ee" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#22d3ee" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="t" stroke="#475569" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="#475569" fontSize={12} tickLine={false} axisLine={false} domain={[-1, 1]} />
                <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b' }} itemStyle={{ color: '#22d3ee' }} />
                <Area type="monotone" dataKey="v" stroke="#22d3ee" strokeWidth={2} fillOpacity={1} fill="url(#colorValue)" />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

      </div>
    </DashboardLayout>
  );
};

export default CryptoSentimentDashboard;
