import asyncio
import json
import sys
from app.schemas import IdeaInput
from app.pipeline import generate_project_plan_stream
from app.database import save_plan, get_plans

async def run_test():
    print("=" * 60)
    print("RUNNING PIPELINE INTEGRATION TEST")
    print("=" * 60)
    
    # Define test intake data
    test_idea = IdeaInput(
        title="StudyRoom Booker",
        description="A web app for college students to reserve study rooms in the library. It shows real-time availability and allows slot reservations.",
        team_size="Solo",
        skills="Beginner",
        timeframe="24h",
        budget="Free tier only",
        platform="Web"
    )
    
    print(f"Submitting idea: '{test_idea.title}'")
    print(f"Description: '{test_idea.description}'")
    print("Starting multi-stage LLM generation pipeline...\n")
    
    final_plan_data = None
    
    try:
        async for step in generate_project_plan_stream(test_idea):
            status = step.get("status")
            message = step.get("message")
            data = step.get("data")
            
            print(f"[{status.upper()}] {message}")
            
            if status == "error":
                print(f"\nCRITICAL ERROR: {message}")
                sys.exit(1)
                
            if status == "synthesis_done":
                final_plan_data = data
                
        if not final_plan_data:
            print("\nError: Pipeline completed but no final plan data was generated.")
            sys.exit(1)
            
        print("\n" + "=" * 60)
        print("PIPELINE COMPLETED SUCCESSFULLY!")
        print("=" * 60)
        print(f"Title: {final_plan_data.get('title')}")
        print(f"Architecture Nodes (Mermaid):")
        print("-" * 40)
        print(final_plan_data.get('architecture'))
        print("-" * 40)
        print(f"Tech Stack Items Recommended: {len(final_plan_data.get('stack', {}).get('stack', []))}")
        print(f"Modules Extracted: {len(final_plan_data.get('features', []))}")
        print(f"MVP Matrix Decisions: {len(final_plan_data.get('mvp', {}).get('scoping', []))}")
        print(f"Markdown Content Length: {len(final_plan_data.get('markdown', ''))} characters")
        print("-" * 40)
        
        # Test Database integration
        print("\nTesting Database Save...")
        saved_plan = save_plan(final_plan_data)
        print(f"Saved Plan ID: {saved_plan.get('id')}")
        
        # Verify it exists in database list
        all_plans = get_plans()
        plan_ids = [p.get("id") for p in all_plans]
        if saved_plan.get("id") in plan_ids:
            print("DB Verification: Plan successfully saved and queried from Database!")
        else:
            print("DB Verification: Plan was NOT found in queried results!")
            sys.exit(1)
            
        print("\nALL INTEGRATION TESTS PASSED SUCCESSFULLY!")
        print("=" * 60)
        
    except Exception as e:
        print(f"\nTest failed with exception: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)

if __name__ == "__main__":
    asyncio.run(run_test())
