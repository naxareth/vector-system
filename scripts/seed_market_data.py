import os
import random
from datetime import datetime, timedelta
from supabase import create_client, Client
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Configuration
SUPABASE_URL = os.getenv("NEXT_PUBLIC_SUPABASE_URL")
SUPABASE_KEY = os.getenv("NEXT_PUBLIC_SUPABASE_ANON_KEY")

if not SUPABASE_URL or not SUPABASE_KEY:
    raise ValueError("❌ Missing Supabase Credentials in .env")

# Initialize Client
supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

# ==========================================
# 🧹 STEP 1: CLEAR OLD DATA
# ==========================================
print("🧹 Clearing old market data to prevent duplicates...")
try:
    # This deletes all rows where ID is not 0 (effectively all rows)
    supabase.table("market_snapshots").delete().neq("id", 0).execute()
    print("✨ Database cleaned.")
except Exception as e:
    print(f"⚠️ Warning during cleanup (table might be empty): {e}")


# ==========================================
# 📈 STEP 2: DEFINE SMOOTH DEMO DATA
# ==========================================
# Variance reduced to 10-50 to ensure high confidence scores
skills_data = [
    # RISING SKILLS (Positive Slope = High Health Score)
    {"name": "React", "start": 300, "trend": "up", "variance": 10},
    {"name": "Python Programming", "start": 800, "trend": "up", "variance": 10}, 
    {"name": "Node.js", "start": 500, "trend": "up", "variance": 10},
    {"name": "Blockchain", "start": 50, "trend": "up", "variance": 5},
    {"name": "Bachelor of Science in Information Technology", "start": 5000, "trend": "up", "variance": 50},
    
    # FALLING SKILLS (Negative Slope = Warning Alert)
    {"name": "PHP", "start": 600, "trend": "down", "variance": 10},
    {"name": "jQuery", "start": 400, "trend": "down", "variance": 10},
    
    # STABLE SKILLS (Flat Slope = ~50% Score)
    {"name": "SQL", "start": 900, "trend": "flat", "variance": 5},
]

print("🌱 Seeding Market Data for the last 12 months...")

rows_to_insert = []
today = datetime.now()

for skill in skills_data:
    current_count = skill["start"]
    
    # Loop back 12 months
    for i in range(12, 0, -1):
        date_point = today - timedelta(days=30 * i)
        
        # Add realistic (but controlled) noise
        noise = random.randint(-skill["variance"], skill["variance"])
        
        if skill["trend"] == "up":
            current_count += random.randint(20, 40) # Consistent growth
        elif skill["trend"] == "down":
            current_count -= random.randint(20, 40) # Consistent drop
        
        # Ensure count never goes below 0
        final_count = max(0, current_count + noise)

        rows_to_insert.append({
            "skill_name": skill["name"],
            "job_count": final_count,
            "data_source": "synthetic_history",
            "recorded_at": date_point.isoformat()
        })

# ==========================================
# 🚀 STEP 3: INSERT NEW DATA
# ==========================================
try:
    # Batch insert
    data, count = supabase.table("market_snapshots").insert(rows_to_insert).execute()
    print(f"✅ Success! Inserted {len(rows_to_insert)} historical data points.")
except Exception as e:
    print(f"❌ Error: {e}")