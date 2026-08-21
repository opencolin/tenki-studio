#!/usr/bin/env python3
"""
Phase 0 spike: the in-sandbox side of the run protocol (PRD 002 §4).

The question this exists to answer is *transport*, not model quality: can a
long-running process inside a Tenki sandbox stream events out reliably, given
that `tenki sandbox exec` drops its connection on long commands?

So the runner is backgrounded and pushes events out over HMAC-signed HTTP
batches rather than holding a stream open. Two modes:

    --mode fake     deterministic timings, no LLM, no credentials
    --mode crewai   construct a real CrewAI crew (needs a model key)

Only stdlib, so it runs in a bare sandbox with no install step.
"""

import argparse
import hashlib
import hmac
import json
import os
import random
import sys
import threading
import time
import urllib.error
import urllib.request

BATCH_MAX = 50
BATCH_INTERVAL_S = 1.0
HEARTBEAT_S = 5.0
RETRIES = 3


class Emitter:
    """Buffers events and POSTs them in signed batches. Never blocks the run."""

    def __init__(self, callback: str, secret: str, run_id: str, jsonl=sys.stdout):
        self.callback = callback
        self.secret = secret.encode()
        self.run_id = run_id
        self.jsonl = jsonl
        self.seq = 0
        self.buf: list[dict] = []
        self.lock = threading.Lock()
        self.stopped = threading.Event()
        self.dropped = 0
        self.sent = 0
        self.flusher = threading.Thread(target=self._loop, daemon=True)
        self.flusher.start()

    def emit(self, type_: str, label: str, **fields):
        with self.lock:
            self.seq += 1
            event = {
                "run_id": self.run_id,
                "seq": self.seq,
                "ts": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
                "type": type_,
                "label": label,
                **fields,
            }
            self.buf.append(event)
        # stdout JSONL is the second channel: if callbacks fail entirely, the
        # orchestrator can still recover the run from the sandbox's log.
        print(json.dumps(event), file=self.jsonl, flush=True)

    def _loop(self):
        last_beat = time.time()
        while not self.stopped.is_set():
            time.sleep(BATCH_INTERVAL_S)
            if time.time() - last_beat >= HEARTBEAT_S:
                self.emit("heartbeat", "heartbeat")
                last_beat = time.time()
            self.flush()

    def flush(self):
        with self.lock:
            if not self.buf:
                return
            batch, self.buf = self.buf[:BATCH_MAX], self.buf[BATCH_MAX:]
        body = json.dumps({"run_id": self.run_id, "events": batch}).encode()
        sig = hmac.new(self.secret, body, hashlib.sha256).hexdigest()
        for attempt in range(RETRIES):
            try:
                req = urllib.request.Request(
                    self.callback,
                    data=body,
                    headers={"content-type": "application/json", "x-tenki-signature": sig},
                    method="POST",
                )
                with urllib.request.urlopen(req, timeout=10) as resp:
                    resp.read()
                self.sent += len(batch)
                return
            except (urllib.error.URLError, TimeoutError, OSError) as exc:
                if attempt == RETRIES - 1:
                    # Give up on this batch but keep the run alive; stdout JSONL
                    # still holds it, and the ingest can backfill from there.
                    self.dropped += len(batch)
                    print(f"[runner] batch dropped after {RETRIES} tries: {exc}", file=sys.stderr, flush=True)
                    return
                time.sleep(0.4 * (2**attempt) + random.random() * 0.2)

    def close(self):
        self.stopped.set()
        self.flush()


CREW = [
    ("pete_campbell", "client_business_overview_and_requirements", [("llm", 9.6)]),
    ("don_draper", "client_discovery_and_briefing", [("llm", 1.7), ("tool", 1.1), ("llm", 20.6)]),
    ("sal_romano", "visual_design_specifications", [("llm", 9.7)]),
    ("peggy_olson", "final_advertisement_prompt", [("llm", 4.1)]),
]


def run_fake(em: Emitter, scale: float):
    """Replays the demo crew's shape with no LLM. `scale` stretches wall clock."""
    em.emit("provisioning", "Creating sandbox from project snapshot")
    time.sleep(0.4 * scale)
    em.emit("run_started", "Run started", payload={"mode": "fake"})

    for agent, task, steps in CREW:
        started = time.time()
        em.emit("task_started", "Started", agent_id=agent, task_id=task)
        for kind, secs in steps:
            time.sleep(min(secs, 2.5) * scale)
            if kind == "llm":
                em.emit(
                    "llm_call",
                    "LLM call",
                    agent_id=agent,
                    task_id=task,
                    duration_ms=int(secs * 1000),
                )
            else:
                em.emit(
                    "tool_usage_started",
                    "search_the_internet_with_serper",
                    agent_id=agent,
                    task_id=task,
                    duration_ms=int(secs * 1000),
                    payload={"input": {"search_query": "trends in cloud computing 2026"}},
                )
                em.emit("tool_usage_finished", "Tool Usage Finished", agent_id=agent, task_id=task)
        em.emit(
            "task_completed",
            "Completed",
            agent_id=agent,
            task_id=task,
            duration_ms=int((time.time() - started) * 1000),
            payload={"output": f"[fake output for {task}]"},
        )

    em.emit("run_completed", "Run completed")


def run_crewai(em: Emitter):
    """Real CrewAI, driven off its event bus. Needs a model credential."""
    from crewai import Agent, Crew, Task  # noqa: F401  (imported lazily)
    from crewai.utilities.events import crewai_event_bus
    from crewai.utilities.events import (
        LLMCallStartedEvent,
        LLMCallCompletedEvent,
        TaskStartedEvent,
        TaskCompletedEvent,
        ToolUsageStartedEvent,
        ToolUsageFinishedEvent,
    )

    mapping = {
        TaskStartedEvent: ("task_started", "Started"),
        TaskCompletedEvent: ("task_completed", "Completed"),
        LLMCallStartedEvent: ("llm_call", "LLM call"),
        LLMCallCompletedEvent: ("llm_call_completed", "LLM call completed"),
        ToolUsageStartedEvent: ("tool_usage_started", "Tool usage"),
        ToolUsageFinishedEvent: ("tool_usage_finished", "Tool Usage Finished"),
    }
    for event_cls, (type_, label) in mapping.items():
        @crewai_event_bus.on(event_cls)
        def _handler(source, event, _t=type_, _l=label):  # noqa: ANN001
            em.emit(_t, _l, payload={"event": type(event).__name__})

    em.emit("run_started", "Run started", payload={"mode": "crewai"})
    analyst = Agent(
        role="Analyst",
        goal="Answer briefly.",
        backstory="You are terse.",
        verbose=False,
    )
    task = Task(description="Say hello in one sentence.", expected_output="One sentence.", agent=analyst)
    Crew(agents=[analyst], tasks=[task]).kickoff()
    em.emit("run_completed", "Run completed")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--callback", required=True)
    ap.add_argument("--secret", default=os.environ.get("TENKI_CALLBACK_SECRET", "spike-secret"))
    ap.add_argument("--run-id", default=f"run_{int(time.time())}")
    ap.add_argument("--mode", choices=["fake", "crewai"], default="fake")
    ap.add_argument("--scale", type=float, default=1.0, help="stretch fake timings")
    args = ap.parse_args()

    em = Emitter(args.callback, args.secret, args.run_id)
    try:
        if args.mode == "fake":
            run_fake(em, args.scale)
        else:
            run_crewai(em)
    except Exception as exc:  # a crashed crew is still a run outcome
        em.emit("run_failed", "Run failed", payload={"error": str(exc)})
        raise
    finally:
        em.close()
        print(
            f"[runner] run_id={args.run_id} emitted={em.seq} delivered={em.sent} dropped={em.dropped}",
            file=sys.stderr,
            flush=True,
        )


if __name__ == "__main__":
    main()
