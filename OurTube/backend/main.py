from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException
from fastapi.responses import FileResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
import asyncio
import os
import shutil
from typing import List
from urllib.parse import quote
from yt_dlp.version import __version__ as YT_DLP_VERSION

from socket_manager import manager
from downloader import downloader_service

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Ensure downloads directory exists
if not os.path.exists("downloads"):
    os.makedirs("downloads")

# Mount downloads to serve files
app.mount("/files", StaticFiles(directory="downloads"), name="files")

class DownloadRequest(BaseModel):
    url: str
    format: str = "mp4"
    quality: str = "best"
    task_id: str = None  # Optional client-provided ID
    strict_mode: bool = False
    split_chapters: bool = False
    
@app.get("/")
def read_root():
    return {"status": "OurTube Backend Running"}

@app.get("/api/v2/status")
def get_debug_status():
    """Hidden endpoint to list files for debugging."""
    files = os.listdir("downloads")
    return {
        "status": "online",
        "yt_dlp_version": YT_DLP_VERSION,
        "downloads_count": len(files),
        "files": files
    }

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await manager.connect(websocket)
    try:
        while True:
            # Keep connection alive
            await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(websocket)

@app.post("/api/downloads")
async def start_download(request: DownloadRequest):
    print(f"Received download request: {request.url} with ID: {request.task_id} (Strict: {request.strict_mode}, Split: {request.split_chapters})")
    # Start download in background executor
    task_id = await downloader_service.start_download(
        request.url, 
        request.format, 
        request.quality, 
        task_id=request.task_id,
        strict_mode=request.strict_mode,
        split_chapters=request.split_chapters
    )
    print(f"Download scheduled with ID {task_id}, returning response.")
    return {"status": "started", "url": request.url, "id": task_id}

@app.get("/api/downloads")
def list_downloads():
    downloads_dir = os.path.abspath("downloads")

    if not os.path.exists(downloads_dir):
        return []

    files = []
    for filename in os.listdir(downloads_dir):
        path = os.path.join(downloads_dir, filename)
        if not os.path.isfile(path):
            continue

        files.append({
            "filename": filename,
            "size": os.path.getsize(path),
            "modified": os.path.getmtime(path),
            "url": f"/api/v3/download?filename={quote(filename)}",
        })

    files.sort(key=lambda item: item["modified"], reverse=True)

    return [
        {
            "filename": item["filename"],
            "size": item["size"],
            "url": item["url"],
        }
        for item in files
    ]



import re

def sanitize_filename(name: str) -> str:
    # 1. Remove all non-alphanumeric except spaces, dashes, underscores, and dots
    # This is much safer for URLs and paths
    sanitized = re.sub(r'[^a-zA-Z0-9\s\-\_\.]', '', name)
    # 2. Collapse multiple dots or spaces
    sanitized = re.sub(r'\.+', '.', sanitized)
    sanitized = re.sub(r'\s+', ' ', sanitized)
    # 3. Strip leading/trailing whitespace and dots
    sanitized = sanitized.strip(' .')
    # 4. Limit length
    return sanitized[:120]

def normalize_filename_for_lookup(name: str) -> str:
    safe_name = sanitize_filename(name).lower()
    stem, ext = os.path.splitext(safe_name)
    stem = re.sub(r'_\d{9,}$', '', stem)
    return f"{stem}{ext}"

def filenames_match(requested_name: str, candidate_name: str) -> bool:
    requested_safe = sanitize_filename(requested_name)
    candidate_safe = sanitize_filename(candidate_name)

    requested_lower = requested_safe.lower()
    candidate_lower = candidate_safe.lower()

    if requested_lower == candidate_lower:
        return True

    if normalize_filename_for_lookup(requested_safe) == normalize_filename_for_lookup(candidate_safe):
        return True

    return requested_lower in candidate_lower or candidate_lower in requested_lower

@app.get("/api/v2/download/{filename}")
def download_file_v2(filename: str):
    """Old path-based download. Keeping for fallback but deprecated."""
    return process_download(filename)

@app.get("/api/v3/download")
def download_file_v3(filename: str):
    """New query-based download for better compatibility with messy names."""
    return process_download(filename)

def process_download(filename: str):
    # Sanitize the input filename
    safe_filename = sanitize_filename(filename)
    
    downloads_dir = os.path.abspath("downloads")
    target_path = os.path.abspath(os.path.join(downloads_dir, safe_filename))
    
    # Verify path is actually inside downloads directory
    if not target_path.startswith(downloads_dir):
        print(f"Security Alert: Attempted path traversal with {filename}")
        raise HTTPException(status_code=400, detail="Invalid filename")

    if os.path.exists(target_path):
        return FileResponse(
            path=target_path,
            filename=safe_filename,
            media_type='application/octet-stream'
        )
        
    # BACKUP FUZZY MATCH LOGIC
    # If exact string fails due to proxy encoding or OS unicode weirdness,
    # find the closest matching file in the directory.
    try:
        files = os.listdir(downloads_dir)
        # Allow fallback matches for stale timestamp-suffixed filenames.
        for f in files:
            if filenames_match(safe_filename, f):
                return FileResponse(
                    path=os.path.join(downloads_dir, f),
                    filename=f,
                    media_type='application/octet-stream'
                )
    except Exception as e:
        print("Fuzzy match error:", e)
    
    # If not found, show what literal name we looked for
    raise HTTPException(status_code=404, detail=f"File not found: {safe_filename}")

@app.delete("/api/downloads/{filename}")
def delete_download(filename: str):
    # 1. Sanitize the input filename
    safe_filename = sanitize_filename(filename)
    
    # 2. Reject if the filename was significantly altered (implies malicious intent or invalid chars)
    # Alternatively, we could just use the safe_filename, but rejecting avoids ambiguity.
    # For now, let's just ensure we only operate on the safe name.
    
    downloads_dir = os.path.abspath("downloads")
    target_path = os.path.abspath(os.path.join(downloads_dir, safe_filename))
    
    # 3. Verify path is actually inside downloads directory
    if not target_path.startswith(downloads_dir):
        # This should technically be impossible due to sanitize_filename removing slashes,
        # but it's a critical second layer of defense (defense in depth).
        print(f"Security Alert: Attempted path traversal with {filename}")
        raise HTTPException(status_code=400, detail="Invalid filename")

    if os.path.exists(target_path):
        os.remove(target_path)
        return {"status": "deleted", "filename": safe_filename}
        
    # BACKUP FUZZY MATCH LOGIC
    try:
        files = os.listdir(downloads_dir)
        for f in files:
            if filenames_match(safe_filename, f):
                fuzzy_path = os.path.join(downloads_dir, f)
                os.remove(fuzzy_path)
                return {"status": "deleted", "filename": f}
    except Exception as e:
        print("Fuzzy match delete error:", e)

    raise HTTPException(status_code=404, detail="File not found")
