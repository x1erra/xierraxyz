import re

with open("OurTube/backend/main.py", "r") as f:
    content = f.read()

replacement = """def process_download(filename: str):
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
        # Try finding a file that contains our sanitized string (ignoring case)
        for f in files:
            if safe_filename.lower() in f.lower() or f.lower() in safe_filename.lower():
                return FileResponse(
                    path=os.path.join(downloads_dir, f),
                    filename=f,
                    media_type='application/octet-stream'
                )
    except Exception as e:
        print("Fuzzy match error:", e)
    
    # If not found, show what literal name we looked for
    raise HTTPException(status_code=404, detail=f"File not found: {safe_filename}")"""

content = re.sub(
    r"""def process_download\(filename: str\):.*?raise HTTPException\(status_code=404, detail=f"File not found: \{safe_filename\}"\)""",
    replacement,
    content,
    flags=re.DOTALL
)

with open("OurTube/backend/main.py", "w") as f:
    f.write(content)
