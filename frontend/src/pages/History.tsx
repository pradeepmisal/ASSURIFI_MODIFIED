
import React, { useEffect, useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { API_BASE_URL } from "@/config";
import { useAuth } from "@/context/AuthContext";
import { History as HistoryIcon, ArrowRight, Shield, Activity, Smile, TrendingUp, FileText } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

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
        // Sentiment fields
        average_sentiment?: number;
        sentiment_distribution?: any;
    };
}

const History = () => {
    const [history, setHistory] = useState<AnalysisHistory[]>([]);
    const [loading, setLoading] = useState(true);
    const { token } = useAuth(); // Assuming AuthContext provides the JWT token

    const fetchHistory = async () => {
        try {
            // Don't show loading spinner on background refreshes
            if (history.length === 0) setLoading(true);

            const response = await fetch(`${API_BASE_URL}/history`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (response.ok) {
                const data = await response.json();
                // Only update if data changed (simple length check or deep compare could be better, but simple is fine for now)
                setHistory(data);
            } else {
                console.error("Failed to fetch history");
            }
        } catch (error) {
            console.error("Error fetching history:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (token) {
            fetchHistory(); // Initial fetch

            // Poll every 10 seconds for real-time updates
            const interval = setInterval(fetchHistory, 10000);
            return () => clearInterval(interval);
        } else {
            setLoading(false);
        }
    }, [token]);

    const getRiskBadge = (score: number, type: string) => {
        if (type === 'SENTIMENT') {
            if (score >= 60) return <Badge className="bg-green-500">Positive</Badge>;
            if (score <= 40) return <Badge className="bg-red-500">Negative</Badge>;
            return <Badge className="bg-yellow-500">Neutral</Badge>;
        }
        if (score > 75) return <Badge className="bg-red-500 hover:bg-red-600">High Risk</Badge>;
        if (score > 40) return <Badge className="bg-yellow-500 hover:bg-yellow-600">Medium Risk</Badge>;
        return <Badge className="bg-green-500 hover:bg-green-600">Low Risk</Badge>;
    };

    const getTypeIcon = (type: string) => {
        switch (type) {
            case 'SENTIMENT': return <Smile className="h-4 w-4 text-purple-400" />;
            case 'LIQUIDITY': return <Activity className="h-4 w-4 text-blue-400" />;
            default: return <Shield className="h-4 w-4 text-green-400" />;
        }
    };

    return (
        <DashboardLayout title="Audit History" description="View your past smart contract analysis reports.">
            <div className="space-y-6 max-w-6xl mx-auto">
                {loading ? (
                    <div className="flex justify-center items-center h-64">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
                    </div>
                ) : history.length === 0 ? (
                    <Card className="text-center py-12">
                        <CardHeader>
                            <div className="mx-auto bg-slate-100 dark:bg-slate-800 p-4 rounded-full w-16 h-16 flex items-center justify-center mb-4">
                                <HistoryIcon className="h-8 w-8 text-muted-foreground" />
                            </div>
                            <CardTitle>No Analysis History</CardTitle>
                            <CardDescription>You haven't performed any security audits yet.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Link to="/audit">
                                <Button>Run Your First Audit</Button>
                            </Link>
                        </CardContent>
                    </Card>
                ) : (
                    <div className="grid gap-4 md:grid-cols-1">
                        {history.map((item) => (
                            <Card key={item._id} className="hover:shadow-md transition-shadow">
                                <CardHeader className="flex flex-row items-center justify-between pb-2">
                                    <div className="space-y-1">
                                        <CardTitle className="text-lg flex items-center gap-2">
                                            {getTypeIcon(item.type || 'AUDIT')}
                                            {item.tokenName}
                                            {item.type !== 'SENTIMENT' && (
                                                <Badge variant="outline" className="text-xs font-normal ml-2">
                                                    {item.chainId || 'N/A'}
                                                </Badge>
                                            )}
                                            <Badge variant="secondary" className="text-xs ml-2">{item.type || 'AUDIT'}</Badge>
                                        </CardTitle>
                                        <CardDescription className="text-xs font-mono">
                                            {item.type === 'SENTIMENT' ? 'Market Sentiment Analysis' : item.contractAddress || item.tokenAddress || 'No Address'}
                                        </CardDescription>
                                    </div>
                                    <div className="flex flex-col items-end gap-1">
                                        {getRiskBadge(item.overallRiskScore, item.type || 'AUDIT')}
                                        <span className="text-sm text-muted-foreground">
                                            {format(new Date(item.createdAt), 'PPP p')}
                                        </span>
                                    </div>
                                </CardHeader>
                                <CardContent>
                                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                                        <div className="flex-1">
                                            <p className="text-sm text-muted-foreground mb-2 line-clamp-2">
                                                {item.geminiAnalysis?.oneLineSummary || item.geminiAnalysis?.summary || "No summary available."}
                                            </p>
                                        </div>
                                        <Link to={`/report/${item._id}`}>
                                            <Button variant="outline" size="sm" className="gap-2">
                                                View Details <ArrowRight className="h-4 w-4" />
                                            </Button>
                                        </Link>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                )}
            </div>
        </DashboardLayout>
    );
};

export default History;
