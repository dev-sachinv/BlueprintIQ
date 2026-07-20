import truststore
try:
    truststore.inject_into_ssl()
except Exception:
    pass

import json
from fastapi import FastAPI, HTTPException, Depends, Header
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from app.schemas import IdeaInput, ProjectPlan
from app.pipeline import generate_project_plan_stream
from app.database import save_plan, get_plans, get_plan_by_id, delete_plan

app = FastAPI(title="AI Project Guide API", description="AI-powered build-plan generator")

# CORS setup
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # For local development ease, allow all origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

def get_current_user(authorization: str = Header(None)):
    from app.database import supabase_client
    from app.config import USE_SUPABASE
    
    # If Supabase Auth is disabled/SQLite fallback is active, return dummy user id and None token
    if not USE_SUPABASE or not supabase_client:
        return "local_user", None
        
    if not authorization:
        raise HTTPException(status_code=401, detail="Authorization header missing")
        
    try:
        token = authorization.replace("Bearer ", "")
        user_response = supabase_client.auth.get_user(token)
        return user_response.user.id, token
    except Exception as e:
        print(f"Auth token verification failed: {e}")
        raise HTTPException(status_code=401, detail=f"Invalid or expired auth token: {str(e)}")

@app.get("/api/health")
def health_check():
    return {"status": "ok", "message": "API is healthy"}

@app.post("/api/plans/generate")
async def generate_plan(idea: IdeaInput, auth_info: tuple = Depends(get_current_user)):
    """
    Spawns the multi-stage pipeline as a streaming response.
    Each event is streamed as a JSON line.
    """
    user_id, token = auth_info
    
    async def event_generator():
        final_plan_data = None
        try:
            async for step in generate_project_plan_stream(idea):
                # If pipeline completes, save the result to the DB
                if step.get("status") == "synthesis_done":
                    final_plan_data = step.get("data")
                    try:
                        saved_plan = save_plan(final_plan_data, user_id, token)
                        step["data"] = saved_plan
                    except Exception as db_err:
                        print(f"Error auto-saving plan to DB: {db_err}")
                
                yield f"{json.dumps(step)}\n"
        except Exception as e:
            error_event = {"status": "error", "message": f"Pipeline crashed: {str(e)}", "data": None}
            yield f"{json.dumps(error_event)}\n"
            
    return StreamingResponse(event_generator(), media_type="text/event-stream")

@app.get("/api/plans")
def list_plans(auth_info: tuple = Depends(get_current_user)):
    """Retrieve all previously generated plans."""
    user_id, token = auth_info
    try:
        return get_plans(user_id, token)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database query failed: {str(e)}")

@app.get("/api/plans/{plan_id}")
def read_plan(plan_id: str, auth_info: tuple = Depends(get_current_user)):
    """Retrieve a single plan by ID."""
    user_id, token = auth_info
    plan = get_plan_by_id(plan_id, user_id, token)
    if not plan:
        raise HTTPException(status_code=404, detail="Plan not found")
    return plan

@app.delete("/api/plans/{plan_id}")
def remove_plan(plan_id: str, auth_info: tuple = Depends(get_current_user)):
    """Delete a plan by ID."""
    user_id, token = auth_info
    success = delete_plan(plan_id, user_id, token)
    if not success:
        raise HTTPException(status_code=404, detail="Plan not found or could not be deleted")
    return {"status": "success", "message": "Plan deleted"}

@app.post("/api/plans/save")
def update_plan(plan: ProjectPlan, auth_info: tuple = Depends(get_current_user)):
    """Manually save or update a plan."""
    user_id, token = auth_info
    try:
        saved_plan = save_plan(plan.dict(), user_id, token)
        return saved_plan
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to save plan: {str(e)}")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
