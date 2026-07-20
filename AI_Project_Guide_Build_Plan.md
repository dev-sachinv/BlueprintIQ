# AI Project Guide
### An AI-Powered Build-Plan Generator for Student Projects & Hackathons
*Give it a raw idea → get back a complete, buildable implementation plan (stack, architecture, features, MVP scope, deployment, risks) — the same kind of document you just fed me, generated automatically.*

Stack cost: **$0 — 100% free tier**

---

## 1 · Project Overview

**AI Project Guide** is a tool that takes a one-line or one-paragraph project idea and turns it into a full technical build plan — tech stack recommendation, system architecture diagram, module-by-module feature breakdown, MVP cuts, deployment checklist, and a challenges/mitigations table. It's essentially automating the exact planning work you did by hand for FutureLens and the AI Lie Detector.

**Problem it solves:** Students and hackathon teams spend hours deciding *what* to build with before they can start building. Most don't know which free-tier services pair well together, where the RAM/rate-limit traps are, or how to scope an MVP for a 24–48 hour judging window. AI Project Guide compresses that research into a single generated document.

**Target users:**
- Hackathon teams needing a stack + architecture in the first hour
- First-year/second-year CS/AIDS students planning a college project
- Solo builders deciding between Lovable/Cursor/FlutterFlow-style no-code vs. custom stack
- You, for your *next* hackathon idea after this one

**Positioning statement:**
"AI Project Guide — turns any raw idea into a free-tier-first, hackathon-ready build plan in minutes."

---

## 2 · Technology Stack (100% Free Tier)

| Layer | Tool / Service | Why it's free | Role |
|---|---|---|---|
| Frontend | React + Vite + Tailwind | Open-source, matches your existing stack | Idea input form, plan viewer, export UI |
| Frontend hosting | Vercel (Free tier) | Free static + serverless hosting | Deploys the dashboard |
| Backend API | FastAPI (Python) | Open-source | Orchestrates the multi-stage prompt pipeline |
| Backend hosting | Render (Free tier) | Free web-service tier | Hosts FastAPI |
| LLM — fast/structured | Groq API (Llama 3, free tier) | 3–10x lower latency, generous free quota | Stack Recommender, Feature Breakdown, MVP Scoper |
| LLM — long-context/synthesis | Gemini API (Flash, free tier) | 1M-token context | Final document assembly, architecture diagram generation |
| Database | Supabase (Postgres, free tier) | Free managed Postgres | Stores generated plans, versions, user ideas |
| Auth | Supabase Auth (free tier) | Bundled with Supabase | Login, saved plan history |
| Export | Custom Python (markdown → PDF via a library like `weasyprint` or `md-to-pdf`) | Free, open-source | Lets user download the plan as PDF/DOCX, same as your ResearchMind doc |

**Why the same Groq + Gemini split you already use:**
- Groq handles the short, structured, JSON-shaped calls (stack picks, feature lists) — fast turnaround matters because the pipeline chains 4–5 calls per plan.
- Gemini handles the *final assembly* step — stitching all the structured pieces into one long, coherent document — because that step benefits from a big context window more than raw speed.

---

## 3 · System Architecture

```
React + Tailwind Dashboard (Vercel)
        |
FastAPI Backend (Render, free tier)
        |
   ---------------------------------------------------
   |            |               |              |
Idea Intake   Stack        Architecture     Feature
(form)        Recommender  Generator        Breakdown
   |            |               |              |
   v            v               v              v
 Postgres     Groq API      Groq/Gemini     Groq API
 (save idea)  (JSON stack   (mermaid/ASCII  (per-module
              picks)        diagram text)   JSON blocks)
   |            |               |              |
   ------------------------------------------------
                        |
                MVP Scoper + Risk Table
                     (Groq API)
                        |
                Final Doc Assembler
                  (Gemini API, 1M ctx)
                        |
              Export (Markdown → PDF/DOCX)
```

**Request flow (example: user submits an idea):**
1. User types idea + constraints (team size, timeframe, skills, budget) into the React form.
2. FastAPI saves the raw idea to Supabase Postgres.
3. **Stage 1 (Groq):** Idea is classified (web app / mobile / ML / hardware / SaaS) and matched to a free-tier stack template.
4. **Stage 2 (Groq or Gemini depending on complexity):** Architecture diagram text is generated based on the chosen stack.
5. **Stage 3 (Groq):** Feature list is broken into modules, each with "what it does / tools used / how it works" — same structure as your ResearchMind doc.
6. **Stage 4 (Groq):** MVP cuts and a challenges/mitigations table are generated based on the stated timeframe.
7. **Stage 5 (Gemini, long context):** All prior JSON outputs are passed in together and assembled into one polished document.
8. Final plan is saved to Postgres (versioned) and rendered in the dashboard, with a "Download as PDF" button.

---

## 4 · Feature Breakdown

### 1. Idea Intake
**What it does:** Captures the raw idea plus constraints that shape everything downstream (timeframe, team skill level, budget ceiling, platform preference).
**Tools:** React form, FastAPI, Supabase Postgres
**How it works:** Structured form (not a single free-text box) — this matters because vague input produces vague plans. Fields: idea description, problem it solves, target users, team size/skills, time available, platform (web/mobile/both).

### 2. Stack Recommender
**What it does:** Picks a concrete, named free-tier stack (not generic "use React and a database") based on the idea type.
**Tools:** Groq API, a small rules table (idea-type → known-good free stacks) fed into the prompt as grounding
**How it works:** Prompted with your constraints table already in this doc (Render RAM limits, Supabase quotas, Groq/Gemini rate limits) so it doesn't hallucinate a stack that will fall over during a demo — this is the single highest-value piece, since picking the wrong stack is what costs teams the most time.

### 3. Architecture Generator
**What it does:** Produces a text-based system diagram (mermaid or ASCII, like the one above) showing data flow between the chosen services.
**Tools:** Groq/Gemini
**How it works:** Takes the Stack Recommender's output as input, so the diagram always matches the recommended stack rather than being generic.

### 4. Feature Breakdown
**What it does:** Splits the idea into buildable modules, each with a "what/tools/how" card — directly mirrors Section 4 of your ResearchMind doc.
**Tools:** Groq API, structured JSON output
**How it works:** One prompt per module keeps each card focused and avoids the model blending features together in one wall of text.

### 5. MVP Scoper
**What it does:** Given the stated timeframe, flags which features are "core," "stretch," or "cut," with a one-line reason for each — this is exactly Section 6 of your ResearchMind doc.
**Tools:** Groq API
**How it works:** Prompted with hackathon-specific heuristics (e.g., "anything requiring live third-party auth is risky for a 24hr demo") so the cuts are realistic, not arbitrary.

### 6. Risk & Mitigation Table
**What it does:** Generates a challenges/mitigations table specific to the chosen stack (rate limits, cold starts, free-tier expiry windows).
**Tools:** Groq API
**How it works:** Grounded in the same free-tier constraint facts used by the Stack Recommender, so risks are concrete (e.g., "Render free tier sleeps after 15 min") rather than generic ("scalability may be a concern").

### 7. Final Document Assembler
**What it does:** Stitches every stage's output into one long, formatted document — the actual deliverable.
**Tools:** Gemini API (1M-token context ingests all prior JSON in one call), markdown templating
**How it works:** All structured outputs from stages 1–6 are passed together so Gemini can keep terminology and section order consistent, rather than assembling it piece by piece.

### 8. Export & Versioning
**What it does:** Lets the user download the plan as Markdown/PDF/DOCX and re-generate specific sections without starting over.
**Tools:** Supabase Postgres (stores each version), Python markdown-to-PDF conversion
**How it works:** Each regeneration (e.g., "make the architecture more scalable") only reruns the relevant stage and re-assembles, instead of re-running the whole pipeline — keeps you inside free-tier rate limits.

---

## 5 · MVP Scope Decisions

| Feature | Reason to cut/simplify for MVP | Replacement |
|---|---|---|
| Full multi-turn chat refinement | Adds a lot of state management for a first version | Simple "regenerate this section" buttons per stage |
| PDF export with custom branding/templates | Nice-to-have, not core | Plain markdown-to-PDF, styled later |
| Auto-detecting idea type via embeddings | Extra ML step, marginal gain over a good classification prompt | Groq-based classification in the same prompt as Stack Recommender |
| Storing a searchable corpus of past plans | Real feature but not needed to prove the core loop | Just version history per user, no cross-user search yet |

---

## 6 · Deployment & Operations

- Same demo-day habits you already use for FutureLens: **wake the Render backend 1–2 minutes before any demo** to dodge the cold-start delay.
- Rotate Groq/Gemini free-tier keys if you're demoing to multiple judges back-to-back — the pipeline makes 4–5 LLM calls per generated plan, which adds up faster than a single-call app.
- Cache the Stack Recommender's output per idea-type combination where possible, so repeated similar ideas don't burn extra quota during testing.

---

## 7 · Challenges & Mitigations

| Challenge | Mitigation |
|---|---|
| Multi-stage pipeline (5 LLM calls) can hit free-tier rate limits during demo | Split calls across Groq and Gemini quota pools like your other projects; cache repeated stack lookups |
| Generated plans can be generic if idea input is vague | Structured intake form instead of a single free-text box; require timeframe + team skill fields |
| Final assembly step losing consistency across sections | Pass all prior stage outputs into one Gemini call rather than assembling incrementally |
| Users wanting to iterate without re-running everything | Version each stage's output separately so only the edited section re-runs |
| Hallucinated stack recommendations (e.g., suggesting a paid tier) | Ground every Stack Recommender prompt in a fixed, factual table of real free-tier limits (like Section 2 above) |

---

## Closing Note

This is essentially your `ai-coding-workflow` skill (PLAN → PROMPT → REVIEW → ITERATE) turned into a product — the pipeline stages above map almost directly onto that loop, just automated end-to-end instead of run manually in Cursor/Antigravity. Worth considering as your next hackathon submission, since you already have the mental model built.
