# BlueprintIQ 🚀

BlueprintIQ is an AI-powered project build-plan generator designed for developers, architects, and product managers. It takes a raw project idea and constraints (team size, skill level, timeframe, platform, and budget) and designs a comprehensive, production-ready build plan.

🔗 **Live Demo**: [https://blueprint-iq-iota.vercel.app](https://blueprint-iq-iota.vercel.app)

## 🌟 Key Features

*   **5-Stage LLM Pipeline**: Progressively plans project requirements, designs architecture diagrams, splits the work into modules, optimizes scope for MVP, and synthesizes a full documentation package.
*   **Live Streamed Console**: Real-time console stepper on the frontend showing backend generation logs as they happen.
*   **Dual-Database Resilience**: Auto-connects to **Supabase Postgres** for primary storage, with an automated fallback to a local **SQLite** database if Supabase is offline.
*   **Multi-User Authentication**: Integrated Supabase Auth gating with Row-Level Security (RLS) ensuring isolated history records for every user.
*   **Mermaid Flowcharts**: Renders system architecture diagrams dynamically in the browser, featuring an automated syntax sanitizer to clean and resolve parsing quirks.
*   **Multi-page PDF Export**: Standard print media overrides that generate professional, paginated, vector-based PDF reports directly from the browser print dialog.

---

## 🛠️ Tech Stack

### Frontend
*   **Vite + React 19**
*   **Tailwind CSS v4**
*   **Supabase JS Client** (Auth & Session synchronization)
*   **Mermaid.js** (Architecture rendering)
*   **Marked.js** (Markdown conversion)
*   **Lucide Icons**

### Backend
*   **FastAPI + Uvicorn** (Asynchronous REST API)
*   **SQLAlchemy ORM**
*   **Supabase Python Client**
*   **Groq SDK (Llama 3.3 70b)**
*   **Google GenAI SDK (Gemini 2.0 Flash)**

---

## 🚀 Local Development Setup

### Prerequisite Environment Keys
Create a `.env` file in the `backend/` folder and a `.env` file in the `frontend/` folder.

**backend/.env**:
```env
GROQ_API_KEY=your_groq_key
GEMINI_API_KEY=your_gemini_key
SUPABASE_URL=your_supabase_url
SUPABASE_KEY=your_supabase_service_key
```

**frontend/.env**:
```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
VITE_API_BASE_URL=http://localhost:8000
```

---

### Running the Backend (FastAPI)

1. Navigate to the backend directory:
   ```bash
   cd backend
   ```
2. Create and activate a Python virtual environment:
   ```bash
   python -m venv .venv
   # On Windows:
   .venv\Scripts\activate
   # On macOS/Linux:
   source .venv/bin/activate
   ```
3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
4. Start the FastAPI server:
   ```bash
   python -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
   ```

---

### Running the Frontend (Vite)

1. Open a new terminal window at the project root and navigate to the frontend directory:
   ```bash
   cd frontend
   ```
2. Install npm dependencies:
   ```bash
   npm install
   ```
3. Start the Vite dev server:
   ```bash
   npm run dev
   ```
4. Open **[http://localhost:5173](http://localhost:5173)** in your browser!

---

## 🌐 Production Deployment

*   **Backend**: Deploy on **Render** (or any persistent container hosting) to support long-running Server-Sent Events (SSE) connections for generation progress streaming.
*   **Frontend**: Deploy on **Vercel** with the Root Directory set to `frontend`.
