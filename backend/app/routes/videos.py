from fastapi import APIRouter, HTTPException, UploadFile, File, BackgroundTasks
from fastapi.responses import FileResponse
from pydantic import BaseModel
import json
import os
os.environ["PROTOCOL_BUFFERS_PYTHON_IMPLEMENTATION"] = "python"
import time
from pathlib import Path
import google.generativeai as genai
from dotenv import load_dotenv
from app.database.mongodb import videos_collection

# Get the backend directory (parent of app directory)
BACKEND_DIR = Path(__file__).parent.parent.parent
ENV_FILE = BACKEND_DIR / ".env"

# Load environment variables from backend/.env
load_dotenv(dotenv_path=ENV_FILE)

router = APIRouter(prefix="/api/videos", tags=["videos"])

# Get the videos directory
VIDEOS_DIR = BACKEND_DIR / "videos"
METADATA_FILE = VIDEOS_DIR / "metadata.json"

# Initialize Gemini
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
if GEMINI_API_KEY:
    genai.configure(api_key=GEMINI_API_KEY)


class SearchQuery(BaseModel):
    query: str


import numpy as np

def cosine_similarity(a, b):
    # a and b are lists/arrays of floats
    a_norm = np.linalg.norm(a)
    b_norm = np.linalg.norm(b)
    if a_norm == 0 or b_norm == 0:
        return 0.0
    return float(np.dot(a, b) / (a_norm * b_norm))

@router.get("/")
async def list_videos():
    """Get list of all videos with metadata from MongoDB"""
    videos = []
    cursor = videos_collection.find().sort("created_at", -1)
    
    for item in cursor:
        video_path = VIDEOS_DIR / item["filename"]
        if video_path.exists():
            videos.append({
                "filename": item.get("filename"),
                "label": item.get("label", ""),
                "type": item.get("type", ""),
                "beat": item.get("beat", ""),
                "energy": item.get("energy", ""),
                "expression": item.get("expression", ""),
                "emotion": item.get("emotion", ""),
                "description": item.get("description", ""),
                "fullDescription": item.get("fullDescription", ""),
                "url": item.get("url", f"/api/videos/stream/{item.get('filename')}")
            })
    
    return {"videos": videos}


@router.get("/stream/{filename}")
async def stream_video(filename: str):
    """Stream video file"""
    video_path = VIDEOS_DIR / filename
    
    if not video_path.exists():
        raise HTTPException(status_code=404, detail="Video not found")
    
    return FileResponse(
        path=str(video_path),
        media_type="video/mp4"
    )


@router.post("/upload")
async def upload_video(file: UploadFile = File(...)):
    """Upload a video, process with Gemini 2.0 Flash, and store in MongoDB"""
    if not GEMINI_API_KEY:
        raise HTTPException(status_code=500, detail="Gemini API key not configured")

    filename = file.filename
    video_path = VIDEOS_DIR / filename
    
    # Save the file temporarily
    try:
        with open(video_path, "wb") as buffer:
            content = await file.read()
            buffer.write(content)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to save file: {str(e)}")

    try:
        # 1. Upload to Gemini
        print(f"Uploading {filename} to Gemini...")
        gemini_file = genai.upload_file(path=str(video_path))
        
        # Wait for processing to complete
        while gemini_file.state.name == "PROCESSING":
            print(".", end="", flush=True)
            time.sleep(5)
            gemini_file = genai.get_file(gemini_file.name)
            
        if gemini_file.state.name == "FAILED":
            raise HTTPException(status_code=500, detail="Gemini video processing failed")

        print("\nVideo processing active. Generating description...")
        
        # 2. Extract description & keywords using gemini-2.0-flash
        model = genai.GenerativeModel('gemini-2.0-flash')
        prompt = f"""You are a Sri Lankan dance expert analyzer. Watch this video and categorize it.
Ensure you return ONLY a strict JSON object with these exact keys:
{{
  "label": "string (e.g., Up-Country Traditional Dance, Hip Hop Dance, Pahatharata Traditional Dance, Contemporary Dance)",
  "type": "string (e.g., Sinhala Traditional Drum Song, Sinhala Folk Song with Drum Beats)",
  "beat": "string (e.g., fast drum-driven beat, medium rhythmic beat, slow graceful beat)",
  "energy": "string (e.g., high energy, moderate energy, calm energy)",
  "expression": "string (Describe visible facial and body expression, e.g., joyful and confident, devotional and focused, dramatic and intense)",
  "emotion": "string (Main emotional tone, e.g., happy, sad, proud, devotional, playful, intense)",
  "description": "string (A detailed 1-sentence description of what happens in the video, mentioning performers, energy, style, and beats)",
  "fullDescription": "string (Combines filename / label / type / beat / energy / expression / emotion — description)"
}}

Examples of expected format based on our metadata:
- "label": "Up-Country Traditional Dance", "type": "Sinhala Traditional Drum Song", "beat": "fast drum-driven beat", "energy": "high energy", "expression": "proud and commanding", "emotion": "excited", "description": "Male and female performers present an authentic Udarata dance featuring traditional steps high energy beats and powerful drum driven rhythms", "fullDescription": "Udarata Rhythms / Up-Country Traditional Dance / Sinhala Traditional Drum Song / fast drum-driven beat / high energy / proud and commanding / excited — Male and female performers..."
- "label": "Pahatharata Traditional Dance", "type": "Sinhala Pahatharata Song", "beat": "slow rhythmic beat", "energy": "moderate energy", "expression": "graceful and soft", "emotion": "serene", "description": "Solo female performance highlighting graceful girly movements expressed through slow rhythmic beats rooted in Pahatharata tradition"
- "label": "Hip Hop Dance", "type": "Swag Song", "beat": "punchy syncopated beat", "energy": "high energy", "expression": "bold and swagger-filled", "emotion": "confident", "description": "Trio male performance delivering energetic hip hop steps with strong swag attitude sharp movements and high intensity execution"

Analyze the video and return the JSON. Infer beat, energy, expression, and emotion from movement quality, rhythm, and visible performance mood. Use concise natural language. Use the filename as the source for the first part of 'fullDescription'. Filename is: {filename}"""

        response = model.generate_content([gemini_file, prompt])
        response_text = response.text.strip()
        
        if "```json" in response_text:
            response_text = response_text.split("```json")[1].split("```")[0].strip()
        elif "```" in response_text:
            response_text = response_text.split("```")[1].split("```")[0].strip()
            
        metadata_json = json.loads(response_text)
        metadata_json['filename'] = filename
        
        # 3. Generate Embeddings using gemini-embedding-001
        print("Generating embeddings...")
        embedding_response = genai.embed_content(
            model="models/gemini-embedding-001",
            content=metadata_json['fullDescription'],
            task_type="retrieval_document"
        )
        embedding_vector = embedding_response['embedding']
        
        # 4. Save to MongoDB
        document = {
            "filename": filename,
            "label": metadata_json.get('label', ''),
            "type": metadata_json.get('type', ''),
            "beat": metadata_json.get('beat', ''),
            "energy": metadata_json.get('energy', ''),
            "expression": metadata_json.get('expression', ''),
            "emotion": metadata_json.get('emotion', ''),
            "description": metadata_json.get('description', ''),
            "fullDescription": metadata_json.get('fullDescription', ''),
            "embedding": embedding_vector,
            "url": f"/api/videos/stream/{filename}",
            "created_at": time.time()
        }
        
        # Upsert by filename
        videos_collection.update_one(
            {"filename": filename},
            {"$set": document},
            upsert=True
        )
        
        print("Successfully processed and saved to MongoDB.")
        return {"message": "Upload & processing successful", "data": document}
        
    except json.JSONDecodeError as e:
        raise HTTPException(status_code=500, detail=f"Failed to parse Gemini JSON: {str(e)} - Raw: {response.text}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))



@router.post("/search")
async def search_videos(search_query: SearchQuery):
    """AI-powered video search using Gemini embeddings and MongoDB"""
    if not GEMINI_API_KEY:
        raise HTTPException(status_code=500, detail="Gemini API key not configured")
    
    query = search_query.query
    
    # 1. Generate embedding for the search query
    try:
        query_embedding_response = genai.embed_content(
            model="models/gemini-embedding-001",
            content=query,
            task_type="retrieval_query"
        )
        query_vector = query_embedding_response['embedding']
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate query embedding: {str(e)}")

    # 2. Fetch all videos and calculate similarity
    all_videos = list(videos_collection.find())
    if not all_videos:
        return {
            "matches": [],
            "explanation": "No videos available in the archive.",
            "musicRecommendations": []
        }
    
    results = []
    for video in all_videos:
        video_vector = video.get("embedding")
        if not video_vector:
            continue
            
        score = cosine_similarity(query_vector, video_vector)
        
        # Boost score slightly if exact filename match (case insensitive)
        filename_without_ext = video.get('filename', '').replace('.mp4', '').lower()
        if query.lower() == filename_without_ext or query.lower() in filename_without_ext:
            score += 0.2
            
        results.append({
            "score": score,
            "video": video
        })
        
    # Sort by score descending
    results.sort(key=lambda x: x["score"], reverse=True)
    
    # Get Top 8 matches (or fewer if less available)
    top_matches = results[:8]
    
    matched_videos = []
    for match in top_matches:
        item = match["video"]
        video_path = VIDEOS_DIR / item["filename"]
        if video_path.exists():
            matched_videos.append({
                "filename": item.get("filename"),
                "label": item.get("label", ""),
                "type": item.get("type", ""),
                "beat": item.get("beat", ""),
                "energy": item.get("energy", ""),
                "expression": item.get("expression", ""),
                "emotion": item.get("emotion", ""),
                "description": item.get("description", ""),
                "fullDescription": item.get("fullDescription", ""),
                "url": item.get("url", f"/api/videos/stream/{item.get('filename')}"),
                "similarityScore": round(match["score"], 3)
            })
            
    # 3. Use Gemini to generate an explanation and music recommendations based on the top matches
    try:
        model = genai.GenerativeModel('gemini-2.0-flash')
        
        video_context = "\\n\\n".join([
            f"Video: {item['filename']} - {item['fullDescription']}"
            for item in matched_videos
        ])
        
        explanation_prompt = f"""
The user searched for "{query}". We found the following top matching videos from our database:
{video_context}

Briefly explain (in 1-2 paragraphs) why these videos are great matches for their query, acting as a helpful dance archive assistant. 
Also provide a few short choreography suggestions based on these styles.

Return ONLY a strict JSON object with this shape:
{{
  "explanation": "string",
  "choreography_suggestions": "string",
  "music_recommendations": [
    {{
       "title": "string",
       "artist": "string",
       "description": "string",
       "style": "string"
    }}
  ]
}}
"""
        response = model.generate_content(explanation_prompt)
        response_text = response.text.strip()
        
        if "```json" in response_text:
            response_text = response_text.split("```json")[1].split("```")[0].strip()
        elif "```" in response_text:
            response_text = response_text.split("```")[1].split("```")[0].strip()
            
        response_json = json.loads(response_text)
        explanation = response_json.get("explanation", "Here are the top matches we found for your query.")
        choreography_suggestions = response_json.get("choreography_suggestions", "")
        music_recommendations = response_json.get("music_recommendations", [])
        
    except Exception as e:
        print(f"Error generating explanation: {e}")
        explanation = "Here are the best matches for your search query based on semantic similarity."
        choreography_suggestions = ""
        music_recommendations = []

    return {
        "matches": matched_videos,
        "explanation": explanation,
        "choreography_suggestions": choreography_suggestions,
        "musicRecommendations": music_recommendations
    }
