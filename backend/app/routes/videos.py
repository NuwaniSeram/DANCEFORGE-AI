from fastapi import APIRouter, HTTPException
from fastapi.responses import FileResponse
from pydantic import BaseModel
import json
import os
from pathlib import Path
import google.generativeai as genai
from dotenv import load_dotenv

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


def load_metadata():
    """Load video metadata from JSON file"""
    try:
        with open(METADATA_FILE, 'r', encoding='utf-8') as f:
            return json.load(f)
    except FileNotFoundError:
        return []


@router.get("/")
async def list_videos():
    """Get list of all videos with metadata"""
    metadata = load_metadata()
    videos = []
    
    for item in metadata:
        video_path = VIDEOS_DIR / item["filename"]
        if video_path.exists():
            videos.append({
                "filename": item["filename"],
                "label": item.get("label", ""),
                "type": item.get("type", ""),
                "description": item.get("description", ""),
                "fullDescription": item.get("fullDescription", ""),
                "url": f"/api/videos/stream/{item['filename']}"
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
        media_type="video/mp4",
        filename=filename
    )


@router.post("/search")
async def search_videos(search_query: SearchQuery):
    """AI-powered video search using Gemini"""
    if not GEMINI_API_KEY:
        raise HTTPException(status_code=500, detail="Gemini API key not configured")
    
    metadata = load_metadata()
    
    if not metadata:
        return {
            "matches": [],
            "explanation": "No videos available in the archive.",
            "musicRecommendations": []
        }
    
    # Filter by dance tradition if specified in query
    query_lower = search_query.query.lower()
    filtered_metadata = metadata.copy()
    tradition_filter_applied = False
    
    # Check if query mentions a specific dance tradition
    if "pahatharata" in query_lower or "low country" in query_lower:
        filtered_metadata = [
            item for item in metadata
            if "pahatharata" in item.get("label", "").lower() or 
               "pahatharata" in item.get("fullDescription", "").lower() or
               "low country" in item.get("label", "").lower()
        ]
        tradition_filter_applied = True
    elif "udarata" in query_lower or "up country" in query_lower or "up-country" in query_lower:
        filtered_metadata = [
            item for item in metadata
            if "udarata" in item.get("label", "").lower() or 
               "udarata" in item.get("fullDescription", "").lower() or
               "up country" in item.get("label", "").lower() or
               "up-country" in item.get("label", "").lower()
        ]
        tradition_filter_applied = True
    elif "bharatanatyam" in query_lower:
        filtered_metadata = [
            item for item in metadata
            if "bharatanatyam" in item.get("label", "").lower() or 
               "bharatanatyam" in item.get("fullDescription", "").lower()
        ]
        tradition_filter_applied = True
    
    # Use filtered metadata if filter was applied
    metadata_to_search = filtered_metadata if tradition_filter_applied else metadata
    
    # Create mapping from filtered index to original index
    if tradition_filter_applied:
        index_mapping = {i: metadata.index(item) for i, item in enumerate(metadata_to_search)}
    else:
        index_mapping = {i: i for i in range(len(metadata_to_search))}
    
    # Prepare video descriptions for Gemini
    video_context = "\n\n".join([
        f"Video {i+1}: {item['fullDescription']}"
        for i, item in enumerate(metadata_to_search)
    ])
    
    # Create prompt for Gemini (using filtered metadata)
    query_keywords = search_query.query.lower().split()
    query_lower = search_query.query.lower()
    
    # Check for exact filename match
    exact_filename_match = None
    for i, item in enumerate(metadata_to_search):
        filename_without_ext = item['filename'].replace('.mp4', '').lower()
        if query_lower == filename_without_ext or query_lower in filename_without_ext:
            exact_filename_match = i
            break
    
    prompt = f"""You are a dance archive search assistant. A user is searching for: "{search_query.query}"

Available videos in the archive (remember: Video 1 = index 0, Video 2 = index 1, etc.):
{video_context}

CRITICAL: The user's query is: "{search_query.query}"
{f'IMPORTANT: Video {exact_filename_match + 1} (index {exact_filename_match}) has a filename that EXACTLY matches the query. This video MUST be included and ranked FIRST.' if exact_filename_match is not None else ''}

Analyze the user's query and match videos based on these criteria (in order of importance):
1. EXACT FILENAME MATCH (HIGHEST PRIORITY):
   - If the query exactly matches or is very close to a video's filename (without .mp4), that video MUST be ranked FIRST
   - Example: Query "Pahatharata Fusion Dance" should rank "Pahatharata Fusion Dance.mp4" video as #1
2. KEYWORD MATCHING:
   - Videos with MORE matching keywords from the query should rank HIGHER
   - Count how many words from the query appear in the video's filename, label, or description
3. Key characteristics matching (fusion, solo, graceful, powerful, traditional, etc.)
4. Performance type (solo, duet, male, female)
5. Energy level (fast/slow, high/low energy)

MATCHING RULES:
- EXACT FILENAME MATCHES ALWAYS RANK FIRST
- COUNT matching keywords: Videos matching more keywords from the query should be ranked higher
- Video indices are 0-based: Video 1 = 0, Video 2 = 1, etc. (current video is Video {len(metadata_to_search)} = index {len(metadata_to_search)-1})
- Return ALL relevant videos (2-8 videos), ordered by relevance score (highest matches first)
- Order matters: Put videos with exact filename matches first, then videos with the most keyword matches

Provide a JSON response with this exact structure (no extra text):
{{
    "matched_video_indices": [0, 1, 2],
    "explanation": "Detailed explanation...",
    "choreography_suggestions": "Suggestions..."
}}

Return valid JSON only. Video indices must be numbers between 0 and {len(metadata_to_search)-1}. Order the indices by relevance (exact filename matches first, then most keyword matches).
"""
    
    response_text = ""
    try:
        model = genai.GenerativeModel('gemini-2.0-flash')
        response = model.generate_content(prompt)
        
        # Parse Gemini response
        response_text = response.text.strip()
        
        # Extract JSON from response (Gemini might add markdown formatting)
        if "```json" in response_text:
            response_text = response_text.split("```json")[1].split("```")[0].strip()
        elif "```" in response_text:
            response_text = response_text.split("```")[1].split("```")[0].strip()
        
        result = json.loads(response_text)
        
        # Get matched videos (indices are relative to metadata_to_search)
        matched_indices = result.get("matched_video_indices", [])
        matched_videos = []
        
        for idx in matched_indices:
            # idx is relative to metadata_to_search, convert to original metadata index if needed
            if 0 <= idx < len(metadata_to_search):
                original_idx = index_mapping[idx]
                item = metadata[original_idx]
                video_path = VIDEOS_DIR / item["filename"]
                if video_path.exists():
                    matched_videos.append({
                        "filename": item["filename"],
                        "label": item.get("label", ""),
                        "type": item.get("type", ""),
                        "description": item.get("description", ""),
                        "fullDescription": item.get("fullDescription", ""),
                        "url": f"/api/videos/stream/{item['filename']}"
                    })
        
        explanation = result.get("explanation", "")
        choreography_suggestions = result.get("choreography_suggestions", "")
        
        # Get music recommendations using Gemini
        music_prompt = f"""Based on these matched dance videos and the user's search query "{search_query.query}", recommend 3-5 traditional Sri Lankan songs or music tracks that would be suitable for this type of choreography. 

Matched videos context: {explanation}

Provide a JSON array of music recommendations:
{{
    "music_recommendations": [
        {{
            "title": "Song title",
            "artist": "Artist name (if known)",
            "description": "Why this music fits",
            "style": "Music style/tradition"
        }}
    ]
}}
"""
        
        music_response = model.generate_content(music_prompt)
        music_text = music_response.text.strip()
        
        if "```json" in music_text:
            music_text = music_text.split("```json")[1].split("```")[0].strip()
        elif "```" in music_text:
            music_text = music_text.split("```")[1].split("```")[0].strip()
        
        music_data = json.loads(music_text)
        music_recommendations = music_data.get("music_recommendations", [])
        
        return {
            "matches": matched_videos,
            "explanation": explanation,
            "choreography_suggestions": choreography_suggestions,
            "musicRecommendations": music_recommendations
        }
    
    except json.JSONDecodeError as e:
        # Fallback if JSON parsing fails
        return {
            "matches": [],
            "explanation": f"Search completed but response parsing failed. Please try a different search query.",
            "musicRecommendations": []
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Search error: {str(e)}")

