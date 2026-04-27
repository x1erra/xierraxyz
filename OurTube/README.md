# OurTube Architecture

`/ourtube` is served by the main Next.js app in this repo, not by a standalone frontend inside `OurTube/`.

Source of truth:
- Frontend route: `src/app/ourtube/page.tsx`
- Frontend UI: `src/components/ourtube/`
- API/backend: `OurTube/backend/`
- Pi stack: `OurTube/docker-compose.yml`

Deployment:
- Frontend changes deploy through the main site build on Vercel.
- Backend changes deploy through the Pi/Portainer stack.

Instagram:
- Public Instagram reels/posts are downloaded through yt-dlp with Instagram-specific browser headers and impersonation.
- Login-gated, private, or age/restriction-gated Instagram URLs need cookies. Export cookies in Netscape format to `OurTube/cookies/instagram.txt`; the Docker Compose stack mounts that file read-only at `/app/cookies/instagram.txt`.
- You can override the cookie path with `OURTUBE_INSTAGRAM_COOKIES`.

The old Vite frontend under `OurTube/frontend/` has been removed to avoid split-brain updates.
