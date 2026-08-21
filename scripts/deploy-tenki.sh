#!/usr/bin/env bash
# Build Tenki Studio and host it from a Tenki sandbox.
#
# Requires: the `tenki` CLI, logged in (`tenki login`), and Node 20+.
# Usage: ./scripts/deploy-tenki.sh [session-name] [slug]
set -euo pipefail

SESSION="${1:-tenki-studio}"
SLUG="${2:-tenki-studio}"
PORT=8080
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

cd "$ROOT"

if tenki sandbox get --session "$SESSION" >/dev/null 2>&1; then
  echo "==> Reusing sandbox $SESSION"
  tenki sandbox resume --session "$SESSION" >/dev/null 2>&1 || true
else
  echo "==> Creating sandbox $SESSION"
  tenki sandbox create \
    --name "$SESSION" \
    --sticky \
    --allow-inbound \
    --cpu 2 \
    --memory-mb 2048 \
    --idle-timeout 0 >/dev/null
fi

echo "==> Building inside the sandbox from this repo"
tenki sandbox exec --session "$SESSION" --timeout 120s -c \
  'cd ~ && rm -rf tenki-studio && git clone --depth 1 https://github.com/opencolin/tenki-studio.git >/tmp/clone.log 2>&1 && echo cloned'
tenki sandbox exec --session "$SESSION" --timeout 60s -c \
  'cd ~/tenki-studio && setsid sh -c "npm ci --no-audit --no-fund >/tmp/install.log 2>&1 && npm run build >/tmp/build.log 2>&1 && touch /tmp/BUILD_OK" >/dev/null 2>&1 < /dev/null & sleep 1; echo building'
until tenki sandbox exec --session "$SESSION" --timeout 30s -c 'test -f /tmp/BUILD_OK && echo DONE' 2>/dev/null | grep -q DONE; do
  sleep 10
done
echo "==> Built"

echo "==> Starting the server on :$PORT"
tenki sandbox exec --session "$SESSION" --timeout 60s -c \
  "pkill -f serve.mjs || true; cd ~/tenki-studio && PORT=$PORT setsid node scripts/serve.mjs out >/tmp/serve.log 2>&1 < /dev/null & sleep 3; curl -sf -o /dev/null http://localhost:$PORT/ && echo serving"

echo "==> Exposing the port"
tenki sandbox expose --session "$SESSION" "$PORT" --slug "$SLUG"

echo "==> Done"
