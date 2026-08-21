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

echo "==> Building the static site"
npm run build

echo "==> Packing ./out"
TARBALL="$(mktemp -t tenki-studio-XXXX).tgz"
tar czf "$TARBALL" -C out .

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

echo "==> Uploading the site"
tenki sandbox exec --session "$SESSION" -- bash -lc 'rm -rf /srv/site && mkdir -p /srv/site'
tenki sandbox write --session "$SESSION" --path /root/site.tgz --file "$TARBALL"
tenki sandbox exec --session "$SESSION" -- bash -lc 'tar xzf /root/site.tgz -C /srv/site'

echo "==> Starting the server on :$PORT"
tenki sandbox exec --session "$SESSION" -- bash -lc \
  "pkill -f 'serve@14' || true; setsid npx --yes serve@14 /srv/site -l $PORT --single >/tmp/serve.log 2>&1 < /dev/null & sleep 4; curl -sf -o /dev/null http://localhost:$PORT/ && echo serving"

echo "==> Exposing the port"
tenki sandbox expose --session "$SESSION" "$PORT" --slug "$SLUG"

rm -f "$TARBALL"
echo "==> Done"
