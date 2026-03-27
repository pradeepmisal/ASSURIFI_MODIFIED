import { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Activity, ShieldAlert, Cpu, CheckCircle, Search, AlertTriangle, FileText } from "lucide-react";

// Assuming standard API URL, change if different.
const API_BASE_URL = "http://localhost:3002";

// --- Types ---
type AgentStatus = 'WAITING' | 'RUNNING' | 'COMPLETED' | 'FAILED' | 'REQUERY';
type LogEntry = { id: number; timestamp: string; message: string; type: 'info' | 'success' | 'warn' | 'error' };

const UnifiedAnalysis = () => {
    // --- State ---
    const [query, setQuery] = useState("");
    const [isAnalyzing, setIsAnalyzing] = useState(false);

    // UI tracking
    const [logs, setLogs] = useState<LogEntry[]>([]);
    const [agentStatus, setAgentStatus] = useState<Record<string, AgentStatus>>({
        contractAuditor: 'WAITING',
        riskAssessor: 'WAITING',
        sentimentAnalyst: 'WAITING'
    });
    const [finalReport, setFinalReport] = useState<any>(null);

    // Refs
    const logsEndRef = useRef<HTMLDivElement>(null);
    const eventSourceRef = useRef<EventSource | null>(null);

    // Auto-scroll terminal
    useEffect(() => {
        logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [logs]);

    // Cleanup SSE on unmount
    useEffect(() => {
        return () => {
            if (eventSourceRef.current) {
                eventSourceRef.current.close();
            }
        };
    }, []);

    // --- Helpers ---
    const addLog = (message: string, type: LogEntry['type'] = 'info') => {
        setLogs(prev => [...prev, {
            id: Date.now() + Math.random(),
            timestamp: new Date().toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' }),
            message,
            type
        }]);
    };

    const handleAnalyze = () => {
        if (!query.trim()) return;

        // Reset UI
        setLogs([]);
        setFinalReport(null);
        setAgentStatus({
            contractAuditor: 'WAITING',
            riskAssessor: 'WAITING',
            sentimentAnalyst: 'WAITING'
        });
        setIsAnalyzing(true);
        addLog(`Initiating Autonomous Supervisor for: ${query.toUpperCase()}`, 'info');

        // Close any existing connection
        if (eventSourceRef.current) {
            eventSourceRef.current.close();
        }

        // Connect to SSE Endpoint
        const sseUrl = `${API_BASE_URL}/full-analysis/stream?token=${encodeURIComponent(query)}`;
        const es = new EventSource(sseUrl);
        eventSourceRef.current = es;

        // --- Event Listeners ---

        es.addEventListener('supervisor_plan', (e) => {
            const data = JSON.parse(e.data);
            if (data.status === 'analyzing') {
                addLog('Supervisor planning execution...', 'info');
            } else if (data.status === 'planned') {
                addLog(`Executing agents: ${data.agents.join(', ')}`, 'info');
            }
        });

        es.addEventListener('agent_started', (e) => {
            const data = JSON.parse(e.data);
            addLog(`[${data.agent}] Started analysis...`, 'info');
            setAgentStatus(prev => ({ ...prev, [data.agent]: 'RUNNING' }));
        });

        es.addEventListener('agent_completed', (e) => {
            const data = JSON.parse(e.data);
            addLog(`[${data.agent}] Completed in ${data.latency}ms`, 'success');
            setAgentStatus(prev => ({ ...prev, [data.agent]: 'COMPLETED' }));
        });

        es.addEventListener('agent_failed', (e) => {
            const data = JSON.parse(e.data);
            addLog(`[${data.agent}] Failed: ${data.error}`, 'error');
            setAgentStatus(prev => ({ ...prev, [data.agent]: 'FAILED' }));
        });

        es.addEventListener('conflict_detected', (e) => {
            const data = JSON.parse(e.data);
            addLog(`Conflict detected: ${data.reasons.join(' | ')}`, 'warn');
            if (data.action) {
                addLog(`Supervisor designated resolution: ${data.action.toUpperCase()}`, 'info');
            }
        });

        es.addEventListener('requery_triggered', (e) => {
            const data = JSON.parse(e.data);
            addLog(`[${data.agent}] Supervisor requested RE-QUERY bypass.`, 'warn');
            setAgentStatus(prev => ({ ...prev, [data.agent]: 'REQUERY' }));
        });

        es.addEventListener('memory_lookup', (e) => {
            const data = JSON.parse(e.data);
            if (data.status === 'searching') addLog(`Querying Semantic Vector Memory...`, 'info');
            if (data.status === 'complete') {
                if (data.hits > 0) addLog(`Found ${data.hits} similar historical risk patterns.`, 'success');
                else addLog(`No significant historical pattern matches.`, 'info');
            }
        });

        es.addEventListener('final_synthesis', (e) => {
            const data = JSON.parse(e.data);
            if (data.status === 'started') addLog(`Synthesizing final intelligence report...`, 'info');
            if (data.status === 'retrying_validation') addLog(`Output validation failed. Attempting self-correction loop...`, 'warn');
        });

        es.addEventListener('complete', (e) => {
            const data = JSON.parse(e.data);
            addLog(`Analysis completely successfully.`, 'success');
            setFinalReport(data);
            setIsAnalyzing(false);
            es.close();
        });

        es.addEventListener('error', (e) => {
            // Check if it's a custom server error or network drop
            try {
                const data = JSON.parse(e.data);
                if (data.error) addLog(`Supervisor Error: ${data.error}`, 'error');
            } catch {
                addLog(`Connection to stream lost.`, 'error');
            }
            setIsAnalyzing(false);
            es.close();
        });
    };

    // --- Renders ---

    // Color mapping for Agent Status cards
    const getStatusColor = (status: AgentStatus) => {
        switch (status) {
            case 'WAITING': return 'border-slate-800 bg-slate-900 text-slate-500';
            case 'RUNNING': return 'border-cyan-500/50 bg-cyan-950/20 text-cyan-400 animate-pulse';
            case 'REQUERY': return 'border-orange-500/50 bg-orange-950/20 text-orange-400 animate-pulse';
            case 'COMPLETED': return 'border-emerald-500/50 bg-emerald-950/20 text-emerald-400';
            case 'FAILED': return 'border-rose-500/50 bg-rose-950/20 text-rose-400';
            default: return 'border-slate-800 bg-slate-900';
        }
    };

    return (
        <DashboardLayout title="Universal Scanner" description="Multi-Agent Orchestration Terminal">
            <div className="min-h-screen bg-[#0a0b14] text-slate-200 font-sans p-4 md:p-6 space-y-6">

                {/* 1. Header & Input */}
                <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-slate-900/50 p-4 rounded-xl border border-slate-800 relative z-10">
                    <div className="flex items-center gap-3">
                        <Cpu className="text-indigo-400" />
                        <span className="text-xl font-bold tracking-wider text-indigo-100">AUTONOMOUS SUPERVISOR</span>
                    </div>

                    <div className="relative w-full md:w-[400px] flex gap-2">
                        <div className="relative w-full">
                            <input
                                type="text"
                                placeholder="Enter Token Address or Symbol (e.g. PEPE)"
                                value={query}
                                onChange={(e) => setQuery(e.target.value)}
                                className="w-full bg-slate-950 border border-slate-700 text-indigo-400 rounded px-4 py-2 pl-10 focus:ring-2 focus:ring-indigo-500 outline-none uppercase tracking-wide placeholder:text-slate-600"
                                onKeyDown={(e) => e.key === 'Enter' && handleAnalyze()}
                                disabled={isAnalyzing}
                            />
                            <Search className="absolute left-3 top-2.5 text-slate-500" size={16} />
                        </div>
                        <button
                            onClick={handleAnalyze}
                            disabled={isAnalyzing || !query.trim()}
                            className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white px-6 rounded font-bold uppercase text-sm tracking-wider transition-colors"
                        >
                            {isAnalyzing ? 'Scanning...' : 'Analyze'}
                        </button>
                    </div>
                </div>

                {/* 2. Main Terminal & Agent Status Split */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                    {/* LIVE TERMINAL */}
                    <Card className="lg:col-span-2 bg-slate-950 border-slate-800 h-[400px] flex flex-col overflow-hidden shadow-2xl">
                        <CardHeader className="py-3 px-4 bg-slate-900/80 border-b border-slate-800 flex justify-between flex-row items-center">
                            <CardTitle className="text-xs text-slate-500 font-mono tracking-widest uppercase flex items-center gap-2">
                                <Activity size={14} className={isAnalyzing ? "text-indigo-400 animate-pulse" : "text-slate-600"} />
                                Execution Streaming Log
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="flex-1 overflow-y-auto p-4 font-mono text-sm custom-scrollbar space-y-2">
                            {logs.length === 0 && <span className="text-slate-700">Awaiting input...</span>}
                            {logs.map(log => (
                                <div key={log.id} className="flex gap-3">
                                    <span className="text-slate-600 shrink-0">[{log.timestamp}]</span>
                                    <span className={`
                                        ${log.type === 'info' ? 'text-slate-300' : ''}
                                        ${log.type === 'success' ? 'text-emerald-400' : ''}
                                        ${log.type === 'warn' ? 'text-amber-400' : ''}
                                        ${log.type === 'error' ? 'text-rose-400' : ''}
                                    `}>
                                        {log.message}
                                    </span>
                                </div>
                            ))}
                            <div ref={logsEndRef} />
                        </CardContent>
                    </Card>

                    {/* AGENT NODES */}
                    <div className="lg:col-span-1 space-y-4 flex flex-col justify-center">
                        <div className={`p-4 rounded-xl border-2 transition-all duration-500 flex items-center gap-4 ${getStatusColor(agentStatus.contractAuditor)}`}>
                            <FileText size={24} />
                            <div>
                                <h3 className="font-bold tracking-wide uppercase text-sm">Contract Auditor</h3>
                                <p className="text-xs opacity-70">{agentStatus.contractAuditor}</p>
                            </div>
                        </div>

                        <div className={`p-4 rounded-xl border-2 transition-all duration-500 flex items-center gap-4 ${getStatusColor(agentStatus.riskAssessor)}`}>
                            <AlertTriangle size={24} />
                            <div>
                                <h3 className="font-bold tracking-wide uppercase text-sm">Risk Assessor</h3>
                                <p className="text-xs opacity-70">{agentStatus.riskAssessor}</p>
                            </div>
                        </div>

                        <div className={`p-4 rounded-xl border-2 transition-all duration-500 flex items-center gap-4 ${getStatusColor(agentStatus.sentimentAnalyst)}`}>
                            <Activity size={24} />
                            <div>
                                <h3 className="font-bold tracking-wide uppercase text-sm">Sentiment Analyst</h3>
                                <p className="text-xs opacity-70">{agentStatus.sentimentAnalyst}</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* 3. FINAL SYNTHESIS REPORT (Fades in when complete) */}
                {finalReport && (
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="pt-6">
                        <Card className="bg-slate-900 border-slate-700 shadow-2xl overflow-hidden relative">
                            {/* Decorative header stripe */}
                            <div className={`absolute top-0 left-0 right-0 h-1 
                                ${finalReport.overallRating === 'SAFE' ? 'bg-emerald-500' :
                                    finalReport.overallRating === 'CAUTION' ? 'bg-yellow-500' :
                                        finalReport.overallRating === 'HIGH_RISK' ? 'bg-orange-500' : 'bg-rose-500'}`}
                            />

                            <CardHeader className="pb-2 pt-6">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <CardTitle className="text-2xl font-bold flex items-center gap-2">
                                            <ShieldAlert className={
                                                finalReport.overallRating === 'SAFE' ? 'text-emerald-500' :
                                                    finalReport.overallRating === 'CAUTION' ? 'text-yellow-500' :
                                                        finalReport.overallRating === 'HIGH_RISK' ? 'text-orange-500' : 'text-rose-500'
                                            } />
                                            Supervisor Intelligence Report
                                        </CardTitle>
                                        <p className="text-slate-400 mt-1">
                                            Analyzed by {finalReport._meta.agentsExecuted} agents over {finalReport._meta.supervisorLoops} loops.
                                        </p>
                                    </div>
                                    <div className="text-right">
                                        <div className="text-4xl font-black">{finalReport.overallRisk}<span className="text-lg text-slate-500">/100</span></div>
                                        <div className="text-xs font-bold uppercase tracking-widest text-slate-400 mt-1">Risk Score</div>
                                    </div>
                                </div>
                            </CardHeader>

                            <CardContent className="space-y-6 pt-4">
                                <div>
                                    <h3 className="text-sm uppercase tracking-widest text-indigo-400 font-bold mb-3 border-b border-slate-800 pb-2">Key Findings</h3>
                                    <ul className="space-y-2">
                                        {finalReport.keyFindings.map((finding: string, i: number) => (
                                            <li key={i} className="flex gap-2 text-slate-300">
                                                <CheckCircle className="shrink-0 max-w-5 h-5 text-indigo-500/50" />
                                                <span className="leading-relaxed">{finding}</span>
                                            </li>
                                        ))}
                                    </ul>
                                </div>

                                {finalReport.conflictsDetected.length > 0 && (
                                    <div className="bg-orange-950/20 border border-orange-500/20 p-4 rounded-lg">
                                        <h3 className="text-sm uppercase tracking-widest text-orange-400 font-bold mb-2 flex items-center gap-2">
                                            <AlertTriangle size={16} /> Conflicts Handled By Supervisor
                                        </h3>
                                        <ul className="list-disc pl-5 space-y-1 text-sm text-slate-300">
                                            {finalReport.conflictsDetected.map((c: string, i: number) => <li key={i}>{c}</li>)}
                                        </ul>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </motion.div>
                )}

            </div>
        </DashboardLayout>
    );
};

export default UnifiedAnalysis;
