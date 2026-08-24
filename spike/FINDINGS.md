# Phase 0 findings — the run transport holds

Executed 21 Aug 2026 against sandbox `tenki-studio`, per
[PRD 002 §4](../docs/PRD-002-make-one-run-real.md). The question was whether a
long-running process inside a Tenki sandbox can stream events out reliably,
given that `tenki sandbox exec` drops its connection on long commands.

**Answer: yes, provided the runner is detached and pushes rather than being
streamed from.** The design in PRD 001 §10.3 survives every failure we induced.
No LLM credentials were needed — the transport is what was under test, so the
runner ran in `--mode fake`.

## What was measured

| # | Test | Result |
|---|---|---|
| 1 | Detached runner outlives its `exec` | `exec` returned in **3s**; the run continued for **~60s** and delivered all **28** events |
| 2 | Sequence integrity | Seqs contiguous `1..28`, no gaps, no duplicates |
| 3 | Bad HMAC signature | Rejected **401**, counted, not stored |
| 4 | Retried batch (at-least-once delivery) | Same batch posted 3× → `added: 2, 0, 0`; dedupe on `seq` makes retries harmless |
| 5 | Ingest unreachable for the whole run | Runner **completed anyway**: 18 emitted, 0 delivered, 18 dropped and reported; all 18 recoverable from the sandbox's stdout JSONL |
| 6 | Runner killed mid-run | 5 events captured, **no terminal event** — death is only detectable from the heartbeat gap |
| 7 | Heartbeats | Emitted every 5s throughout, including during long silent stretches |
| 8 | Public reachability | Ingest exposed at a Tenki preview URL and reached from the open internet |
| 9 | Browser end-to-end | The studio's Output and Traces views rendered the live run over SSE, tail-following, from a static site on one sandbox against an ingest on another port |

## What this changes in the design

**Detach and push; never hold a stream open.** `exec` returning in 3 seconds
while the run continued is the whole finding. The orchestrator should start the
runner with `setsid … &`, take the immediate return as "started", and learn
everything else from callbacks.

**Keep stdout JSONL as a second channel.** Test 5 is the argument: with the
ingest completely unreachable the run still finished correctly and every event
was recoverable from the sandbox's own log. That makes callback delivery an
optimisation rather than a single point of failure, and it costs one `print`.

**At-least-once delivery is sufficient.** Because the ingest dedupes on `seq`,
the runner can retry freely and the orchestrator needs no delivery bookkeeping.

**Heartbeats are the only death signal, so they are not optional.** A killed
runner emits no terminal event; it simply stops. The watchdog in PRD 001 SR-3
(three missed heartbeats → `failed(lost)` and reap) is the only thing standing
between a crashed run and a run that appears to hang forever.

**SSE needs `id:` and keep-alive comments.** `id:` lets `EventSource` resume
with `Last-Event-ID` after a blip, and a periodic comment frame stops an idle
stream being reaped in transit. Both are in `ingest.py`.

**CORS is required.** The studio and the ingest are different origins — a
different exposed port is a different host — so the ingest sets
`access-control-allow-origin`. Production should narrow this from `*`.

## Recovering after a reap (added 24 Aug)

Sandboxes do not survive a credit lapse. When the session is reaped the preview
*routes* remain but point at a dead session, and every request through them
returns `{"code":"route_not_found","message":"no preview route registered for
this host"}` — which looks like a proxy or DNS fault and is neither.

Rebinding the same route ids keeps the hostnames identical, so the Vercel proxy
at tenki.monster needs no change. `scripts/restore-sandbox.sh` does the whole
recovery: create, clone, build, start both services, unbind and rebind both
routes, verify through the domain.

Note that `preview-url bind` refuses a route that is still bound to the dead
session — unbind first.

## Operational gotchas worth writing down

- **`pkill -f <pattern>` inside `exec` kills the exec shell**, because the
  pattern matches the shell's own command line. Bit us twice. Use `pkill -x node`,
  or `pgrep … | head -1 | xargs kill`.
- **`/srv` is not writable**; the sandbox user is `tenki` and work belongs under `~`.
- **`npm i -g` installs outside `PATH`** in the non-login shell, which is why the
  site is served by a zero-dependency Node script rather than `serve`.
- **`curl` is an unreliable SSE client through the gateway.** Streams that
  render progressively in a browser returned zero bytes to `curl -sN` under a
  `timeout`. Verify streaming with the real client before concluding the
  transport is broken — we nearly "fixed" a working path twice.
- **Long `exec` commands get their connection reset** — the finding that started
  this. Background the work and poll for a sentinel file.

## What this spike is not

It is one process doing the orchestrator's job and the runner's job, holding
events in memory, with a shared static secret and open CORS. It proves the
transport and nothing else. Phase 1a replaces the ingest with the real
orchestrator (Postgres, Redis, per-run HMAC keys) and swaps `--mode fake` for
CrewAI driven off its event bus — the wire format and the studio-side consumer
do not need to change for that.

## Reproducing

```bash
# in a sandbox
python3 spike/ingest.py &                     # PORT=8090
python3 spike/runner.py --callback http://localhost:8090/ingest \
  --run-id run_demo --mode fake --scale 3.0 &

tenki sandbox expose --session <name> 8090 --slug <slug>
```

Then open the studio against it:

```
/studio/?stream=https://<slug>--<id>.us.sb.tenki.sh&run=run_demo
```
