import json
import os
os.environ["PROTOCOL_BUFFERS_PYTHON_IMPLEMENTATION"] = "python"
import time
from pathlib import Path
import google.generativeai as genai
from dotenv import load_dotenv
import numpy as np
from app.database.mongodb import videos_collection

# Setup paths
BACKEND_DIR = Path(__file__).parent
ENV_FILE = BACKEND_DIR / ".env"
VIDEOS_DIR = BACKEND_DIR / "videos"
METADATA_FILE = VIDEOS_DIR / "metadata.json"

# Load env
load_dotenv(dotenv_path=ENV_FILE)
genai.configure(api_key=os.getenv("GEMINI_API_KEY"))

def cosine_similarity(a, b):
    return float(np.dot(a, b) / (np.linalg.norm(a) * np.linalg.norm(b)))

def migrate():
    if not METADATA_FILE.exists():
        print("No metadata.json found.")
        return

    with open(METADATA_FILE, 'r', encoding='utf-8') as f:
        metadata = json.load(f)

    print(f"Found {len(metadata)} videos to migrate.")
    
    for item in metadata:
        # Check if already exists in DB
        if videos_collection.find_one({"filename": item["filename"]}):
            print(f"Skipping {item['filename']} - already in DB")
            continue
            
        print(f"Processing {item['filename']}...")
        
        # We need to generate the embedding
        full_desc = item.get("fullDescription", "")
        if not full_desc:
            full_desc = f"{item['filename']} / {item.get('label','')} / {item.get('type','')} - {item.get('description','')}"
            item["fullDescription"] = full_desc
            
        # Generate embedding
        try:
            embedding_response = genai.embed_content(
                model="models/gemini-embedding-001",
                content=full_desc,
                task_type="retrieval_document"
            )
            embedding_vector = embedding_response['embedding']
        except Exception as e:
            print(f"Failed to get embedding for {item['filename']}: {e}")
            continue
            
        # Save to DB
        document = {
            "filename": item["filename"],
            "label": item.get("label", ""),
            "type": item.get("type", ""),
            "description": item.get("description", ""),
            "fullDescription": full_desc,
            "embedding": embedding_vector,
            "url": f"/api/videos/stream/{item['filename']}",
            "created_at": time.time()
        }
        
        videos_collection.insert_one(document)
        print(f"Saved {item['filename']} to DB. Sleeping 2 seconds to avoid rate limits.")
        time.sleep(2)
        
    print("Migration complete!")

if __name__ == "__main__":
    migrate()
