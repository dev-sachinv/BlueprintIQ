import React from 'react';
import { Loader2, CheckCircle2, AlertCircle, Sparkles } from 'lucide-react';

export default function PipelineProgress({ activeStep, error, logs }) {
  const steps = [
    { id: 'stack', label: 'Stack Recommender', desc: 'Analyzing constraints and choosing free-tier stack' },
    { id: 'architecture', label: 'System Design', desc: 'Generating Mermaid data flow & diagrams' },
    { id: 'features', label: 'Module Breakdown', desc: 'Structuring codebases & technical files' },
    { id: 'mvp', label: 'MVP Scoping & Risks', desc: 'Defining MVP boundaries and rate-limits' },
    { id: 'synthesis', label: 'Final Synthesis', desc: 'Gemini synthesis into polished markdown' },
  ];

  const getStepStatus = (stepId, index) => {
    const currentIndex = steps.findIndex(s => s.id === activeStep);
    
    if (error && stepId === activeStep) return 'error';
    if (activeStep === 'synthesis_done') return 'done';
    
    if (currentIndex === -1) return 'pending';
    if (index < currentIndex) return 'done';
    if (index === currentIndex) return 'loading';
    return 'pending';
  };

  return (
    <div className="w-full max-w-2xl mx-auto bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-2xl shadow-violet-500/5">
      <div className="flex items-center justify-between mb-8 pb-4 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-violet-400 animate-pulse" />
          <h2 className="text-lg font-semibold text-slate-100">Generation Pipeline</h2>
        </div>
        <span className="text-xs text-slate-400 px-2 py-1 bg-slate-800 rounded-full border border-slate-700">
          5-Stage Orchestrator
        </span>
      </div>

      <div className="space-y-6">
        {steps.map((step, idx) => {
          const status = getStepStatus(step.id, idx);
          
          return (
            <div 
              key={step.id} 
              className={`flex items-start gap-4 transition-all duration-300 ${
                status === 'pending' ? 'opacity-40' : 'opacity-100'
              }`}
            >
              {/* Stepper Dot Indicator */}
              <div className="relative flex items-center justify-center mt-1">
                {status === 'done' && (
                  <CheckCircle2 className="w-6 h-6 text-emerald-500 bg-emerald-950/30 rounded-full" />
                )}
                {status === 'loading' && (
                  <div className="relative">
                    <Loader2 className="w-6 h-6 text-violet-500 animate-spin" />
                    <div className="absolute inset-0 bg-violet-500/20 blur-sm rounded-full -z-10" />
                  </div>
                )}
                {status === 'error' && (
                  <AlertCircle className="w-6 h-6 text-red-500 bg-red-950/30 rounded-full" />
                )}
                {status === 'pending' && (
                  <div className="w-6 h-6 rounded-full border-2 border-slate-700 bg-slate-950 flex items-center justify-center">
                    <span className="text-xs text-slate-500">{idx + 1}</span>
                  </div>
                )}
                
                {/* Connecting Line */}
                {idx < steps.length - 1 && (
                  <div 
                    className={`absolute top-6 bottom-0 w-0.5 h-10 left-1/2 -translate-x-1/2 -z-10 transition-colors duration-500 ${
                      status === 'done' ? 'bg-emerald-500/50' : 'bg-slate-800'
                    }`}
                  />
                )}
              </div>

              {/* Text content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className={`font-medium text-sm md:text-base ${
                    status === 'loading' ? 'text-violet-400 font-semibold' : 'text-slate-200'
                  }`}>
                    {step.label}
                  </h3>
                  {status === 'loading' && (
                    <span className="text-[10px] uppercase font-bold tracking-widest text-violet-400 animate-pulse px-1.5 py-0.5 bg-violet-950/50 border border-violet-800/30 rounded">
                      Processing
                    </span>
                  )}
                </div>
                <p className="text-xs md:text-sm text-slate-400 mt-0.5">{step.desc}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Logs section */}
      {logs && logs.length > 0 && (
        <div className="mt-8 pt-6 border-t border-slate-800">
          <span className="text-xs font-semibold text-slate-400 block mb-2 uppercase tracking-wider">
            Pipeline Activity Log
          </span>
          <div className="bg-slate-950/70 border border-slate-800 rounded-lg p-3 font-mono text-xs text-emerald-400/90 max-h-40 overflow-y-auto space-y-1.5 scrollbar-thin">
            {logs.map((log, index) => (
              <div key={index} className="flex gap-2">
                <span className="text-slate-600 select-none">&gt;</span>
                <span>{log}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {error && (
        <div className="mt-6 p-4 bg-red-950/30 border border-red-900/50 rounded-lg flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
          <div>
            <h4 className="text-sm font-semibold text-red-200">Execution Error</h4>
            <p className="text-xs text-red-400 mt-1">{error}</p>
          </div>
        </div>
      )}
    </div>
  );
}
