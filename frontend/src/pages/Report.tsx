
import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import DashboardLayout from "@/components/DashboardLayout";
import { motion } from "framer-motion";
import {
    FileSearch,
    Shield,
    AlertTriangle,
    CheckCircle,
    HelpCircle,
    Clipboard,
    AlertCircle,
    ArrowLeft
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { API_BASE_URL } from "@/config";

const Report = () => {
    const { id } = useParams();
    const [report, setReport] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const { toast } = useToast();

    useEffect(() => {
        const fetchReport = async () => {
            try {
                const response = await fetch(`${API_BASE_URL}/report/${id}`);
                if (!response.ok) {
                    // If request failed, throw error
                    if (response.status === 404) throw new Error("Report not found");
                    throw new Error("Failed to fetch report");
                }
                const data = await response.json();
                setReport(data);
            } catch (error: any) {
                toast({
                    title: "Error",
                    description: error.message,
                    variant: "destructive",
                });
            } finally {
                setLoading(false);
            }
        };

        if (id) {
            fetchReport();
        }
    }, [id, toast]);

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
        toast({
            title: "Copied to clipboard",
            description: "The code has been copied to your clipboard.",
        });
    };

    const getScoreColor = (score: number) => {
        if (score >= 80) return "text-green-500";
        if (score >= 60) return "text-yellow-500";
        return "text-red-500";
    };

    const getScoreLabel = (score: number) => {
        if (score >= 80) return "Low Risk";
        if (score >= 60) return "Medium Risk";
        return "High Risk";
    };

    if (loading) {
        return (
            <DashboardLayout title="Analysis Report" description="Loading report details...">
                <div className="flex justify-center items-center h-64">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
                </div>
            </DashboardLayout>
        );
    }

    if (!report) {
        return (
            <DashboardLayout title="Report Not Found" description="The requested analysis report could not be found.">
                <div className="text-center py-12">
                    <Button variant="outline" asChild>
                        <Link to="/history">
                            <ArrowLeft className="mr-2 h-4 w-4" /> Back to History
                        </Link>
                    </Button>
                </div>
            </DashboardLayout>
        );
    }

    // Extract data from the report structure
    // The structure matches what is saved in RiskService.analyzeRisk
    // report object has: tokenName, tokenAddress, contractAddress, chainId, overallRiskScore, geminiAnalysis

    const { geminiAnalysis, tokenName, contractAddress, overallRiskScore, createdAt, type } = report;
    const { contractAnalysis, riskData } = geminiAnalysis || {};
    // Audit fields
    const vulnerabilities = contractAnalysis?.vulnerabilities || [];
    const summary = contractAnalysis?.summary || geminiAnalysis?.summary;
    const score = overallRiskScore || contractAnalysis?.overallScore || 0;

    // Sentiment fields
    const sentimentDistribution = geminiAnalysis?.sentiment_distribution;
    const latestNews = geminiAnalysis?.latest_news || geminiAnalysis?.news_articles || [];
    const redditPosts = geminiAnalysis?.reddit_posts || [];

    // Liquidity fields
    const liquidityHealth = geminiAnalysis?.ai_insights_panel?.liquidityHealth;
    const liquidityTrend = geminiAnalysis?.ai_insights_panel?.liquidityTrend;
    const exitRisk = geminiAnalysis?.ai_insights_panel?.exitRiskSignal;

    return (
        <DashboardLayout title={`${tokenName} Analysis Report`} description={`${type || 'Analysis'} Report for ${contractAddress || tokenName}`}>
            <div className="mb-6">
                <Button variant="ghost" className="pl-0 gap-2 text-muted-foreground hover:text-foreground" asChild>
                    <Link to="/history">
                        <ArrowLeft className="h-4 w-4" /> Back to History
                    </Link>
                </Button>
            </div>

            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
            >
                <div className="glass-card mb-8">
                    <div className="border-b border-white/10 px-6 pt-6 pb-4">
                        <div className="flex justify-between items-center">
                            <h2 className="text-2xl text-white font-semibold">{type === 'SENTIMENT' ? 'Sentiment Analysis' : type === 'LIQUIDITY' ? 'Liquidity Monitor' : 'Security Audit'}</h2>
                            <div className="flex items-center gap-2">
                                {type === 'SENTIMENT' ? (
                                    <div className="flex items-center gap-2">
                                        <span className={`text-xl font-bold ${score >= 60 ? "text-green-500" : score <= 40 ? "text-red-500" : "text-yellow-500"}`}>
                                            {score >= 60 ? "Positive" : score <= 40 ? "Negative" : "Neutral"}
                                        </span>
                                    </div>
                                ) : (
                                    <>
                                        <span className={`text-2xl font-bold ${getScoreColor(score)}`}>{score}</span>
                                        <span className="text-sm text-gray-400">/100</span>
                                    </>
                                )}
                            </div>
                        </div>
                        <p className="text-gray-300 mt-1 text-xs">Analysis Date: {new Date(createdAt).toLocaleString()}</p>
                    </div>

                    <div className="px-6 pb-8 pt-4 space-y-6">

                        {/* SENTIMENT SPECIFIC CONTENT */}
                        {type === 'SENTIMENT' && (
                            <div className="space-y-6">
                                <div className="bg-slate-900/50 p-4 rounded-lg border border-white/10">
                                    <h3 className="text-lg font-medium text-white mb-2">Executive Summary</h3>
                                    <p className="text-gray-300 leading-relaxed">{summary}</p>
                                </div>

                                {sentimentDistribution && (
                                    <div className="grid grid-cols-3 gap-4 text-center">
                                        <div className="p-4 bg-green-500/10 rounded-lg border border-green-500/20">
                                            <div className="text-2xl font-bold text-green-400">{sentimentDistribution.Positive || 0}%</div>
                                            <div className="text-xs text-green-200 uppercase">Positive</div>
                                        </div>
                                        <div className="p-4 bg-yellow-500/10 rounded-lg border border-yellow-500/20">
                                            <div className="text-2xl font-bold text-yellow-400">{sentimentDistribution.Neutral || 0}%</div>
                                            <div className="text-xs text-yellow-200 uppercase">Neutral</div>
                                        </div>
                                        <div className="p-4 bg-red-500/10 rounded-lg border border-red-500/20">
                                            <div className="text-2xl font-bold text-red-400">{sentimentDistribution.Negative || 0}%</div>
                                            <div className="text-xs text-red-200 uppercase">Negative</div>
                                        </div>
                                    </div>
                                )}

                                <div>
                                    <h3 className="text-lg font-medium text-white mb-4">Latest News & Context</h3>
                                    <div className="space-y-3">
                                        {latestNews.slice(0, 5).map((news: any, i: number) => (
                                            <div key={i} className="p-3 bg-white/5 rounded-lg border border-white/10 flex justify-between items-start gap-4">
                                                <div>
                                                    <p className="text-sm text-gray-200">{news.content || news.title}</p>
                                                    <p className="text-xs text-gray-500 mt-1">{news.source || "News Source"} • {new Date(news.date || news.publishedAt).toLocaleDateString()}</p>
                                                </div>
                                                <Badge variant="outline" className="text-xs">{news.sentiment || 'neutral'}</Badge>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}


                        {/* LIQUIDITY SPECIFIC CONTENT */}
                        {type === 'LIQUIDITY' && (
                            <div className="space-y-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="p-4 bg-blue-500/10 rounded-lg border border-blue-500/20">
                                        <h4 className="text-sm font-bold text-blue-200 uppercase mb-2">Liquidity Health</h4>
                                        <p className="text-white">{liquidityHealth || "N/A"}</p>
                                    </div>
                                    <div className="p-4 bg-purple-500/10 rounded-lg border border-purple-500/20">
                                        <h4 className="text-sm font-bold text-purple-200 uppercase mb-2">Trend</h4>
                                        <p className="text-white">{liquidityTrend || "N/A"}</p>
                                    </div>
                                </div>

                                {exitRisk && (
                                    <div className={`p-4 rounded-lg border flex items-center gap-4 ${exitRisk === 'HIGH' ? 'bg-red-500/20 border-red-500/50' : 'bg-green-500/20 border-green-500/50'}`}>
                                        <AlertTriangle className={`h-6 w-6 ${exitRisk === 'HIGH' ? 'text-red-400' : 'text-green-400'}`} />
                                        <div>
                                            <h4 className="font-bold text-white uppercase">Exit Risk: {exitRisk}</h4>
                                            <p className="text-sm text-gray-300">
                                                {geminiAnalysis?.ai_insights_panel?.investorInterpretation}
                                            </p>
                                        </div>
                                    </div>
                                )}

                                <div>
                                    <h3 className="text-lg font-medium text-white mb-4">Risk Breakdown</h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {riskData && riskData.map((item: any) => (
                                            <div key={item.category} className="border border-white/10 rounded-lg p-3 bg-white/5">
                                                <div className="flex justify-between mb-2">
                                                    <span className="text-sm font-medium text-gray-200">{item.category}</span>
                                                    <span className="text-sm font-bold text-white">{item.risk}/100</span>
                                                </div>
                                                <Progress value={item.risk} className="h-1.5" />
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}


                        {/* AUDIT / DEFAULT SPECIFIC CONTENT */}
                        {(type === 'AUDIT' || !type) && (
                            <>
                                {/* Overall Score Section */}
                                <div className="border border-white/15 rounded-lg p-4">
                                    <div className="flex justify-between items-center mb-2">
                                        <h3 className="font-medium text-white">Security Score</h3>
                                        <div className={`px-2 py-1 text-sm font-medium rounded-full ${score >= 80 ? "bg-green-400/10 text-green-200" :
                                            score >= 60 ? "bg-yellow-400/10 text-yellow-200" :
                                                "bg-red-400/10 text-red-200"
                                            }`}>
                                            {getScoreLabel(score)}
                                        </div>
                                    </div>
                                    <Progress
                                        value={score}
                                        className={`h-2 mb-2 bg-white/5 [&>div]:${score >= 80 ? "bg-green-400/80" :
                                            score >= 60 ? "bg-yellow-300/70" :
                                                "bg-red-700/80"
                                            }`}
                                    />
                                    <p className="text-sm text-gray-300">
                                        {score >= 80
                                            ? "This contract appears to be relatively secure with minor issues."
                                            : score >= 60
                                                ? "This contract has security concerns that should be addressed."
                                                : "This contract has critical vulnerabilities that must be fixed."}
                                    </p>
                                </div>

                                {/* Risk Data Categories (If available) */}
                                {riskData && riskData.length > 0 && (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {riskData.map((item: any) => (
                                            <div key={item.category} className="border border-white/10 rounded-lg p-3 bg-white/5">
                                                <div className="flex justify-between mb-2">
                                                    <span className="text-sm font-medium text-gray-200">{item.category}</span>
                                                    <span className="text-sm font-bold text-white">{item.risk}/100</span>
                                                </div>
                                                <Progress value={item.risk} className="h-1.5" />
                                            </div>
                                        ))}
                                    </div>
                                )}


                                {/* Vulnerabilities Section */}
                                <div>
                                    <h3 className="font-medium mb-4 text-white">Vulnerabilities Found ({vulnerabilities.length})</h3>
                                    {vulnerabilities.length > 0 ? (
                                        <div className="space-y-4">
                                            {vulnerabilities.map((item: any, index: number) => (
                                                <div
                                                    key={index}
                                                    className="border border-white/10 rounded-lg overflow-hidden bg-white/5 backdrop-blur-md"
                                                >
                                                    <div className="p-4">
                                                        <div className="flex justify-between items-start mb-2">
                                                            <div className="flex items-center gap-2">
                                                                {item.severity === "critical" && <AlertTriangle className="h-5 w-5 text-red-400" />}
                                                                {item.severity === "high" && <AlertCircle className="h-5 w-5 text-orange-400" />}
                                                                {item.severity === "medium" && <AlertCircle className="h-5 w-5 text-yellow-400" />}
                                                                {item.severity === "low" && <HelpCircle className="h-5 w-5 text-blue-400" />}
                                                                <h4 className="font-medium text-white">{item.name || "Issue Detected"}</h4>
                                                            </div>
                                                            <div className={`text-xs font-medium px-2 py-1 rounded-full uppercase ${item.severity === "critical" ? "bg-red-400/10 text-red-200" :
                                                                item.severity === "high" ? "bg-orange-400/10 text-orange-200" :
                                                                    item.severity === "medium" ? "bg-yellow-400/10 text-yellow-200" :
                                                                        "bg-blue-400/10 text-blue-200"
                                                                }`}>
                                                                {item.severity || "Unknown"}
                                                            </div>
                                                        </div>
                                                        <p className="text-sm text-gray-200 mb-3">
                                                            {item.description}
                                                        </p>
                                                        {item.code && (
                                                            <div className="relative mb-3">
                                                                <div className="flex items-center justify-between mb-1">
                                                                    <div className="text-xs text-gray-400">
                                                                        {item.lineNumber && `Line ${item.lineNumber}`}
                                                                    </div>
                                                                    <button
                                                                        onClick={() => copyToClipboard(item.code)}
                                                                        className="text-xs text-blue-400 hover:underline flex items-center gap-1"
                                                                    >
                                                                        <Clipboard className="h-3 w-3" /> Copy
                                                                    </button>
                                                                </div>
                                                                <pre className="bg-slate-900/80 text-white p-3 rounded-md text-xs overflow-x-auto">
                                                                    <code>{item.code}</code>
                                                                </pre>
                                                            </div>
                                                        )}
                                                        {item.recommendation && (
                                                            <div className="mt-2">
                                                                <h5 className="text-sm font-medium mb-1 flex items-center gap-1 text-white">
                                                                    <CheckCircle className="h-4 w-4 text-green-400" /> Recommendation
                                                                </h5>
                                                                <p className="text-sm text-gray-200">
                                                                    {item.recommendation}
                                                                </p>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="text-center p-6 border border-white/10 rounded-lg bg-white/5 backdrop-blur-md">
                                            <CheckCircle className="h-12 w-12 text-green-400 mx-auto mb-3" />
                                            <h3 className="font-medium mb-1 text-white">No Vulnerabilities Found</h3>
                                            <p className="text-sm text-gray-300">
                                                The detailed audit did not detect specific code vulnerabilities.
                                            </p>
                                        </div>
                                    )}
                                </div>

                                {/* Summary Section */}
                                {summary && (
                                    <div className="border border-white/10 rounded-lg p-4 bg-white/5 backdrop-blur-md mb-4">
                                        <h3 className="font-medium mb-2 text-white">Audit Summary</h3>
                                        <p className="text-sm text-gray-200">{summary}</p>
                                    </div>
                                )}
                            </>
                        )}

                    </div>
                </div>
            </motion.div>
        </DashboardLayout>
    );
};

export default Report;
