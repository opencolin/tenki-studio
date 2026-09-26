#!/usr/bin/env bash
# Bring the live site back up after the hosting sandbox stops serving.
#
# Several different failures look identical from outside — every request returns
#
#   {"code":"route_not_found","message":"no preview route registered for this host"}
#
#   1. The workspace balance ran out. The sandbox auto-pauses even though it is
#      sticky, and it cannot resume until the account is topped up. This has
#      been the cause every time the site went down on its own.
#   2. The sandbox was PAUSED or reaped for another reason. `tenki sandbox list`.
#   3. The sandbox is fine but its preview hostname moved. The part after `--`
#      is the workspace id, and it is NOT stable: it changed from `irtbn5` to
#      `03q08p` on its own while the sandbox was healthy, which 404'd the whole
#      domain. `tenki sandbox preview-url list` prints the real hostname.
#
# This script fixes 2, detects 3, and says so plainly when it hits 1 — which
# only a top-up can fix. For 3 the fix is in proxy/: update the destination in
# vercel.json and redeploy, since only the proxy knows the host.
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
  # `resume` returns long before the session can take commands, and a resume
  # already in flight makes a second one fail outright — so ignore the result
  # and wait on the state instead. Without this the very next exec dies with
  # "http2: client connection lost", which reads like a network fault rather
  # than "not up yet".
  tenki sandbox resume --session "$SESSION" >/dev/null 2>&1 || true
else
  # --sticky is the whole story now: `--idle-timeout` was removed from the CLI
  # and sandboxes no longer auto-pause on idle. Passing it fails the create.
  tenki sandbox create --name "$SESSION" --sticky --allow-inbound \
    --cpu 2 --memory-mb 2048 --disk-size-gb 10 >/dev/null
fi

# RUNNING is necessary but not sufficient: exec is refused for a while after
# the state flips, so a working exec is the only honest readiness signal.
# Ten minutes — a cold resume from a pause snapshot is genuinely slow.
printf '    waiting for the session'
ready=no
for _ in $(seq 1 120); do
  if sbx 'echo ready' 30s 2>/dev/null | grep -q ready; then ready=yes; break; fi
  printf '.'; sleep 5
done

if [ "$ready" = yes ]; then
  echo " up"
else
  state="$(tenki sandbox get --session "$SESSION" 2>/dev/null | awk '/^state/{print $3}')"
  echo " never came up (state=${state:-unknown})"
  # Only blame the balance when the session genuinely will not start. Saying
  # "top up" at a session that is RUNNING sends you off fixing the wrong thing,
  # which is exactly the sin this message exists to prevent.
  if [ "$state" != "RUNNING" ]; then
    cat <<EOF

  A session stuck outside RUNNING is usually an empty workspace balance.
  Tenki does not say so on resume — it cycles RESUMING -> timeout, and a
  second resume fails with "session belongs to a different resume
  operation". Only 'create' names it:

      failed_precondition: workspace balance is empty; top up to start a sandbox

  Top up the Tenki workspace, then rerun this script.
EOF
  else
    echo "  The session is RUNNING but not accepting commands. Rerun; if that"
    echo "  persists, terminate it and let this script build a fresh one."
  fi
  exit 1
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
sbx 'mkdir -p ~/tenki-studio/runner ~/tenki-studio/deploy ~/tenki-studio/scripts /tmp/tenki-runs' >/dev/null
# Written from this checkout, not the clone, so a restore always runs the code
# you are looking at — including serve.mjs, which carries the /_events proxy.
for f in runner/orchestrator.py runner/tenki_runner.py runner/stub_llm.py \
         scripts/serve.mjs deploy/tenki-studio.service deploy/tenki-events.service; do
  tenki sandbox write --session "$SESSION" --path "tenki-studio/$f" \
    --data-file "$ROOT/$f" >/dev/null
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
sbx "sudo cp ~/tenki-studio/deploy/tenki-studio.service ~/tenki-studio/deploy/tenki-events.service /etc/systemd/system/
     sudo systemctl daemon-reload
     sudo systemctl enable --now tenki-studio tenki-events 2>&1 | tail -1
     sudo systemctl restart tenki-studio tenki-events
     sleep 3
     curl -s -o /dev/null -w 'site:%{http_code} ' http://localhost:$SITE_PORT/studio/
     curl -s -o /dev/null -w 'events:%{http_code}\n' http://localhost:$EVENTS_PORT/health"

# One port, one route. The orchestrator on :8090 is reached through the site
# server's /_events proxy, so it needs no route of its own — a second route is
# what broke twice before.
say "Exposing the site"
tenki sandbox expose --session "$SESSION" "$SITE_PORT" --slug tenki-studio >/dev/null
tenki sandbox preview-url list | grep -E "SLUG|tenki-studio" || true

say "Checking the proxy still points where the sandbox actually lives"
live_site="$(tenki sandbox preview-url list | awk '$4 == "tenki-studio" {print $10}' | head -1)"
if [ -n "$live_site" ] && ! grep -q "${live_site#https://}" "$ROOT/proxy/vercel.json"; then
  printf '  MISMATCH: proxy/vercel.json does not name %s\n' "$live_site"
  printf '  Update the destination there, then: cd proxy && vercel deploy --prod\n'
else
  printf '  proxy destination matches\n'
fi

say "Verifying through the domain"
for p in / /studio/ /traces/ /_events/health; do
  printf '  https://tenki.monster%-16s %s\n' "$p" \
    "$(curl -sL -o /dev/null -w '%{http_code}' --max-time 25 "https://tenki.monster$p?cb=$RANDOM")"
done
