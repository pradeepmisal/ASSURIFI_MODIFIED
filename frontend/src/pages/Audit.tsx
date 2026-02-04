import React, { useRef, useState, useEffect } from "react";
import DashboardLayout from "../components/DashboardLayout";
import { motion } from "framer-motion";
import PageTransition from "@/components/PageTransition";
import {
  FileSearch,
  Shield,
  AlertTriangle,
  CheckCircle,
  HelpCircle,
  Clipboard,
  Search,
  Upload,
  Code,
  AlertCircle,
  Moon,
  Sun
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import SearchBar from "@/components/SearchBar";
import { API_BASE_URL } from "@/config";

interface VulnerabilityItem {
  id: number;
  name: string;
  description: string;
  severity: "critical" | "high" | "medium" | "low";
  lineNumber?: number;
  code?: string;
  recommendation: string;
}

const Audit = () => {
  const [activeTab, setActiveTab] = useState("address");
  const [contractAddress, setContractAddress] = useState("");
  const [selectedAddress, setSelectedAddress] = useState("");
  const [sourceCode, setSourceCode] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [auditComplete, setAuditComplete] = useState(false);
  const [auditScore, setAuditScore] = useState(0);
  const [progressValue, setProgressValue] = useState(0);
  const [vulnerabilities, setVulnerabilities] = useState<VulnerabilityItem[]>([]);
  const [summary, setSummary] = useState("");
  const [investorImpactSummary, setInvestorImpactSummary] = useState("");
  const [isDark, setIsDark] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    // ... (theme existing logic)
    // Load theme from localStorage
    const savedTheme = localStorage.getItem('theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const initialTheme = savedTheme === 'dark' || (!savedTheme && prefersDark);
    setIsDark(initialTheme);
    if (initialTheme) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, []);

  const toggleTheme = () => {
    const newTheme = !isDark;
    setIsDark(newTheme);
    if (newTheme) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  };

  // Backend API endpoint for contract audit
  const AUDIT_API_URL = `${API_BASE_URL}/analyze-contract`;

  // Ref for file input (hidden)
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Handle file selection
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.name.endsWith(".sol")) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const fileContent = event.target?.result as string;
        setSourceCode(fileContent);
      };
      reader.readAsText(file);
    } else {
      toast({
        title: "Invalid File",
        description: "Please upload a valid Solidity (.sol) file.",
        variant: "destructive",
      });
    }
  };

  // When a coin/address is selected from the SearchBar, update contract address too
  const handleCoinSelect = (addr: string) => {
    setSelectedAddress(addr);
    setContractAddress(addr);
  };

  const handleAudit = async () => {
    // Validate inputs
    if (activeTab === "address" && !contractAddress) {
      toast({
        title: "Input Required",
        description: "Please enter a contract address to audit.",
        variant: "destructive",
      });
      return;
    }

    // Validate Ethereum address format
    if (activeTab === "address" && contractAddress) {
      const trimmedAddress = contractAddress.trim();
      const isValidAddress = /^0x[0-9a-fA-F]{40}$/.test(trimmedAddress);
      if (!isValidAddress) {
        toast({
          title: "Invalid Address Format",
          description: `Ethereum address must be 42 characters (0x followed by 40 hex characters). Current length: ${trimmedAddress.length}`,
          variant: "destructive",
        });
        return;
      }
    }

    if (activeTab === "source" && !sourceCode) {
      toast({
        title: "Input Required",
        description: "Please enter or upload source code to audit.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    setProgressValue(0);
    setAuditComplete(false);
    setVulnerabilities([]);
    setSummary("");
    setInvestorImpactSummary("");
    setAuditScore(0);

    try {
      // Simulate realtime progress
      const progressInterval = setInterval(() => {
        setProgressValue((prev) => {
          const newValue = prev + Math.random() * 10;
          if (newValue >= 90) {
            clearInterval(progressInterval);
            return 90;
          }
          return newValue;
        });
      }, 200);

      const token = localStorage.getItem("token");
      const headers: any = {};

      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }

      let response;
      if (activeTab === "address") {
        // GET request with contract address in header
        const trimmedAddress = contractAddress.trim();
        headers["contract-address"] = trimmedAddress;

        response = await fetch(AUDIT_API_URL, {
          method: "GET",
          headers: headers,
        });
      } else if (activeTab === "source") {
        // POST request: send a JSON object with the source code
        headers["Content-Type"] = "application/json";

        response = await fetch(AUDIT_API_URL, {
          method: "POST",
          headers: headers,
          body: JSON.stringify({ code: sourceCode }),
        });
      }

      if (!response || !response.ok) {
        console.error("Audit backend fetch error", response);
        // Try to get error message from response
        let errorMessage = "Server responded with an error";
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorMessage;
        } catch (e) {
          // If response is not JSON, use status text
          errorMessage = response.statusText || `HTTP ${response.status} error`;
        }
        throw new Error(errorMessage);
      }
      const data = await response.json();

      // Expected response structure:
      // { vulnerabilities: [...], overallScore: number, summary: string, investorImpactSummary: string }
      setVulnerabilities(data.vulnerabilities || []);
      setAuditScore(data.overallScore || 0);
      setSummary(data.summary || "");
      setInvestorImpactSummary(data.investorImpactSummary || "");

      setProgressValue(100);
      setAuditComplete(true);
    } catch (err: any) {
      console.error("Audit error:", err);
      toast({
        title: "Audit Failed",
        description: err.message || String(err),
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

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

  return (
    <PageTransition>
      <DashboardLayout title="Smart Contract Audit" description="Analyze smart contracts for vulnerabilities and security issues">
        <div className="flex justify-between items-center mb-4">
          <SearchBar onCoinSelect={handleCoinSelect} />
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleTheme}
            className="gap-2 border-white/20 text-white hover:bg-white/10"
          >
            {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </Button>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          {/* Left side - Input */}
          <div className="lg:col-span-2">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
              <div className="glass-card h-full">
                {/* card header and card content */}
                <div className="border-b border-white/10 px-6 pt-6 pb-4">
                  <h2 className="text-2xl text-white font-semibold">Audit Smart Contract</h2>
                  <p className="text-gray-300 mt-1 text-sm">Submit a contract address or source code for security analysis</p>
                </div>
                <div className="px-6 pb-8 pt-4">
                  <Tabs defaultValue="address" value={activeTab} onValueChange={setActiveTab}>
                    <TabsList className="grid grid-cols-2 mb-6 bg-transparent">
                      <TabsTrigger value="address" className="text-white">Contract Address</TabsTrigger>
                      <TabsTrigger value="source" className="text-white">Source Code</TabsTrigger>
                    </TabsList>

                    <TabsContent value="address" className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="contractAddress" className="text-gray-200">Enter Contract Address</Label>
                        <div className="relative">
                          <Input
                            id="contractAddress"
                            placeholder="0x..."
                            value={selectedAddress || contractAddress}
                            onChange={(e) => {
                              setContractAddress(e.target.value);
                              setSelectedAddress(e.target.value);
                            }}
                            className="pl-10 bg-white/5 border border-white/10 text-gray-100 placeholder:text-gray-400"
                          />
                          <div className="absolute left-3 top-2.5 text-gray-400">
                            <Search className="h-5 w-5" />
                          </div>
                        </div>
                        <p className="text-xs text-gray-400">
                          Enter any contract address (Ethereum, BSC, etc).
                        </p>
                      </div>
                    </TabsContent>

                    <TabsContent value="source" className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="sourceCode" className="text-gray-200">Enter Source Code</Label>
                        <Textarea
                          id="sourceCode"
                          placeholder="// Paste your smart contract code here..."
                          value={sourceCode}
                          onChange={(e) => setSourceCode(e.target.value)}
                          className="min-h-[200px] font-mono text-sm bg-white/5 border border-white/10 text-gray-100 placeholder:text-gray-400"
                        />
                        <div className="flex items-center justify-between">
                          <p className="text-xs text-gray-400">Or upload a Solidity (.sol) file</p>
                          <Button
                            variant="outline"
                            size="sm"
                            className="gap-2 border-white/20 text-white hover:bg-white/10"
                            onClick={() => fileInputRef.current?.click()}
                          >
                            <Upload className="h-4 w-4" /> Upload File
                          </Button>
                          {/* Hidden file input */}
                          <input
                            type="file"
                            accept=".sol"
                            ref={fileInputRef}
                            style={{ display: "none" }}
                            onChange={handleFileChange}
                          />
                        </div>
                      </div>
                    </TabsContent>
                  </Tabs>

                  <div className="mt-6">
                    <Button
                      onClick={handleAudit}
                      disabled={isLoading}
                      className="w-full gap-2 bg-gradient-to-r from-blue-500 via-purple-600 to-fuchsia-500 text-white font-bold shadow-lg shadow-blue-500/30 border-0 ring-2 ring-blue-400/30 hover:brightness-125 hover:shadow-xl hover:ring-4 transition duration-200"
                      style={{ textShadow: "0 0 8px #89f" }}
                    >
                      {isLoading ? "Running Audit..." : <><Shield className="h-4 w-4" /> Start Audit</>}
                    </Button>
                    {isLoading && (
                      <div className="mt-4 space-y-2">
                        <div className="flex justify-between text-sm text-gray-300">
                          <span>Analyzing contract...</span>
                          <span>{Math.round(progressValue)}%</span>
                        </div>
                        <Progress value={progressValue} className="h-2 bg-white/10 [&>div]:bg-blue-500/80" />
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          </div>

          {/* Right side - Results */}
          <div className="lg:col-span-3">
            {!auditComplete && !isLoading ? (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.1 }}
              >
                <div className="glass-card h-full flex flex-col justify-center items-center py-12">
                  <div className="text-center p-6">
                    <FileSearch className="h-16 w-16 text-blue-300/60 mx-auto mb-6" />
                    <h3 className="text-xl font-medium text-white mb-2">No Audit Results Yet</h3>
                    <p className="text-gray-300 max-w-md">
                      Submit a smart contract address or source code to run a security audit and detect vulnerabilities.
                    </p>
                  </div>
                </div>
              </motion.div>
            ) : auditComplete ? (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
              >
                <div className="glass-card">
                  <div className="border-b border-white/10 px-6 pt-6 pb-4">
                    <div className="flex justify-between items-center">
                      <h2 className="text-2xl text-white font-semibold">Audit Results</h2>
                      <div className="flex items-center gap-2">
                        <span className={`text-2xl font-bold ${getScoreColor(auditScore)}`}>{auditScore}</span>
                        <span className="text-sm text-gray-400">/100</span>
                      </div>
                    </div>
                    <p className="text-gray-300 mt-1 text-xs">Scan completed on {new Date().toLocaleString()}</p>
                  </div>
                  <div className="px-6 pb-8 pt-4 space-y-6">
                    {/* Overall Score Section */}
                    <div className="border border-white/15 rounded-lg p-4">
                      <div className="flex justify-between items-center mb-2">
                        <h3 className="font-medium text-white">Security Score</h3>
                        <div className={`px-2 py-1 text-sm font-medium rounded-full ${auditScore >= 80 ? "bg-green-400/10 text-green-200" :
                          auditScore >= 60 ? "bg-yellow-400/10 text-yellow-200" :
                            "bg-red-400/10 text-red-200"
                          }`}>
                          {getScoreLabel(auditScore)}
                        </div>
                      </div>
                      <Progress
                        value={auditScore}
                        className={`h-2 mb-2 bg-white/5 [&>div]:${auditScore >= 80 ? "bg-green-400/80" :
                          auditScore >= 60 ? "bg-yellow-300/70" :
                            "bg-red-700/80"
                          }`}
                      />
                      <p className="text-sm text-gray-300">
                        {auditScore >= 80
                          ? "This contract appears to be relatively secure with minor issues."
                          : auditScore >= 60
                            ? "This contract has security concerns that should be addressed."
                            : "This contract has critical vulnerabilities that must be fixed."}
                      </p>
                    </div>

                    {/* Vulnerabilities Section */}
                    <div>
                      <h3 className="font-medium mb-4 text-white">Vulnerabilities Found ({vulnerabilities.length})</h3>
                      {vulnerabilities.length > 0 ? (
                        <div className="space-y-4">
                          {vulnerabilities.map((item) => (
                            <div
                              key={item.id}
                              className="border border-white/10 rounded-lg overflow-hidden bg-white/5 backdrop-blur-md"
                            >
                              <div className="p-4">
                                <div className="flex justify-between items-start mb-2">
                                  <div className="flex items-center gap-2">
                                    {item.severity === "critical" && <AlertTriangle className="h-5 w-5 text-red-400" />}
                                    {item.severity === "high" && <AlertCircle className="h-5 w-5 text-orange-400" />}
                                    {item.severity === "medium" && <AlertCircle className="h-5 w-5 text-yellow-400" />}
                                    {item.severity === "low" && <HelpCircle className="h-5 w-5 text-blue-400" />}
                                    <h4 className="font-medium text-white">{item.name}</h4>
                                  </div>
                                  <div className={`text-xs font-medium px-2 py-1 rounded-full uppercase ${item.severity === "critical" ? "bg-red-400/10 text-red-200" :
                                    item.severity === "high" ? "bg-orange-400/10 text-orange-200" :
                                      item.severity === "medium" ? "bg-yellow-400/10 text-yellow-200" :
                                        "bg-blue-400/10 text-blue-200"
                                    }`}>
                                    {item.severity}
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
                                <div className="mt-2">
                                  <h5 className="text-sm font-medium mb-1 flex items-center gap-1 text-white">
                                    <CheckCircle className="h-4 w-4 text-green-400" /> Recommendation
                                  </h5>
                                  <p className="text-sm text-gray-200">
                                    {item.recommendation}
                                  </p>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center p-6 border border-white/10 rounded-lg bg-white/5 backdrop-blur-md">
                          <CheckCircle className="h-12 w-12 text-green-400 mx-auto mb-3" />
                          <h3 className="font-medium mb-1 text-white">No Vulnerabilities Found</h3>
                          <p className="text-sm text-gray-300">
                            Our audit did not detect any security issues with this contract.
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

                    {/* Investor Impact Summary - NEW */}
                    {investorImpactSummary && (
                      <div className="border border-blue-500/20 rounded-lg p-4 bg-blue-500/5 backdrop-blur-md">
                        <div className="flex items-center gap-2 mb-2">
                          <Shield className="h-5 w-5 text-blue-400" />
                          <h3 className="font-medium text-white">Investor Impact Analysis</h3>
                        </div>
                        <p className="text-sm text-blue-100/90 leading-relaxed font-medium">
                          {investorImpactSummary}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            ) : null}

            {/* Display if audit is in progress */}
            {isLoading && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
              >
                <div className="glass-card h-full flex flex-col justify-center items-center py-12">
                  <div className="text-center p-6">
                    <div className="relative h-16 w-16 mx-auto mb-6">
                      <div className="absolute inset-0 rounded-full border-4 border-blue-400/20 border-t-blue-400 animate-spin" />
                      <Shield className="h-8 w-8 text-blue-400 absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2" />
                    </div>
                    <h3 className="text-xl font-medium mb-2 text-gray-100">Analyzing Smart Contract</h3>
                    <p className="text-gray-300 max-w-md">
                      Our AI is scanning the contract for vulnerabilities, backdoors, and security issues...
                    </p>
                  </div>
                </div>
              </motion.div>
            )}
          </div>
        </div>
      </DashboardLayout>
    </PageTransition>
  );
};

export default Audit;
