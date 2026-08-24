#!/usr/bin/env bash
# Rebuild the hosting sandbox and reattach the existing preview URLs.
#
# Sandboxes get reaped — credit runs out, or one is terminated. When that
# happens the preview *routes* survive but point at a dead session, and every
# request through them returns:
#
#   {"code":"route_not_found","message":"no preview route registered for this host"}
#
# Rebinding the same route ids keeps the hostnames identical, so the Vercel
# proxy at tenki.monster needs no change. That is the whole point of this
# script: recover without touching DNS or the proxy.
#
# Usage: ./scripts/restore-sandbox.sh
set -euo pipefail

SESSION="tenki-studio"
REPO="https://github.com/opencolin/tenki-studio.git"
SITE_PORT=8080
EVENTS_PORT=8090

# Stable preview-route ids. `tenki sandbox preview-url list` prints them.
ROUTE_SITE="01a022bb-6b03-727b-8269-73d0599417c0"    # slug tenki-studio
ROUTE_EVENTS="01a02625-f381-74ed-976b-ed857a64578c"  # slug tenki-events

say() { printf '\n==> %s\n' "$1"; }

if tenki sandbox get --session "$SESSION" >/dev/null 2>&1; then
  say "Reusing sandbox $SESSION"
  tenki sandbox resume --session "$SESSION" >/dev/null 2>&1 || true
else
  say "Creating sandbox $SESSION"
  tenki sandbox create --name "$SESSION" --sticky --allow-inbound \
    --cpu 2 --memory-mb 4096 --idle-timeout 0 >/dev/null
fi

say "Cloning and building (backgrounded — a long exec gets its connection reset)"
tenki sandbox exec --session "$SESSION" --timeout 120s -c \
  "cd ~ && rm -rf tenki-studio && git clone --depth 1 $REPO >/tmp/clone.log 2>&1 && echo cloned"

tenki sandbox exec --session "$SESSION" --timeout 60s -c \
  'cd ~/tenki-studio && rm -f /tmp/BUILD_OK && setsid sh -c "npm ci --no-audit --no-fund >/tmp/install.log 2>&1 && npm run build >/tmp/build.log 2>&1 && touch /tmp/BUILD_OK" >/dev/null 2>&1 & sleep 1; echo building' >/dev/null

until tenki sandbox exec --session "$SESSION" --timeout 30s -c 'test -f /tmp/BUILD_OK && echo DONE' 2>/dev/null | grep -q DONE; do
  printf '.'
  sleep 8
done
echo " built"

say "Starting the site and the event ingest"
# Never `pkill -f <pattern>` here: the pattern matches this exec shell's own
# command line and kills it. Match the process name instead.
tenki sandbox exec --session "$SESSION" --timeout 40s -c 'pkill -x node; pkill -x python3; sleep 1; true' >/dev/null 2>&1 || true
tenki sandbox exec --session "$SESSION" --timeout 60s -c \
  "cd ~/tenki-studio && PORT=$SITE_PORT setsid node scripts/serve.mjs out >/tmp/serve.log 2>&1 < /dev/null &
   cd ~/tenki-studio/spike && PORT=$EVENTS_PORT TENKI_CALLBACK_SECRET=spike-secret setsid python3 ingest.py >/tmp/ingest.log 2>&1 < /dev/null &
   sleep 4
   curl -s -o /dev/null -w 'site:%{http_code} ' http://localhost:$SITE_PORT/studio/
   curl -s -o /dev/null -w 'events:%{http_code}\n' http://localhost:$EVENTS_PORT/health"

say "Rebinding the preview routes to this session"
for pair in "$ROUTE_SITE:$SITE_PORT" "$ROUTE_EVENTS:$EVENTS_PORT"; do
  id="${pair%%:*}"; port="${pair##*:}"
  tenki sandbox preview-url unbind "$id" >/dev/null 2>&1 || true
  tenki sandbox preview-url bind "$id" --session "$SESSION" --port "$port" >/dev/null
done
tenki sandbox preview-url list | grep -E "SLUG|tenki-studio|tenki-events" || true

say "Verifying through the domain"
sleep 3
for p in / /studio/ /_events/health; do
  printf '  https://tenki.monster%-16s %s\n' "$p" "$(curl -sL -o /dev/null -w '%{http_code}' --max-time 25 "https://tenki.monster$p")"
done
