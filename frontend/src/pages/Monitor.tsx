import { useEffect, useState, useRef } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import {
  Activity,
  AlertTriangle,
  ArrowDownRight,
  AreaChart,
  Percent,
  BarChart3,
  Wallet,
  Search
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter
} from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Legend,
  Cell
} from "recharts";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { tokenData as defaultTokenData } from "@/data/liquidityData";




const Monitor = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const [tokenData, setTokenData] = useState(defaultTokenData);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [selectedPair, setSelectedPair] = useState<any>(null);

  // Ref to track if the search query update comes from a selection
  // If true, we should skip the autocomplete search
  const ignoreSearchRef = useRef(false);

  useEffect(() => {
    document.title = "Liquidity Monitor - AssureFi Guardian";
  }, []);

  // Debounce logic for autocomplete
  useEffect(() => {
    // If empty or just selected, don't search
    if (!searchQuery || !searchQuery.trim()) {
      setSearchResults([]);
      setShowResults(false);
      return;
    }

    // Don't search if we just selected something
    if (ignoreSearchRef.current) {
      ignoreSearchRef.current = false;
      return;
    }

    // User is typing, clear previous selection
    setSelectedPair(null);

    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        // Use our backend proxy to avoid CORS issues if calling direct, 
        // but here we use the proxy we created: /search/dex
        const response = await fetch(`http://localhost:3002/search/dex?q=${encodeURIComponent(searchQuery)}`);
        if (response.ok) {
          const data = await response.json();
          // Limit suggestions to top 5 for cleaner UI
          setSearchResults(data.slice(0, 5));
          setShowResults(true);
        }
      } catch (error) {
        console.error("Autocomplete error:", error);
      } finally {
        setIsSearching(false);
      }
    }, 400); // 400ms debounce

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handleSearchClick = async () => {
    // Case 1: User selected a pair from dropdown explicitly
    if (selectedPair) {
      await fetchTokenData(selectedPair);
      return;
    }

    // Case 2: User didn't select, but we have results (auto-select top)
    if (searchResults.length > 0) {
      const topResult = searchResults[0];
      handleSelectPair(topResult);
      await fetchTokenData(topResult); // Fetch immediately on button click
    } else {
      // Case 3: Fallback manual search if nothing in list
      setIsSearching(true);
      try {
        const response = await fetch(`http://localhost:3002/search/dex?q=${encodeURIComponent(searchQuery)}`);
        if (response.ok) {
          const data = await response.json();
          if (data && data.length > 0) {
            handleSelectPair(data[0]);
            await fetchTokenData(data[0]); // Fetch immediately on button click
          } else {
            setError("No token found.");
          }
        }
      } catch (e) { setError("Search failed"); }
      finally { setIsSearching(false); }
    }
  };


  const handleSelectPair = (pair: any) => {
    ignoreSearchRef.current = true; // Set flag to ignore next search
    setSelectedPair(pair);
    setShowResults(false);
    setSearchQuery(`${pair.baseToken.name} (${pair.baseToken.symbol})`);
  };


  const fetchTokenData = async (pair: any) => {
    setIsLoading(true);
    setIsAnalyzing(true);
    setHasSearched(true);
    setError("");

    try {
      // 1. Map DexScreener pair data
      // 1. Map DexScreener pair data
      // Cast to any to bypass strict TokenData checks for legacy fields
      const transformedData: any = {
        token_name: pair.baseToken.name,
        token_symbol: pair.baseToken.symbol,
        timestamp: Date.now(),
        metrics: {
          price: {
            current: parseFloat(pair.priceUsd) || 0,
            change: {
              h1: pair.priceChange?.h1 || 0,
              h6: pair.priceChange?.h6 || 0,
              h24: pair.priceChange?.h24 || 0,
            }
          },
          volume: {
            h1: 0,
            h6: 0,
            h24: pair.volume?.h24 || 0,
          },
          liquidity: pair.liquidity?.usd || 0,
          market_cap: pair.fdv || 0,
          fdv: pair.fdv || 0,
          transactions: {
            h1: { buys: 0, sells: 0, ratio: 0 }
          }
        },
        risk: {
          risk_score: 50,
          vulnerabilities: [],
          recommendations: [],
          level: "Medium",
          audit_status: "Unverified",
          last_audit: "Pending"
        },
        ai_insights: [],
        recommendations: [],
        insights_list: [],
        ai_insights_panel: null
      };

      // 2. Prepare Payload
      const payload = {
        token_name: pair.baseToken.name,
        token_address: pair.baseToken.address,
        smart_contract_address: pair.baseToken.address,
        chain_id: pair.chainId
      };

      // 3. Fetch Risk Analysis (AWAITED - blocking UI)
      let riskUpdates = {};
      try {
        const token = localStorage.getItem("token");
        const headers: any = { "Content-Type": "application/json" };
        if (token) {
          headers["Authorization"] = `Bearer ${token}`;
        }

        const riskResponse = await fetch("http://localhost:3002/risk-analysis", {
          method: "POST",
          headers: headers,
          body: JSON.stringify(payload)
        });

        if (riskResponse.ok) {
          const riskResult = await riskResponse.json();

          // Score Logic
          let realScore = 0;
          if (riskResult.contractAnalysis?.overallScore) realScore = riskResult.contractAnalysis.overallScore;
          else if (riskResult.geminiAnalysis?.contractAnalysis?.overallScore) realScore = riskResult.geminiAnalysis.contractAnalysis.overallScore;
          else if (riskResult.riskData && Array.isArray(riskResult.riskData)) {
            const total = riskResult.riskData.reduce((acc: any, item: any) => acc + (item.risk || 0), 0);
            realScore = Math.round(total / (riskResult.riskData.length || 1));
          }
          if (realScore === 0) realScore = 50;

          riskUpdates = {
            risk: { ...transformedData.risk, risk_score: realScore },
            insights_list: riskResult.insightsList || [],
            ai_insights_panel: riskResult.ai_insights_panel || null
          };
        }
      } catch (riskErr) {
        console.error("Risk Fetch Failed", riskErr);
      }

      // 4. Update State ONCE with ALL data
      setTokenData({
        ...transformedData,
        ...riskUpdates
      });


    } catch (err: any) {
      console.error("Error processing token data:", err);
      setError("Failed to process token data.");
    } finally {
      setIsLoading(false);
      // Artificial Delay to ensure user sees the "Scanning" state for a moment if API is too fast
      setTimeout(() => {
        setIsAnalyzing(false);
      }, 1500);
    }
  };

  // Format the price change data for the chart
  const priceChangeData = [
    { name: "1h", value: tokenData.metrics.price.change.h1 },
    { name: "6h", value: tokenData.metrics.price.change.h6 },
    { name: "24h", value: tokenData.metrics.price.change.h24 },
  ];

  // Format the volume data for the chart
  const volumeData = [
    { name: "1h", value: tokenData.metrics.volume.h1 },
    { name: "6h", value: tokenData.metrics.volume.h6 },
    { name: "24h", value: tokenData.metrics.volume.h24 },
  ];

  // Format transactions data
  const transactionsData = [
    { name: "Buys", value: tokenData.metrics.transactions.h1.buys },
    { name: "Sells", value: tokenData.metrics.transactions.h1.sells },
  ];

  // Colors for transaction data
  const transactionColors = ["#4ade80", "#f87171"];

  // Format date from timestamp
  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp * 1000);
    return date.toLocaleString();
  };

  // Risk level indicator
  const getRiskLevelColor = (score: number) => {
    if (!score) return "bg-gray-500";
    if (score >= 75) return "bg-red-500";
    if (score >= 50) return "bg-yellow-500";
    return "bg-green-500";
  };

  // Generate simulated historical liquidity data based on current liquidity
  const hoursAgo = (hours: number) => {
    const date = new Date();
    date.setHours(date.getHours() - hours);
    return date.getTime();
  };

  const liquidityHistoricalData = [
    { time: hoursAgo(24), liquidity: tokenData.metrics.liquidity * 1.8 },
    { time: hoursAgo(18), liquidity: tokenData.metrics.liquidity * 1.5 },
    { time: hoursAgo(12), liquidity: tokenData.metrics.liquidity * 1.3 },
    { time: hoursAgo(6), liquidity: tokenData.metrics.liquidity * 1.1 },
    { time: hoursAgo(3), liquidity: tokenData.metrics.liquidity * 1.05 },
    { time: Date.now(), liquidity: tokenData.metrics.liquidity },
  ];

  // Custom number formatter
  const formatNumber = (value: any): string => {
    return typeof value === "number" ? value.toFixed(2) : String(value);
  };

  return (
    <DashboardLayout
      title="Liquidity Monitor"
      description="Track liquidity movements and detect potential exit scams"
    >
      <div className="grid gap-4 md:gap-8">
        {/* Token Selection Card */}
        <Card>
          <CardHeader>
            <CardTitle>Select Token</CardTitle>
            <CardDescription>
              Choose a token from the list below to analyze its liquidity metrics.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col space-y-4">
              <div className="relative z-50">
                <div className="flex w-full items-center space-x-2">
                  <Input
                    type="text"
                    placeholder="Search token name (e.g. USDC, WIF)"
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      // If user clears input, hide results
                      if (e.target.value === "") setShowResults(false);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        handleSearchClick();
                        setShowResults(false);
                      }
                    }}
                  />
                  <Button onClick={handleSearchClick} disabled={isSearching}>
                    {isSearching ? "Searching..." : "Search"}
                    {!isSearching && <Search className="ml-2 h-4 w-4" />}
                  </Button>
                </div>

                {/* Autocomplete Dropdown - Absolute Position */}
                {showResults && searchResults.length > 0 && (
                  <div className="absolute top-full left-0 right-0 z-50 mt-1 border rounded-md shadow-lg bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 max-h-60 overflow-y-auto">
                    {searchResults.map((pair: any, index: number) => (
                      <div
                        key={index}
                        className="p-3 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer flex justify-between items-center border-b last:border-0 border-slate-100 dark:border-slate-800"
                        onClick={() => handleSelectPair(pair)}
                      >
                        <div>
                          <div className="font-bold flex items-center gap-2">
                            {pair.baseToken.name} <span className="text-muted-foreground text-xs">({pair.baseToken.symbol})</span>
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {pair.chainId} • ${parseFloat(pair.priceUsd).toFixed(6)}
                          </div>
                        </div>
                        <Badge variant="outline" className="ml-2">
                          Liq: ${(pair.liquidity?.usd / 1000).toFixed(0)}k
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
            {error && (
              <Alert variant="destructive" className="mt-4">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>

        {/* --- GLOBAL LOADING OVERLAY (The "Buffer") --- */}
        {isAnalyzing && (
          <div className="flex flex-col items-center justify-center py-20 min-h-[400px] bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm rounded-xl border border-slate-200 dark:border-slate-800 animate-in fade-in duration-300">
            <div className="flex flex-col items-center animate-pulse space-y-6">
              <Search className="h-16 w-16 text-primary animate-bounce" />
              <div className="text-center space-y-2">
                <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Scanning Token...</h2>
                <p className="text-lg text-slate-500">AssureFi Analyzing Liquidity Depth & Risk Matrices</p>
              </div>
            </div>
          </div>
        )}

        {/* --- INITIAL STATE (Hidden Dashboard) --- */}
        {!hasSearched ? (
          <div className="flex flex-col items-center justify-center h-[50vh] text-center space-y-6 opacity-60">
            <div className="p-8 bg-slate-100 dark:bg-slate-800 rounded-full">
              <Search className="h-16 w-16 text-slate-400" />
            </div>
            <div className="max-w-md space-y-2">
              <h3 className="text-2xl font-bold tracking-tight">Ready to Monitor</h3>
              <p className="text-muted-foreground">
                Enter a token name or address above to begin a comprehensive risk and liquidity analysis.
              </p>
            </div>
          </div>
        ) : (
          /* --- ACTUAL DASHBOARD CONTENT (Only shown after search) --- */
          <div className={`space-y-6 ${isAnalyzing ? 'opacity-0 overflow-hidden h-0' : 'animate-in fade-in slide-in-from-bottom-4 duration-700'}`}>

            {/* Token Overview Card */}
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2 mb-2">
                  <Activity className="h-5 w-5 text-blue-500" />
                  <CardTitle>
                    Token Overview: {tokenData.token_name} ({tokenData.token_symbol})
                  </CardTitle>
                </div>
                <CardDescription>
                  Last updated: {formatDate(tokenData.timestamp)}
                </CardDescription>
              </CardHeader>
              <CardContent>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div className="bg-slate-50 dark:bg-slate-800 p-4 rounded-lg">
                    <div className="text-sm text-muted-foreground mb-1">Current Price</div>
                    <div className="text-2xl font-bold">
                      {tokenData.metrics.price.current.toExponential(2)}
                    </div>
                    <div className="flex items-center mt-1">
                      <ArrowDownRight className="h-4 w-4 text-red-500 mr-1" />
                      <span className="text-red-500">
                        {tokenData.metrics.price.change.h24}% (24h)
                      </span>
                    </div>
                  </div>

                  <div className="bg-slate-50 dark:bg-slate-800 p-4 rounded-lg">
                    <div className="text-sm text-muted-foreground mb-1">Liquidity</div>
                    <div className="text-2xl font-bold">
                      ${formatNumber(tokenData.metrics.liquidity)}
                    </div>
                    <div className="flex items-center mt-1">
                      <AreaChart className="h-4 w-4 text-blue-500 mr-1" />
                      <span className="text-muted-foreground">
                        vs Market Cap: ${formatNumber(tokenData.metrics.market_cap)}
                      </span>
                    </div>
                  </div>

                  <div className="bg-slate-50 dark:bg-slate-800 p-4 rounded-lg">
                    <div className="text-sm text-muted-foreground mb-1">24h Volume</div>
                    <div className="text-2xl font-bold">
                      ${formatNumber(tokenData.metrics.volume.h24)}
                    </div>
                    <div className="flex items-center mt-1">
                      <BarChart3 className="h-4 w-4 text-green-500 mr-1" />
                      <span className="text-green-500">Active trading</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* DexScreener Pair Info Card */}
            <Card>
              <CardHeader>
                <CardTitle>Pair Information</CardTitle>
              </CardHeader>
              <CardContent>
                {selectedPair ? (
                  <div className="space-y-2">
                    <p><strong>Pair Address:</strong> <span className="text-xs text-muted-foreground">{selectedPair.pairAddress}</span></p>
                    <p><strong>DEX:</strong> {selectedPair.dexId}</p>
                    <p><strong>Chain:</strong> {selectedPair.chainId}</p>
                    <p><strong>Base Token:</strong> {selectedPair.baseToken?.name} ({selectedPair.baseToken?.address.substring(0, 8)}...)</p>
                    <p><strong>Quote Token:</strong> {selectedPair.quoteToken?.name} ({selectedPair.quoteToken?.symbol})</p>
                    <p className="text-xs text-muted-foreground mt-2">
                      Likely Liquidity Lock Status: <span className="italic">Check generic block explorer</span>
                    </p>
                  </div>
                ) : (
                  <p className="text-muted-foreground">Select a token from search to view details.</p>
                )}
              </CardContent>
            </Card>

            {/* Liquidity Chart Card */}
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2 mb-2">
                  <AreaChart className="h-5 w-5 text-blue-500" />
                  <CardTitle>Liquidity Tracker</CardTitle>
                </div>
                <CardDescription>
                  Monitor liquidity pool changes and set alerts for suspicious withdrawals
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={liquidityHistoricalData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis
                        dataKey="time"
                        tickFormatter={(tick) => {
                          const date = new Date(tick);
                          return `${date.getHours()}:${date.getMinutes().toString().padStart(2, "0")}`;
                        }}
                      />
                      <YAxis />
                      <Tooltip
                        formatter={(value) => [`$${formatNumber(value)}`, "Liquidity"]}
                        labelFormatter={(label) => new Date(label).toLocaleString()}
                      />
                      <Line type="monotone" dataKey="liquidity" stroke="#2563eb" strokeWidth={2} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
                <div className="mt-4 text-sm text-muted-foreground">
                  <p>
                    Liquidity to Market Cap Ratio:{" "}
                    {tokenData.metrics.market_cap > 0
                      ? (tokenData.metrics.liquidity / tokenData.metrics.market_cap).toFixed(2)
                      : "N/A"}
                  </p>
                  <p className="text-red-500 mt-1">
                    {tokenData.metrics.market_cap > 0 && tokenData.metrics.liquidity > tokenData.metrics.market_cap &&
                      "⚠️ Warning: Liquidity exceeds market cap, potential for high volatility and manipulation"}
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Price Changes and Volume */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <Percent className="h-5 w-5 text-red-500" />
                    <CardTitle>Price Changes</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="h-[200px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={priceChangeData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" />
                        <YAxis />
                        <Tooltip formatter={(value) => [`${value}%`, "Change"]} />
                        <Bar dataKey="value" fill="#f87171" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <BarChart3 className="h-5 w-5 text-green-500" />
                    <CardTitle>Trading Volume</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="h-[200px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={volumeData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" />
                        <YAxis />
                        <Tooltip formatter={(value) => [`$${formatNumber(value)}`, "Volume"]} />
                        <Bar dataKey="value" fill="#2563eb" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <Search className="h-5 w-5 text-purple-500" />
                    <CardTitle>AI Insights</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  {/* Check for New Structured Panel FIRST */}
                  {(tokenData as any).ai_insights_panel ? (
                    <div className="space-y-5">

                      {/* 1. Liquidity Health */}
                      <div className="bg-slate-50 dark:bg-slate-800 p-3 rounded-lg border-l-4 border-blue-500">
                        <h4 className="text-xs font-bold text-muted-foreground uppercase mb-1">Liquidity Health</h4>
                        <p className="text-sm font-medium">{(tokenData as any).ai_insights_panel.liquidityHealth}</p>
                      </div>

                      {/* 2. Liquidity Trend & Exit Risk Row */}
                      <div className="grid grid-cols-2 gap-3">
                        <div className="bg-slate-50 dark:bg-slate-800 p-3 rounded-lg">
                          <h4 className="text-xs font-bold text-muted-foreground uppercase mb-1">Trend</h4>
                          <p className="text-sm">{(tokenData as any).ai_insights_panel.liquidityTrend}</p>
                        </div>
                        <div className="bg-slate-50 dark:bg-slate-800 p-3 rounded-lg flex flex-col items-center justify-center text-center">
                          <h4 className="text-xs font-bold text-muted-foreground uppercase mb-1">Exit Risk</h4>
                          <Badge
                            variant="outline"
                            className={`
                                    ${(tokenData as any).ai_insights_panel.exitRiskSignal === 'HIGH' ? 'bg-red-100 text-red-700 border-red-200' : ''}
                                    ${(tokenData as any).ai_insights_panel.exitRiskSignal === 'MEDIUM' ? 'bg-yellow-100 text-yellow-700 border-yellow-200' : ''}
                                    ${(tokenData as any).ai_insights_panel.exitRiskSignal === 'LOW' ? 'bg-green-100 text-green-700 border-green-200' : ''}
                                `}
                          >
                            {(tokenData as any).ai_insights_panel.exitRiskSignal}
                          </Badge>
                        </div>
                      </div>

                      {/* 3. Investor Interpretation */}
                      <div className="bg-purple-50 dark:bg-purple-900/20 p-4 rounded-lg border border-purple-100 dark:border-purple-800">
                        <div className="flex items-center gap-2 mb-2 text-purple-700 dark:text-purple-300">
                          <Activity className="h-4 w-4" />
                          <h4 className="text-sm font-semibold">Investor Interpretation</h4>
                        </div>
                        <p className="text-sm leading-relaxed text-slate-700 dark:text-slate-300">
                          {(tokenData as any).ai_insights_panel.investorInterpretation}
                        </p>
                      </div>

                    </div>
                  ) : (
                    /* FALLBACK to old list if panel missing */
                    <div className="space-y-4">
                      {(tokenData as any).insights_list?.length ? (
                        (tokenData as any).insights_list.map((insight: any, index: number) => (
                          <div key={index} className="p-3 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-100 dark:border-slate-700">
                            <div className="flex items-start gap-3">
                              <div className={`mt-1 ${insight.iconColor || "text-blue-500"}`}>
                                <Activity className="h-4 w-4" />
                              </div>
                              <div>
                                <h4 className="font-semibold text-sm">{insight.title}</h4>
                                <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                                  {insight.description}
                                </p>
                              </div>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="text-center py-6 text-muted-foreground">
                          <p>Run a search to generate AI insights for this token.</p>
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <Wallet className="h-5 w-5 text-blue-500" />
                    <CardTitle>Transaction Analysis</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="h-[150px] mb-4">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={transactionsData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        <Bar dataKey="value" name="Transactions" fill="#2563eb">
                          {transactionsData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={transactionColors[index % transactionColors.length]} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div className="bg-slate-50 dark:bg-slate-800 p-3 rounded-lg">
                      <div className="text-sm text-muted-foreground">Buy/Sell Ratio</div>
                      <div className="text-xl font-bold">
                        {tokenData.metrics.transactions.h1.ratio.toFixed(2)}
                      </div>
                      <Badge variant={tokenData.metrics.transactions.h1.ratio >= 1 ? "success" : "destructive"} className="mt-1">
                        {tokenData.metrics.transactions.h1.ratio >= 1 ? "Bullish" : "Bearish"}
                      </Badge>
                    </div>
                    <div className="bg-slate-50 dark:bg-slate-800 p-3 rounded-lg">
                      <div className="text-sm text-muted-foreground">Recent Transactions</div>
                      <div className="text-xl font-bold">
                        {tokenData.metrics.transactions.h1.buys + tokenData.metrics.transactions.h1.sells}
                      </div>
                      <div className="text-sm text-muted-foreground mt-1">In the last hour</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>


          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default Monitor;
