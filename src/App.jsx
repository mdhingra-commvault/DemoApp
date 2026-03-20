import React, { useState, useMemo, useEffect } from 'react';
import {
  Shield,
  ChevronRight,
  AlertTriangle,
  CheckCircle2,
  BarChart3,
  LayoutDashboard,
  Target,
  FileText,
  Table as TableIcon,
  Sparkles,
  Loader2,
  BrainCircuit,
  Layers,
  Wrench,
  Database,
  ShieldCheck,
  Activity,
  Zap,
  Sun,
  Moon,
  CalendarCheck,
  Circle,
  CheckCircle,
  Plus,
  Trash2,
  History
} from 'lucide-react';
import { useTheme } from './hooks/useTheme';
import commvaultLogo from './assets/CommvaultHorizontal.svg';
import { 
  Radar, 
  RadarChart, 
  PolarGrid, 
  PolarAngleAxis, 
  PolarRadiusAxis, 
  ResponsiveContainer
} from 'recharts';

// --- Constants & Data ---
const apiKey = ""; // Provided at runtime

/**
 * REFACTORED DATA STRUCTURE: Grouped by Layer as per ar.csv requirements.
 * Ordering: Control Plane, Data Plane, Data Policy, Operations, Response.
 */
const LAYERS_CONFIG = [
  {
    id: 'CP',
    name: "Control Plane",
    color: '#6366f1',
    icon: Shield,
    objective: "Protect the management, orchestration, and administration layer of the resilience environment.",
    parameters: [
      { phase: "Identify", name: "CP-Control via isolated Admin Creds/no-root, zero-trust profile, PAM/PIM break-glass with MPA ", rec: "Remove root logins, enhance break-glass with PAM/PIM" },
      { phase: "Protect", name: "Control Plane (CS) runs on private, dedicated host, with geo-copy and isolated network with secure tunnels (HTTPS)", rec: "CS should run on private, dedicated compute - avoid shared clusters and ensure smart, isolated network " },
      { phase: "Detect", name: "CP-Enforce security complexity/rotation,lockout, install authorization", rec: "Follow security posture recommendations in Security IQ" },
      { phase: "Respond", name: "Control Plane (CS) - automated responses to security events (SOAR)", rec: "Integrate with SIEM/SOAR to automate response playbooks for common attack vectors like Ransomware" }
    ]
  },
  {
    id: 'DP',
    name: "Data Plane",
    color: '#0ea5e9',
    icon: Database,
    objective: "Secure the data movement, storage assets, and network pathways used for backup and recovery.",
    parameters: [
      { phase: "Protect", name: "Data Plane (MA) - Secure Air Gap and Network Isolation", rec: "Implement segmented HTTPS tunnels and VLAN air-gap elements for data movement." },
      { phase: "Detect", name: "Data Plane - Anomaly Detection & Threat Hunting", rec: "Use ML-based detection to identify abnormal data growth or deletion rates." }
    ]
  },
  {
    id: 'DPol',
    name: "Data Policy",
    color: '#10b981',
    icon: ShieldCheck,
    objective: "Enforce immutability, retention rules, and compliance standards across all data copies.",
    parameters: [
      { phase: "Protect", name: "Data Policy - Immutable Copies & Retention Lock", rec: "Enforce WORM policies and multi-user authorization for deletion." },
      { phase: "Detect", name: "Data Policy - Content Indexing & Compliance Scanning", rec: "Perform automated baseline auditing against hardening and data compliance standards." }
    ]
  },
  {
    id: 'Ops',
    name: "Operations",
    color: '#f59e0b',
    icon: Activity,
    objective: "Manage on-going maintenance, testing, and proactive readiness reporting.",
    parameters: [
      { phase: "Respond", name: "Recovery Testing - automated schedule policy - connection with SOAR/SIEM", rec: "Using scheduled validation and recovery tests - with alerting to SOAR/SIEM " },
      { phase: "Recover", name: "## Recovery Readiness / Copy posture scores ## trending --- coupled with Runbooks", rec: "Assess RTO monthly with action response plans for issues exposed in readiness reports." }
    ]
  },
  {
    id: 'Res',
    name: "Response",
    color: '#ef4444',
    icon: Zap,
    objective: "Establish the framework for communications, RACI, and business impact decisions.",
    parameters: [
      { phase: "Identify", name: "Decision / RACI for recovery - communciations plan", rec: "Establish common classes and business impact assessment criteria to align objectives and plan types " }
    ]
  }
];

const RISK_LEVELS = [
  { label: 'Low Risk', score: 3, color: '#10b981', definition: 'Controls are fully optimized, documented, and automated.' },
  { label: 'Medium Risk', score: 2, color: '#84cc16', definition: 'Standard controls are in place but lack full automation.' },
  { label: 'High Risk', score: 1, color: '#f97316', definition: 'Controls are manual, incomplete, or inconsistently applied.' },
  { label: 'Critical Risk', score: 0, color: '#ef4444', definition: 'No formalized controls exist; high operational exposure.' }
];

const LAYER_ORDER = ["Control Plane", "Data Plane", "Data Policy", "Operations", "Response"];

const INITIAL_DATA = {
  'Control Plane': { score: 1 },
  'Data Plane': { score: 1 },
  'Data Policy': { score: 1 },
  'Operations': { score: 1 },
  'Response': { score: 1 }
};

const callGemini = async (prompt, systemInstruction = "") => {
  let delay = 1000;
  for (let i = 0; i < 5; i++) {
    try {
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${apiKey}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          systemInstruction: { parts: [{ text: systemInstruction }] }
        })
      });
      if (!response.ok) throw new Error("API call failed");
      const data = await response.json();
      return data.candidates?.[0]?.content?.parts?.[0]?.text || "No insights found.";
    } catch (error) {
      if (i === 4) throw error;
      await new Promise(resolve => setTimeout(resolve, delay));
      delay *= 2;
    }
  }
};

const App = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [assessmentData, setAssessmentData] = useState(INITIAL_DATA);
  const [mitigationAdvice, setMitigationAdvice] = useState({});
  const [loadingAdvice, setLoadingAdvice] = useState(null);
  const { theme, toggleTheme } = useTheme();
  const [manualTasks, setManualTasks] = useState([]);
  const [isAddingTask, setIsAddingTask] = useState(false);
  const [newTask, setNewTask] = useState({ parameter: '', recommendation: '', layer: 'Control Plane', monthOffset: 0 });

  useEffect(() => {
    const savedTasks = localStorage.getItem('ar_manual_tasks_v1');
    if (savedTasks) setManualTasks(JSON.parse(savedTasks));
  }, []);

  const addTask = (e) => {
    e.preventDefault();
    if (!newTask.parameter) return;
    const task = { ...newTask, id: crypto.randomUUID(), status: 'pending', createdAt: new Date().toISOString() };
    const updated = [...manualTasks, task];
    setManualTasks(updated);
    localStorage.setItem('ar_manual_tasks_v1', JSON.stringify(updated));
    setNewTask({ parameter: '', recommendation: '', layer: 'Control Plane', monthOffset: 0 });
    setIsAddingTask(false);
  };

  const updateTaskStatus = (id, status) => {
    const updated = manualTasks.map(t => t.id === id ? { ...t, status } : t);
    setManualTasks(updated);
    localStorage.setItem('ar_manual_tasks_v1', JSON.stringify(updated));
  };

  const deleteTask = (id) => {
    const updated = manualTasks.filter(t => t.id !== id);
    setManualTasks(updated);
    localStorage.setItem('ar_manual_tasks_v1', JSON.stringify(updated));
  };

  const getMonthLabel = (offset) => {
    const d = new Date();
    d.setMonth(d.getMonth() + offset);
    return d.toLocaleString('default', { month: 'long', year: 'numeric' });
  };

  const aggregateScore = useMemo(() => {
    const total = Object.values(assessmentData).reduce((acc, curr) => acc + curr.score, 0);
    return ((total / (LAYERS_CONFIG.length * 3)) * 100).toFixed(1);
  }, [assessmentData]);

  const chartData = useMemo(() => {
    return LAYERS_CONFIG.map(layer => ({
      subject: layer.name,
      score: (assessmentData[layer.name].score / 3) * 100,
      fullMark: 100,
      raw: assessmentData[layer.name].score,
      color: layer.color
    }));
  }, [assessmentData]);

  const highPriorityLayers = useMemo(() => {
    return LAYERS_CONFIG.filter(l => assessmentData[l.name].score <= 1)
      .sort((a, b) => assessmentData[a.name].score - assessmentData[b.name].score);
  }, [assessmentData]);

  const handleScoreChange = (layerName, score) => {
    setAssessmentData(prev => ({ ...prev, [layerName]: { score } }));
  };

  const getMitigationGuide = async (layer) => {
    setLoadingAdvice(layer.id);
    const params = layer.parameters.map(p => `Parameter: ${p.name}, Recommended: ${p.rec}`).join('\n');
    const prompt = `Layer: ${layer.name}. Current Risk: ${assessmentData[layer.name].score === 0 ? 'CRITICAL' : 'HIGH'}. 
    Based on the following parameters and recommendations from the AR Matrix:
    ${params}
    
    Provide a concise, 3-step technical implementation guide to move this layer to a 'Low Risk' state.`;
    
    try {
      const result = await callGemini(prompt, "You are a Cyber Resilience Implementation Engineer. Provide short, bulleted technical steps.");
      setMitigationAdvice(prev => ({ ...prev, [layer.id]: result }));
    } catch (e) {
      setMitigationAdvice(prev => ({ ...prev, [layer.id]: "Error generating guide." }));
    } finally {
      setLoadingAdvice(null);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans">
      <nav className="sticky top-0 z-50 bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-3">
          <img src={commvaultLogo} alt="Commvault" className="commvault-logo h-8" />
          <div className="w-px h-6 bg-slate-300" />
          <div className="flex flex-col leading-tight">
            <span className="text-md font-semibold text-indigo-600 mt-1 tracking-wide">Active Resilience</span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex bg-slate-100 p-1 rounded-xl">
            <button onClick={() => setActiveTab('dashboard')} className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${activeTab === 'dashboard' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-500'}`}>
              <LayoutDashboard size={16} /> Dashboard
            </button>
            <button onClick={() => setActiveTab('assessment')} className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${activeTab === 'assessment' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-500'}`}>
              <BarChart3 size={16} /> Assessment
            </button>
            <button onClick={() => setActiveTab('report')} className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${activeTab === 'report' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-500'}`}>
              <FileText size={16} /> Detailed Report
            </button>
            <button onClick={() => setActiveTab('actionPlan')} className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${activeTab === 'actionPlan' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-500'}`}>
              <CalendarCheck size={16} /> Action Plans
            </button>
          </div>

          <button
            onClick={toggleTheme}
            title={`Switch to ${theme === 'light' ? 'dark' : 'light'} theme`}
            style={{
              background: 'var(--containerBackground)',
              border: '1px solid var(--baseBorderColor)',
              color: 'var(--iconColor)',
            }}
            className="p-2 rounded-lg transition-colors hover:opacity-80"
          >
            {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
          </button>
        </div>
      </nav>

      <main className="p-6 max-w-7xl mx-auto space-y-8">
        {activeTab === 'dashboard' && (
          <div className="space-y-6">
            <div className="text-center">
            </div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-center">
                <span className="text-slate-400 text-[11px] font-bold uppercase block mb-1">Resilience Score</span>
                <div className="text-4xl font-black text-indigo-600">{aggregateScore}%</div>
              </div>
              <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm md:col-span-3">
                <div className="flex items-center justify-between mb-3">
                    <span className="text-slate-400 text-[11px] font-bold uppercase block tracking-wider">Strategic Mitigation View</span>
                    {highPriorityLayers.length > 0 ? (
                        <span className="flex items-center gap-1.5 px-2.5 py-1 bg-red-50 text-red-700 text-[10px] font-bold rounded-full border border-red-100 uppercase">
                            <AlertTriangle size={12} /> {highPriorityLayers.length} Vulnerable Layers
                        </span>
                    ) : (
                        <span className="flex items-center gap-1.5 px-2.5 py-1 bg-green-50 text-green-700 text-[10px] font-bold rounded-full border border-green-100 uppercase">
                            <CheckCircle2 size={12} /> Posture Validated
                        </span>
                    )}
                </div>
                <p className="text-sm text-slate-600 leading-relaxed" style={{ fontWeight: 'var(--font-weight-medium)' }}>
                  {highPriorityLayers.length > 0 
                    ? `Immediate attention required in the ${highPriorityLayers.map(l => l.name).join(', ')} architectures. Refer to the Mitigation Guide for technical fix-actions.` 
                    : "Technical layers are currently optimized according to AR.csv risk profiles."}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                <h3 className="text-lg font-bold mb-6 flex items-center gap-2 text-slate-800 tracking-tight">
                    <Target size={18} className="text-indigo-600" />Maturity Radar
                </h3>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <RadarChart cx="50%" cy="50%" outerRadius="80%" data={chartData}>
                      <PolarGrid stroke="#e2e8f0" />
                      <PolarAngleAxis dataKey="subject" tick={{ fill: theme === 'dark' ? '#ffffff' : '#000000', fontSize: 12, fontWeight: 500 }} />
                      <PolarRadiusAxis angle={30} domain={[0, 100]} axisLine={false} tick={false} />
                      <Radar name="Score" dataKey="score" stroke="#C17DD7" fill="#C17DD7" fillOpacity={0.4} />
                    </RadarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col overflow-hidden">
                <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
                    <h3 className="text-lg font-bold flex items-center gap-2 text-slate-800">
                        <Wrench size={18} className="text-indigo-600" /> Mitigation Guide
                    </h3>
                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">By Architecture Layer</div>
                </div>
                
                <div className="flex-1 overflow-y-auto max-h-[400px] p-6 space-y-4">
                  {highPriorityLayers.length > 0 ? (
                    highPriorityLayers.map((layer) => (
                        <div key={layer.id} className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-sm transition-all hover:border-indigo-200">
                            <div className="px-4 py-3 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <layer.icon size={16} style={{ color: layer.color }} />
                                    <span className="font-bold text-sm">{layer.name}</span>
                                </div>
                                <span className={`text-[10px] font-black px-2 py-0.5 rounded uppercase ${assessmentData[layer.name].score === 0 ? 'bg-red-100 text-red-700' : 'bg-orange-100 text-orange-700'}`}>
                                    {assessmentData[layer.name].score === 0 ? 'Critical' : 'High'} Risk
                                </span>
                            </div>
                            <div className="p-4 space-y-4">
                                {layer.parameters.map((p, idx) => (
                                    <div key={idx} className="mb-3 last:mb-0">
                                        <div className="text-[11px] font-bold text-slate-800 leading-tight mb-1">{p.name}</div>
                                        <div className="text-[11px] text-slate-500 italic bg-slate-50 p-2 rounded border border-slate-100">
                                            {p.rec || "Align with technical hardening standards."}
                                        </div>
                                    </div>
                                ))}
                                <div className="pt-2 border-t border-slate-100">
                                    {mitigationAdvice[layer.id] ? (
                                        <div className="bg-indigo-50/50 p-3 rounded-lg border border-indigo-100 animate-in fade-in duration-300">
                                            <div className="flex items-center gap-2 mb-2 text-indigo-700 font-bold text-[10px] uppercase">
                                                <BrainCircuit size={14} /> ✨ Technical Implementation Advisor
                                            </div>
                                            <div className="text-[11px] text-slate-700 prose prose-sm leading-relaxed whitespace-pre-line">
                                                {mitigationAdvice[layer.id]}
                                            </div>
                                        </div>
                                    ) : (
                                        <button 
                                            onClick={() => getMitigationGuide(layer)}
                                            disabled={loadingAdvice === layer.id}
                                            className="w-full flex items-center justify-center gap-2 py-2 text-[10px] font-bold uppercase tracking-wider text-indigo-600 border border-indigo-200 rounded-lg hover:bg-indigo-50 transition-colors"
                                        >
                                            {loadingAdvice === layer.id ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
                                            Generate Layer Fix
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))
                  ) : (
                    <div className="flex flex-col items-center justify-center h-64 text-center space-y-4">
                        <div className="p-4 bg-green-50 rounded-full text-green-600"><CheckCircle2 size={32} /></div>
                        <p className="font-bold text-slate-800 text-sm">Layers are Optimized</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'assessment' && (
          <div className="max-w-4xl mx-auto pb-32">
            <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm">
              <div className="mb-8 border-b border-slate-100 pb-4 text-center">
                <h2 className="text-2xl font-bold">Architecture Scoring</h2>
                <p className="text-slate-500">Assign risk levels based on technical capabilities in each architectural layer.</p>
              </div>
              <div className="space-y-12">
                {LAYERS_CONFIG.map((layer) => (
                  <div key={layer.id} className="relative pl-12 border-l-2 border-slate-100 ml-4">
                    <div className="absolute -left-[18px] top-0 p-2 rounded-full bg-white border-2 shadow-sm" style={{ borderColor: layer.color }}>
                      <layer.icon size={18} style={{ color: layer.color }} />
                    </div>
                    <div className="mb-4">
                      <h3 className="text-lg font-bold">{layer.name}</h3>
                      <p className="text-xs text-slate-500">{layer.objective}</p>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                      {RISK_LEVELS.map((level) => {
                        const isActive = assessmentData[layer.name].score === level.score;
                        return (
                          <button
                            key={level.label}
                            onClick={() => handleScoreChange(layer.name, level.score)}
                            className={`flex flex-col items-center p-3 rounded-xl border-2 transition-all ${
                              isActive ? 'bg-white shadow-lg border-indigo-500 ring-4 ring-indigo-50' : 'bg-slate-50 border-transparent hover:border-slate-200'
                            }`}
                          >
                            <span className="text-sm font-bold uppercase mb-1" style={{ color: isActive ? layer.color : '#94a3b8' }}>{level.label}</span>
                            <span className="text-2xl font-black">{level.score}</span>
                            <span className="text-[11px] text-slate-400 text-center leading-tight mt-1 px-2">{level.definition}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'report' && (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl overflow-hidden">
            <div className="p-8 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div>
                <h2 className="text-2xl font-bold flex items-center gap-3 text-indigo-600"><TableIcon size={24} /> Comprehensive Assessment Matrix</h2>
                <p className="text-slate-500 mt-1">Grouped by architectural layer and resilience pillar.</p>
              </div>
              <div className="text-right">
                <div className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Resilience Score</div>
                <div className="text-4xl font-black text-indigo-600 tracking-tighter">{aggregateScore}%</div>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-900 text-white text-[10px] font-bold uppercase tracking-wider">
                    <th className="px-6 py-5 border-b border-slate-800">Layer (Architecture)</th>
                    <th className="px-6 py-5 border-b border-slate-800">Pillar</th>
                    <th className="px-6 py-5 border-b border-slate-800">Parameter</th>
                    <th className="px-6 py-5 border-b border-slate-800">Strategic Recommendation</th>
                    <th className="px-6 py-5 border-b border-slate-800 text-center">Score</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {LAYERS_CONFIG.map((layer) => (
                    <React.Fragment key={layer.id}>
                      {layer.parameters.map((item, idx) => {
                        const score = assessmentData[layer.name].score;
                        return (
                          <tr key={`${layer.id}-${item.name}`} className="hover:bg-indigo-50/20 transition-colors">
                            {idx === 0 && (
                              <td className="px-6 py-6 text-slate-900 align-top border-r border-slate-100 bg-slate-50/40 text-[10px] uppercase tracking-widest" style={{ fontWeight: 'var(--font-weight-normal)' }} rowSpan={layer.parameters.length}>
                                <div className="flex items-center gap-2 text-indigo-700">
                                  <Layers size={14} />
                                  {layer.name}
                                </div>
                              </td>
                            )}
                            <td className="px-6 py-4 text-slate-500 text-[11px] border-r border-slate-50 uppercase tracking-tighter">
                                {item.phase}
                            </td>
                            <td className="px-6 py-4 text-[11px] text-slate-800 leading-tight border-r border-slate-50 max-w-xs">
                              {item.name}
                            </td>
                            <td className="px-6 py-4 text-[11px] text-slate-500 italic leading-snug max-w-sm">
                              {item.rec || "---"}
                            </td>
                            <td className="px-6 py-4 text-center text-[11px] font-black text-slate-800 border-l border-slate-50">
                              {score}
                            </td>
                          </tr>
                        );
                      })}
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
        {activeTab === 'actionPlan' && (
          <div className="space-y-8 pb-32">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-slate-900">Resilience Action Plan</h2>
                <p className="text-slate-500">Manually track progress of specific technical objectives across 3 months.</p>
              </div>
              <button
                onClick={() => setIsAddingTask(true)}
                className="flex items-center gap-2 bg-indigo-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-indigo-700 transition-all"
              >
                <Plus size={18} /> Add New Objective
              </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
              {[-2, -1, 0].map(offset => {
                const monthTasks = manualTasks.filter(t => t.monthOffset === offset);
                const isCurrent = offset === 0;
                return (
                  <div key={offset} className={`rounded-2xl border bg-white flex flex-col min-h-[500px] ${isCurrent ? 'border-indigo-200 ring-2 ring-indigo-50 shadow-lg' : 'border-slate-200 shadow-sm opacity-90'}`}>
                    <div className={`p-5 border-b flex items-center justify-between ${isCurrent ? 'bg-indigo-600 text-white rounded-t-2xl' : 'bg-slate-50'}`}>
                      <div className="flex items-center gap-2">
                        {isCurrent ? <CalendarCheck size={18} /> : <History size={18} />}
                        <span className="font-black text-xs uppercase tracking-widest">{getMonthLabel(offset)}</span>
                      </div>
                      <span
                        className="text-[10px] font-bold px-2 py-1 rounded"
                        style={isCurrent
                          ? { background: 'rgba(255,255,255,0.2)', color: '#ffffff' }
                          : { background: 'var(--detail-background)', color: 'var(--text-color)' }
                        }
                      >
                        {monthTasks.length} {monthTasks.length === 1 ? 'Task' : 'Tasks'}
                      </span>
                    </div>
                    <div className="p-4 space-y-4 flex-1">
                      {monthTasks.map(task => (
                        <div key={task.id} className="group p-4 bg-slate-50 border border-slate-100 rounded-xl hover:bg-white hover:border-indigo-100 transition-all shadow-sm">
                          <div className="flex items-start justify-between mb-2">
                            <span className="text-[9px] font-black uppercase text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded">{task.layer}</span>
                            <button onClick={() => deleteTask(task.id)} className="text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity">
                              <Trash2 size={12} />
                            </button>
                          </div>
                          <h4 className={`text-sm font-bold mb-1 leading-tight ${task.status === 'completed' ? 'text-slate-400 line-through italic' : 'text-slate-800'}`}>
                            {task.parameter}
                          </h4>
                          <p className="text-[11px] text-slate-500 mb-4 line-clamp-2 italic">{task.recommendation}</p>
                          <div className="flex items-center gap-2">
                            <select
                              value={task.status}
                              onChange={(e) => updateTaskStatus(task.id, e.target.value)}
                              className={`text-[9px] font-bold uppercase py-1 px-2 rounded-lg border outline-none flex-1 transition-colors ${
                                task.status === 'completed' ? 'bg-green-50 border-green-200 text-green-700' :
                                task.status === 'in-progress' ? 'bg-orange-50 border-orange-200 text-orange-700' :
                                'bg-white border-slate-200 text-slate-500'
                              }`}
                            >
                              <option value="pending">Pending</option>
                              <option value="in-progress">In-Progress</option>
                              <option value="completed">Completed</option>
                            </select>
                            {task.status === 'completed' && <CheckCircle size={14} className="text-green-500" />}
                          </div>
                        </div>
                      ))}
                      {monthTasks.length === 0 && (
                        <div className="flex flex-col items-center justify-center py-20 text-slate-800 opacity-50">
                          <Circle size={32} strokeWidth={1} className="mb-2" />
                          <p className="text-[10px] uppercase font-bold tracking-widest">No Objectives</p>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </main>

      {isAddingTask && (
        <div className="fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-6 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden animate-in slide-in-from-bottom-8 duration-300">
            <div className="p-6 text-white bg-indigo-600">
              <h3 className="text-xl font-bold flex items-center gap-2"><Plus size={20} /> New Resilience Objective</h3>
              <p className="text-[10px] mt-1 opacity-80 uppercase tracking-widest font-normal">Matrix implementation planning</p>
            </div>
            <div className="border-t border-slate-200" />
            <form onSubmit={addTask} className="p-8 space-y-6">
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Matrix Parameter</label>
                <input
                  autoFocus required type="text"
                  placeholder="e.g. CP-Control via isolated Admin Creds"
                  className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl px-4 py-3 text-sm focus:border-indigo-500 outline-none transition-all font-medium"
                  value={newTask.parameter}
                  onChange={(e) => setNewTask({...newTask, parameter: e.target.value})}
                />
              </div>
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Specific Recommendation</label>
                <textarea
                  placeholder="e.g. Remove root logins, enhance break-glass..."
                  className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl px-4 py-3 text-sm focus:border-indigo-500 outline-none transition-all h-24 font-medium"
                  value={newTask.recommendation}
                  onChange={(e) => setNewTask({...newTask, recommendation: e.target.value})}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Technical Layer</label>
                  <select
                    className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl px-4 py-3 text-sm focus:border-indigo-500 outline-none transition-all font-bold"
                    value={newTask.layer}
                    onChange={(e) => setNewTask({...newTask, layer: e.target.value})}
                  >
                    {LAYER_ORDER.map(l => <option key={l} value={l}>{l}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Target Period</label>
                  <select
                    className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl px-4 py-3 text-sm focus:border-indigo-500 outline-none transition-all font-bold"
                    value={newTask.monthOffset}
                    onChange={(e) => setNewTask({...newTask, monthOffset: parseInt(e.target.value)})}
                  >
                    <option value={0}>Current Month</option>
                    <option value={-1}>Last Month</option>
                    <option value={-2}>2 Months Ago</option>
                  </select>
                </div>
              </div>
              <div className="flex gap-3 pt-4">
                <button type="button" onClick={() => setIsAddingTask(false)} className="flex-1 px-6 py-3 rounded-xl font-bold text-slate-500 bg-slate-100 hover:bg-slate-200 transition-colors">
                  Cancel
                </button>
                <button type="submit" className="flex-1 px-8 py-3 rounded-xl font-bold text-white bg-indigo-600 hover:bg-indigo-700 shadow-lg transition-all">
                  Create Objective
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {activeTab === 'assessment' && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 bg-slate-900 text-white px-8 py-5 rounded-full shadow-2xl flex items-center gap-10 border border-slate-700 ring-4 ring-indigo-500/10">
          <div className="flex flex-col">
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Aggregate Maturity</span>
            <span className="text-2xl font-black">{aggregateScore}%</span>
          </div>
          <div className="w-px h-10 bg-slate-700" />
          <button onClick={() => setActiveTab('report')} className="bg-indigo-600 hover:bg-indigo-500 px-8 py-2.5 rounded-xl font-black transition-all flex items-center gap-2 text-sm uppercase tracking-wider">
            Finalize Report <ChevronRight size={18} />
          </button>
        </div>
      )}
    </div>
  );
};

export default App;
