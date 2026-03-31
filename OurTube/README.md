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

The old Vite frontend under `OurTube/frontend/` has been removed to avoid split-brain updates.
