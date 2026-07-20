import truststore
try:
    truststore.inject_into_ssl()
except Exception:
    pass

import json
import uuid
import datetime
from sqlalchemy import create_engine, Column, String, Text, DateTime, JSON
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from app.config import DATABASE_URL, USE_SUPABASE, SUPABASE_URL, SUPABASE_KEY

# SQLAlchemy Setup (SQLite fallback)
engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False} if "sqlite" in DATABASE_URL else {})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

class DBPlan(Base):
    __tablename__ = "plans"
    
    id = Column(String, primary_key=True, index=True)
    title = Column(String, index=True)
    idea = Column(Text)
    constraints = Column(JSON)  # Dict of team size, skill, time, platform
    stack = Column(JSON)        # Dict of recommended stack
    architecture = Column(Text) # Mermaid syntax code
    features = Column(JSON)     # List of modules
    mvp = Column(JSON)          # Dict of core, stretch, cuts, and risks
    markdown = Column(Text)     # Final MD synthesis
    user_id = Column(String, index=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

# Create tables in SQLite
Base.metadata.create_all(bind=engine)

# Supabase Client Setup (optional)
supabase_client = None
if USE_SUPABASE:
    try:
        from supabase import create_client
        supabase_client = create_client(SUPABASE_URL, SUPABASE_KEY)
        print("Supabase client initialized successfully.")
    except Exception as e:
        print(f"Error initializing Supabase client: {e}")
        print("Falling back to SQLite database.")

def get_supabase_client(token: str = None):
    if not USE_SUPABASE or not SUPABASE_URL or not SUPABASE_KEY:
        return None
    try:
        from supabase import create_client
        client = create_client(SUPABASE_URL, SUPABASE_KEY)
        if token:
            client.postgrest.auth(token)
        return client
    except Exception as e:
        print(f"Error creating Supabase client for request: {e}")
        return None

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def save_plan_sqlite(plan_dict: dict, user_id: str = None) -> dict:
    db = SessionLocal()
    try:
        # Convert schema format to DBPlan
        db_plan = DBPlan(
            id=plan_dict.get("id", str(uuid.uuid4())),
            title=plan_dict.get("title", "Untitled Project"),
            idea=plan_dict.get("idea", ""),
            constraints=plan_dict.get("constraints", {}),
            stack=plan_dict.get("stack", {}),
            architecture=plan_dict.get("architecture", ""),
            features=plan_dict.get("features", []),
            mvp=plan_dict.get("mvp", {}),
            markdown=plan_dict.get("markdown", ""),
            user_id=user_id
        )
        merged_plan = db.merge(db_plan)  # Use merge to support insert or update
        db.commit()
        plan_dict["id"] = merged_plan.id
        plan_dict["user_id"] = merged_plan.user_id
        return plan_dict
    except Exception as e:
        db.rollback()
        print(f"SQLite save error: {e}")
        raise e
    finally:
        db.close()

def save_plan(plan_dict: dict, user_id: str = None, token: str = None) -> dict:
    if not plan_dict.get("id"):
        plan_dict["id"] = str(uuid.uuid4())
    
    plan_dict["user_id"] = user_id
    
    client = get_supabase_client(token)
    if client:
        try:
            # We must convert datetimes to strings or omit for DB inserts
            data = {
                "id": plan_dict["id"],
                "title": plan_dict.get("title", "Untitled Project"),
                "idea": plan_dict.get("idea", ""),
                "constraints": plan_dict.get("constraints", {}),
                "stack": plan_dict.get("stack", {}),
                "architecture": plan_dict.get("architecture", ""),
                "features": plan_dict.get("features", []),
                "mvp": plan_dict.get("mvp", {}),
                "markdown": plan_dict.get("markdown", ""),
                "user_id": user_id
            }
            # Attempt to upsert in Supabase
            response = client.table("plans").upsert(data).execute()
            print("Successfully saved to Supabase.")
            return plan_dict
        except Exception as e:
            print(f"Supabase upsert failed: {e}. Falling back to SQLite.")
            # Fallback to SQLite
            return save_plan_sqlite(plan_dict, user_id)
    else:
        return save_plan_sqlite(plan_dict, user_id)

def get_plans(user_id: str = None, token: str = None) -> list:
    client = get_supabase_client(token)
    if client:
        try:
            # Query plans only belonging to this user
            response = client.table("plans").select("*").eq("user_id", user_id).order("created_at", desc=True).execute()
            return response.data
        except Exception as e:
            print(f"Supabase select failed: {e}. Falling back to SQLite.")
    
    # SQLite fallback
    db = SessionLocal()
    try:
        plans = db.query(DBPlan).filter(DBPlan.user_id == user_id).order_by(DBPlan.created_at.desc()).all()
        result = []
        for p in plans:
            result.append({
                "id": p.id,
                "title": p.title,
                "idea": p.idea,
                "constraints": p.constraints,
                "stack": p.stack,
                "architecture": p.architecture,
                "features": p.features,
                "mvp": p.mvp,
                "markdown": p.markdown,
                "user_id": p.user_id,
                "created_at": p.created_at.isoformat() if p.created_at else None
            })
        return result
    finally:
        db.close()

def get_plan_by_id(plan_id: str, user_id: str = None, token: str = None) -> dict:
    client = get_supabase_client(token)
    if client:
        try:
            response = client.table("plans").select("*").eq("id", plan_id).eq("user_id", user_id).execute()
            if response.data:
                return response.data[0]
        except Exception as e:
            print(f"Supabase select by id failed: {e}. Falling back to SQLite.")
            
    db = SessionLocal()
    try:
        p = db.query(DBPlan).filter(DBPlan.id == plan_id, DBPlan.user_id == user_id).first()
        if p:
            return {
                "id": p.id,
                "title": p.title,
                "idea": p.idea,
                "constraints": p.constraints,
                "stack": p.stack,
                "architecture": p.architecture,
                "features": p.features,
                "mvp": p.mvp,
                "markdown": p.markdown,
                "user_id": p.user_id,
                "created_at": p.created_at.isoformat() if p.created_at else None
            }
        return None
    finally:
        db.close()

def delete_plan(plan_id: str, user_id: str = None, token: str = None) -> bool:
    success = False
    client = get_supabase_client(token)
    if client:
        try:
            client.table("plans").delete().eq("id", plan_id).eq("user_id", user_id).execute()
            success = True
        except Exception as e:
            print(f"Supabase delete failed: {e}. Falling back to SQLite.")
            
    # Always delete from SQLite as well (or as fallback)
    db = SessionLocal()
    try:
        p = db.query(DBPlan).filter(DBPlan.id == plan_id, DBPlan.user_id == user_id).first()
        if p:
            db.delete(p)
            db.commit()
            success = True
    except Exception as e:
        db.rollback()
        print(f"SQLite delete error: {e}")
    finally:
        db.close()
        
    return success
