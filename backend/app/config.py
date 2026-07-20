import os
from pathlib import Path
from dotenv import load_dotenv

# Load environment variables from the .env file in the backend folder
BASE_DIR = Path(__file__).resolve().parent.parent
dotenv_path = BASE_DIR / ".env"
load_dotenv(dotenv_path=dotenv_path)

GROQ_API_KEY = os.getenv("GROQ_API_KEY")
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")

# Check if both Supabase URL and Key are present to decide database fallback
USE_SUPABASE = bool(SUPABASE_URL and SUPABASE_KEY)

# SQL Alchemy Database URL for SQLite fallback
SQLITE_DB_PATH = BASE_DIR / "projects.db"
DATABASE_URL = f"sqlite:///{SQLITE_DB_PATH}"

print("=" * 60)
print("CONFIG DIAGNOSTICS:")
print(f"  GROQ_API_KEY: {'[SET]' if GROQ_API_KEY else '[MISSING]'}")
print(f"  GEMINI_API_KEY: {'[SET]' if GEMINI_API_KEY else '[MISSING]'}")
print(f"  SUPABASE_URL: {'[SET]' if SUPABASE_URL else '[MISSING]'}")
print(f"  SUPABASE_KEY: {'[SET]' if SUPABASE_KEY else '[MISSING]'}")
print(f"  Active Database: {'Supabase' if USE_SUPABASE else f'SQLite (local: {SQLITE_DB_PATH.name})'}")
print("=" * 60)
