import React, { useState } from 'react';
import { Sparkles, Terminal, Users, Cpu, Clock, HelpCircle, Code2, ShieldAlert } from 'lucide-react';

export default function IdeaForm({ onSubmit, loading }) {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    team_size: 'Solo',
    skills: 'Beginner',
    timeframe: '24h',
    budget: 'Free tier only',
    platform: 'Web',
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.title.trim() || !formData.description.trim()) return;
    onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="w-full space-y-6 bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-2xl shadow-violet-500/5">
      <div className="flex items-center gap-2 pb-4 border-b border-slate-800">
        <Terminal className="w-5 h-5 text-violet-400" />
        <h2 className="text-lg font-semibold text-slate-100">Intake Details</h2>
      </div>

      <div className="space-y-4">
        {/* Title */}
        <div>
          <label htmlFor="title" className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
            Project Title
          </label>
          <input
            type="text"
            id="title"
            name="title"
            required
            value={formData.title}
            onChange={handleChange}
            placeholder="e.g., StudyRoom Booker, AutoNews Summarizer"
            className="w-full bg-slate-950 border border-slate-800 focus:border-violet-500 focus:ring-1 focus:ring-violet-500 rounded-lg px-4 py-2.5 text-slate-200 text-sm placeholder-slate-600 outline-none transition-all"
          />
        </div>

        {/* Description */}
        <div>
          <label htmlFor="description" className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
            Raw Idea / Description
          </label>
          <textarea
            id="description"
            name="description"
            required
            rows={4}
            value={formData.description}
            onChange={handleChange}
            placeholder="Describe your project idea in detail. Specify what problem it solves, what features you want, and how it should behave..."
            className="w-full bg-slate-950 border border-slate-800 focus:border-violet-500 focus:ring-1 focus:ring-violet-500 rounded-lg px-4 py-2.5 text-slate-200 text-sm placeholder-slate-600 outline-none resize-none transition-all"
          />
        </div>

        {/* Dropdowns row 1 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="platform" className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
              <Code2 className="w-3.5 h-3.5" />
              Platform
            </label>
            <select
              id="platform"
              name="platform"
              value={formData.platform}
              onChange={handleChange}
              className="w-full bg-slate-950 border border-slate-800 focus:border-violet-500 rounded-lg px-3 py-2 text-slate-300 text-sm outline-none transition-all"
            >
              <option value="Web">Web Application</option>
              <option value="Mobile">Mobile App</option>
              <option value="Desktop">Desktop App</option>
              <option value="CLI">Command Line (CLI)</option>
              <option value="IoT">IoT / Hardware</option>
            </select>
          </div>

          <div>
            <label htmlFor="timeframe" className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
              <Clock className="w-3.5 h-3.5" />
              Timeframe
            </label>
            <select
              id="timeframe"
              name="timeframe"
              value={formData.timeframe}
              onChange={handleChange}
              className="w-full bg-slate-950 border border-slate-800 focus:border-violet-500 rounded-lg px-3 py-2 text-slate-300 text-sm outline-none transition-all"
            >
              <option value="24h">24 Hour Hackathon</option>
              <option value="48h">48 Hour Hackathon</option>
              <option value="1 week">1 Week</option>
              <option value="1 month">1 Month</option>
              <option value="Flexible">Flexible / Semester Project</option>
            </select>
          </div>
        </div>

        {/* Dropdowns row 2 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label htmlFor="team_size" className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
              <Users className="w-3.5 h-3.5" />
              Team Size
            </label>
            <select
              id="team_size"
              name="team_size"
              value={formData.team_size}
              onChange={handleChange}
              className="w-full bg-slate-950 border border-slate-800 focus:border-violet-500 rounded-lg px-3 py-2 text-slate-300 text-sm outline-none transition-all"
            >
              <option value="Solo">Solo Builder</option>
              <option value="2-3 members">2-3 Members</option>
              <option value="4+ members">4+ Members</option>
            </select>
          </div>

          <div>
            <label htmlFor="skills" className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
              <Cpu className="w-3.5 h-3.5" />
              Team Skills
            </label>
            <select
              id="skills"
              name="skills"
              value={formData.skills}
              onChange={handleChange}
              className="w-full bg-slate-950 border border-slate-800 focus:border-violet-500 rounded-lg px-3 py-2 text-slate-300 text-sm outline-none transition-all"
            >
              <option value="Beginner">Beginner (Basic HTML/JS)</option>
              <option value="Intermediate">Intermediate (React/APIs)</option>
              <option value="Advanced">Advanced (Full-stack/DevOps)</option>
            </select>
          </div>

          <div>
            <label htmlFor="budget" className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
              <HelpCircle className="w-3.5 h-3.5" />
              Budget Limit
            </label>
            <select
              id="budget"
              name="budget"
              value={formData.budget}
              onChange={handleChange}
              className="w-full bg-slate-950 border border-slate-800 focus:border-violet-500 rounded-lg px-3 py-2 text-slate-300 text-sm outline-none transition-all"
            >
              <option value="Free tier only">100% Free Tiers Only</option>
              <option value="Low budget (<$50)">Low Budget (&lt;$50)</option>
              <option value="Flexible">Flexible Budget</option>
            </select>
          </div>
        </div>
      </div>

      <button
        type="submit"
        disabled={loading || !formData.title.trim() || !formData.description.trim()}
        className="w-full flex items-center justify-center gap-2 py-3 px-4 font-semibold text-white bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 rounded-lg shadow-lg shadow-violet-600/25 active:scale-[0.98] transition-all disabled:opacity-50 disabled:pointer-events-none"
      >
        <Sparkles className="w-5 h-5 text-white/90" />
        Generate Build Plan
      </button>
    </form>
  );
}
