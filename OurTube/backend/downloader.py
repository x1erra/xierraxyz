import yt_dlp
import threading
import asyncio
import os
import shutil
import time
import re
from urllib.parse import urlparse, urlunparse
from socket_manager import manager

import uuid

def sanitize_filename(name):
    # 1. Remove all non-alphanumeric except spaces, dashes, underscores, and dots
    sanitized = re.sub(r'[^a-zA-Z0-9\s\-\_\.]', '', name)
    # 2. Collapse multiple dots or spaces
    sanitized = re.sub(r'\.+', '.', sanitized)
    sanitized = re.sub(r'\s+', ' ', sanitized)
    # 3. Strip leading/trailing whitespace and dots
    sanitized = sanitized.strip(' .')
    # 4. Limit length
    return sanitized[:120]

def is_youtube_url(url: str) -> bool:
    lowered = url.lower()
    return "youtube.com/" in lowered or "youtu.be/" in lowered

def is_instagram_url(url: str) -> bool:
    parsed = urlparse(url.strip())
    if not parsed.hostname:
        parsed = urlparse(f"https://{url.strip()}")

    hostname = parsed.hostname or ""
    hostname = hostname.lower()
    return hostname == "instagram.com" or hostname.endswith(".instagram.com")

def normalize_instagram_url(url: str) -> str:
    parsed = urlparse(url.strip())

    if not parsed.scheme:
        parsed = urlparse(f"https://{url.strip()}")

    if not is_instagram_url(parsed.geturl()):
        return url.strip()

    # Instagram share URLs often carry tracking parameters that can confuse
    # extractors. The post/reel/story identifier is in the path.
    path = re.sub(r"/+", "/", parsed.path)
    return urlunparse((
        parsed.scheme or "https",
        parsed.netloc or "www.instagram.com",
        path,
        "",
        "",
        "",
    ))

class Downloader:
    def __init__(self):
        self.active_downloads = {}
        self.active_downloads_lock = threading.Lock()
        # Ensure folders exist
        for folder in ["downloads", "processing"]:
            if not os.path.exists(folder):
                os.makedirs(folder)

    async def start_download(self, url: str, format_id: str = "mp4", quality: str = "best", task_id: str = None, strict_mode: bool = False, split_chapters: bool = False, loop=None):
        if loop is None:
            try:
                loop = asyncio.get_running_loop()
            except RuntimeError:
                loop = asyncio.new_event_loop()
        
        self.loop = loop
        # Use provided ID or generate a new one
        if not task_id:
            task_id = str(uuid.uuid4())

        self._set_task_state(
            task_id,
            id=task_id,
            url=url,
            format_id=format_id,
            quality=quality,
            strict_mode=strict_mode,
            split_chapters=split_chapters,
            status="queued",
            percent="0%",
            speed="Queued",
            eta="Waiting...",
            created_at=time.time(),
        )
        
        # Use default executor (ThreadPoolExecutor) to run blocking download
        loop.run_in_executor(None, self._download_task, task_id, url, format_id, quality, strict_mode, split_chapters)
        return task_id

    def _set_task_state(self, task_id, **updates):
        with self.active_downloads_lock:
            current = dict(self.active_downloads.get(task_id, {"id": task_id}))
            current.update({key: value for key, value in updates.items() if value is not None})
            current.setdefault("created_at", time.time())
            current["updated_at"] = time.time()
            self.active_downloads[task_id] = current

    def get_task(self, task_id):
        with self.active_downloads_lock:
            task = self.active_downloads.get(task_id)
            return dict(task) if task else None

    def _cleanup_processing_files(self, task_id):
        processing_dir = "processing"
        if not os.path.exists(processing_dir):
            return

        for name in os.listdir(processing_dir):
            if not name.startswith(f"{task_id}."):
                continue

            path = os.path.join(processing_dir, name)
            if os.path.isfile(path):
                try:
                    os.remove(path)
                except OSError:
                    pass

    def _broadcast_progress(self, payload):
        task_id = payload.get("id")
        if task_id:
            updates = {key: value for key, value in payload.items() if key != "type"}
            updates["event_type"] = payload.get("type")
            if payload.get("type") == "error" and "status" not in updates:
                updates["status"] = "error"
            self._set_task_state(task_id, **updates)

        asyncio.run_coroutine_threadsafe(manager.broadcast(payload), self.loop)

    def _run_download_attempt(self, ydl_opts, task_id, url):
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            self._broadcast_progress({
                'type': 'progress',
                'id': task_id,
                'status': 'initializing',
                'percent': '0%',
                'speed': 'Connecting...',
                'eta': 'Preparing...'
            })

            info = ydl.extract_info(url, download=False)
            title = info.get('title', 'video')

            self._broadcast_progress({
                'type': 'progress',
                'id': task_id,
                'filename': title,
                'status': 'starting',
                'percent': '0%',
            })

            # Reuse the extracted info to avoid a second extractor pass.
            ydl.process_ie_result(info, download=True)
            return title

    def _instagram_cookie_file(self):
        candidate_paths = [
            os.getenv("OURTUBE_INSTAGRAM_COOKIES"),
            os.getenv("OURTUBE_COOKIES_FILE"),
            "/app/cookies/instagram.txt",
        ]

        for path in candidate_paths:
            if path and os.path.exists(path):
                return path

        return None

    def _apply_instagram_options(self, ydl_opts):
        ydl_opts.update({
            'http_headers': {
                'User-Agent': (
                    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) '
                    'AppleWebKit/537.36 (KHTML, like Gecko) '
                    'Chrome/124.0.0.0 Safari/537.36'
                ),
                'Accept-Language': 'en-US,en;q=0.9',
                'Referer': 'https://www.instagram.com/',
            },
            'extractor_retries': 5,
            'socket_timeout': 30,
            'sleep_interval_requests': 1,
            'impersonate': 'chrome',
        })

        cookie_file = self._instagram_cookie_file()
        if cookie_file:
            ydl_opts['cookiefile'] = cookie_file

        return ydl_opts

    def _download_task(self, task_id, url, format_id, quality, strict_mode, split_chapters):
        # We use the ID as the temporary filename to avoid collisions and special char issues in paths
        
        # We need a progress hook that captures 'd' but also knows about 'task_id'
        def progress_hook(d):
             if d['status'] == 'downloading':
                data = {
                    'type': 'progress',
                    'id': task_id,
                    'filename': d.get('filename'), # This is the temp filename usually
                    'percent': d.get('_percent_str', '0%'),
                    'speed': d.get('_speed_str', '0'),
                    'eta': d.get('_eta_str', '0'),
                    'status': 'downloading'
                }
                self._broadcast_progress(data)
        
        url = normalize_instagram_url(url) if is_instagram_url(url) else url
        is_instagram = is_instagram_url(url)

        ydl_opts = {
            'outtmpl': f'processing/{task_id}.%(ext)s', # Use task_id for tracking temp file
            'progress_hooks': [progress_hook],
            'quiet': False,
            'no_warnings': False,
            'continuedl': True,
            'nocheckcertificate': True,
            'retries': 10,
            'fragment_retries': 10,
            'concurrent_fragment_downloads': 5, # Speed up HLS
            'noplaylist': strict_mode, # Strict Mode
            'split_chapters': split_chapters, # Split Chapters
        }

        if split_chapters:
             ydl_opts['force_keyframes_at_cuts'] = True # Ensure clean cuts for chapters

        if format_id == 'thumbnail':
            ydl_opts['writethumbnail'] = True
            ydl_opts['skip_download'] = True
        elif format_id in ['mp3', 'm4a', 'opus', 'wav', 'flac']:
            ydl_opts['format'] = 'bestaudio/best'
            ydl_opts['postprocessors'] = [{
                'key': 'FFmpegExtractAudio',
                'preferredcodec': format_id,
                'preferredquality': '192',
            }]
        else:
             # Video Mode
             # For Twitch/HLS, sometimes bestvideo+bestaudio causes chunk issues
             # We will try to force a single format if possible or better merging
             format_selector = 'bestvideo+bestaudio/best'
             
             if is_instagram:
                 # Instagram generally exposes progressive MP4s. Prefer one
                 # complete file before falling back to split/merged formats.
                 format_selector = 'best[ext=mp4]/best/bestvideo*+bestaudio'
             elif quality == 'best':
                 # Force H.264 (avc1) and AAC (mp4a) for maximum compatibility (Linux/iOS/Windows)
                 # Fallback to best mp4, then best available if strict codecs aren't found
                 format_selector = 'bestvideo[vcodec^=avc1]+bestaudio[acodec^=mp4a]/best[ext=mp4]/best'
             elif quality == 'best_ios':
                 format_selector = 'bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best'
             elif quality == 'worst':
                 format_selector = 'worstvideo+worstaudio/worst'
             elif quality.endswith('p'):
                 height = quality[:-1]
                 if is_instagram:
                     format_selector = f'best[height<={height}][ext=mp4]/best[height<={height}]/best'
                 else:
                     format_selector = f'bestvideo[height<={height}]+bestaudio/best[height<={height}]'
             
             ydl_opts['format'] = format_selector
             ydl_opts['merge_output_format'] = 'mp4' if format_id == 'mp4' or format_id == 'any' else None
        
        
        if is_instagram:
            ydl_opts = self._apply_instagram_options(ydl_opts)
        
        try:
            title = None
            attempt_opts = [ydl_opts]

            if is_youtube_url(url):
                fallback_opts = dict(ydl_opts)
                fallback_opts['extractor_args'] = {
                    'youtube': {
                        'player_client': ['web'],
                        'formats': ['incomplete'],
                    }
                }
                attempt_opts.append(fallback_opts)

            last_error = None

            for attempt_index, opts in enumerate(attempt_opts):
                try:
                    title = self._run_download_attempt(opts, task_id, url)
                    break
                except Exception as attempt_error:
                    last_error = attempt_error

                    if attempt_index == len(attempt_opts) - 1:
                        raise

                    print(f"Retrying {url} with YouTube-safe fallback after: {attempt_error}")
                    self._cleanup_processing_files(task_id)
                    self._broadcast_progress({
                        'type': 'progress',
                        'id': task_id,
                        'status': 'retrying',
                        'percent': '0%',
                        'speed': 'Retrying extractor',
                        'eta': 'Trying alternate YouTube path...'
                    })

            if title is None and last_error:
                raise last_error
                
                # 3. VERIFY & MOVE (Atomic)
                # Broadcast merging status
            self._broadcast_progress({
                'type': 'progress',
                'id': task_id,
                'status': 'merging',
                'percent': '99%',
                'speed': 'Processing',
                'eta': 'Finalizing...'
            })

            # Small sleep to let ffmpeg close descriptors
            time.sleep(2)

            # Find the actual resulting file
            # yt-dlp might have changed the ext during merge
            candidate_exts = [format_id if format_id != 'any' else 'mp4', 'mp4', 'mkv', 'webm', 'm4a', 'mp3', 'wav', 'jpg', 'webp']
            actual_file = None
            
            # Try the direct name first using task_id
            possible_paths = [
                os.path.join("processing", f"{task_id}.{ext}") for ext in candidate_exts
            ]
            
            for path in possible_paths:
                if os.path.exists(path):
                    actual_file = path
                    break
            
            if not actual_file:
                raise Exception("Could not find downloaded file in processing directory")

            # Move to final location with sanitized title
            # Ensure we don't have double dots or spaces between title and extension
            ext = actual_file.rsplit('.', 1)[-1].strip().lower()
            safe_title = sanitize_filename(title)
            
            # Construct final filename: Title.ext
            final_filename = f"{safe_title}.{ext}"
            final_path = os.path.join("downloads", final_filename)
            
            # If file already exists, add timestamp to avoid collision
            if os.path.exists(final_path):
                final_filename = f"{safe_title}_{int(time.time())}.{ext}"
                final_path = os.path.join("downloads", final_filename)

            shutil.move(actual_file, final_path)
            
            # Double check size for logging
            file_size = os.path.getsize(final_path)
            print(f"Success: {final_path} ({file_size} bytes)")
            
            # 4. FINISH
            final_filename = os.path.basename(final_path)
            self._broadcast_progress({
                'type': 'finished',
                'id': task_id,
                'filename': final_filename,
                'file_size': file_size,
                'status': 'finished'
            })

        except Exception as e:
            print(f"Error downloading {url}: {e}")
            error_message = str(e)
            if is_instagram:
                cookie_hint = (
                    " Instagram may require login cookies for this URL. "
                    "Export Instagram cookies to /app/cookies/instagram.txt "
                    "or set OURTUBE_INSTAGRAM_COOKIES to the cookie file path."
                )
                if "cookies" not in error_message.lower() and "login" not in error_message.lower():
                    error_message = f"{error_message}{cookie_hint}"
            # Broadcast error
            self._broadcast_progress({
                'type': 'error',
                'url': url,
                'id': task_id,
                'error': error_message,
                'status': 'error',
            })
    
downloader_service = Downloader()
