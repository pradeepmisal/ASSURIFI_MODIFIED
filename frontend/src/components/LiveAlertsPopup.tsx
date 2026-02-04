import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    TrendingUp,
    TrendingDown,
    AlertTriangle,
    Droplet,
    X,
    RefreshCw,
    Clock,
    DollarSign,
    Activity
} from "lucide-react";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";

interface Alert {
    id: string;
    type: "price" | "liquidity" | "volume" | "trending";
    severity: "high" | "medium" | "low";
    token: string;
    message: string;
    timestamp: Date;
    change?: number;
}

interface LiveAlertsPopupProps {
    isOpen: boolean;
    onClose: () => void;
}

export function LiveAlertsPopup({ isOpen, onClose }: LiveAlertsPopupProps) {
    const [alerts, setAlerts] = useState<Alert[]>([]);
    const [loading, setLoading] = useState(false);
    const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

    const fetchLiveAlerts = async () => {
        setLoading(true);
        try {
            // Fetch trending coins from CoinGecko
            const response = await fetch(
                "https://api.coingecko.com/api/v3/search/trending"
            );
            const data = await response.json();

            // Transform trending data into alerts
            const newAlerts: Alert[] = data.coins.slice(0, 8).map((coin: any, index: number) => {
                const priceChange = coin.item.data?.price_change_percentage_24h?.usd || 0;
                const isPositive = priceChange > 0;

                return {
                    id: `${coin.item.id}-${Date.now()}-${index}`,
                    type: Math.abs(priceChange) > 10 ? "price" : "trending",
                    severity: Math.abs(priceChange) > 15 ? "high" : Math.abs(priceChange) > 5 ? "medium" : "low",
                    token: coin.item.symbol.toUpperCase(),
                    message: `${coin.item.name} ${isPositive ? "surged" : "dropped"} ${Math.abs(priceChange).toFixed(2)}% in 24h`,
                    timestamp: new Date(),
                    change: priceChange
                };
            });

            setAlerts(newAlerts);
            setLastUpdate(new Date());
        } catch (error) {
            console.error("Failed to fetch live alerts:", error);
            // Fallback to demo data if API fails
            setAlerts(generateDemoAlerts());
            setLastUpdate(new Date());
        } finally {
            setLoading(false);
        }
    };

    const generateDemoAlerts = (): Alert[] => {
        return [
            {
                id: "1",
                type: "price",
                severity: "high",
                token: "BTC",
                message: "Bitcoin surged 8.5% in the last hour",
                timestamp: new Date(),
                change: 8.5
            },
            {
                id: "2",
                type: "liquidity",
                severity: "medium",
                token: "ETH",
                message: "Ethereum liquidity decreased by 12% on Uniswap",
                timestamp: new Date(),
                change: -12
            },
            {
                id: "3",
                type: "volume",
                severity: "low",
                token: "SOL",
                message: "Solana trading volume up 45% in 24h",
                timestamp: new Date(),
                change: 45
            },
            {
                id: "4",
                type: "trending",
                severity: "medium",
                token: "PEPE",
                message: "PEPE trending #1 on CoinGecko",
                timestamp: new Date()
            }
        ];
    };

    useEffect(() => {
        if (isOpen) {
            fetchLiveAlerts();
        }
    }, [isOpen]);

    const getAlertIcon = (type: Alert["type"]) => {
        switch (type) {
            case "price":
                return <DollarSign className="h-4 w-4" />;
            case "liquidity":
                return <Droplet className="h-4 w-4" />;
            case "volume":
                return <Activity className="h-4 w-4" />;
            case "trending":
                return <TrendingUp className="h-4 w-4" />;
        }
    };

    const getSeverityColor = (severity: Alert["severity"]) => {
        switch (severity) {
            case "high":
                return "bg-red-500/10 text-red-500 border-red-500/20";
            case "medium":
                return "bg-amber-500/10 text-amber-500 border-amber-500/20";
            case "low":
                return "bg-blue-500/10 text-blue-500 border-blue-500/20";
        }
    };

    const formatTimestamp = (date: Date) => {
        const now = new Date();
        const diff = Math.floor((now.getTime() - date.getTime()) / 1000 / 60);
        if (diff < 1) return "Just now";
        if (diff < 60) return `${diff}m ago`;
        return `${Math.floor(diff / 60)}h ago`;
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
                    />

                    {/* Dropdown Panel */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: -10 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: -10 }}
                        transition={{ type: "spring", damping: 25, stiffness: 300 }}
                        className="fixed top-20 right-4 w-[400px] max-h-[500px] bg-white dark:bg-slate-900 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-800 z-50 overflow-hidden"
                    >
                        {/* Header */}
                        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                                    <AlertTriangle className="h-4 w-4 text-primary" />
                                </div>
                                <div>
                                    <h3 className="text-sm font-semibold">Live Market Alerts</h3>
                                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                                        <Clock className="h-3 w-3" />
                                        {formatTimestamp(lastUpdate)}
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-center gap-1">
                                <button
                                    onClick={fetchLiveAlerts}
                                    disabled={loading}
                                    className="h-7 w-7 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center transition-colors disabled:opacity-50"
                                    title="Refresh"
                                >
                                    <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
                                </button>
                                <button
                                    onClick={onClose}
                                    className="h-7 w-7 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center transition-colors"
                                    title="Close"
                                >
                                    <X className="h-3.5 w-3.5" />
                                </button>
                            </div>
                        </div>

                        {/* Alerts List */}
                        <div className="overflow-y-auto max-h-[400px] p-3">
                            {loading && alerts.length === 0 ? (
                                <div className="flex items-center justify-center py-8">
                                    <RefreshCw className="h-6 w-6 animate-spin text-primary" />
                                </div>
                            ) : alerts.length === 0 ? (
                                <div className="text-center py-8 text-muted-foreground">
                                    <AlertTriangle className="h-8 w-8 mx-auto mb-2 opacity-50" />
                                    <p className="text-sm">No alerts available</p>
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    {alerts.map((alert, index) => (
                                        <motion.div
                                            key={alert.id}
                                            initial={{ opacity: 0, x: -20 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            transition={{ delay: index * 0.05 }}
                                            className={`p-3 rounded-lg border ${getSeverityColor(alert.severity)} hover:shadow-sm transition-shadow`}
                                        >
                                            <div className="flex items-start gap-2">
                                                <div className="mt-0.5">{getAlertIcon(alert.type)}</div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <Badge variant="outline" className="font-mono text-xs">
                                                            {alert.token}
                                                        </Badge>
                                                        {alert.change !== undefined && (
                                                            <span className={`flex items-center gap-1 text-xs font-medium ${alert.change > 0 ? "text-green-500" : "text-red-500"}`}>
                                                                {alert.change > 0 ? (
                                                                    <TrendingUp className="h-3 w-3" />
                                                                ) : (
                                                                    <TrendingDown className="h-3 w-3" />
                                                                )}
                                                                {Math.abs(alert.change).toFixed(2)}%
                                                            </span>
                                                        )}
                                                    </div>
                                                    <p className="text-xs leading-relaxed">{alert.message}</p>
                                                    <p className="text-xs text-muted-foreground mt-1">
                                                        {formatTimestamp(alert.timestamp)}
                                                    </p>
                                                </div>
                                            </div>
                                        </motion.div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}
