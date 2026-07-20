import React, { useState, useEffect } from 'react';
import IdeaForm from './IdeaForm';
import PipelineProgress from './PipelineProgress';
import PlanViewer from './PlanViewer';
import { Plus, History, Trash2, ShieldAlert, Sparkles, FolderKanban, LogOut, User } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

export default function Dashboard() {
  const { session, logout, user } = useAuth();
  const [history, setHistory] = useState([]);
  const [activePlan, setActivePlan] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [pipelineState, setPipelineState] = useState({
    activeStep: 'stack', // stack, architecture, features, mvp, synthesis, synthesis_done
    logs: [],
    error: null,
  });

  // Load history on mount
  useEffect(() => {
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/plans`, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      });
      if (response.ok) {
        const data = await response.json();
        setHistory(data);
      }
    } catch (e) {
      console.error("Failed to load plan history: ", e);
    }
  };

  const handleSelectPlan = async (planId) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/plans/${planId}`, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      });
      if (response.ok) {
        const data = await response.json();
        setActivePlan(data);
        setIsGenerating(false); // Make sure form/pipeline is hidden
      }
    } catch (e) {
      console.error("Failed to load plan details: ", e);
    }
  };

  const handleDeletePlan = async (e, planId) => {
    e.stopPropagation(); // Avoid selecting the plan when clicking delete
    
    if (!window.confirm("Are you sure you want to delete this build plan?")) return;
    
    try {
      const response = await fetch(`${API_BASE_URL}/api/plans/${planId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      });
      if (response.ok) {
        setHistory(prev => prev.filter(p => p.id !== planId));
        if (activePlan && activePlan.id === planId) {
          setActivePlan(null);
        }
      }
    } catch (e) {
      console.error("Failed to delete plan: ", e);
    }
  };

  const handleNewPlan = () => {
    setActivePlan(null);
    setIsGenerating(false);
    setPipelineState({
      activeStep: 'stack',
      logs: [],
      error: null,
    });
  };

  const handleGenerate = async (ideaData) => {
    setIsGenerating(true);
    setActivePlan(null);
    setPipelineState({
      activeStep: 'stack',
      logs: ['Intake data processed. Initiating multi-stage generation...', 'Initializing connection to FastAPI orchestrator...'],
      error: null,
    });

    try {
      const response = await fetch(`${API_BASE_URL}/api/plans/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify(ideaData),
      });

      if (!response.ok) {
        throw new Error(`Orchestrator returned error: ${response.statusText}`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop(); // save incomplete line

        for (const line of lines) {
          if (!line.trim()) continue;

          try {
            const step = JSON.parse(line);
            
            if (step.status === 'error') {
              setPipelineState(prev => ({
                ...prev,
                error: step.message,
              }));
              return;
            }

            // Update pipeline step and logs
            setPipelineState(prev => {
              const logs = [...prev.logs];
              let activeStep = prev.activeStep;
              
              if (step.status === 'stack') {
                activeStep = 'stack';
                logs.push('Generating Groq LLM prompt for stack analysis...');
              } else if (step.status === 'stack_done') {
                logs.push('Groq analysis completed: Free stack template selected.');
              } else if (step.status === 'architecture') {
                activeStep = 'architecture';
                logs.push('Sending tech stack to Gemini for Mermaid layout generation...');
              } else if (step.status === 'architecture_done') {
                logs.push('Mermaid flowchart code generated successfully.');
              } else if (step.status === 'features') {
                activeStep = 'features';
                logs.push('Requesting module-by-module feature JSON from Groq...');
              } else if (step.status === 'features_done') {
                logs.push(`Split project into ${step.data?.modules?.length || 4} technical modules.`);
              } else if (step.status === 'mvp') {
                activeStep = 'mvp';
                logs.push('Asking Groq for MVP scoping cuts & local environment risk tables...');
              } else if (step.status === 'mvp_done') {
                logs.push('Scoping boundaries and mitigations parsed.');
              } else if (step.status === 'synthesis') {
                activeStep = 'synthesis';
                logs.push('Submitting all JSON modules to Gemini Flash for full markdown document assembly...');
              } else if (step.status === 'synthesis_done') {
                activeStep = 'synthesis_done';
                logs.push('Markdown compilation complete. Saving plan to database...');
              }

              if (step.message) {
                logs.push(step.message);
              }

              return {
                ...prev,
                activeStep,
                logs,
              };
            });

            // If we completed synthesis, load the final project plan
            if (step.status === 'synthesis_done' && step.data) {
              setTimeout(() => {
                setActivePlan(step.data);
                setIsGenerating(false);
                fetchHistory(); // Refresh history list
              }, 1000);
            }

          } catch (err) {
            console.error("Error parsing stream line: ", line, err);
          }
        }
      }
    } catch (err) {
      setPipelineState(prev => ({
        ...prev,
        error: err.message || 'Network connection to orchestrator lost',
      }));
    }
  };

  return (
    <div className="flex h-screen w-full bg-slate-950 overflow-hidden text-slate-150">
      {/* Sidebar: History - Hidden on print */}
      <aside className="w-80 shrink-0 border-r border-slate-800 bg-slate-900/50 flex flex-col h-full no-print">
        {/* Title */}
        <div className="p-6 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FolderKanban className="w-6 h-6 text-violet-500" />
            <h1 className="text-md font-bold text-slate-100 uppercase tracking-wider">
              BlueprintIQ
            </h1>
          </div>
        </div>

        {/* New Plan Trigger */}
        <div className="p-4">
          <button
            onClick={handleNewPlan}
            className="w-full flex items-center justify-center gap-2 py-2 px-4 rounded-lg bg-slate-800 border border-slate-700 text-slate-200 hover:text-white hover:bg-slate-700 text-sm font-semibold transition-all shadow-md active:scale-98"
          >
            <Plus className="w-4 h-4" />
            Create Build Plan
          </button>
        </div>

        {/* History list */}
        <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-2 scrollbar-thin">
          <div className="flex items-center gap-1.5 px-2 mb-3">
            <History className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">
              Plan History
            </span>
          </div>

          {history.length === 0 ? (
            <div className="text-center py-8 text-slate-500 text-xs italic">
              No saved build plans yet
            </div>
          ) : (
            history.map((item) => {
              const isActive = (activePlan && activePlan.id === item.id);
              
              return (
                <div
                  key={item.id}
                  onClick={() => handleSelectPlan(item.id)}
                  className={`group relative p-3 rounded-lg border text-left cursor-pointer transition-all ${
                    isActive
                      ? 'bg-violet-950/20 border-violet-800 text-violet-200'
                      : 'bg-slate-900/40 border-slate-800 hover:bg-slate-900/70 hover:border-slate-800 text-slate-350 hover:text-slate-200'
                  }`}
                >
                  <div className="pr-6">
                    <h3 className="font-bold text-xs truncate">{item.title}</h3>
                    <p className="text-[10px] text-slate-500 truncate mt-1">
                      {item.constraints?.platform || 'Web'} • {item.constraints?.timeframe || '24h'}
                    </p>
                  </div>
                  <button
                    onClick={(e) => handleDeletePlan(e, item.id)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 hover:text-red-400 text-slate-500 p-1 rounded hover:bg-slate-800/80 transition-all"
                    title="Delete plan"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              );
            })
          )}
        </div>
        
        {/* User profile footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/20 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-full bg-violet-950 border border-violet-800/50 flex items-center justify-center shrink-0">
              <User className="w-4 h-4 text-violet-400" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-bold text-slate-200 truncate">{user?.email}</p>
              <p className="text-[9px] text-slate-500 uppercase tracking-widest font-semibold">User Session</p>
            </div>
          </div>
          <button
            onClick={logout}
            className="p-2 text-slate-400 hover:text-red-400 hover:bg-slate-800/55 rounded-lg transition-colors shrink-0 cursor-pointer"
            title="Sign Out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </aside>

      {/* Main Panel */}
      <main className="flex-1 flex flex-col h-full bg-slate-950 overflow-hidden relative">
        {/* Top Glow Decorator */}
        <div className="absolute top-0 left-1/4 right-1/4 h-[1px] bg-gradient-to-r from-transparent via-violet-500/20 to-transparent blur-sm no-print" />
        
        <div className="flex-1 overflow-y-auto p-6 md:p-8 flex justify-center items-start">
          <div className="w-full max-w-4xl h-full flex flex-col justify-start">
            
            {/* If not generating and no active plan, show form */}
            {!isGenerating && !activePlan && (
              <div className="max-w-2xl mx-auto w-full space-y-6 py-6 no-print">
                <div className="text-center space-y-2 mb-4">
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-violet-950/40 border border-violet-800/40 rounded-full text-violet-400 text-xs font-semibold">
                    <Sparkles className="w-3.5 h-3.5" />
                    AI Blueprint Engine
                  </div>
                  <h1 className="text-3xl font-extrabold tracking-tight text-slate-100 sm:text-4xl">
                    BlueprintIQ
                  </h1>
                  <p className="text-slate-400 text-sm max-w-md mx-auto">
                    Submit your raw project idea and constraints to generate a 100% free-tier-first build plan automatically.
                  </p>
                </div>
                <IdeaForm onSubmit={handleGenerate} loading={false} />
              </div>
            )}

            {/* If generating, show progress */}
            {isGenerating && (
              <div className="py-12 w-full no-print">
                <PipelineProgress
                  activeStep={pipelineState.activeStep}
                  error={pipelineState.error}
                  logs={pipelineState.logs}
                />
              </div>
            )}

            {/* If plan exists, show plan viewer */}
            {activePlan && (
              <div className="h-full flex-1 min-h-0">
                <PlanViewer plan={activePlan} />
              </div>
            )}

          </div>
        </div>
      </main>
    </div>
  );
}
