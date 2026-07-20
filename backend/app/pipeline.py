import json
import logging
import asyncio
import truststore
from typing import AsyncGenerator, Dict, Any
from groq import Groq
import google.generativeai as genai
from app.config import GROQ_API_KEY, GEMINI_API_KEY
from app.schemas import IdeaInput

# Inject native OS trust store to handle SSL certificates properly in restricted networks
try:
    truststore.inject_into_ssl()
    logger_msg = "Successfully injected truststore to use OS certificate credentials."
except Exception as trust_err:
    logger_msg = f"Failed to inject truststore: {trust_err}"

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)
logger.info(logger_msg)

# Initialize LLM Clients
groq_client = None
if GROQ_API_KEY:
    try:
        groq_client = Groq(api_key=GROQ_API_KEY)
    except Exception as e:
        logger.error(f"Error initializing Groq client: {e}")

if GEMINI_API_KEY:
    try:
        genai.configure(api_key=GEMINI_API_KEY, transport="rest")
    except Exception as e:
        logger.error(f"Error configuring Gemini client: {e}")

async def call_groq_json(prompt: str, system_message: str = "You are a helpful assistant that returns ONLY raw JSON.") -> Dict[str, Any]:
    """Helper to call Groq with JSON output mode."""
    if not groq_client:
        raise ValueError("Groq client not initialized. Check GROQ_API_KEY.")
    
    # We run the synchronous Groq API call in an executor to avoid blocking the event loop
    def make_call():
        return groq_client.chat.completions.create(
            # Using llama-3.3-70b-versatile or fallback to llama3-8b-8192
            model="llama-3.3-70b-versatile",
            messages=[
                {"role": "system", "content": system_message},
                {"role": "user", "content": prompt}
            ],
            response_format={"type": "json_object"},
            temperature=0.2,
        )
    
    loop = asyncio.get_event_loop()
    response = await loop.run_in_executor(None, make_call)
    content = response.choices[0].message.content
    try:
        return json.loads(content)
    except json.JSONDecodeError as e:
        logger.error(f"Failed to parse JSON from Groq: {content}")
        raise ValueError(f"Invalid JSON returned from Groq: {e}")

async def call_gemini(prompt: str, system_message: str = "") -> str:
    """Helper to call Gemini Flash for synthesis and freeform text generation."""
    if not GEMINI_API_KEY:
        raise ValueError("Gemini client not initialized. Check GEMINI_API_KEY.")
    
    def make_call():
        model = genai.GenerativeModel(
            model_name="gemini-2.0-flash",
            system_instruction=system_message if system_message else None
        )
        response = model.generate_content(prompt)
        return response.text
        
    loop = asyncio.get_event_loop()
    return await loop.run_in_executor(None, make_call)

async def call_gemini_with_groq_fallback(prompt: str, system_message: str = "") -> str:
    """Tries to call Gemini Flash. If it fails (due to quota, SSL, etc.), falls back to Groq Llama 3.3 70b."""
    if GEMINI_API_KEY:
        try:
            logger.info("Attempting Gemini API call...")
            res = await call_gemini(prompt, system_message)
            logger.info("Gemini API call succeeded.")
            return res
        except Exception as e:
            logger.warning(f"Gemini API call failed: {e}. Falling back to Groq Llama 3.3 70b...")
            
    # Fallback to Groq
    logger.info("Using Groq API fallback...")
    if not groq_client:
        raise ValueError("Both Gemini and Groq clients are unavailable. Check API keys.")
        
    def make_call():
        return groq_client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[
                {"role": "system", "content": system_message},
                {"role": "user", "content": prompt}
            ],
            temperature=0.3
        )
        
    loop = asyncio.get_event_loop()
    response = await loop.run_in_executor(None, make_call)
    return response.choices[0].message.content

async def generate_project_plan_stream(idea: IdeaInput) -> AsyncGenerator[Dict[str, Any], None]:
    """
    Orchestrates the multi-stage build-plan generator.
    Yields progress dictionary updates.
    """
    logger.info(f"Starting plan generation for: {idea.title}")
    
    # Pre-calculate constraints dict
    constraints = {
        "team_size": idea.team_size,
        "skills": idea.skills,
        "timeframe": idea.timeframe,
        "budget": idea.budget,
        "platform": idea.platform
    }
    
    # ==========================================
    # STAGE 1: Tech Stack Recommender
    # ==========================================
    yield {"status": "stack", "message": "Selecting the optimal free-tier technology stack...", "data": None}
    
    stack_prompt = f"""
    You are an expert developer stack selector. Recommend a concrete, production-ready stack for the following project.
    
    PROJECT TITLE: {idea.title}
    PROJECT DESCRIPTION: {idea.description}
    
    CONSTRAINTS:
    - Platform: {idea.platform}
    - Team Size: {idea.team_size}
    - Skill Level: {idea.skills}
    - Timeframe: {idea.timeframe}
    - Budget: {idea.budget} (CRITICAL: Prioritize 100% free-tier services like Render, Vercel, Supabase, SQLite, Netlify, Railway free tier, Hugging Face free space, etc.)
    
    You must output a JSON object containing:
    1. "stack": A list of items, where each item has "layer" (e.g., Frontend, Backend, Database, Hosting, Auth, Export), "tool" (e.g. React, FastAPI, Supabase Postgres, Render), "why_free" (why this service is free/affordable), and "role" (what it does in the app).
    2. "rationale": A paragraph explaining why this exact stack was chosen based on the skill level, timeframe, and platform constraints.
    
    Example output structure:
    {{
      "stack": [
         {{ "layer": "Frontend", "tool": "React + Vite", "why_free": "Open-source", "role": "User UI" }}
      ],
      "rationale": "Reason for selection..."
    }}
    """
    try:
        stack_data = await call_groq_json(stack_prompt, "You are a professional software architect. Output JSON only.")
        logger.info("Stage 1 completed.")
        yield {"status": "stack_done", "message": "Optimal free-tier stack selected.", "data": stack_data}
    except Exception as e:
        logger.error(f"Stage 1 failed: {e}")
        yield {"status": "error", "message": f"Stage 1 failed: {str(e)}", "data": None}
        return

    # ==========================================
    # STAGE 2: System Architecture Generator
    # ==========================================
    yield {"status": "architecture", "message": "Designing system architecture and data flows...", "data": None}
    
    stack_str = ", ".join([f"{item.get('layer')}: {item.get('tool')}" for item in stack_data.get("stack", [])])
    
    architecture_prompt = f"""
    You are a system architect. Create a system architecture diagram in Mermaid.js syntax for this project.
    
    PROJECT TITLE: {idea.title}
    PROJECT DESCRIPTION: {idea.description}
    RECOMMENDED STACK: {stack_str}
    
    You must output ONLY raw Mermaid diagram code starting with ```mermaid and ending with ```. No other explanation text.
    Ensure the nodes represent the exact tools chosen: {stack_str}.
    Use a clean flowchart (graph TD or graph LR) showing request flow from user interaction to backend, services, database, auth, and external APIs.
    CRITICAL syntax rule: Do NOT mix sequence diagram syntax (like 'participant' or 'as') with flowchart syntax ('graph TD'). Define nodes simply as: NodeID["Node Label"] (e.g. User["User Interaction"]) and link them with --> (e.g. User --> Frontend["React + Vite"]).
    Keep it professional, robust, and correctly formatted so it can render directly in Mermaid.js.
    """
    try:
        # Use Gemini with Groq fallback for diagram syntax consistency
        architecture_mermaid = await call_gemini_with_groq_fallback(architecture_prompt, "You are a system architecture tool. Return only the mermaid code block.")
        
        # Clean up code blocks if present
        if "```mermaid" in architecture_mermaid:
            architecture_mermaid = architecture_mermaid.split("```mermaid")[1].split("```")[0].strip()
        elif "```" in architecture_mermaid:
            architecture_mermaid = architecture_mermaid.split("```")[1].split("```")[0].strip()
            
        logger.info("Stage 2 completed.")
        yield {"status": "architecture_done", "message": "System architecture diagram generated.", "data": architecture_mermaid}
    except Exception as e:
        logger.error(f"Stage 2 failed: {e}")
        yield {"status": "error", "message": f"Stage 2 failed: {str(e)}", "data": None}
        return

    # ==========================================
    # STAGE 3: Feature Breakdown (Modules)
    # ==========================================
    yield {"status": "features", "message": "Structuring buildable modules and data contracts...", "data": None}
    
    features_prompt = f"""
    You are a technical lead. Break down the project into 4-6 modular development features or steps.
    
    PROJECT TITLE: {idea.title}
    PROJECT DESCRIPTION: {idea.description}
    TECH STACK: {stack_str}
    
    You must output a JSON object containing:
    1. "modules": A list of items, where each item has "name" (module name), "what_it_does" (brief summary of features), "tools" (specific tech stack components used here), and "how_it_works" (technical step-by-step description of data flows, files created, or API calls).
    
    Example output structure:
    {{
      "modules": [
        {{
          "name": "User Authentication",
          "what_it_does": "Allows users to signup and login safely.",
          "tools": "Supabase Auth, React Context",
          "how_it_works": "React form submits credentials to Supabase Auth client, which stores JWT in local storage."
        }}
      ]
    }}
    """
    try:
        features_data = await call_groq_json(features_prompt, "You are a technical product manager. Output JSON only.")
        logger.info("Stage 3 completed.")
        yield {"status": "features_done", "message": "Core development modules structured.", "data": features_data}
    except Exception as e:
        logger.error(f"Stage 3 failed: {e}")
        yield {"status": "error", "message": f"Stage 3 failed: {str(e)}", "data": None}
        return

    # ==========================================
    # STAGE 4: MVP Scoper & Risks
    # ==========================================
    yield {"status": "mvp", "message": "Scoping MVP features and identifying free-tier limits/risks...", "data": None}
    
    mvp_prompt = f"""
    You are a hackathon project advisor. Suggest MVP scoping decisions and evaluate technical risks.
    
    PROJECT TITLE: {idea.title}
    PROJECT DESCRIPTION: {idea.description}
    TIMEFRAME CONSTRAINT: {idea.timeframe}
    RECOMMENDED STACK: {stack_str}
    
    Provide:
    1. A list of feature decisions (Core/Keep, Stretch/Defer, Cut/Remove) with clear technical justifications suited for the timeframe {idea.timeframe}.
    2. A list of technical risks specific to the free-tier services used (e.g. Render cold-starts, Supabase connection limits, API rate-limits, etc.) with actionable mitigations.
    
    You must output a JSON object containing:
    1. "scoping": A list of items, where each item has "feature" (feature name), "action" (Keep / Stretch / Cut), "reason" (why this action was taken), and "replacement" (simplified workaround for MVP, if any).
    2. "risks": A list of items, where each item has "challenge" (the technical risk / limit) and "mitigation" (actionable solution).
    
    Example output structure:
    {{
      "scoping": [
        {{
          "feature": "Real-time Chat",
          "action": "Cut",
          "reason": "Too complex to test and manage socket connections within 24h",
          "replacement": "Use simple polling or email/text notifications"
        }}
      ],
      "risks": [
        {{
          "challenge": "Render backend goes to sleep on free tier after 15m inactivity",
          "mitigation": "Ping the backend server 1-2 minutes before the demo to wake it up"
        }}
      ]
    }}
    """
    try:
        mvp_data = await call_groq_json(mvp_prompt, "You are a pragmatic software consultant. Output JSON only.")
        logger.info("Stage 4 completed.")
        yield {"status": "mvp_done", "message": "MVP boundaries and mitigations defined.", "data": mvp_data}
    except Exception as e:
        logger.error(f"Stage 4 failed: {e}")
        yield {"status": "error", "message": f"Stage 4 failed: {str(e)}", "data": None}
        return

    # ==========================================
    # STAGE 5: Synthesis into formatted Markdown
    # ==========================================
    yield {"status": "synthesis", "message": "Synthesizing all segments into a polished Markdown document...", "data": None}
    
    # Package all prior stages into context for Gemini
    context_data = {
        "title": idea.title,
        "idea": idea.description,
        "constraints": constraints,
        "stack": stack_data,
        "architecture_mermaid": architecture_mermaid,
        "features": features_data,
        "mvp": mvp_data
    }
    
    synthesis_prompt = f"""
    You are an elite software writer. Combine and format all the collected JSON data into a single, cohesive, premium Markdown document.
    
    JSON DATA CONTEXT:
    {json.dumps(context_data, indent=2)}
    
    The resulting document must follow this exact section structure:
    
    # {idea.title} - Build Plan
    
    ## 1. Project Overview
    - A summary explaining what the project is, the problem it solves, target users, and constraints.
    
    ## 2. Technology Stack (100% Free Tier First)
    - Render a clean markdown table matching the stack structure: | Layer | Tool / Service | Why it's free | Role |
    - A brief paragraph explaining the selection rationale.
    
    ## 3. System Architecture
    - Include the following Mermaid block exactly (do NOT modify the mermaid nodes, just output the block):
    ```mermaid
    {architecture_mermaid}
    ```
    - Add 2-3 bullet points describing the core data flows of the system.
    
    ## 4. Feature Breakdown & Implementation Modules
    - For each module in the JSON data, create a sub-section:
      ### Module [Number]: [Module Name]
      - **Objective**: [What it does]
      - **Tools Used**: [Tools]
      - **Technical Flow**: [How it works]
      
    ## 5. MVP Scoping & Roadmap
    - Render a markdown table detailing the Keep, Stretch, and Cut features, along with their reasons and replacements.
      | Feature | Action (Keep/Stretch/Cut) | Rationale | Replacement / Workaround |
    
    ## 6. Challenges & Mitigations (Operations)
    - Render a markdown table of technical risks and their mitigations:
      | Challenge / Risk | Mitigation |
      
    ---
    
    Write with high professionalism, clear formatting, and standard Markdown syntax. Output ONLY the compiled markdown text. No additional intro or outro notes.
    """
    
    try:
        final_markdown = await call_gemini_with_groq_fallback(synthesis_prompt, "You are a professional documentation writer. Return markdown only.")
        logger.info("Stage 5 completed.")
        
        # Package full plan
        full_plan = {
            "title": idea.title,
            "idea": idea.description,
            "constraints": constraints,
            "stack": stack_data,
            "architecture": architecture_mermaid,
            "features": features_data.get("modules", []),
            "mvp": mvp_data,
            "markdown": final_markdown
        }
        
        yield {"status": "synthesis_done", "message": "Full project plan generated and saved.", "data": full_plan}
    except Exception as e:
        logger.error(f"Stage 5 failed: {e}")
        yield {"status": "error", "message": f"Stage 5 failed: {str(e)}", "data": None}
        return
