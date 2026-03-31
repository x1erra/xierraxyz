#!/usr/bin/env bash
set -euo pipefail

CONFIG="${HOME}/.codex/config.toml"

if [[ ! -f "$CONFIG" ]]; then
  echo "Missing Codex config: $CONFIG" >&2
  exit 1
fi

backup="${CONFIG}.bak.$(date +%Y%m%d%H%M%S)"
cp "$CONFIG" "$backup"

if grep -q '^approval_policy\s*=' "$CONFIG"; then
  perl -0pi -e 's/^approval_policy\s*=.*$/approval_policy = "on-request"/m' "$CONFIG"
else
  printf '\napproval_policy = "on-request"\n' >> "$CONFIG"
fi

echo "Updated $CONFIG"
echo "Backup saved to $backup"
echo "For this repo, start Codex with: ./codex-xierra.sh"
