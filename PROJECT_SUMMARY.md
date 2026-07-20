# AI Project Guide - Project Implementation Summary

This document summarizes the architecture, features, database integrations, and directory structure of the **AI Project Guide** application built so far.

---

## 1. Overview
The **AI Project Guide** is a responsive, dark-themed developer dashboard that takes a raw project idea (along with constraints like team size, timeframe, skill level, and platform) and generates a structured, multi-page implementation blueprint. 

It executes a **5-stage generation pipeline** powered by LLMs, stores the results in a database, isolates user data using Supabase Authentication, and supports professional-grade PDF document export.

---

## 2. System Architecture & Tech Stack

### Frontend (React Single-Page App)
*   **Vite + React 19**: Ultra-fast build tool and rendering library.
*   **Tailwind CSS v4**: Utility-first CSS styling using Outfit & Plus Jakarta Sans typography.
*   **Supabase JS Client**: Direct authentication handling (email signup/login, session synchronization).
*   **Lucide Icons**: Modern vector icon set.
*   **Marked.js**: Compiles generated markdown text into styled HTML elements.
*   **Mermaid.js**: Dynamically draws interactive flowcharts using SVGs in the browser.

### Backend (FastAPI REST Server)
*   **FastAPI + Uvicorn**: High-performance asynchronous API server with hot reloading.
*   **SQLAlchemy ORM**: Database models mapping to SQLite.
*   **Supabase Python Client**: Real-time JWT user authentication checking and database sync.
*   **LLM Orchestrator**:
    *   **Groq SDK (Llama 3.3 70b)**: Speed-optimized structured JSON generation.
    *   **Google GenAI SDK (Gemini 2.0 Flash)**: Complex contextual synthesis and markdown writing.
    *   **OS Trust Store (`truststore`)**: Globally injected into SSL contexts at startup to prevent certificate verify errors behind developer proxies.

---

## 3. Key Completed Features

### 1. Resilient Streamed Generation
*   The orchestrator streams logs in real-time to a frontend console stepper during generation.
*   **API Fallback Engine**: If the Gemini API key runs out of free-tier requests (HTTP 429), the orchestrator automatically redirects the task to Groq (Llama 3.3 70b) so the request completes.

### 2. Multi-User Authentication & Data Isolation
*   Users register and sign in through a secure, dark-themed gateway.
*   All FastAPI endpoints require validation via the user's `Authorization: Bearer <JWT_token>` header.
*   The backend validates tokens against Supabase's authentication service and filters SQL queries by `user_id`, providing complete data isolation.

### 3. Dual-Mode Storage
*   The application attempts to connect to **Supabase Postgres** first.
*   If Supabase is offline or tables are missing, it automatically routes reads and writes to a local SQLite database (`projects.db`).

### 4. Advanced Printing & PDF Export
*   Includes print media queries that reset fullscreen elements (`overflow-hidden`, `h-screen`) during printing.
*   Hides sidebars and tab buttons (`no-print`), and generates a **unified multi-page vector-based PDF report** containing the title, full markdown text, tech stack table, system diagram, and MVP matrix sequentially.

### 5. Mermaid Syntax Sanitizer
*   Filters and cleans syntax errors (e.g. converting mixed sequence diagram nodes like `participant as` or `|label|>` back to flowchart standards) before rendering them, preventing parsing errors from interrupting the user experience.

---

## 4. Complete Directory & File Walkthrough

Below are the primary files implemented and modified in the workspace:

### Configuration & Database
*   **[backend/app/config.py](file:///d:/Sachin/Ai-Blueprint/backend/app/config.py)**: Loads environment variables (`.env`) and tests connections to activate Supabase or fallback SQLite.
*   **[backend/app/database.py](file:///d:/Sachin/Ai-Blueprint/backend/app/database.py)**: Defines the SQLAlchemy schema (`DBPlan`) and CRUD database functions (`save_plan`, `get_plans`, `get_plan_by_id`, `delete_plan`) with user isolation.
*   **[backend/app/schemas.py](file:///d:/Sachin/Ai-Blueprint/backend/app/schemas.py)**: Defines Pydantic validation schemas.

### API Router & Generation Pipeline
*   **[backend/app/main.py](file:///d:/Sachin/Ai-Blueprint/backend/app/main.py)**: Implements FastAPI routes, CORS middleware, JWT auth parser dependencies (`get_current_user`), and streamed event generators.
*   **[backend/app/pipeline.py](file:///d:/Sachin/Ai-Blueprint/backend/app/pipeline.py)**: Coordinates the 5 generation stages, parses prompts, and manages fallback API logic.
*   **[backend/test_pipeline.py](file:///d:/Sachin/Ai-Blueprint/backend/test_pipeline.py)**: Integration script to test the backend orchestration offline.

### Frontend Application Entry
*   **[frontend/src/App.jsx](file:///d:/Sachin/Ai-Blueprint/frontend/src/App.jsx)**: Gates the application; checks AuthContext and renders the SignIn card or the Main Dashboard.
*   **[frontend/src/lib/supabaseClient.js](file:///d:/Sachin/Ai-Blueprint/frontend/src/lib/supabaseClient.js)**: Configures the client instance using VITE environment parameters.
*   **[frontend/src/context/AuthContext.jsx](file:///d:/Sachin/Ai-Blueprint/frontend/src/context/AuthContext.jsx)**: Global listener for logins, logouts, and token refreshes.
*   **[frontend/src/index.css](file:///d:/Sachin/Ai-Blueprint/frontend/src/index.css)**: Implements scrollbars, prose text styling, and custom printing overrides.

### Dashboard UI Components
*   **[frontend/src/components/Dashboard.jsx](file:///d:/Sachin/Ai-Blueprint/frontend/src/components/Dashboard.jsx)**: Coordinates sidebar history queries, logout actions, intake forms, generation steps, and active views.
*   **[frontend/src/components/SignIn.jsx](file:///d:/Sachin/Ai-Blueprint/frontend/src/components/SignIn.jsx)**: Authentication form (Email & Password) supporting toggle transitions.
*   **[frontend/src/components/IdeaForm.jsx](file:///d:/Sachin/Ai-Blueprint/frontend/src/components/IdeaForm.jsx)**: Intake form with constraint selection grids.
*   **[frontend/src/components/PipelineProgress.jsx](file:///d:/Sachin/Ai-Blueprint/frontend/src/components/PipelineProgress.jsx)**: Live visual generator progress stepper.
*   **[frontend/src/components/PlanViewer.jsx](file:///d:/Sachin/Ai-Blueprint/frontend/src/components/PlanViewer.jsx)**: Multi-tab layout (Markdown, Tech Stack, Flowchart, MVP table) with a hidden unified layout for PDF printing.
