from pydantic import BaseModel, Field
from typing import List, Dict, Any, Optional

class IdeaInput(BaseModel):
    title: str = Field(..., description="Short title of the project")
    description: str = Field(..., description="Raw project description or one-paragraph idea")
    team_size: str = Field("Solo", description="Solo, 2-3 members, or 4+ members")
    skills: str = Field("Beginner", description="Beginner, Intermediate, or Advanced")
    timeframe: str = Field("24h", description="24h, 48h, 1 week, 1 month, etc.")
    budget: str = Field("Free tier only", description="Free tier only, low budget (<$50), or flexible")
    platform: str = Field("Web", description="Web, Mobile, Desktop, CLI, or IoT")

class TechStackItem(BaseModel):
    layer: str
    tool: str
    why_free: str
    role: str

class TechStackResponse(BaseModel):
    stack: List[TechStackItem]
    rationale: str

class ModuleItem(BaseModel):
    name: str
    what_it_does: str
    tools: str
    how_it_works: str

class FeatureBreakdownResponse(BaseModel):
    modules: List[ModuleItem]

class MvpScopeItem(BaseModel):
    feature: str
    action: str = Field(..., description="Keep / Stretch / Cut")
    reason: str
    replacement: Optional[str] = None

class RiskItem(BaseModel):
    challenge: str
    mitigation: str

class MvpResponse(BaseModel):
    scoping: List[MvpScopeItem]
    risks: List[RiskItem]

class ProjectPlan(BaseModel):
    id: Optional[str] = None
    title: str
    idea: str
    constraints: Dict[str, str]
    stack: Dict[str, Any]
    architecture: str
    features: List[Dict[str, Any]]
    mvp: Dict[str, Any]
    markdown: str
    user_id: Optional[str] = None
    created_at: Optional[str] = None
