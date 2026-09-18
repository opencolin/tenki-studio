#!/usr/bin/env bash
# Bring the live site back up after the hosting sandbox stops serving.
#
# Two different failures look identical from outside — every request returns
#
#   {"code":"route_not_found","message":"no preview route registered for this host"}
#
#   1. The sandbox was PAUSED or reaped. `tenki sandbox list` shows the state.
#   2. The sandbox is fine but its preview hostname moved. The part after `--`
#      is the workspace id, and it is NOT stable: it changed from `irtbn5` to
#      `03q08p` on its own while both sandboxes were healthy, which 404'd the
#      whole domain. `tenki sandbox preview-url list` prints the real hostnames.
#
# This script fixes 1 and detects 2. For 2 the fix is in proxy/: update the two
# destinations in vercel.json and redeploy, since only the proxy knows the host.
#
# Usage: ./scripts/restore-sandbox.sh
set -euo pipefail

SESSION="tenki-studio"
REPO="https://github.com/opencolin/tenki-studio.git"
SITE_PORT=8080
EVENTS_PORT=8090
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

say() { printf '\n==> %s\n' "$1"; }
sbx() { tenki sandbox exec --session "$SESSION" --timeout "${2:-60s}" -c "$1"; }

say "Ensuring the sandbox is running"
if tenki sandbox get --session "$SESSION" >/dev/null 2>&1; then
  tenki sandbox resume --session "$SESSION" >/dev/null 2>&1 || true
else
  tenki sandbox create --name "$SESSION" --sticky --allow-inbound \
    --cpu 2 --memory-mb 2048 --idle-timeout 0 >/dev/null
fi

# A paused sandbox restores its processes with dead sockets: they look alive in
# `ps` and listen on the right port, but nothing reaches them. systemd units are
# what make that recoverable — restarting the unit rebinds a working socket.
say "Installing the site"
if ! sbx 'test -d ~/tenki-studio/out && echo has-build' 2>/dev/null | grep -q has-build; then
  sbx "cd ~ && rm -rf tenki-studio && git clone --depth 1 $REPO >/tmp/clone.log 2>&1 && echo cloned" 120s
  sbx 'cd ~/tenki-studio && rm -f /tmp/BUILD_OK && setsid sh -c "npm ci --no-audit --no-fund >/tmp/install.log 2>&1 && npm run build >/tmp/build.log 2>&1 && touch /tmp/BUILD_OK" >/dev/null 2>&1 & sleep 1; echo building' >/dev/null
  until sbx 'test -f /tmp/BUILD_OK && echo DONE' 30s 2>/dev/null | grep -q DONE; do printf '.'; sleep 8; done
  echo " built"
fi

say "Installing the orchestrator"
sbx 'mkdir -p ~/tenki-studio/runner /tmp/tenki-runs' >/dev/null
for f in orchestrator.py tenki_runner.py stub_llm.py; do
  tenki sandbox write --session "$SESSION" --path "tenki-studio/runner/$f" \
    --data-file "$ROOT/runner/$f" >/dev/null
done

# CrewAI itself, in its own venv. Only the runner needs it; the orchestrator is
# stdlib, so the site and the event stream come up even if this fails.
if ! sbx 'test -x ~/crewenv/bin/python && echo has-venv' 2>/dev/null | grep -q has-venv; then
  say "Building the CrewAI venv (slow — backgrounded)"
  sbx 'rm -f /tmp/CREWENV_OK; setsid sh -c "python3 -m venv ~/crewenv >/tmp/crewenv.log 2>&1 && ~/crewenv/bin/pip install --no-cache-dir --upgrade pip >>/tmp/crewenv.log 2>&1 && ~/crewenv/bin/pip install --no-cache-dir crewai >>/tmp/crewenv.log 2>&1 && touch /tmp/CREWENV_OK" >/dev/null 2>&1 & sleep 1; echo installing' >/dev/null
  until sbx 'test -f /tmp/CREWENV_OK && echo DONE' 30s 2>/dev/null | grep -q DONE; do printf '.'; sleep 10; done
  echo " installed"
fi

say "Starting both services under systemd"
# Never `pkill -f <pattern>` here: the pattern matches this exec shell's own
# command line and kills it before the restart runs, leaving nothing serving.
sbx "sudo cp ~/tenki-studio/deploy/tenki-events.service /etc/systemd/system/ 2>/dev/null || true
     sudo systemctl daemon-reload
     sudo systemctl enable --now tenki-studio tenki-events 2>&1 | tail -1
     sudo systemctl restart tenki-studio tenki-events
     sleep 3
     curl -s -o /dev/null -w 'site:%{http_code} ' http://localhost:$SITE_PORT/studio/
     curl -s -o /dev/null -w 'events:%{http_code}\n' http://localhost:$EVENTS_PORT/health"

say "Exposing both ports"
tenki sandbox expose --session "$SESSION" "$SITE_PORT" --slug tenki-studio >/dev/null
tenki sandbox expose --session "$SESSION" "$EVENTS_PORT" --slug tenki-events >/dev/null
tenki sandbox preview-url list | grep -E "SLUG|tenki-studio|tenki-events" || true

say "Checking the proxy still points where the sandbox actually lives"
live_site="$(tenki sandbox preview-url list | awk '$4 == "tenki-studio" {print $10}' | head -1)"
if [ -n "$live_site" ] && ! grep -q "${live_site#https://}" "$ROOT/proxy/vercel.json"; then
  printf '  MISMATCH: proxy/vercel.json does not name %s\n' "$live_site"
  printf '  Update both destinations there, then: cd proxy && vercel deploy --prod\n'
else
  printf '  proxy destinations match\n'
fi

say "Verifying through the domain"
for p in / /studio/ /traces/ /_events/health; do
  printf '  https://tenki.monster%-16s %s\n' "$p" \
    "$(curl -sL -o /dev/null -w '%{http_code}' --max-time 25 "https://tenki.monster$p?cb=$RANDOM")"
done
