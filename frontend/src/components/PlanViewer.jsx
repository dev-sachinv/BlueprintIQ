import React, { useState, useEffect, useRef } from 'react';
import { marked } from 'marked';
import mermaid from 'mermaid';
import { Copy, FileDown, Printer, Server, Network, ShieldAlert, Award, Check, FileText } from 'lucide-react';

// Configure marked
marked.setOptions({
  gfm: true,
  breaks: true,
});

// Mermaid Renderer Component
function MermaidViewer({ chartCode }) {
  const [svg, setSvg] = useState('');
  const [error, setError] = useState(null);
  const containerRef = useRef(null);

  const cleanMermaidCode = (code) => {
    if (!code) return '';
    return code
      .trim()
      // Fix |label|> syntax to |label|
      .replace(/\|([^|]+)\|>/g, '|$1|')
      // Fix participant declarations in flowcharts
      .replace(/participant\s+(\w+)\s+as\s+"([^"]+)"/g, '$1["$2"]')
      // Remove double arrows if written as -->--> or other quirks
      .replace(/-->\s*-->/g, '-->')
      // Clean up markdown block remainders
      .replace(/```mermaid/gi, '')
      .replace(/```/g, '');
  };

  useEffect(() => {
    if (!chartCode) return;

    setError(null);
    setSvg('');

    const sanitizedCode = cleanMermaidCode(chartCode);

    try {
      mermaid.initialize({
        startOnLoad: false,
        theme: 'dark',
        themeVariables: {
          background: '#0f172a', // Slate 900
          primaryColor: '#6366f1', // Indigo 500
          primaryTextColor: '#f8fafc', // Slate 50
          lineColor: '#475569', // Slate 600
        },
        securityLevel: 'loose',
      });

      const uniqueId = `mermaid-${Math.floor(Math.random() * 100000)}`;
      
      // Render mermaid chart asynchronously
      mermaid.render(uniqueId, sanitizedCode)
        .then(({ svg }) => {
          setSvg(svg);
        })
        .catch((err) => {
          console.error("Mermaid parsing error: ", err);
          setError(err.message || 'Syntax error in Mermaid flowchart');
          // Reset the mermaid parser on error to prevent breaking subsequent renders
          mermaid.parseError = () => {};
        });
    } catch (e) {
      setError(e.message || 'Mermaid engine failed to initialize');
    }
  }, [chartCode]);

  if (error) {
    return (
      <div className="p-6 bg-slate-900 border border-red-950/30 rounded-xl text-center">
        <ShieldAlert className="w-8 h-8 text-red-500 mx-auto mb-2" />
        <h4 className="text-sm font-semibold text-red-200">Could not render diagram</h4>
        <p className="text-xs text-red-400 mt-1 mb-4">{error}</p>
        <pre className="text-left font-mono text-[10px] bg-slate-950 p-4 rounded border border-slate-800 text-slate-400 overflow-x-auto select-all max-w-full">
          {chartCode}
        </pre>
      </div>
    );
  }

  if (!svg) {
    return (
      <div className="flex flex-col items-center justify-center py-20 bg-slate-950/50 border border-slate-900 rounded-xl">
        <div className="w-8 h-8 border-2 border-violet-500 border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-sm text-slate-400">Rendering system diagram...</p>
      </div>
    );
  }

  return (
    <div 
      className="p-6 bg-slate-950 rounded-xl border border-slate-800 overflow-x-auto flex justify-center items-center select-none"
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}

export default function PlanViewer({ plan }) {
  const [activeTab, setActiveTab] = useState('doc');
  const [copied, setCopied] = useState(false);

  if (!plan) {
    return (
      <div className="flex flex-col items-center justify-center py-20 bg-slate-900/30 border border-dashed border-slate-800 rounded-xl text-center">
        <FileText className="w-12 h-12 text-slate-700 mb-3" />
        <h3 className="text-slate-400 font-semibold text-base">No build plan selected</h3>
        <p className="text-slate-500 text-sm mt-1 max-w-xs">Fill out the form to generate a plan or select an item from the history sidebar.</p>
      </div>
    );
  }

  // Parse markdown content
  const htmlContent = marked.parse(plan.markdown || '');

  // Copy Markdown Handler
  const handleCopy = () => {
    navigator.clipboard.writeText(plan.markdown);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Download Markdown file
  const handleDownload = () => {
    const element = document.createElement("a");
    const file = new Blob([plan.markdown], { type: 'text/markdown' });
    element.href = URL.createObjectURL(file);
    element.download = `${plan.title.toLowerCase().replace(/[^a-z0-9]+/g, '_')}_build_plan.md`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  // Print Handler
  const handlePrint = () => {
    window.print();
  };

  // Safe access parsing for structures
  const stackList = plan.stack?.stack || [];
  const rationale = plan.stack?.rationale || '';
  const modules = plan.features || [];
  const scoping = plan.mvp?.scoping || [];
  const risks = plan.mvp?.risks || [];

  return (
    <>
      <div className="w-full bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-2xl flex flex-col h-full no-print">
      {/* Header Bar */}
      <div className="px-6 py-4 bg-slate-950 border-b border-slate-800 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <span className="text-[10px] text-violet-400 uppercase tracking-widest font-semibold bg-violet-950/40 border border-violet-800/30 rounded px-2 py-0.5">
            Active Plan
          </span>
          <h2 className="text-xl font-bold text-slate-100 mt-1.5">{plan.title}</h2>
        </div>

        {/* Action Controls */}
        <div className="flex gap-2 no-print shrink-0 w-full sm:w-auto">
          <button
            onClick={handleCopy}
            className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-slate-300 hover:text-slate-100 hover:bg-slate-800 text-xs font-medium transition-colors"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            {copied ? 'Copied!' : 'Copy MD'}
          </button>
          <button
            onClick={handleDownload}
            className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-slate-300 hover:text-slate-100 hover:bg-slate-800 text-xs font-medium transition-colors"
          >
            <FileDown className="w-3.5 h-3.5" />
            Download
          </button>
          <button
            onClick={handlePrint}
            className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3 py-1.5 bg-violet-600 hover:bg-violet-500 border border-violet-700 rounded-lg text-white text-xs font-bold transition-all shadow-md shadow-violet-600/20 active:scale-98 cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5" />
            Download PDF
          </button>
        </div>
      </div>

      {/* Tabs list */}
      <div className="flex border-b border-slate-800 bg-slate-950/30 px-6 no-print overflow-x-auto scrollbar-none">
        <button
          onClick={() => setActiveTab('doc')}
          className={`py-3.5 px-4 text-xs md:text-sm font-semibold border-b-2 transition-colors shrink-0 ${
            activeTab === 'doc' ? 'border-violet-500 text-violet-400' : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          Build Plan
        </button>
        <button
          onClick={() => setActiveTab('stack')}
          className={`py-3.5 px-4 text-xs md:text-sm font-semibold border-b-2 transition-colors shrink-0 ${
            activeTab === 'stack' ? 'border-violet-500 text-violet-400' : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          Tech Stack
        </button>
        <button
          onClick={() => setActiveTab('arch')}
          className={`py-3.5 px-4 text-xs md:text-sm font-semibold border-b-2 transition-colors shrink-0 ${
            activeTab === 'arch' ? 'border-violet-500 text-violet-400' : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          Architecture Diagram
        </button>
        <button
          onClick={() => setActiveTab('mvp')}
          className={`py-3.5 px-4 text-xs md:text-sm font-semibold border-b-2 transition-colors shrink-0 ${
            activeTab === 'mvp' ? 'border-violet-500 text-violet-400' : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          MVP & Risks
        </button>
      </div>

      {/* Content Container */}
      <div className="flex-1 overflow-y-auto p-6 scrollbar-thin">
        {/* Tab 1: Formatted Document */}
        {activeTab === 'doc' && (
          <article 
            className="prose prose-slate prose-invert max-w-none print-container
              prose-headings:text-slate-100 prose-headings:font-bold 
              prose-h1:text-2xl prose-h2:text-xl prose-h3:text-lg 
              prose-p:text-slate-300 prose-p:leading-relaxed prose-p:mb-4
              prose-strong:text-slate-100 prose-code:text-violet-300 prose-code:bg-slate-950 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:before:content-none prose-code:after:content-none
              prose-pre:bg-slate-950 prose-pre:border prose-pre:border-slate-800 prose-pre:p-4 prose-pre:rounded-lg
              prose-table:w-full prose-table:border-collapse prose-th:text-left prose-th:text-xs prose-th:font-semibold prose-th:uppercase prose-th:tracking-wider prose-th:text-slate-400 prose-th:pb-2 prose-th:border-b prose-th:border-slate-800
              prose-td:py-3 prose-td:text-sm prose-td:text-slate-300 prose-td:border-b prose-td:border-slate-800/50
              prose-ul:list-disc prose-ul:pl-5 prose-li:text-slate-300 prose-li:mb-1"
            dangerouslySetInnerHTML={{ __html: htmlContent }}
          />
        )}

        {/* Tab 2: Visual Tech Stack Grid */}
        {activeTab === 'stack' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {stackList.map((item, index) => (
                <div key={index} className="bg-slate-950 border border-slate-800 rounded-xl p-4 flex flex-col justify-between">
                  <div>
                    <span className="text-[10px] text-indigo-400 font-bold uppercase tracking-wider block">
                      {item.layer}
                    </span>
                    <h3 className="text-lg font-bold text-slate-100 mt-1">{item.tool}</h3>
                    <p className="text-xs text-slate-400 mt-2 line-clamp-3">{item.role}</p>
                  </div>
                  <div className="mt-4 pt-3 border-t border-slate-900 flex items-center gap-1.5">
                    <Award className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    <span className="text-[10px] text-slate-300 font-medium truncate">
                      {item.why_free}
                    </span>
                  </div>
                </div>
              ))}
            </div>
            {rationale && (
              <div className="bg-slate-950/50 border border-slate-800/80 rounded-xl p-5">
                <span className="text-xs text-slate-400 font-bold uppercase tracking-wider block mb-1">
                  Architecture Rationale
                </span>
                <p className="text-sm text-slate-300 leading-relaxed">{rationale}</p>
              </div>
            )}
          </div>
        )}

        {/* Tab 3: Mermaid Diagram */}
        {activeTab === 'arch' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-xs text-slate-400 font-bold uppercase tracking-wider">
                System flow chart
              </span>
            </div>
            <MermaidViewer chartCode={plan.architecture} />
          </div>
        )}

        {/* Tab 4: MVP & Risks Tables */}
        {activeTab === 'mvp' && (
          <div className="space-y-8">
            {/* MVP Cuts */}
            <div className="bg-slate-950 rounded-xl border border-slate-800 overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-800 bg-slate-950 flex items-center gap-2">
                <Server className="w-4 h-4 text-violet-400" />
                <h3 className="text-sm font-bold text-slate-200 uppercase tracking-wider">
                  MVP Feature Matrix
                </h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm border-collapse">
                  <thead>
                    <tr className="border-b border-slate-800 text-slate-400 text-xs font-semibold uppercase tracking-wider bg-slate-900/50">
                      <th className="px-5 py-3">Feature</th>
                      <th className="px-5 py-3">Action</th>
                      <th className="px-5 py-3">Rationale</th>
                      <th className="px-5 py-3">MVP Workaround</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {scoping.map((item, index) => (
                      <tr key={index} className="hover:bg-slate-900/25">
                        <td className="px-5 py-3 font-semibold text-slate-200">{item.feature}</td>
                        <td className="px-5 py-3">
                          <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded border ${
                            item.action?.toLowerCase() === 'keep' 
                              ? 'text-emerald-400 bg-emerald-950/20 border-emerald-900/30'
                              : item.action?.toLowerCase() === 'stretch'
                              ? 'text-amber-400 bg-amber-950/20 border-amber-900/30'
                              : 'text-red-400 bg-red-950/20 border-red-900/30'
                          }`}>
                            {item.action}
                          </span>
                        </td>
                        <td className="px-5 py-3 text-slate-350 text-xs leading-relaxed max-w-xs">{item.reason}</td>
                        <td className="px-5 py-3 text-slate-400 text-xs font-mono">{item.replacement || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Risk Mitigation */}
            <div className="bg-slate-950 rounded-xl border border-slate-800 overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-800 bg-slate-950 flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-violet-400" />
                <h3 className="text-sm font-bold text-slate-200 uppercase tracking-wider">
                  Technical Risks & Mitigations
                </h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm border-collapse">
                  <thead>
                    <tr className="border-b border-slate-800 text-slate-400 text-xs font-semibold uppercase tracking-wider bg-slate-900/50">
                      <th className="px-5 py-3 w-1/2">Challenge / Risk</th>
                      <th className="px-5 py-3 w-1/2">Actionable Mitigation</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {risks.map((item, index) => (
                      <tr key={index} className="hover:bg-slate-900/25">
                        <td className="px-5 py-4 text-slate-200 text-xs leading-relaxed font-semibold">{item.challenge}</td>
                        <td className="px-5 py-4 text-emerald-450 text-xs leading-relaxed bg-emerald-950/5 border-l-2 border-emerald-500/30">
                          {item.mitigation}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>

    {/* Unified print-only document */}
    <div className="hidden print-only p-8 text-slate-800 bg-white space-y-8 font-sans print-container">
        {/* Title Block */}
        <div className="border-b-2 border-slate-200 pb-6">
          <span className="text-[10px] text-indigo-600 uppercase tracking-widest font-bold border border-indigo-200 rounded px-2 py-0.5">
            AI Blueprint Build Plan
          </span>
          <h1 className="text-3xl font-extrabold text-slate-900 mt-3">{plan.title}</h1>
          <p className="text-xs text-slate-500 mt-2">
            Generated on: {plan.created_at ? new Date(plan.created_at).toLocaleDateString() : new Date().toLocaleDateString()}
          </p>
        </div>

        {/* Intake Idea */}
        <div className="space-y-2">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400">Intake Project Idea</h2>
          <p className="text-sm text-slate-750 italic bg-slate-50 border-l-4 border-indigo-500 p-4 rounded-r-lg">
            "{plan.idea}"
          </p>
        </div>

        {/* Section 1: Build Plan MD */}
        <div className="space-y-4 pt-4">
          <h2 className="text-md font-bold uppercase tracking-wider text-slate-900 border-b border-slate-200 pb-2">
            1. Comprehensive Implementation Plan
          </h2>
          <div 
            className="prose text-sm text-slate-700 leading-relaxed print-prose"
            dangerouslySetInnerHTML={{ __html: marked.parse(plan.markdown) }}
          />
        </div>

        {/* Section 2: Tech Stack */}
        <div className="space-y-4 pt-6 page-break-before" style={{ pageBreakBefore: 'always' }}>
          <h2 className="text-md font-bold uppercase tracking-wider text-slate-900 border-b border-slate-200 pb-2">
            2. Recommended Technology Stack
          </h2>
          {rationale && (
            <p className="text-xs text-slate-500 italic leading-relaxed mb-4">{rationale}</p>
          )}
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b-2 border-slate-350 text-slate-800 font-semibold bg-slate-50">
                <th className="px-4 py-2 bg-slate-100">Layer</th>
                <th className="px-4 py-2 bg-slate-100">Recommended Tool</th>
                <th className="px-4 py-2 bg-slate-100">Tier / Pricing</th>
                <th className="px-4 py-2 bg-slate-100">Rationale</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {stackList.map((item, index) => (
                <tr key={index}>
                  <td className="px-4 py-2.5 font-semibold text-slate-800">{item.layer}</td>
                  <td className="px-4 py-2.5 font-semibold text-indigo-700">{item.tool}</td>
                  <td className="px-4 py-2.5">{item.tier}</td>
                  <td className="px-4 py-2.5 text-slate-600">{item.rationale}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Section 3: Architecture Diagram */}
        <div className="space-y-4 pt-6 page-break-before" style={{ pageBreakBefore: 'always' }}>
          <h2 className="text-md font-bold uppercase tracking-wider text-slate-900 border-b border-slate-200 pb-2">
            3. System Architecture Diagram
          </h2>
          <div className="border border-slate-200 rounded-lg p-6 bg-slate-50 flex justify-center">
            <MermaidViewer chartCode={plan.architecture} />
          </div>
        </div>

        {/* Section 4: MVP Scope */}
        <div className="space-y-4 pt-6 page-break-before" style={{ pageBreakBefore: 'always' }}>
          <h2 className="text-md font-bold uppercase tracking-wider text-slate-900 border-b border-slate-200 pb-2">
            4. MVP Feature Matrix
          </h2>
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b-2 border-slate-350 text-slate-800 font-semibold bg-slate-50">
                <th className="px-4 py-2 bg-slate-100">Feature</th>
                <th className="px-4 py-2 bg-slate-100">Action</th>
                <th className="px-4 py-2 bg-slate-100">Rationale</th>
                <th className="px-4 py-2 bg-slate-100">MVP Workaround</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {scoping.map((item, index) => (
                <tr key={index}>
                  <td className="px-4 py-2.5 font-semibold text-slate-800">{item.feature}</td>
                  <td className="px-4 py-2.5 font-semibold uppercase text-indigo-700">{item.action}</td>
                  <td className="px-4 py-2.5 text-slate-600">{item.reason}</td>
                  <td className="px-4 py-2.5 font-mono text-slate-600">{item.replacement || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Section 5: Risks */}
        <div className="space-y-4 pt-6 page-break-before" style={{ pageBreakBefore: 'always' }}>
          <h2 className="text-md font-bold uppercase tracking-wider text-slate-900 border-b border-slate-200 pb-2">
            5. Technical Risks & Mitigations
          </h2>
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b-2 border-slate-350 text-slate-800 font-semibold bg-slate-50">
                <th className="px-4 py-2 w-1/2 bg-slate-100">Challenge / Risk</th>
                <th className="px-4 py-2 w-1/2 bg-slate-100">Actionable Mitigation</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {risks.map((item, index) => (
                <tr key={index}>
                  <td className="px-4 py-3 font-semibold text-slate-800">{item.challenge}</td>
                  <td className="px-4 py-3 text-slate-600 bg-slate-50/50">{item.mitigation}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
