#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Keep the safer workspace sandbox, but explicitly make the repo's .git
# directory writable so Codex can create index.lock, refs, and commits.
exec codex \
  -C "$ROOT" \
  -a on-request \
  -s workspace-write \
  --add-dir "$ROOT/.git" \
  "$@"
