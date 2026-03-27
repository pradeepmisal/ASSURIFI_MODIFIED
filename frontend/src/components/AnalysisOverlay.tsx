import React, { useState, useEffect, useRef } from 'react';
import {
    X, Shield, FileSearch, MessageSquare, AlertTriangle, CheckCircle2,
    Activity, ArrowRight, BrainCircuit, ShieldAlert, BadgeCheck, ChevronDown, ChevronUp
} from 'lucide-react';
import { Button } from './ui/button';
import { useNavigate } from 'react-router-dom';

// --- Types ---
interface AnalysisOverlayProps {
    token: string | null;
    onClose: () => void;
}

interface EventLog {
    id: string;
    type: string;
    message: string;
    timestamp: string;
    status: 'info' | 'success' | 'warning' | 'error';
}

interface AgentState {
    status: 'waiting' | 'running' | 'completed' | 'failed' | 'requery';
    confidence?: number;
    verdict?: string;
    verdict?: string;
    summary?: string;
    raw?: any;
}

interface FinalSynthesis {
    overallRiskScore: number;
    securityLabel: string;
    keyFindings: string[];
}

export const AnalysisOverlay: React.FC<AnalysisOverlayProps> = ({ token, onClose }) => {
    const [logs, setLogs] = useState<EventLog[]>([]);
    const [agents, setAgents] = useState<{
        contractAuditor: AgentState;
        riskAssessor: AgentState;
        sentimentAnalyst: AgentState;
    }>({
        contractAuditor: { status: 'waiting' },
        riskAssessor: { status: 'waiting' },
        sentimentAnalyst: { status: 'waiting' }
    });
    const [synthesis, setSynthesis] = useState<FinalSynthesis | null>(null);
    const [streamError, setStreamError] = useState<string | null>(null);
    const [expandedAgent, setExpandedAgent] = useState<string | null>(null);
    const navigate = useNavigate();

    const endOfLogsRef = useRef<HTMLDivElement>(null);

    // Auto-scroll timeline
    useEffect(() => {
        endOfLogsRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [logs]);

    // Handle SSE connection
    useEffect(() => {
        if (!token) return;

        // Reset state
        setLogs([]);
        setSynthesis(null);
        setStreamError(null);
        setAgents({
            contractAuditor: { status: 'waiting' },
            riskAssessor: { status: 'waiting' },
            sentimentAnalyst: { status: 'waiting' }
        });

        const addLog = (message: string, status: EventLog['status'] = 'info', type = 'system') => {
            setLogs(prev => [...prev, {
                id: Math.random().toString(36).substring(7),
                message,
                status,
                type,
                timestamp: new Date().toLocaleTimeString([], { hour12: false })
            }]);
        };

        addLog(`Initiating autonomous scan for ${token}...`);

        // Wire up SSE
        const eventSource = new EventSource(`http://localhost:3002/full-analysis/stream?token=${encodeURIComponent(token)}`);

        eventSource.addEventListener('supervisor_plan', (e) => {
            const data = JSON.parse(e.data);
            if (data.status === 'planned') {
                addLog(`Supervisor plan created. Targeted agents: ${data.agents.join(', ')}`, 'info', 'planning');
            }
        });

        eventSource.addEventListener('agent_started', (e) => {
            const { agent } = JSON.parse(e.data);
            addLog(`[${agent}] spinning up...`, 'info', agent);
            setAgents(prev => ({ ...prev, [agent]: { ...prev[agent as keyof typeof prev], status: 'running' } }));
        });

        eventSource.addEventListener('agent_completed', (e) => {
            const { agent } = JSON.parse(e.data);
            addLog(`[${agent}] completed successfully.`, 'success', agent);
            setAgents(prev => ({ ...prev, [agent]: { ...prev[agent as keyof typeof prev], status: 'completed' } }));
        });

        eventSource.addEventListener('agent_failed', (e) => {
            const { agent, error } = JSON.parse(e.data);
            addLog(`[${agent}] failed: ${error}`, 'error', agent);
            setAgents(prev => ({ ...prev, [agent]: { ...prev[agent as keyof typeof prev], status: 'failed', verdict: 'Analysis Failed' } }));
        });

        eventSource.addEventListener('conflict_detected', (e) => {
            const { reasons } = JSON.parse(e.data);
            addLog(`Conflict detected between agents: ${reasons[0]}`, 'warning', 'supervisor');
        });

        eventSource.addEventListener('memory_lookup', (e) => {
            const data = JSON.parse(e.data);
            if (data.status === 'complete') {
                addLog(`Queried vector memory. Found ${data.hits} similar historic risk patterns.`, 'info', 'memory');
            }
        });

        eventSource.addEventListener('complete', (e) => {
            const finalReport = JSON.parse(e.data);
            addLog(`Final synthesis complete. Verdict: ${finalReport.securityLabel}`, 'success', 'supervisor');

            setSynthesis({
                overallRiskScore: finalReport.overallRiskScore,
                securityLabel: finalReport.securityLabel,
                keyFindings: finalReport.keyFindings
            });

            // Update agent cards with findings or failures
            if (finalReport.agentBreakdown) {
                setAgents(prev => {
                    const updated = { ...prev };
                    Object.keys(updated).forEach(key => {
                        const data = finalReport.agentBreakdown[key];
                        if (data) {
                            if (data.error) {
                                updated[key as keyof typeof updated] = {
                                    status: 'failed',
                                    verdict: 'Analysis failed (API/Timeout)',
                                };
                            } else {
                                updated[key as keyof typeof updated] = {
                                    status: 'completed',
                                    confidence: data.confidenceScore,
                                    verdict: data.summary?.substring(0, 50) + '...',
                                    summary: data.summary,
                                    raw: data
                                };
                            }
                        }
                    });
                    return updated;
                });
            }

            eventSource.close();
        });

        eventSource.onerror = () => {
            setStreamError("Connection to intelligence network lost.");
            addLog("SSE Connection failed.", 'error');
            eventSource.close();
        };

        return () => {
            eventSource.close();
        };
    }, [token]);

    if (!token) return null;

    // --- Render Helpers ---

    const getAgentIcon = (agentKey: string) => {
        switch (agentKey) {
            case 'contractAuditor': return <FileSearch className="h-5 w-5" />;
            case 'riskAssessor': return <Activity className="h-5 w-5" />;
            case 'sentimentAnalyst': return <MessageSquare className="h-5 w-5" />;
            default: return <BrainCircuit className="h-5 w-5" />;
        }
    };

    const getAgentTitle = (agentKey: string) => {
        switch (agentKey) {
            case 'contractAuditor': return 'Contract Auditor';
            case 'riskAssessor': return 'Risk Assessor';
            case 'sentimentAnalyst': return 'Sentiment Analyst';
            default: return 'Agent';
        }
    };

    const getConfidenceColor = (score?: number) => {
        if (!score) return 'bg-slate-700';
        if (score >= 0.85) return 'bg-green-500';
        if (score >= 0.60) return 'bg-amber-500';
        return 'bg-red-500';
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-300">
            <div className="bg-slate-900 border border-slate-700 w-full max-w-6xl h-[90vh] rounded-2xl shadow-2xl overflow-hidden flex flex-col relative">

                {/* Header */}
                <div className="flex justify-between items-center p-6 border-b border-slate-800 bg-slate-900/50">
                    <div>
                        <h2 className="text-2xl font-bold text-white flex items-center gap-3">
                            <BrainCircuit className="h-6 w-6 text-blue-400" />
                            Autonomous Analysis: {token}
                        </h2>
                        <p className="text-slate-400 text-sm mt-1">Supervisor Orchestrator actively streaming insights</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 rounded-full hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
                    >
                        <X className="h-6 w-6" />
                    </button>
                </div>

                {/* Two-Column Body */}
                <div className="flex-1 flex flex-col md:flex-row overflow-hidden">

                    {/* LEFT COLUMN: Live Timeline (40%) */}
                    <div className="w-full md:w-2/5 border-r border-slate-800 flex flex-col bg-slate-900/30">
                        <div className="p-4 border-b border-slate-800 bg-slate-800/30">
                            <h3 className="font-semibold text-sm text-slate-300 uppercase tracking-widest flex items-center gap-2">
                                <Activity className="h-4 w-4" /> Live Reasoning Log
                            </h3>
                        </div>

                        <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
                            {logs.map((log) => (
                                <div key={log.id} className="flex gap-3 animate-in slide-in-from-left-2 duration-300">
                                    <div className="text-xs text-slate-500 font-mono mt-0.5 whitespace-nowrap">
                                        [{log.timestamp}]
                                    </div>
                                    <div className="flex-1">
                                        <p className={`text-sm ${log.status === 'error' ? 'text-red-400' :
                                            log.status === 'success' ? 'text-green-400' :
                                                log.status === 'warning' ? 'text-amber-400' :
                                                    'text-slate-300'
                                            }`}>
                                            {log.message}
                                        </p>
                                    </div>
                                </div>
                            ))}
                            <div ref={endOfLogsRef} />

                            {!synthesis && !streamError && (
                                <div className="flex items-center gap-2 text-blue-400/70 text-sm font-mono mt-4">
                                    <span className="relative flex h-2 w-2">
                                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                                        <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
                                    </span>
                                    Awaiting next signal...
                                </div>
                            )}
                        </div>
                    </div>

                    {/* RIGHT COLUMN: Agent Cards & Final Verdict (60%) */}
                    <div className="w-full md:w-3/5 flex flex-col overflow-y-auto bg-slate-900 p-6 pb-24 custom-scrollbar min-h-0">

                        <div className="flex items-center justify-between mb-4 shrink-0">
                            <h3 className="font-semibold text-lg text-white">Agent Network Status</h3>
                            {Object.values(agents).some(a => a.status === 'running') && (
                                <div className="flex items-center gap-2 text-xs font-mono text-blue-400 bg-blue-500/10 px-3 py-1.5 rounded-full border border-blue-500/20 animate-pulse">
                                    <Activity className="h-3 w-3" />
                                    Active Communications
                                </div>
                            )}
                        </div>

                        {/* Animated Communication Visualization */}
                        {Object.values(agents).some(a => a.status === 'running') && (
                            <div className="w-full h-12 mb-4 relative flex items-center justify-around px-8 shrink-0 overflow-hidden rounded-lg bg-slate-800/30 border border-slate-700/50">
                                {/* Supervisor Node */}
                                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-blue-600/20 p-2 rounded-full z-10">
                                    <BrainCircuit className="h-5 w-5 text-blue-400" />
                                </div>
                                {/* Data Streams */}
                                <div className="absolute inset-0 w-full h-full opacity-30 flex">
                                    <div className={`flex-1 h-full bg-gradient-to-r from-transparent via-blue-500 to-transparent ${agents.contractAuditor.status === 'running' ? 'animate-[slide-right_2s_linear_infinite]' : 'hidden'}`}></div>
                                    <div className={`flex-1 h-full bg-gradient-to-l from-transparent via-blue-500 to-transparent ${agents.sentimentAnalyst.status === 'running' ? 'animate-[slide-left_2s_linear_infinite]' : 'hidden'}`}></div>
                                </div>
                                <style>{`
                                    @keyframes slide-right { 0% { transform: translateX(-100%); } 100% { transform: translateX(100%); } }
                                    @keyframes slide-left { 0% { transform: translateX(100%); } 100% { transform: translateX(-100%); } }
                                `}</style>
                            </div>
                        )}

                        {/* 3 Agent Cards */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8 shrink-0">
                            {Object.entries(agents).map(([key, state]) => (
                                <div
                                    key={key}
                                    onClick={() => {
                                        if (state.status === 'completed') {
                                            const routeMap: Record<string, string> = {
                                                contractAuditor: '/audit',
                                                riskAssessor: '/monitor',
                                                sentimentAnalyst: '/sentiment-analysis'
                                            };
                                            navigate(routeMap[key], {
                                                state: {
                                                    token,
                                                    agentData: state.raw
                                                }
                                            });
                                            onClose();
                                        } else {
                                            setExpandedAgent(expandedAgent === key ? null : key);
                                        }
                                    }}
                                    className={`border rounded-xl p-4 bg-slate-800/50 transition-all duration-300 cursor-pointer overflow-hidden ${state.status === 'running' ? 'border-blue-500/50 shadow-[0_0_15px_rgba(59,130,246,0.1)] hover:border-blue-400' :
                                        state.status === 'completed' ? 'border-blue-500/30 bg-blue-900/10 hover:bg-blue-900/20 hover:border-blue-500/60' :
                                            state.status === 'failed' ? 'border-red-500/30 hover:border-red-500/50' :
                                                'border-slate-800 opacity-50'
                                        }`}>
                                    <div className="flex items-center justify-between mb-3">
                                        <div className="flex items-center gap-2">
                                            <div className={`p-1.5 rounded-md ${state.status === 'completed' ? 'bg-blue-500/10 text-blue-400' : 'bg-slate-700 text-slate-400'}`}>
                                                {getAgentIcon(key)}
                                            </div>
                                            <span className="font-medium text-sm text-slate-200">{getAgentTitle(key)}</span>
                                        </div>
                                        {/* Status Indicator */}
                                        <div className="flex items-center gap-1">
                                            {state.status === 'running' && <Activity className="h-4 w-4 text-blue-400 animate-pulse" />}
                                            {state.status === 'completed' && <CheckCircle2 className="h-4 w-4 text-green-400" />}
                                            {state.status === 'failed' && <AlertTriangle className="h-4 w-4 text-red-400" />}
                                        </div>
                                    </div>

                                    {/* Confidence Bar */}
                                    <div className="mb-2">
                                        <div className="flex justify-between text-xs text-slate-400 mb-1">
                                            <span>Confidence</span>
                                            <span>{state.confidence ? `${(state.confidence * 100).toFixed(0)}%` : '--'}</span>
                                        </div>
                                        <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                                            <div
                                                className={`h-full transition-all duration-1000 ${getConfidenceColor(state.confidence)}`}
                                                style={{ width: `${(state.confidence || 0) * 100}%` }}
                                            ></div>
                                        </div>
                                    </div>

                                    <div className={`text-xs text-slate-400 mt-2 transition-all duration-300 ${expandedAgent === key ? 'line-clamp-none mb-2' : 'line-clamp-2 h-8'}`}>
                                        {state.verdict || (state.status === 'running' ? 'Analyzing patterns...' : 'Waiting for orchestration...')}
                                    </div>

                                    {/* Expandable Content for Deep Dive */}
                                    <div className={`grid transition-all duration-300 ease-in-out ${expandedAgent === key ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}`}>
                                        <div className="overflow-hidden">
                                            <div className="pt-3 mt-1 border-t border-slate-700">
                                                <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">Detailed Analysis Log</h4>
                                                <div className="text-xs text-slate-300 whitespace-pre-wrap leading-relaxed font-mono bg-slate-900/50 p-2 rounded border border-slate-800">
                                                    {state.summary || "No raw data output from this node yet."}
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Expand/Collapse Chevron Indicator */}
                                    <div className="w-full flex justify-center mt-1 text-slate-600">
                                        {expandedAgent === key ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Final Verdict Panel */}
                        <div className={`mt-auto shrink-0 border rounded-xl overflow-hidden transition-all duration-700 ${synthesis ? 'border-blue-500/30 bg-blue-500/5 shadow-2xl opacity-100 translate-y-0' : 'opacity-0 translate-y-8 pointer-events-none'
                            }`}>
                            <div className="p-6">
                                <div className="flex items-start justify-between mb-6">
                                    <div>
                                        <h3 className="text-xl font-bold text-white mb-2 flex items-center gap-2">
                                            <BadgeCheck className="h-6 w-6 text-blue-400" />
                                            Supervisor Verdict
                                        </h3>
                                        <p className="text-slate-400 text-sm">Synthesized from 3 independent agent nodes</p>
                                    </div>

                                    {/* Risk Score Circle */}
                                    <div className="flex flex-col items-center">
                                        <div className={`h-16 w-16 rounded-full flex items-center justify-center border-4 font-bold text-xl ${(synthesis?.overallRiskScore || 0) < 40 ? 'border-green-500 text-green-500' :
                                            (synthesis?.overallRiskScore || 0) < 70 ? 'border-amber-500 text-amber-500' :
                                                'border-red-500 text-red-500'
                                            }`}>
                                            {synthesis?.overallRiskScore || 0}
                                        </div>
                                        <span className="text-xs font-semibold uppercase tracking-wider mt-2 text-slate-300">
                                            {synthesis?.securityLabel}
                                        </span>
                                    </div>
                                </div>

                                {/* Key Findings */}
                                <div className="bg-slate-900/60 rounded-lg p-4 mb-6">
                                    <h4 className="text-sm font-semibold text-slate-300 mb-3 uppercase tracking-wider">Key Intelligence Drivers</h4>
                                    <ul className="space-y-2">
                                        {synthesis?.keyFindings.map((finding, idx) => (
                                            <li key={idx} className="text-sm text-slate-300 flex items-start gap-2">
                                                <ArrowRight className="h-4 w-4 text-blue-400 shrink-0 mt-0.5" />
                                                <span>{finding}</span>
                                            </li>
                                        ))}
                                    </ul>
                                </div>

                                <div className="flex justify-end mt-4 shrink-0">
                                    <Button
                                        onClick={() => navigate(`/report/${token}`)}
                                        className="bg-blue-600 hover:bg-blue-500 text-white rounded-lg px-6 flex items-center gap-2"
                                    >
                                        Open Full Platform Report <ArrowRight className="h-4 w-4" />
                                    </Button>
                                </div>
                            </div>
                        </div>

                        {streamError && (
                            <div className="mt-4 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 flex items-center gap-3">
                                <ShieldAlert className="h-5 w-5" />
                                <span className="text-sm">{streamError}</span>
                            </div>
                        )}

                    </div>
                </div>
            </div>
        </div>
    );
};
