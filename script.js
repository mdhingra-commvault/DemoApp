import React, { useState, useMemo, useEffect } from 'react';
import { 
  Shield, 
  Search, 
  Lock, 
  Eye, 
  Zap, 
  RefreshCw, 
  ChevronRight, 
  Info, 
  AlertTriangle, 
  CheckCircle2,
  BarChart3,
  LayoutDashboard,
  Save,
  Target,
  ListChecks,
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
  CalendarCheck,
  Circle,
  CheckCircle,
  Plus,
  Trash2,
  History
} from 'lucide-react';
import { 
  Radar, 
  RadarChart, 
  PolarGrid, 
  PolarAngleAxis, 
  PolarRadiusAxis, 
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Cell
} from 'recharts';

// --- Constants ---
const apiKey = "";
const LAYER_ORDER = ["Control Plane", "Data Plane", "Data Policy", "Operations", "Response"];

const LAYERS_CONFIG = [
  {
    id: 'CP',
    name: "Control Plane",
    color: '#6366f1',
    icon: Shield,
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
    parameters: [
      { phase: "Identify", name: "Decision / RACI for recovery - communciations plan", rec: "Establish common classes and business impact assessment criteria to align objectives and plan types " }
    ]
  }
];

const RISK_LEVELS = [
  { label: 'Low Risk', score: 3, color: '#10b981' },
  { label: 'Medium Risk', score: 2, color: '#84cc16' },
  { label: 'High Risk', score: 1, color: '#f97316' },
  { label: 'Critical Risk', score: 0, color: '#ef4444' }
];

const INITIAL_DATA = {
  'Control Plane': { score: 1 },
  'Data Plane': { score: 1 },
  'Data Policy': { score: 1 },
  'Operations': { score: 1 },
  'Response': { score: 1 }
};

const App = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [assessmentData, setAssessmentData] = useState(INITIAL_DATA);
  const [manualTasks, setManualTasks] = useState([]);
  const [isAddingTask, setIsAddingTask] = useState(false);
  
  // New Task Form State
  const [newTask, setNewTask] = useState({
    parameter: '',
    recommendation: '',
    layer: 'Control Plane',
    monthOffset: 0 // 0 = Current, -1 = Last Month, -2 = 2 Months Ago
  });

  // Load from local storage on mount
  useEffect(() => {
    const savedAssessment = localStorage.getItem('ar_assessment_v5');
    const savedTasks = localStorage.getItem('ar_manual_tasks_v1');
    if (savedAssessment) setAssessmentData(JSON.parse(savedAssessment));
    if (savedTasks) setManualTasks(JSON.parse(savedTasks));
  }, []);

  // Persistence
  const saveProgress = () => {
    localStorage.setItem('ar_assessment_v5', JSON.stringify(assessmentData));
    localStorage.setItem('ar_manual_tasks_v1', JSON.stringify(manualTasks));
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
      color: layer.color
    }));
  }, [assessmentData]);

  const handleScoreChange = (layerName, score) => {
    setAssessmentData(prev => ({ ...prev, [layerName]: { score } }));
  };

  const addTask = (e) => {
    e.preventDefault();
    if (!newTask.parameter) return;
    const task = {
      ...newTask,
      id: crypto.randomUUID(),
      status: 'pending',
      createdAt: new Date().toISOString()
    };
    setManualTasks(prev => [...prev, task]);
    setNewTask({ parameter: '', recommendation: '', layer: 'Control Plane', monthOffset: 0 });
    setIsAddingTask(false);
  };

  const updateTaskStatus = (id, status) => {
    setManualTasks(prev => prev.map(t => t.id === id ? { ...t, status } : t));
  };

  const deleteTask = (id) => {
    setManualTasks(prev => prev.filter(t => t.id !== id));
  };

  // Month labels helper
  const getMonthLabel = (offset) => {
    const d = new Date();
    d.setMonth(d.getMonth() + offset);
    return d.toLocaleString('default', { month: 'long', year: 'numeric' });
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans">
      {/* Navigation */}
      <nav className="sticky top-0 z-50 bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-3">
          <div className="bg-indigo-600 p-2 rounded-lg">
            <Shield className="text-white" size={24} />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-slate-900 uppercase">Active Resilience</h1>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Enterprise Maturity Hub</p>
          </div>
        </div>

        <div className="flex bg-slate-100 p-1 rounded-xl">
          {[
            { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
            { id: 'assessment', label: 'Assessment', icon: BarChart3 },
            { id: 'report', label: 'Detailed Report', icon: FileText },
            { id: 'actionPlan', label: 'Action Plan', icon: CalendarCheck },
          ].map(tab => (
            <button 
              key={tab.id}
              onClick={() => setActiveTab(tab.id)} 
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${activeTab === tab.id ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-500 hover:text-slate-700'}`}
            >
              <tab.icon size={16} /> {tab.label}
            </button>
          ))}
        </div>

        <button onClick={saveProgress} className="flex items-center gap-2 bg-slate-900 text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-slate-800 transition-colors">
          <Save size={16} /> Save Data
        </button>
      </nav>

      <main className="p-6 max-w-7xl mx-auto space-y-8">
        {/* DASHBOARD TAB */}
        {activeTab === 'dashboard' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                <span className="text-slate-400 text-[10px] font-bold uppercase block mb-1">Overall Maturity</span>
                <div className="text-4xl font-black text-indigo-600">{aggregateScore}%</div>
              </div>
              <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm md:col-span-3 flex items-center justify-between">
                <div>
                  <span className="text-slate-400 text-[10px] font-bold uppercase block mb-1">Operational Progress</span>
                  <p className="text-sm text-slate-600 font-medium leading-relaxed max-w-xl">
                    Tracking {manualTasks.length} manual resilience objectives. 
                    {manualTasks.filter(t => t.status === 'completed').length} completed across technical layers.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                    <div className="text-right">
                        <div className="text-xs font-bold text-slate-400 uppercase">Completion Rate</div>
                        <div className="text-xl font-bold text-slate-800">
                            {manualTasks.length > 0 ? Math.round((manualTasks.filter(t => t.status === 'completed').length / manualTasks.length) * 100) : 0}%
                        </div>
                    </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                <h3 className="text-lg font-bold mb-6 flex items-center gap-2 text-slate-800 tracking-tight">
                    <Target size={18} className="text-indigo-600" /> Resilience Posture Radar
                </h3>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <RadarChart cx="50%" cy="50%" outerRadius="80%" data={chartData}>
                      <PolarGrid stroke="#e2e8f0" />
                      <PolarAngleAxis dataKey="subject" tick={{ fill: '#64748b', fontSize: 11, fontWeight: 700 }} />
                      <PolarRadiusAxis angle={30} domain={[0, 100]} axisLine={false} tick={false} />
                      <Radar name="Score" dataKey="score" stroke="#6366f1" fill="#6366f1" fillOpacity={0.4} />
                    </RadarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 flex flex-col h-[400px]">
                <h3 className="text-lg font-bold mb-4 flex items-center gap-2 text-slate-800">
                    <History size={18} className="text-indigo-600" /> Recent Task Activity
                </h3>
                <div className="flex-1 overflow-y-auto space-y-3 pr-2">
                  {manualTasks.slice(-5).reverse().map(task => (
                    <div key={task.id} className="p-3 bg-slate-50 border border-slate-100 rounded-lg flex items-center justify-between">
                        <div>
                            <div className="text-[10px] font-bold text-slate-400 uppercase">{task.layer}</div>
                            <div className="text-sm font-bold text-slate-800 truncate max-w-[200px]">{task.parameter}</div>
                        </div>
                        <div className={`text-[10px] font-bold px-2 py-1 rounded-full uppercase ${task.status === 'completed' ? 'bg-green-100 text-green-700' : 'bg-indigo-100 text-indigo-700'}`}>
                            {task.status}
                        </div>
                    </div>
                  ))}
                  {manualTasks.length === 0 && (
                    <div className="flex flex-col items-center justify-center h-full text-slate-400 text-sm">
                        <CalendarCheck size={32} className="mb-2 opacity-20" />
                        No tasks recorded yet.
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ASSESSMENT TAB */}
        {activeTab === 'assessment' && (
          <div className="max-w-4xl mx-auto pb-32">
            <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm">
              <div className="mb-8 border-b border-slate-100 pb-4 text-center">
                <h2 className="text-2xl font-bold">Technical Pillar Scoring</h2>
                <p className="text-slate-500">Assign risk levels to architecture layers to align with your AR.csv matrix.</p>
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
                            <span className="text-[10px] font-bold uppercase mb-1" style={{ color: isActive ? layer.color : '#94a3b8' }}>{level.label}</span>
                            <span className="text-2xl font-black">{level.score}</span>
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

        {/* REPORT TAB */}
        {activeTab === 'report' && (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl overflow-hidden">
            <div className="p-8 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <h2 className="text-2xl font-bold flex items-center gap-3 text-indigo-600"><TableIcon size={24} /> Detailed Resilience Matrix</h2>
              <div className="text-right">
                <div className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Maturity Score</div>
                <div className="text-4xl font-black text-indigo-600">{aggregateScore}%</div>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead className="bg-slate-900 text-white text-[10px] font-bold uppercase tracking-wider">
                  <tr>
                    <th className="px-6 py-5">Layer</th>
                    <th className="px-6 py-5">Parameter</th>
                    <th className="px-6 py-5">Strategic Recommendation</th>
                    <th className="px-6 py-5 text-center">Score</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {LAYERS_CONFIG.map((layer) => (
                    layer.parameters.map((item, idx) => (
                      <tr key={`${layer.id}-${item.name}`} className="hover:bg-slate-50 transition-colors">
                        {idx === 0 && (
                          <td className="px-6 py-6 font-black text-slate-900 align-top border-r bg-slate-50/40 text-[10px] uppercase tracking-widest" rowSpan={layer.parameters.length}>
                            {layer.name}
                          </td>
                        )}
                        <td className="px-6 py-4 text-[12px] text-slate-800 font-bold max-w-xs">{item.name}</td>
                        <td className="px-6 py-4 text-[11px] text-slate-500 italic max-w-sm">{item.rec || "---"}</td>
                        <td className="px-6 py-4 text-center font-mono font-black border-l">{assessmentData[layer.name].score}</td>
                      </tr>
                    ))
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ACTION PLAN TAB */}
        {activeTab === 'actionPlan' && (
          <div className="space-y-8 pb-32">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-slate-900">Resilience Action Plan</h2>
                <p className="text-slate-500">Manually track progress of specific technical objectives across 3 months.</p>
              </div>
              <button 
                onClick={() => setIsAddingTask(true)}
                className="flex items-center gap-2 bg-indigo-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-indigo-700 shadow-lg shadow-indigo-200 transition-all"
              >
                <Plus size={18} /> Add New Objective
              </button>
            </div>

            {/* Historical Progress View (3 Columns) */}
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
                        <span className={`text-[10px] font-bold px-2 py-1 rounded ${isCurrent ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-500'}`}>
                            {monthTasks.length} {monthTasks.length === 1 ? 'Task' : 'Tasks'}
                        </span>
                    </div>
                    
                    <div className="p-4 space-y-4 flex-1">
                      {monthTasks.map(task => (
                        <div key={task.id} className="group p-4 bg-slate-50 border border-slate-100 rounded-xl hover:bg-white hover:border-indigo-100 transition-all shadow-sm">
                            <div className="flex items-start justify-between mb-2">
                                <span className="text-[9px] font-black uppercase text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded">
                                    {task.layer}
                                </span>
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
                        <div className="flex flex-col items-center justify-center py-20 text-slate-300 opacity-50">
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

      {/* ADD TASK MODAL */}
      {isAddingTask && (
        <div className="fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-6 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden animate-in slide-in-from-bottom-8 duration-300">
            <div className="bg-indigo-600 p-6 text-white">
                <h3 className="text-xl font-bold flex items-center gap-2">
                    <Plus size={20} /> New Resilience Objective
                </h3>
                <p className="text-indigo-100 text-sm mt-1 opacity-80 uppercase tracking-widest font-bold text-[10px]">Matrix implementation planning</p>
            </div>
            <form onSubmit={addTask} className="p-8 space-y-6">
                <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Matrix Parameter</label>
                    <input 
                      autoFocus
                      required
                      type="text" 
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
                    <button type="submit" className="flex-2 px-8 py-3 rounded-xl font-bold text-white bg-indigo-600 hover:bg-indigo-700 shadow-lg shadow-indigo-100 transition-all">
                        Create Objective
                    </button>
                </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;