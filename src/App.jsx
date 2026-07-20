import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  Settings,
  Layers,
  Calendar,
  Users,
  Clock,
  DollarSign,
  Award,
  Download,
  AlertTriangle,
  RefreshCw,
  Cpu,
  Database,
  Layout,
  Lock,
  Globe,
  Plus,
  BookOpen,
  Info,
  CheckCircle,
  Copy,
  ChevronRight,
  HelpCircle
} from 'lucide-react';

// Default system prompt from specification
const SYSTEM_PROMPT = `You are a senior solutions architect who writes project blueprints for student developers building hackathon and portfolio projects. You will receive a PROJECT IDEA and CONSTRAINTS (team size, timeline, budget, skill level). Your job is to return ONE thing only: a single valid JSON object matching the schema below. No markdown code fences, no preamble, no explanation outside the JSON.

RULES:
1. Every tech stack recommendation MUST be justified in light of the stated constraints — do not give the same stack regardless of team size/timeline/budget/skill level. A solo 24-hour hackathon with a beginner should not receive a Kubernetes microservices recommendation.
2. If budget = "free", the "paid" field must still be filled (as a future upgrade path), but the "free" option must be genuinely usable at $0, not a crippled trial.
3. Every option needs a "why" of 1-2 sentences, written in plain language, naming the actual tradeoff (not marketing language).
4. architecture.layers must reflect components that are ACTUALLY needed for this idea — do not pad with generic layers the idea does not require (e.g. do not add an "AI Layer" if the idea has no AI feature)
5. roadmap must have between 3 and 5 phases, ordered, each buildable independently, with the MVP phase first and clearly the smallest possible slice that proves the core idea works.
6. Keep all string fields concise: overview <= 60 words, each "why" <= 30 words, each task <= 15 words.
7. Output must be parseable by a strict JSON parser. Use double quotes only. No trailing commas.
8. If the idea is too vague to blueprint, still produce your best-guess JSON, but set "clarification_needed" to a short question string; otherwise set it to null.

Return ONLY the JSON object described in the schema. Nothing before it, nothing after it.`;

// Preloaded examples for quick testing
const EXAMPLES = [
  {
    title: "Grocery Split",
    idea: "A mobile app that lets hostel students split and track shared grocery expenses.",
    constraints: { team_size: "solo", timeline: "48 hours", budget: "free", skill_level: "intermediate" }
  },
  {
    title: "AI Audio Book Reader",
    idea: "A mobile application that listens to children reading stories out loud, highlights words, and gives real-time pronunciation corrections using AI.",
    constraints: { team_size: "2-4", timeline: "2 weeks", budget: "low", skill_level: "advanced" }
  },
  {
    title: "Decentralized Tickets",
    idea: "A Web3 event ticketing system where organizers issue tickets as NFTs, avoiding scalpers and letting users resell tickets within a capped price range.",
    constraints: { team_size: "2-4", timeline: "3 months", budget: "flexible", skill_level: "intermediate" }
  }
];

function App() {
  // State for user inputs
  const [idea, setIdea] = useState('');
  const [constraints, setConstraints] = useState({
    team_size: 'solo',
    timeline: '48 hours',
    budget: 'free',
    skill_level: 'intermediate'
  });

  // Settings state (API Keys)
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [apiKeys, setApiKeys] = useState({
    groq: '',
    gemini: '',
    anthropic: ''
  });
  const [selectedProvider, setSelectedProvider] = useState('groq');
  const [selectedModel, setSelectedModel] = useState('llama-3.3-70b-versatile');

  // Loading & App States
  const [loading, setLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState('');
  const [error, setError] = useState(null);
  const [repairAttempts, setRepairAttempts] = useState(0);
  const [blueprint, setBlueprint] = useState(null);
  const [showPaidStack, setShowPaidStack] = useState(false);
  const [cacheHit, setCacheHit] = useState(false);
  
  // Roadmap task checklist completion state
  const [completedTasks, setCompletedTasks] = useState({});
  const [toastMessage, setToastMessage] = useState(null);

  // Load configuration from local storage on mount
  useEffect(() => {
    const savedKeys = localStorage.getItem('blueprint_api_keys');
    if (savedKeys) {
      try {
        const parsed = JSON.parse(savedKeys);
        setApiKeys(prev => ({ ...prev, ...parsed }));
      } catch (e) {
        console.error("Failed to parse saved API keys:", e);
      }
    }

    const savedProvider = localStorage.getItem('blueprint_selected_provider');
    if (savedProvider) setSelectedProvider(savedProvider);

    const savedModel = localStorage.getItem('blueprint_selected_model');
    if (savedModel) {
      if (savedModel === 'llama-3.1-70b-versatile') {
        setSelectedModel('llama-3.3-70b-versatile');
        localStorage.setItem('blueprint_selected_model', 'llama-3.3-70b-versatile');
      } else {
        setSelectedModel(savedModel);
      }
    }

    // Initial default example loading
    setIdea(EXAMPLES[0].idea);
    setConstraints(EXAMPLES[0].constraints);
  }, []);

  // Save Settings helper
  const handleSaveSettings = (newKeys, provider, model) => {
    setApiKeys(newKeys);
    setSelectedProvider(provider);
    setSelectedModel(model);
    localStorage.setItem('blueprint_api_keys', JSON.stringify(newKeys));
    localStorage.setItem('blueprint_selected_provider', provider);
    localStorage.setItem('blueprint_selected_model', model);
    setSettingsOpen(false);
    triggerToast("Settings saved successfully!");
  };

  // Helper for micro toasts
  const triggerToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 3000);
  };

  // Hashing and Caching helpers
  const getCacheKey = (ideaText, constr) => {
    const cleaned = {
      idea: ideaText.trim().toLowerCase(),
      team_size: constr.team_size,
      timeline: constr.timeline,
      budget: constr.budget,
      skill_level: constr.skill_level,
      provider: selectedProvider,
      model: selectedModel
    };
    return 'bp_cache_' + btoa(unescape(encodeURIComponent(JSON.stringify(cleaned))));
  };

  const getCachedBlueprint = (key) => {
    const cached = localStorage.getItem(key);
    if (cached) {
      try {
        return JSON.parse(cached);
      } catch (e) {
        return null;
      }
    }
    return null;
  };

  const cacheBlueprint = (key, data) => {
    try {
      localStorage.setItem(key, JSON.stringify(data));
    } catch (e) {
      console.warn("Storage quota exceeded, unable to cache.", e);
    }
  };

  // Copy blueprint to clipboard as JSON
  const handleCopyJSON = () => {
    if (!blueprint) return;
    navigator.clipboard.writeText(JSON.stringify(blueprint, null, 2));
    triggerToast("JSON copied to clipboard!");
  };

  // Parsing & Sanitizing JSON from API Response
  const parseResponseJSON = (text) => {
    let clean = text.trim();
    
    // 1. Strip markdown code block markers
    const markdownMatch = clean.match(/^(?:```(?:json)?\s*)?([\s\S]*?)(?:\s*```)?$/);
    if (markdownMatch && markdownMatch[1]) {
      clean = markdownMatch[1].trim();
    }
    
    // 2. Find the bounds of the actual JSON object
    const startIdx = clean.indexOf('{');
    const endIdx = clean.lastIndexOf('}');
    if (startIdx !== -1 && endIdx !== -1 && endIdx > startIdx) {
      clean = clean.substring(startIdx, endIdx + 1);
    }
    
    // 3. Attempt parse
    const parsed = JSON.parse(clean);

    // 4. Validate schema top-level elements (partial UI support handles missing segments)
    const requiredKeys = ['project_name', 'overview', 'tech_stack', 'architecture', 'roadmap'];
    const missingKeys = requiredKeys.filter(k => !(k in parsed));
    if (missingKeys.length > 0) {
      console.warn("Missing expected top-level properties:", missingKeys);
    }

    return parsed;
  };

  // API Call Orchestration (Supports Groq & Gemini client-side)
  const makeLLMCall = async (userPrompt, chatHistory = [], isRepairAttempt = false) => {
    const activeKey = apiKeys[selectedProvider];
    if (!activeKey && selectedProvider !== 'gemini') {
      throw new Error(`API key for ${selectedProvider} is not set. Open Settings (gear icon) to configure it.`);
    }

    if (selectedProvider === 'groq') {
      setLoadingStep(isRepairAttempt ? "Submitting repair instructions..." : "Connecting to Groq API...");
      
      const messages = [
        { role: 'system', content: SYSTEM_PROMPT },
        ...chatHistory,
        { role: 'user', content: userPrompt }
      ];

      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${activeKey}`
        },
        body: JSON.stringify({
          model: selectedModel,
          messages: messages,
          temperature: 0.1,
          response_format: { type: "json_object" }
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error?.message || `Groq API returned HTTP ${response.status}`);
      }

      const result = await response.json();
      return {
        text: result.choices[0].message.content,
        history: [...chatHistory, { role: 'user', content: userPrompt }, { role: 'assistant', content: result.choices[0].message.content }]
      };

    } else if (selectedProvider === 'gemini') {
      setLoadingStep(isRepairAttempt ? "Submitting repair instructions..." : "Connecting to Gemini API...");
      
      // If key is empty, try to use a free key or direct fetch.
      const geminiKey = activeKey || ''; 
      if (!geminiKey) {
        throw new Error("Gemini API key is required. Open Settings (gear icon) to enter your Google AI Studio API key.");
      }

      const modelName = selectedModel.includes('pro') ? 'gemini-1.5-pro' : 'gemini-1.5-flash';
      const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${geminiKey}`;
      
      // Combine prompt history into a unified instructions string
      const systemInstructions = SYSTEM_PROMPT;
      const contentParts = [];
      
      // Add chat history to content parts
      chatHistory.forEach(msg => {
        contentParts.push({ text: `${msg.role.toUpperCase()}: ${msg.content}\n` });
      });
      contentParts.push({ text: `USER:\n${userPrompt}` });

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          contents: [{ parts: contentParts }],
          systemInstruction: {
            parts: [{ text: systemInstructions }]
          },
          generationConfig: {
            responseMimeType: "application/json",
            temperature: 0.1
          }
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error?.message || `Gemini API returned HTTP ${response.status}`);
      }

      const result = await response.json();
      const textOutput = result.candidates[0].content.parts[0].text;
      
      return {
        text: textOutput,
        history: [...chatHistory, { role: 'user', content: userPrompt }, { role: 'assistant', content: textOutput }]
      };
    } else {
      throw new Error(`Provider ${selectedProvider} is not currently supported in this client build. Please select Groq or Gemini.`);
    }
  };

  // Main Orchestrator Flow with Validation & Repair
  const handleGenerate = async (e) => {
    if (e) e.preventDefault();
    if (!idea.trim()) return;

    setLoading(true);
    setError(null);
    setCacheHit(false);
    setRepairAttempts(0);
    setCompletedTasks({});

    const cacheKey = getCacheKey(idea, constraints);
    const cachedData = getCachedBlueprint(cacheKey);
    
    if (cachedData) {
      setTimeout(() => {
        setBlueprint(cachedData);
        setCacheHit(true);
        setLoading(false);
        triggerToast("Loaded matching plan from client-side cache.");
      }, 600);
      return;
    }

    const userPrompt = `PROJECT IDEA: ${idea}
CONSTRAINTS:
- team_size: ${constraints.team_size}
- timeline: ${constraints.timeline}
- budget: ${constraints.budget}
- skill_level: ${constraints.skill_level}`;

    try {
      // 1. Initial LLM call
      const firstResult = await makeLLMCall(userPrompt);
      
      try {
        setLoadingStep("Validating JSON schema format...");
        const parsed = parseResponseJSON(firstResult.text);
        setBlueprint(parsed);
        cacheBlueprint(cacheKey, parsed);
        setLoading(false);
      } catch (parseError) {
        console.warn("First LLM output failed to parse:", parseError);
        
        // 2. Repair Strategy (ONE attempt)
        setRepairAttempts(1);
        setLoadingStep("Invalid JSON format. Initiating automatic repair loop...");
        
        const repairPrompt = "Your last output was invalid JSON. Return only valid JSON matching the schema, nothing else.";
        const repairResult = await makeLLMCall(repairPrompt, firstResult.history, true);
        
        try {
          setLoadingStep("Validating repaired schema...");
          const repairedParsed = parseResponseJSON(repairResult.text);
          setBlueprint(repairedParsed);
          cacheBlueprint(cacheKey, repairedParsed);
          setLoading(false);
          triggerToast("Successfully repaired JSON in secondary pass!");
        } catch (repairParseError) {
          console.error("Secondary repair attempt also failed to parse:", repairParseError);
          // Set partial parse or raw fallback if possible, else throw
          throw new Error("Unable to parse a clean JSON structure from the AI after two attempts. Please refine the specificity of your project idea.");
        }
      }
    } catch (err) {
      console.error(err);
      setError(err.message);
      setLoading(false);
    }
  };

  const selectExample = (ex) => {
    setIdea(ex.idea);
    setConstraints(ex.constraints);
    triggerToast(`Loaded "${ex.title}" example template!`);
  };

  const toggleTaskCompletion = (phaseIndex, taskIndex) => {
    const key = `${phaseIndex}-${taskIndex}`;
    setCompletedTasks(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  // Helper for categorizing category icons
  const getCategoryIcon = (category = '') => {
    const c = category.toLowerCase();
    if (c.includes('front')) return <Globe className="w-5 h-5 text-sky-400" />;
    if (c.includes('back')) return <Cpu className="w-5 h-5 text-emerald-400" />;
    if (c.includes('data')) return <Database className="w-5 h-5 text-amber-400" />;
    if (c.includes('auth')) return <Lock className="w-5 h-5 text-indigo-400" />;
    if (c.includes('ai') || c.includes('ml')) return <Sparkles className="w-5 h-5 text-purple-400" />;
    return <Layout className="w-5 h-5 text-slate-400" />;
  };

  return (
    <div className="flex-1 flex flex-col min-h-screen bg-[#080c16] relative text-slate-100">
      
      {/* Dynamic Background Gradients */}
      <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-purple-900/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-10 right-1/4 w-[400px] h-[400px] bg-blue-900/10 rounded-full blur-[120px] pointer-events-none" />

      {/* Main App Bar */}
      <header className="no-print w-full border-b border-slate-800 bg-[#0d1426]/60 backdrop-blur-md sticky top-0 z-40 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="bg-gradient-to-tr from-violet-600 to-indigo-500 p-2.5 rounded-xl shadow-lg shadow-indigo-500/20">
            <Layers className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight bg-gradient-to-r from-white via-slate-100 to-slate-400 bg-clip-text text-transparent m-0 font-display">
              AI Project Blueprint Generator
            </h1>
            <p className="text-xs text-slate-400 m-0">Constraint-Aware Architectural Blueprint Spec</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setSettingsOpen(true)}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-slate-300 bg-slate-800/40 border border-slate-700/60 hover:bg-slate-700/50 transition-colors"
            title="Configure LLM API Keys"
          >
            <Settings className="w-4.5 h-4.5" />
            <span className="text-sm font-medium">Configure API</span>
          </button>
        </div>
      </header>

      {/* Central Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Side: Parameters / Form */}
        <section className="no-print lg:col-span-5 flex flex-col gap-6 animate-fade-in">
          
          {/* Preset Ideas Selector */}
          <div className="glass-panel rounded-2xl p-5 border border-slate-800/80">
            <div className="flex items-center gap-2 mb-3">
              <BookOpen className="w-4 h-4 text-violet-400" />
              <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-400 m-0">
                Preset Idea Templates
              </h2>
            </div>
            <div className="flex flex-wrap gap-2">
              {EXAMPLES.map((ex, index) => (
                <button
                  key={index}
                  onClick={() => selectExample(ex)}
                  className="text-xs px-3 py-2 rounded-lg bg-slate-800/30 border border-slate-700/40 text-slate-300 hover:border-violet-500/30 hover:bg-violet-950/20 transition-all font-medium"
                >
                  {ex.title}
                </button>
              ))}
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleGenerate} className="glass-panel rounded-2xl p-6 border border-slate-800/80 flex flex-col gap-5">
            <div>
              <label htmlFor="project-idea-input" className="block text-sm font-semibold text-slate-300 mb-2">
                1. Describe your Project Idea
              </label>
              <textarea
                id="project-idea-input"
                className="w-full min-h-[120px] rounded-xl bg-[#090e1a] border border-slate-800 hover:border-slate-700 focus:border-violet-500 focus:ring-1 focus:ring-violet-500 p-3.5 text-sm text-slate-200 outline-none transition-all placeholder-slate-500 leading-relaxed"
                placeholder="What are you building? Explain the core features and user flow..."
                value={idea}
                onChange={(e) => setIdea(e.target.value)}
                required
              />
            </div>

            {/* Constraints Block */}
            <div className="flex flex-col gap-4.5 border-t border-slate-800/60 pt-4">
              <h3 className="text-sm font-semibold text-slate-300 flex items-center gap-2 m-0">
                <Clock className="w-4 h-4 text-violet-400" />
                2. Set Constraints
              </h3>

              {/* Team Size Option */}
              <div>
                <span className="block text-xs font-semibold text-slate-400 mb-2">TEAM SIZE</span>
                <div className="grid grid-cols-3 gap-2">
                  {['solo', '2-4', '5+'].map((size) => (
                    <button
                      key={size}
                      type="button"
                      onClick={() => setConstraints(prev => ({ ...prev, team_size: size }))}
                      className={`text-xs py-2.5 px-3 rounded-xl border font-medium capitalize transition-all ${
                        constraints.team_size === size
                          ? 'bg-gradient-to-tr from-violet-600 to-indigo-600 border-violet-500 text-white shadow-md shadow-violet-600/10'
                          : 'bg-[#090e1a] border-slate-800 text-slate-400 hover:border-slate-700/80'
                      }`}
                    >
                      {size}
                    </button>
                  ))}
                </div>
              </div>

              {/* Timeline Option */}
              <div>
                <span className="block text-xs font-semibold text-slate-400 mb-2">TIMELINE</span>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {['24 hours', '48 hours', '2 weeks', '1 month', '3 months', '3+ months'].map((time) => (
                    <button
                      key={time}
                      type="button"
                      onClick={() => setConstraints(prev => ({ ...prev, timeline: time }))}
                      className={`text-xs py-2.5 px-2 rounded-xl border font-medium transition-all ${
                        constraints.timeline === time
                          ? 'bg-gradient-to-tr from-violet-600 to-indigo-600 border-violet-500 text-white shadow-md shadow-violet-600/10'
                          : 'bg-[#090e1a] border-slate-800 text-slate-400 hover:border-slate-700/80'
                      }`}
                    >
                      {time}
                    </button>
                  ))}
                </div>
              </div>

              {/* Budget Option */}
              <div>
                <span className="block text-xs font-semibold text-slate-400 mb-2">BUDGET</span>
                <div className="grid grid-cols-3 gap-2">
                  {['free', 'low', 'flexible'].map((bgt) => (
                    <button
                      key={bgt}
                      type="button"
                      onClick={() => setConstraints(prev => ({ ...prev, budget: bgt }))}
                      className={`text-xs py-2.5 px-3 rounded-xl border font-medium capitalize transition-all ${
                        constraints.budget === bgt
                          ? 'bg-gradient-to-tr from-violet-600 to-indigo-600 border-violet-500 text-white shadow-md shadow-violet-600/10'
                          : 'bg-[#090e1a] border-slate-800 text-slate-400 hover:border-slate-700/80'
                      }`}
                    >
                      {bgt}
                    </button>
                  ))}
                </div>
              </div>

              {/* Skill Level Option */}
              <div>
                <span className="block text-xs font-semibold text-slate-400 mb-2">SKILL LEVEL</span>
                <div className="grid grid-cols-3 gap-2">
                  {['beginner', 'intermediate', 'advanced'].map((lvl) => (
                    <button
                      key={lvl}
                      type="button"
                      onClick={() => setConstraints(prev => ({ ...prev, skill_level: lvl }))}
                      className={`text-xs py-2.5 px-3 rounded-xl border font-medium capitalize transition-all ${
                        constraints.skill_level === lvl
                          ? 'bg-gradient-to-tr from-violet-600 to-indigo-600 border-violet-500 text-white shadow-md shadow-violet-600/10'
                          : 'bg-[#090e1a] border-slate-800 text-slate-400 hover:border-slate-700/80'
                      }`}
                    >
                      {lvl}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || !idea.trim()}
              className="mt-2 w-full py-3.5 px-5 rounded-xl font-semibold text-sm text-white flex items-center justify-center gap-2 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 shadow-xl shadow-indigo-600/20 disabled:opacity-40 disabled:pointer-events-none transition-all duration-300"
            >
              {loading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Processing...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4.5 h-4.5" />
                  <span>Generate Architect Blueprint</span>
                </>
              )}
            </button>
          </form>

          {/* Model info label */}
          <div className="text-center">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-900 border border-slate-800 text-[11px] text-slate-400 font-mono">
              Using {selectedProvider === 'groq' ? 'Groq' : 'Gemini'} model: {selectedModel}
            </span>
          </div>
        </section>

        {/* Right Side: Output Dashboard / Report */}
        <section className="lg:col-span-7 flex flex-col gap-6">

          {/* State 1: Loading Screen */}
          {loading && (
            <div className="glass-panel rounded-2xl p-12 border border-slate-800/80 flex flex-col items-center justify-center gap-6 min-h-[450px]">
              <div className="relative flex items-center justify-center">
                <div className="w-16 h-16 rounded-full border-4 border-indigo-500/10 border-t-indigo-500 animate-spin" />
                <Layers className="w-6 h-6 text-indigo-400 absolute" />
              </div>
              <div className="text-center">
                <h3 className="text-lg font-bold text-slate-200 m-0">Generating Project Blueprint</h3>
                <p className="text-sm text-slate-400 mt-2 max-w-sm">
                  {loadingStep || "Formulating constraints system..."}
                </p>
                {repairAttempts > 0 && (
                  <span className="inline-flex mt-3 text-xs px-2.5 py-1 rounded bg-amber-950/30 text-amber-300 border border-amber-800/40 animate-pulse">
                    Reparse triggered. Rewriting JSON matching spec...
                  </span>
                )}
              </div>
            </div>
          )}

          {/* State 2: Error Screen */}
          {!loading && error && (
            <div className="glass-panel rounded-2xl p-8 border border-red-950/40 bg-red-950/10 flex flex-col gap-5 min-h-[450px]">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-red-500/10 rounded-xl text-red-400 border border-red-500/20">
                  <AlertTriangle className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-red-200 m-0">Generation Interrupted</h3>
                  <p className="text-xs text-red-400/80 m-0">LLM output failed to match parser criteria</p>
                </div>
              </div>
              
              <div className="rounded-xl bg-slate-950/50 border border-slate-800 p-4 font-mono text-xs text-slate-300 leading-relaxed overflow-x-auto max-h-[180px]">
                {error}
              </div>

              <div className="text-sm text-slate-300 leading-relaxed border-t border-slate-800 pt-4">
                <p className="font-medium text-slate-200 mb-1">How to fix:</p>
                <ul className="list-disc pl-5 text-xs text-slate-400 space-y-1.5">
                  <li>Verify that your API keys are configured and valid.</li>
                  <li>Rephrase the idea slightly to describe more features, so the architect can distinguish between Frontend/Backend requirements.</li>
                  <li>Try toggling to a different model (like Gemini 1.5 Pro) in Settings which has stricter schema matching.</li>
                </ul>
              </div>

              <button
                onClick={handleGenerate}
                className="mt-2 py-3 px-5 rounded-xl font-semibold text-xs text-slate-200 bg-slate-800 border border-slate-700 hover:bg-slate-700/60 transition-all flex items-center justify-center gap-2"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Retry Last Config</span>
              </button>
            </div>
          )}

          {/* State 3: Empty State */}
          {!loading && !error && !blueprint && (
            <div className="glass-panel rounded-2xl p-12 border border-slate-800/80 flex flex-col items-center justify-center text-center gap-6 min-h-[450px]">
              <div className="w-16 h-16 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-500 shadow-inner">
                <Sparkles className="w-8 h-8" />
              </div>
              <div className="max-w-sm">
                <h3 className="text-base font-bold text-slate-200 m-0">No Blueprint Generated Yet</h3>
                <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                  Provide a raw project idea and configure constraints on the left. The solution architect model will output a clean engineering blueprint.
                </p>
              </div>
              <button
                onClick={handleGenerate}
                className="py-2.5 px-5 rounded-xl border border-violet-500/20 bg-violet-950/20 hover:bg-violet-900/30 text-violet-300 font-medium text-xs transition-all flex items-center gap-2"
              >
                <Sparkles className="w-4 h-4" />
                <span>Run Demo Template</span>
              </button>
            </div>
          )}

          {/* State 4: Rendered Blueprint */}
          {!loading && !error && blueprint && (
            <div className="print-container flex flex-col gap-6 animate-fade-in">
              
              {/* Toolbar */}
              <div className="no-print flex items-center justify-between gap-3 bg-slate-900/60 border border-slate-800 p-3 rounded-2xl backdrop-blur-sm">
                <div className="flex items-center gap-2">
                  {cacheHit && (
                    <span className="text-[11px] font-medium px-2.5 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700/60 shadow-sm flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      Cached Hit
                    </span>
                  )}
                  <span className="text-[11px] font-medium px-2.5 py-0.5 rounded-full bg-slate-800 text-slate-400">
                    Parse Verified
                  </span>
                </div>
                
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleCopyJSON}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-300 bg-slate-850 hover:bg-slate-800 border border-slate-800 transition-colors"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy JSON</span>
                  </button>
                  <button
                    onClick={() => window.print()}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-200 bg-gradient-to-tr from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 shadow-md transition-colors"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Print PDF</span>
                  </button>
                </div>
              </div>

              {/* Main Blueprint Sheet */}
              <div id="blueprint-report-sheet" className="glass-panel rounded-2xl p-6 sm:p-8 border border-slate-800/80 shadow-2xl relative">
                
                {/* Header Information */}
                <div className="border-b border-slate-800/60 pb-6 mb-6">
                  <span className="text-[10px] font-bold uppercase tracking-widest bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 px-3 py-1 rounded-full">
                    Architect Spec Draft
                  </span>
                  
                  <h2 className="text-3xl font-extrabold tracking-tight text-white mt-4 m-0 font-display">
                    {blueprint.project_name || "Project Blueprint"}
                  </h2>
                  
                  <p className="text-sm text-slate-300 mt-3.5 leading-relaxed max-w-2xl font-light">
                    {blueprint.overview || "Overview not populated by model."}
                  </p>

                  {/* Constraint values verified */}
                  <div className="flex flex-wrap gap-2.5 mt-5">
                    {blueprint.constraints_summary && Object.entries(blueprint.constraints_summary).map(([key, value]) => (
                      <span
                        key={key}
                        className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 font-medium"
                      >
                        {key === 'team_size' && <Users className="w-3.5 h-3.5 text-violet-400" />}
                        {key === 'timeline' && <Clock className="w-3.5 h-3.5 text-sky-400" />}
                        {key === 'budget' && <DollarSign className="w-3.5 h-3.5 text-emerald-400" />}
                        {key === 'skill_level' && <Award className="w-3.5 h-3.5 text-amber-400" />}
                        <span className="capitalize text-slate-400 font-normal">{key.replace('_', ' ')}:</span>
                        <span className="font-semibold">{value}</span>
                      </span>
                    ))}
                  </div>
                </div>

                {/* Clarification warning if provided */}
                {blueprint.clarification_needed && (
                  <div className="mb-6 p-4.5 rounded-xl border border-amber-900/40 bg-amber-950/15 text-amber-200 flex gap-3">
                    <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                    <div>
                      <h4 className="text-xs font-bold text-amber-300 uppercase tracking-wider m-0">
                        Architect Clarification Requested
                      </h4>
                      <p className="text-xs text-amber-200/80 mt-1 leading-relaxed m-0 font-medium">
                        &ldquo;{blueprint.clarification_needed}&rdquo;
                      </p>
                      <p className="text-[10px] text-amber-400/60 mt-1.5 m-0 italic">
                        *Refine your project description on the left with these details and re-generate for a more targeted blueprint.
                      </p>
                    </div>
                  </div>
                )}

                {/* Section 1: Tech Stack */}
                <div className="mb-8" id="tech-stack-section">
                  <div className="flex items-center justify-between border-b border-slate-800/40 pb-3 mb-4">
                    <h3 className="text-base font-bold text-white flex items-center gap-2.5 m-0 font-display">
                      <Cpu className="w-4.5 h-4.5 text-indigo-400" />
                      1. Curated Tech Stack Recommendations
                    </h3>
                    
                    {/* Free/Paid selector */}
                    <div className="no-print flex items-center gap-2">
                      <span className={`text-[11px] font-semibold transition-colors ${!showPaidStack ? 'text-indigo-400' : 'text-slate-500'}`}>
                        Free Stacks
                      </span>
                      <button
                        type="button"
                        onClick={() => setShowPaidStack(prev => !prev)}
                        className={`w-9 h-5 rounded-full p-0.5 transition-colors relative flex items-center ${
                          showPaidStack ? 'bg-indigo-600' : 'bg-slate-700'
                        }`}
                      >
                        <span className={`w-4 h-4 rounded-full bg-white transition-transform ${showPaidStack ? 'translate-x-4' : 'translate-x-0'}`} />
                      </button>
                      <span className={`text-[11px] font-semibold transition-colors ${showPaidStack ? 'text-indigo-400' : 'text-slate-500'}`}>
                        Paid Tier
                      </span>
                    </div>
                  </div>

                  {blueprint.tech_stack && blueprint.tech_stack.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {blueprint.tech_stack.map((item, index) => {
                        const option = showPaidStack ? item.paid : item.free;
                        return (
                          <div
                            key={index}
                            className="tech-stack-card bg-[#0b101f] border border-slate-800 hover-glow rounded-xl p-4.5 flex flex-col justify-between"
                          >
                            <div>
                              <div className="flex items-start justify-between gap-3 mb-2">
                                <div className="flex items-center gap-2.5">
                                  {getCategoryIcon(item.category)}
                                  <span className="text-xs font-bold text-slate-200 uppercase tracking-wider">
                                    {item.category}
                                  </span>
                                </div>
                                <span className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md ${
                                  showPaidStack ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                }`}>
                                  {showPaidStack ? 'Paid Tier' : '$0 Free'}
                                </span>
                              </div>
                              <h4 className="text-sm font-bold text-white mt-3 mb-1">
                                {option?.name || "Pending..."}
                              </h4>
                              <p className="text-xs text-slate-400 leading-relaxed font-light mt-1">
                                {option?.why || "No justification provided."}
                              </p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-xs text-slate-500 italic">No tech stack entries compiled.</p>
                  )}
                </div>

                {/* Section 2: Stacked-Layer Architecture Diagram */}
                <div className="mb-8" id="architecture-section">
                  <h3 className="text-base font-bold text-white flex items-center gap-2.5 border-b border-slate-800/40 pb-3 mb-5 m-0 font-display">
                    <Layers className="w-4.5 h-4.5 text-indigo-400" />
                    2. Stacked-Layer Architecture View
                  </h3>

                  {blueprint.architecture && blueprint.architecture.layers && blueprint.architecture.layers.length > 0 ? (
                    <div className="flex flex-col gap-4">
                      
                      {/* Vertical Layers Stack */}
                      <div className="flex flex-col gap-2 relative">
                        {blueprint.architecture.layers.map((layer, index) => (
                          <React.Fragment key={index}>
                            
                            {/* Layer Box */}
                            <div className="bg-[#0b101f]/80 border border-slate-800/80 rounded-xl p-4.5 hover-glow relative flex flex-col md:flex-row md:items-center md:justify-between gap-3 z-10">
                              <div className="md:w-1/4 flex items-center gap-2">
                                <span className="text-[10px] font-mono text-indigo-400 select-none">
                                  L0{index + 1}
                                </span>
                                <h4 className="text-xs font-extrabold uppercase text-slate-200 tracking-wider m-0">
                                  {layer.name}
                                </h4>
                              </div>
                              
                              <div className="md:w-3/4 flex flex-wrap gap-2">
                                {layer.components && layer.components.map((comp, ci) => (
                                  <span
                                    key={ci}
                                    className="text-xs font-medium px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 flex items-center gap-1.5 shadow-inner"
                                  >
                                    <span className="w-1 h-1 rounded-full bg-indigo-500" />
                                    {comp}
                                  </span>
                                ))}
                              </div>
                            </div>

                            {/* Connector Arrow (unless last) */}
                            {index < blueprint.architecture.layers.length - 1 && (
                              <div className="flex justify-center my-0.5 no-print">
                                <div className="h-4 w-[1px] bg-gradient-to-b from-indigo-500/60 to-transparent relative">
                                  <ChevronRight className="w-3.5 h-3.5 text-indigo-500/50 absolute -left-1.5 top-0.5 rotate-90" />
                                </div>
                              </div>
                            )}

                          </React.Fragment>
                        ))}
                      </div>

                      {/* Data flow caption */}
                      {blueprint.architecture.data_flow_notes && (
                        <div className="bg-slate-900/40 border border-slate-850 rounded-xl p-4 mt-3 flex gap-3 items-start">
                          <Info className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
                          <div>
                            <span className="block text-[10px] font-semibold text-slate-400 uppercase tracking-widest">
                              DATA FLOW PROTOCOL
                            </span>
                            <p className="text-xs text-slate-300 mt-1 leading-relaxed m-0 font-light">
                              {blueprint.architecture.data_flow_notes}
                            </p>
                          </div>
                        </div>
                      )}

                    </div>
                  ) : (
                    <p className="text-xs text-slate-500 italic">No structural layers described.</p>
                  )}
                </div>

                {/* Section 3: Phased Roadmap Timeline */}
                <div className="mb-4" id="roadmap-section">
                  <h3 className="text-base font-bold text-white flex items-center gap-2.5 border-b border-slate-800/40 pb-3 mb-5 m-0 font-display">
                    <Calendar className="w-4.5 h-4.5 text-indigo-400" />
                    3. Phased Implementation Roadmap
                  </h3>

                  {blueprint.roadmap && blueprint.roadmap.length > 0 ? (
                    <div className="flex flex-col gap-6 relative pl-3 sm:pl-4 border-l border-slate-800/80 mt-2">
                      {blueprint.roadmap.map((phase, pIndex) => (
                        <div key={pIndex} className="roadmap-phase relative mb-2">
                          
                          {/* Timeline node node indicator */}
                          <div className="absolute -left-[21px] sm:-left-[25px] top-1.5 w-4.5 h-4.5 rounded-full bg-slate-900 border-2 border-indigo-500 flex items-center justify-center z-10">
                            <span className="w-1.5 h-1.5 rounded-full bg-indigo-400" />
                          </div>

                          {/* Phase card */}
                          <div className="bg-[#0b101f]/50 border border-slate-850 rounded-xl p-5 hover-glow">
                            <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
                              <span className="text-xs font-bold uppercase tracking-widest px-2.5 py-1 rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                                Phase: {phase.phase}
                              </span>
                              
                              {/* Progress bar */}
                              <span className="text-[10px] font-mono text-slate-400 font-medium">
                                Prove point: {phase.goal}
                              </span>
                            </div>

                            {/* Checklist tasks */}
                            <div className="mt-4 pt-3 border-t border-slate-800/60">
                              <span className="block text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-2.5">
                                IMPLEMENTATION CHECKLIST
                              </span>
                              
                              <ul className="space-y-2.5 p-0 m-0">
                                {phase.tasks && phase.tasks.map((task, tIndex) => {
                                  const cKey = `${pIndex}-${tIndex}`;
                                  const isChecked = !!completedTasks[cKey];
                                  return (
                                    <li
                                      key={tIndex}
                                      onClick={() => toggleTaskCompletion(pIndex, tIndex)}
                                      className={`flex items-start gap-3 cursor-pointer select-none group p-2 rounded-lg transition-all ${
                                        isChecked ? 'bg-slate-900/40 text-slate-500' : 'hover:bg-slate-900/30'
                                      }`}
                                    >
                                      <div className={`mt-0.5 w-4 h-4 rounded border flex items-center justify-center transition-all ${
                                        isChecked
                                          ? 'border-indigo-500 bg-indigo-600/20 text-indigo-400'
                                          : 'border-slate-700 group-hover:border-slate-500 text-transparent'
                                      }`}>
                                        <CheckCircle className="w-3 h-3 fill-current" />
                                      </div>
                                      <span className={`text-xs font-medium ${isChecked ? 'line-through text-slate-500' : 'text-slate-300'}`}>
                                        {task}
                                      </span>
                                    </li>
                                  );
                                })}
                              </ul>
                            </div>
                          </div>

                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-slate-500 italic">No roadmap phases provided.</p>
                  )}
                </div>

              </div>
            </div>
          )}

        </section>
      </main>

      {/* Settings Modal (Overlay) */}
      {settingsOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="glass-panel-glow rounded-2xl w-full max-w-md overflow-hidden animate-fade-in">
            <div className="px-6 py-5 border-b border-slate-800 bg-[#0d1426]/60 flex items-center justify-between">
              <h3 className="text-base font-bold text-white m-0 flex items-center gap-2">
                <Settings className="w-5 h-5 text-indigo-400" />
                API Configuration
              </h3>
              <button
                onClick={() => setSettingsOpen(false)}
                className="text-slate-400 hover:text-slate-200 text-sm font-semibold"
              >
                Close
              </button>
            </div>

            <div className="p-6 flex flex-col gap-4">
              
              {/* Provider Selection */}
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase mb-2">
                  LLM Provider
                </label>
                <div className="grid grid-cols-2 gap-2.5">
                  {[
                    { id: 'groq', name: 'Groq Cloud' },
                    { id: 'gemini', name: 'Google Gemini' }
                  ].map(p => (
                    <button
                      key={p.id}
                      onClick={() => {
                        setSelectedProvider(p.id);
                        setSelectedModel(p.id === 'groq' ? 'llama-3.3-70b-versatile' : 'gemini-1.5-flash');
                      }}
                      className={`text-xs py-2 px-3 rounded-lg border font-semibold transition-all ${
                        selectedProvider === p.id
                          ? 'bg-indigo-600 border-indigo-500 text-white'
                          : 'bg-[#090e1a] border-slate-850 text-slate-400 hover:border-slate-800'
                      }`}
                    >
                      {p.name}
                    </button>
                  ))}
                </div>
              </div>

              {/* Model Selection */}
              <div>
                <label htmlFor="model-select" className="block text-xs font-semibold text-slate-400 uppercase mb-2">
                  Model Instance
                </label>
                <select
                  id="model-select"
                  value={selectedModel}
                  onChange={(e) => setSelectedModel(e.target.value)}
                  className="w-full bg-[#090e1a] border border-slate-850 text-xs text-slate-200 rounded-lg p-2.5 focus:border-indigo-500 outline-none"
                >
                  {selectedProvider === 'groq' ? (
                    <>
                      <option value="llama-3.3-70b-versatile">llama-3.3-70b-versatile</option>
                      <option value="llama-3.1-8b-instant">llama-3.1-8b-instant</option>
                      <option value="mixtral-8x7b-32768">mixtral-8x7b-32768</option>
                    </>
                  ) : (
                    <>
                      <option value="gemini-1.5-flash">gemini-1.5-flash (Fast & Structured)</option>
                      <option value="gemini-1.5-pro">gemini-1.5-pro (Highly Logical)</option>
                    </>
                  )}
                </select>
              </div>

              {/* API Keys Inputs */}
              <div className="border-t border-slate-800/60 pt-4 mt-2">
                <span className="block text-xs font-semibold text-slate-400 uppercase mb-3">
                  Provider Keys
                </span>
                
                <div className="flex flex-col gap-3.5">
                  <div>
                    <label htmlFor="groq-key-input" className="block text-[11px] text-slate-400 mb-1">Groq API Key</label>
                    <input
                      id="groq-key-input"
                      type="password"
                      className="w-full bg-[#090e1a] border border-slate-850 text-xs text-slate-200 rounded-lg p-2.5 focus:border-indigo-500 outline-none placeholder-slate-700"
                      placeholder="gsk_..."
                      value={apiKeys.groq}
                      onChange={(e) => setApiKeys(prev => ({ ...prev, groq: e.target.value }))}
                    />
                  </div>

                  <div>
                    <label htmlFor="gemini-key-input" className="block text-[11px] text-slate-400 mb-1">Gemini API Key</label>
                    <input
                      id="gemini-key-input"
                      type="password"
                      className="w-full bg-[#090e1a] border border-slate-850 text-xs text-slate-200 rounded-lg p-2.5 focus:border-indigo-500 outline-none placeholder-slate-700"
                      placeholder="AIzaSy..."
                      value={apiKeys.gemini}
                      onChange={(e) => setApiKeys(prev => ({ ...prev, gemini: e.target.value }))}
                    />
                  </div>
                </div>
              </div>

              <div className="text-[10px] text-slate-500 leading-normal mt-2">
                * Keys are saved in local web browser storage and used directly to hit provider endpoints. No backend interceptors.
              </div>

              <button
                onClick={() => handleSaveSettings(apiKeys, selectedProvider, selectedModel)}
                className="mt-3 w-full py-2.5 rounded-lg text-xs font-semibold text-white bg-gradient-to-tr from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 transition-colors shadow-lg"
              >
                Apply & Save Config
              </button>

            </div>
          </div>
        </div>
      )}

      {/* Floating micro notification toasts */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 px-4.5 py-3 rounded-xl bg-slate-900 border border-slate-800 text-xs font-semibold text-indigo-400 shadow-2xl z-50 flex items-center gap-2 animate-fade-in no-print">
          <CheckCircle className="w-4 h-4 text-emerald-400 fill-emerald-400/10" />
          <span>{toastMessage}</span>
        </div>
      )}

    </div>
  );
}

export default App;
