import React, { useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { Sparkles, Mail, Lock, LogIn, UserPlus, AlertCircle, Loader2 } from 'lucide-react';

export default function SignIn() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [mode, setMode] = useState('signin'); // 'signin' | 'signup'
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [signUpSuccess, setSignUpSuccess] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    setSignUpSuccess(false);

    try {
      if (mode === 'signin') {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      } else {
        const { data, error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        
        // Supabase sends a confirmation email by default unless configured otherwise.
        if (data?.user && data.session === null) {
          setSignUpSuccess(true);
          setMode('signin');
          setEmail('');
          setPassword('');
        }
      }
    } catch (err) {
      console.error("Auth error:", err);
      setError(err.message || 'Authentication failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-slate-950 flex flex-col justify-center items-center p-6 relative overflow-hidden font-sans">
      {/* Background radial glows */}
      <div className="absolute top-1/4 left-1/4 w-[400px] h-[400px] bg-violet-500/10 blur-[120px] rounded-full -z-10 animate-pulse" />
      <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] bg-indigo-500/10 blur-[120px] rounded-full -z-10" />
      
      {/* Brand Header */}
      <div className="text-center space-y-2 mb-8 select-none">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-violet-950/40 border border-violet-800/40 rounded-full text-violet-400 text-xs font-semibold">
          <Sparkles className="w-3.5 h-3.5" />
          AI Blueprint Engine
        </div>
        <h1 className="text-3xl font-extrabold tracking-tight text-slate-100">
          AI Project Guide
        </h1>
        <p className="text-slate-400 text-sm max-w-xs mx-auto">
          Sign in to generate, save, and access your project implementation plans.
        </p>
      </div>

      {/* Main card */}
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-xl p-8 shadow-2xl shadow-violet-500/5 space-y-6">
        <div className="flex border-b border-slate-800 pb-1.5 gap-4">
          <button
            onClick={() => { setMode('signin'); setError(null); setSignUpSuccess(false); }}
            className={`pb-3 text-sm font-semibold border-b-2 transition-all flex items-center gap-1.5 ${
              mode === 'signin' 
                ? 'border-violet-500 text-violet-400' 
                : 'border-transparent text-slate-450 hover:text-slate-200'
            }`}
          >
            <LogIn className="w-4 h-4" />
            Sign In
          </button>
          <button
            onClick={() => { setMode('signup'); setError(null); setSignUpSuccess(false); }}
            className={`pb-3 text-sm font-semibold border-b-2 transition-all flex items-center gap-1.5 ${
              mode === 'signup' 
                ? 'border-violet-500 text-violet-400' 
                : 'border-transparent text-slate-450 hover:text-slate-200'
            }`}
          >
            <UserPlus className="w-4 h-4" />
            Create Account
          </button>
        </div>

        {signUpSuccess && (
          <div className="p-4 bg-emerald-950/30 border border-emerald-900/50 rounded-lg text-xs text-emerald-400">
            Account created! Please check your email inbox to confirm your email before signing in.
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Email */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-450">
              Email Address
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-600">
                <Mail className="w-4 h-4" />
              </span>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full bg-slate-950 border border-slate-800 focus:border-violet-500 focus:ring-1 focus:ring-violet-500 rounded-lg pl-10 pr-4 py-2.5 text-slate-200 text-sm placeholder-slate-600 outline-none transition-all"
              />
            </div>
          </div>

          {/* Password */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-450">
              Password
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-600">
                <Lock className="w-4 h-4" />
              </span>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-slate-950 border border-slate-800 focus:border-violet-500 focus:ring-1 focus:ring-violet-500 rounded-lg pl-10 pr-4 py-2.5 text-slate-200 text-sm placeholder-slate-600 outline-none transition-all"
              />
            </div>
          </div>

          {error && (
            <div className="p-3 bg-red-950/30 border border-red-900/50 rounded-lg flex items-start gap-2.5 text-xs text-red-400">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 py-2.5 px-4 font-semibold text-white bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 rounded-lg shadow-lg shadow-violet-600/25 active:scale-[0.98] transition-all disabled:opacity-50 disabled:pointer-events-none text-sm mt-6"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : mode === 'signin' ? (
              'Sign In'
            ) : (
              'Sign Up'
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
