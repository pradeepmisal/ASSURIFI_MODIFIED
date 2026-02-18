import React, { useEffect, useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { format, formatDistanceToNow } from "date-fns";
import { API_BASE_URL } from "@/config";
import { useAuth } from "@/context/AuthContext";
import {
    Shield, Activity, Smile, Star, StarOff, Trash2, RefreshCw,
    ArrowRight, BarChart3, Clock, Target, TrendingUp, FileSearch,
    MessageSquare, Search, StickyNote, X, Check, ChevronDown
} from "lucide-react";
import { Link } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { motion, AnimatePresence } from "framer-motion";

// ─── Types ──────────────────────────────────────────────
interface PinnedContract {
    _id: string;
    contractAddress: string;
    tokenName: string;
    chainId: string;
    lastRiskScore: number | null;
    analysisType: string;
    notes: string;
    pinnedAt: string;
}

interface AnalysisHistory {
    _id: string;
    type: 'AUDIT' | 'SENTIMENT' | 'LIQUIDITY';
    tokenName: string;
    tokenAddress?: string;
    contractAddress?: string;
    chainId?: string;
    overallRiskScore: number;
    createdAt: string;
    geminiAnalysis: {
        oneLineSummary?: string;
        summary?: string;
        riskData?: Array<{ category: string; risk: number }>;
        average_sentiment?: number;
        sentiment_distribution?: any;
    };
}

interface PortfolioStats {
    totalScans: number;
    averageRiskScore: number;
    pinnedCount: number;
    scanBreakdown: { AUDIT: number; SENTIMENT: number; LIQUIDITY: number };
    mostScanned: { name: string; count: number } | null;
    lastScan: string | null;
}

interface PortfolioData {
    stats: PortfolioStats;
    pinnedContracts: PinnedContract[];
    history: AnalysisHistory[];
}

// ─── Component ──────────────────────────────────────────
const Portfolio = () => {
    const [data, setData] = useState<PortfolioData | null>(null);
    const [loading, setLoading] = useState(true);
    const [historyFilter, setHistoryFilter] = useState<string>("ALL");
    const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
    const [noteText, setNoteText] = useState("");
    const [unpinningId, setUnpinningId] = useState<string | null>(null);
    const { token } = useAuth();
    const { toast } = useToast();

    // ─── Fetch Portfolio Data ───────────────────────────────
    const fetchPortfolio = async () => {
        if (!token) { setLoading(false); return; }
        try {
            const response = await fetch(`${API_BASE_URL}/portfolio`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (response.ok) {
                const result = await response.json();
                setData(result);
            } else {
                console.error("Failed to fetch portfolio");
            }
        } catch (error) {
            console.error("Error fetching portfolio:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchPortfolio();
    }, [token]);

    // ─── Unpin Contract ─────────────────────────────────────
    const handleUnpin = async (id: string) => {
        setUnpinningId(id);
        try {
            const response = await fetch(`${API_BASE_URL}/portfolio/pin/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (response.ok) {
                toast({ title: "Unpinned", description: "Contract removed from portfolio." });
                fetchPortfolio();
            }
        } catch (error) {
            toast({ title: "Error", description: "Failed to unpin contract.", variant: "destructive" });
        } finally {
            setUnpinningId(null);
        }
    };

    // ─── Update Note ────────────────────────────────────────
    const handleSaveNote = async (id: string) => {
        try {
            const response = await fetch(`${API_BASE_URL}/portfolio/pin/${id}/note`, {
                method: 'PATCH',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ notes: noteText })
            });
            if (response.ok) {
                toast({ title: "Note Saved", description: "Your note has been updated." });
                setEditingNoteId(null);
                fetchPortfolio();
            }
        } catch (error) {
            toast({ title: "Error", description: "Failed to save note.", variant: "destructive" });
        }
    };

    // ─── Helpers ────────────────────────────────────────────
    const getRiskColor = (score: number | null) => {
        if (score === null) return "text-slate-400";
        if (score >= 80) return "text-green-400";
        if (score >= 60) return "text-yellow-400";
        return "text-red-400";
    };

    const getRiskBadge = (score: number, type: string) => {
        if (type === 'SENTIMENT') {
            if (score >= 60) return <Badge className="bg-green-500/20 text-green-300 border-green-500/30 hover:bg-green-500/30">Positive</Badge>;
            if (score <= 40) return <Badge className="bg-red-500/20 text-red-300 border-red-500/30 hover:bg-red-500/30">Negative</Badge>;
            return <Badge className="bg-yellow-500/20 text-yellow-300 border-yellow-500/30 hover:bg-yellow-500/30">Neutral</Badge>;
        }
        if (score > 75) return <Badge className="bg-red-500/20 text-red-300 border-red-500/30 hover:bg-red-500/30">High Risk</Badge>;
        if (score > 40) return <Badge className="bg-yellow-500/20 text-yellow-300 border-yellow-500/30 hover:bg-yellow-500/30">Medium Risk</Badge>;
        return <Badge className="bg-green-500/20 text-green-300 border-green-500/30 hover:bg-green-500/30">Low Risk</Badge>;
    };

    const getTypeIcon = (type: string) => {
        switch (type) {
            case 'SENTIMENT': return <Smile className="h-4 w-4 text-purple-400" />;
            case 'LIQUIDITY': return <Activity className="h-4 w-4 text-cyan-400" />;
            default: return <Shield className="h-4 w-4 text-blue-400" />;
        }
    };

    const getTypeColor = (type: string) => {
        switch (type) {
            case 'SENTIMENT': return 'border-purple-500/30 bg-purple-500/5';
            case 'LIQUIDITY': return 'border-cyan-500/30 bg-cyan-500/5';
            default: return 'border-blue-500/30 bg-blue-500/5';
        }
    };

    // Filtered history
    const filteredHistory = data?.history.filter(item =>
        historyFilter === "ALL" ? true : item.type === historyFilter
    ) || [];

    // ─── Loading State ──────────────────────────────────────
    if (loading) {
        return (
            <DashboardLayout title="Portfolio Shield" description="Your security command center">
                <div className="flex justify-center items-center h-64">
                    <div className="relative">
                        <div className="absolute inset-0 rounded-full border-4 border-blue-400/20 border-t-blue-400 animate-spin h-12 w-12" />
                        <Shield className="h-6 w-6 text-blue-400 absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2" />
                    </div>
                </div>
            </DashboardLayout>
        );
    }

    // ─── Empty State (No Token) ─────────────────────────────
    if (!token || !data) {
        return (
            <DashboardLayout title="Portfolio Shield" description="Your security command center">
                <div className="flex flex-col items-center justify-center h-64 text-center">
                    <Shield className="h-16 w-16 text-blue-400/40 mb-4" />
                    <h3 className="text-xl font-medium text-white mb-2">Login Required</h3>
                    <p className="text-slate-400 max-w-md">Please log in to access your Portfolio Shield and track your security analyses.</p>
                    <Link to="/login">
                        <Button className="mt-4 bg-blue-500 hover:bg-blue-600">Login</Button>
                    </Link>
                </div>
            </DashboardLayout>
        );
    }

    const { stats, pinnedContracts, history } = data;

    // ─── Main Render ────────────────────────────────────────
    return (
        <DashboardLayout title="Portfolio Shield" description="Your security command center">
            <div className="space-y-8 max-w-7xl mx-auto">

                {/* ═══════════════════════════════════════════════════
            SECTION 1: Security Overview Stats
        ═══════════════════════════════════════════════════ */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4 }}
                >
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {/* Total Scans */}
                        <div className="glass-card group hover:border-blue-500/30 transition-all duration-300">
                            <div className="p-5">
                                <div className="flex items-center justify-between mb-3">
                                    <div className="h-10 w-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center group-hover:bg-blue-500/20 transition-colors">
                                        <BarChart3 className="h-5 w-5 text-blue-400" />
                                    </div>
                                    <span className="text-xs text-slate-500 uppercase tracking-wider">Total</span>
                                </div>
                                <p className="text-3xl font-bold text-white">{stats.totalScans}</p>
                                <p className="text-sm text-slate-400 mt-1">Scans Performed</p>
                            </div>
                        </div>

                        {/* Average Risk Score */}
                        <div className="glass-card group hover:border-emerald-500/30 transition-all duration-300">
                            <div className="p-5">
                                <div className="flex items-center justify-between mb-3">
                                    <div className="h-10 w-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center group-hover:bg-emerald-500/20 transition-colors">
                                        <Target className="h-5 w-5 text-emerald-400" />
                                    </div>
                                    <span className="text-xs text-slate-500 uppercase tracking-wider">Avg</span>
                                </div>
                                <p className={`text-3xl font-bold ${getRiskColor(stats.averageRiskScore)}`}>
                                    {stats.averageRiskScore}<span className="text-lg text-slate-500">/100</span>
                                </p>
                                <p className="text-sm text-slate-400 mt-1">Risk Score</p>
                            </div>
                        </div>

                        {/* Pinned Contracts */}
                        <div className="glass-card group hover:border-amber-500/30 transition-all duration-300">
                            <div className="p-5">
                                <div className="flex items-center justify-between mb-3">
                                    <div className="h-10 w-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center group-hover:bg-amber-500/20 transition-colors">
                                        <Star className="h-5 w-5 text-amber-400" />
                                    </div>
                                    <span className="text-xs text-slate-500 uppercase tracking-wider">Pinned</span>
                                </div>
                                <p className="text-3xl font-bold text-white">{stats.pinnedCount}</p>
                                <p className="text-sm text-slate-400 mt-1">Contracts Tracked</p>
                            </div>
                        </div>

                        {/* Last Scan */}
                        <div className="glass-card group hover:border-purple-500/30 transition-all duration-300">
                            <div className="p-5">
                                <div className="flex items-center justify-between mb-3">
                                    <div className="h-10 w-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center group-hover:bg-purple-500/20 transition-colors">
                                        <Clock className="h-5 w-5 text-purple-400" />
                                    </div>
                                    <span className="text-xs text-slate-500 uppercase tracking-wider">Latest</span>
                                </div>
                                <p className="text-xl font-bold text-white truncate">
                                    {stats.lastScan
                                        ? formatDistanceToNow(new Date(stats.lastScan), { addSuffix: true })
                                        : "No scans yet"}
                                </p>
                                <p className="text-sm text-slate-400 mt-1">Last Activity</p>
                            </div>
                        </div>
                    </div>

                    {/* Scan Breakdown Bar */}
                    {stats.totalScans > 0 && (
                        <div className="glass-card mt-4">
                            <div className="p-5">
                                <div className="flex items-center justify-between mb-3">
                                    <h3 className="text-sm font-medium text-slate-300">Scan Breakdown</h3>
                                    {stats.mostScanned && (
                                        <span className="text-xs text-slate-500">
                                            Most scanned: <span className="text-blue-400 font-medium">{stats.mostScanned.name}</span> ({stats.mostScanned.count}x)
                                        </span>
                                    )}
                                </div>
                                <div className="flex gap-1 h-3 rounded-full overflow-hidden bg-slate-800">
                                    {stats.scanBreakdown.AUDIT > 0 && (
                                        <div
                                            className="bg-blue-500 rounded-full transition-all duration-500"
                                            style={{ width: `${(stats.scanBreakdown.AUDIT / stats.totalScans) * 100}%` }}
                                            title={`Audits: ${stats.scanBreakdown.AUDIT}`}
                                        />
                                    )}
                                    {stats.scanBreakdown.SENTIMENT > 0 && (
                                        <div
                                            className="bg-purple-500 rounded-full transition-all duration-500"
                                            style={{ width: `${(stats.scanBreakdown.SENTIMENT / stats.totalScans) * 100}%` }}
                                            title={`Sentiment: ${stats.scanBreakdown.SENTIMENT}`}
                                        />
                                    )}
                                    {stats.scanBreakdown.LIQUIDITY > 0 && (
                                        <div
                                            className="bg-cyan-500 rounded-full transition-all duration-500"
                                            style={{ width: `${(stats.scanBreakdown.LIQUIDITY / stats.totalScans) * 100}%` }}
                                            title={`Liquidity: ${stats.scanBreakdown.LIQUIDITY}`}
                                        />
                                    )}
                                </div>
                                <div className="flex gap-4 mt-2 text-xs text-slate-400">
                                    <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-blue-500" /> Audit ({stats.scanBreakdown.AUDIT})</span>
                                    <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-purple-500" /> Sentiment ({stats.scanBreakdown.SENTIMENT})</span>
                                    <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-cyan-500" /> Liquidity ({stats.scanBreakdown.LIQUIDITY})</span>
                                </div>
                            </div>
                        </div>
                    )}
                </motion.div>

                {/* ═══════════════════════════════════════════════════
            SECTION 2: Pinned Contracts (Watchlist)
        ═══════════════════════════════════════════════════ */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4, delay: 0.1 }}
                >
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                            <div className="h-8 w-8 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
                                <Star className="h-4 w-4 text-amber-400" />
                            </div>
                            <div>
                                <h2 className="text-lg font-semibold text-white">Pinned Contracts</h2>
                                <p className="text-xs text-slate-500">Your tracked and bookmarked tokens</p>
                            </div>
                        </div>
                        {pinnedContracts.length > 0 && (
                            <Badge variant="outline" className="text-xs border-slate-700 text-slate-400">
                                {pinnedContracts.length} pinned
                            </Badge>
                        )}
                    </div>

                    {pinnedContracts.length === 0 ? (
                        <div className="glass-card">
                            <div className="p-8 text-center">
                                <StarOff className="h-12 w-12 text-slate-600 mx-auto mb-3" />
                                <h3 className="text-base font-medium text-white mb-1">No Pinned Contracts</h3>
                                <p className="text-sm text-slate-400 max-w-sm mx-auto">
                                    Run an audit or liquidity scan, then click the ⭐ "Pin to Portfolio" button to track contracts here.
                                </p>
                                <Link to="/audit">
                                    <Button variant="outline" size="sm" className="mt-4 border-slate-700 text-slate-300 hover:bg-slate-800">
                                        <FileSearch className="h-4 w-4 mr-2" /> Run an Audit
                                    </Button>
                                </Link>
                            </div>
                        </div>
                    ) : (
                        <div className="grid gap-3">
                            <AnimatePresence>
                                {pinnedContracts.map((pin, index) => (
                                    <motion.div
                                        key={pin._id}
                                        initial={{ opacity: 0, x: -20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        exit={{ opacity: 0, x: 20, height: 0 }}
                                        transition={{ duration: 0.3, delay: index * 0.05 }}
                                    >
                                        <div className={`glass-card border ${getTypeColor(pin.analysisType)} hover:border-opacity-60 transition-all duration-300`}>
                                            <div className="p-4">
                                                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                                                    {/* Left: Info */}
                                                    <div className="flex items-start gap-3 flex-1 min-w-0">
                                                        <div className="h-10 w-10 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center shrink-0 mt-0.5">
                                                            {getTypeIcon(pin.analysisType)}
                                                        </div>
                                                        <div className="min-w-0 flex-1">
                                                            <div className="flex items-center gap-2 flex-wrap">
                                                                <h3 className="font-semibold text-white text-base">{pin.tokenName}</h3>
                                                                <Badge variant="outline" className="text-[10px] border-slate-700 text-slate-500">
                                                                    {pin.chainId}
                                                                </Badge>
                                                                <Badge variant="secondary" className="text-[10px]">
                                                                    {pin.analysisType}
                                                                </Badge>
                                                            </div>
                                                            <p className="text-xs text-slate-500 font-mono truncate mt-0.5">
                                                                {pin.contractAddress}
                                                            </p>
                                                            {/* Notes */}
                                                            {editingNoteId === pin._id ? (
                                                                <div className="flex items-center gap-2 mt-2">
                                                                    <Input
                                                                        value={noteText}
                                                                        onChange={(e) => setNoteText(e.target.value)}
                                                                        placeholder="Add a note..."
                                                                        className="h-7 text-xs bg-slate-800 border-slate-700 text-white"
                                                                        maxLength={500}
                                                                        autoFocus
                                                                    />
                                                                    <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-green-400 hover:bg-green-500/10" onClick={() => handleSaveNote(pin._id)}>
                                                                        <Check className="h-3.5 w-3.5" />
                                                                    </Button>
                                                                    <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-slate-400 hover:bg-slate-800" onClick={() => setEditingNoteId(null)}>
                                                                        <X className="h-3.5 w-3.5" />
                                                                    </Button>
                                                                </div>
                                                            ) : (
                                                                <div className="flex items-center gap-1 mt-1">
                                                                    {pin.notes ? (
                                                                        <button
                                                                            onClick={() => { setEditingNoteId(pin._id); setNoteText(pin.notes); }}
                                                                            className="text-xs text-slate-400 hover:text-slate-300 flex items-center gap-1 transition-colors"
                                                                        >
                                                                            <StickyNote className="h-3 w-3" /> {pin.notes}
                                                                        </button>
                                                                    ) : (
                                                                        <button
                                                                            onClick={() => { setEditingNoteId(pin._id); setNoteText(""); }}
                                                                            className="text-xs text-slate-600 hover:text-slate-400 flex items-center gap-1 transition-colors"
                                                                        >
                                                                            <StickyNote className="h-3 w-3" /> Add note
                                                                        </button>
                                                                    )}
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>

                                                    {/* Right: Score + Actions */}
                                                    <div className="flex items-center gap-3 md:flex-col md:items-end">
                                                        <div className="flex items-center gap-2">
                                                            {pin.lastRiskScore !== null && (
                                                                <span className={`text-lg font-bold ${getRiskColor(pin.lastRiskScore)}`}>
                                                                    {pin.lastRiskScore}<span className="text-xs text-slate-500">/100</span>
                                                                </span>
                                                            )}
                                                        </div>
                                                        <div className="flex items-center gap-1.5">
                                                            <Link to={pin.analysisType === 'AUDIT' ? '/audit' : '/monitor'}>
                                                                <Button size="sm" variant="outline" className="h-8 text-xs border-slate-700 text-blue-400 hover:bg-blue-500/10 hover:border-blue-500/30 gap-1">
                                                                    <RefreshCw className="h-3 w-3" /> Re-Scan
                                                                </Button>
                                                            </Link>
                                                            <Button
                                                                size="sm"
                                                                variant="outline"
                                                                className="h-8 text-xs border-slate-700 text-red-400 hover:bg-red-500/10 hover:border-red-500/30"
                                                                onClick={() => handleUnpin(pin._id)}
                                                                disabled={unpinningId === pin._id}
                                                            >
                                                                <Trash2 className="h-3 w-3" />
                                                            </Button>
                                                        </div>
                                                        <span className="text-[10px] text-slate-600 hidden md:block">
                                                            Pinned {formatDistanceToNow(new Date(pin.pinnedAt), { addSuffix: true })}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </motion.div>
                                ))}
                            </AnimatePresence>
                        </div>
                    )}
                </motion.div>

                {/* ═══════════════════════════════════════════════════
            SECTION 3: Scan History (Filterable)
        ═══════════════════════════════════════════════════ */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4, delay: 0.2 }}
                >
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                            <div className="h-8 w-8 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
                                <Clock className="h-4 w-4 text-blue-400" />
                            </div>
                            <div>
                                <h2 className="text-lg font-semibold text-white">Scan History</h2>
                                <p className="text-xs text-slate-500">All your past security analyses</p>
                            </div>
                        </div>
                    </div>

                    {/* Filter Tabs */}
                    <div className="flex gap-2 mb-4 flex-wrap">
                        {["ALL", "AUDIT", "SENTIMENT", "LIQUIDITY"].map(filter => (
                            <Button
                                key={filter}
                                size="sm"
                                variant={historyFilter === filter ? "default" : "outline"}
                                className={`text-xs h-8 ${historyFilter === filter
                                        ? "bg-blue-500/20 text-blue-300 border-blue-500/30 hover:bg-blue-500/30"
                                        : "border-slate-700 text-slate-400 hover:bg-slate-800 hover:text-white"
                                    }`}
                                onClick={() => setHistoryFilter(filter)}
                            >
                                {filter === "ALL" && <BarChart3 className="h-3 w-3 mr-1" />}
                                {filter === "AUDIT" && <Shield className="h-3 w-3 mr-1" />}
                                {filter === "SENTIMENT" && <MessageSquare className="h-3 w-3 mr-1" />}
                                {filter === "LIQUIDITY" && <Activity className="h-3 w-3 mr-1" />}
                                {filter === "ALL" ? "All" : filter.charAt(0) + filter.slice(1).toLowerCase()}
                                {filter !== "ALL" && (
                                    <span className="ml-1 text-[10px] opacity-60">
                                        ({stats.scanBreakdown[filter as keyof typeof stats.scanBreakdown] || 0})
                                    </span>
                                )}
                            </Button>
                        ))}
                    </div>

                    {filteredHistory.length === 0 ? (
                        <div className="glass-card">
                            <div className="p-8 text-center">
                                <Clock className="h-12 w-12 text-slate-600 mx-auto mb-3" />
                                <h3 className="text-base font-medium text-white mb-1">No Scan History</h3>
                                <p className="text-sm text-slate-400">
                                    {historyFilter === "ALL"
                                        ? "You haven't performed any security analyses yet."
                                        : `No ${historyFilter.toLowerCase()} scans found.`}
                                </p>
                                <Link to="/audit">
                                    <Button variant="outline" size="sm" className="mt-4 border-slate-700 text-slate-300 hover:bg-slate-800">
                                        Run Your First Scan
                                    </Button>
                                </Link>
                            </div>
                        </div>
                    ) : (
                        <div className="grid gap-3">
                            {filteredHistory.map((item, index) => (
                                <motion.div
                                    key={item._id}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ duration: 0.2, delay: index * 0.03 }}
                                >
                                    <div className="glass-card hover:border-slate-700 transition-all duration-200">
                                        <div className="p-4">
                                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                                                <div className="flex items-start gap-3 flex-1 min-w-0">
                                                    <div className="h-9 w-9 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center shrink-0">
                                                        {getTypeIcon(item.type || 'AUDIT')}
                                                    </div>
                                                    <div className="min-w-0 flex-1">
                                                        <div className="flex items-center gap-2 flex-wrap">
                                                            <h3 className="font-medium text-white text-sm">{item.tokenName}</h3>
                                                            {item.type !== 'SENTIMENT' && item.chainId && (
                                                                <Badge variant="outline" className="text-[10px] border-slate-700 text-slate-500">
                                                                    {item.chainId}
                                                                </Badge>
                                                            )}
                                                            <Badge variant="secondary" className="text-[10px]">{item.type || 'AUDIT'}</Badge>
                                                        </div>
                                                        <p className="text-xs text-slate-500 font-mono truncate mt-0.5">
                                                            {item.type === 'SENTIMENT'
                                                                ? 'Market Sentiment Analysis'
                                                                : item.contractAddress || item.tokenAddress || 'No Address'}
                                                        </p>
                                                        <p className="text-xs text-slate-500 mt-1 line-clamp-1">
                                                            {item.geminiAnalysis?.oneLineSummary || item.geminiAnalysis?.summary || ""}
                                                        </p>
                                                    </div>
                                                </div>

                                                <div className="flex items-center gap-3 md:flex-col md:items-end shrink-0">
                                                    <div className="flex items-center gap-2">
                                                        {getRiskBadge(item.overallRiskScore, item.type || 'AUDIT')}
                                                    </div>
                                                    <span className="text-[10px] text-slate-600">
                                                        {format(new Date(item.createdAt), 'MMM d, yyyy · h:mm a')}
                                                    </span>
                                                    <Link to={`/report/${item._id}`}>
                                                        <Button variant="ghost" size="sm" className="h-7 text-xs text-blue-400 hover:bg-blue-500/10 gap-1">
                                                            View <ArrowRight className="h-3 w-3" />
                                                        </Button>
                                                    </Link>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </motion.div>
                            ))}
                        </div>
                    )}
                </motion.div>
            </div>
        </DashboardLayout>
    );
};

export default Portfolio;
