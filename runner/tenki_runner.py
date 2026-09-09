#!/usr/bin/env python3
"""
The in-sandbox runner. Real CrewAI, no simulation.

Reads a compiled crew (lib/compile.ts writes it), constructs real CrewAI
Agent/Task/Crew objects, subscribes to CrewAI's own event bus, and pushes the
normalized event stream out over HMAC-signed HTTP batches. Detached and
push-based per spike/FINDINGS.md — never hold a stream open.

There is deliberately no offline mode. If a credential is missing the run fails
with `run_failed` and says which one, because a run that cannot call a model is
a failure, not something to paper over.
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

BATCH_MAX, BATCH_INTERVAL_S, HEARTBEAT_S, RETRIES = 50, 1.0, 5.0, 3


class Emitter:
    """Buffers events and POSTs signed batches. Never blocks the crew."""

    def __init__(self, callback, secret, run_id):
        self.callback, self.secret, self.run_id = callback, secret.encode(), run_id
        self.seq, self.buf, self.lock = 0, [], threading.Lock()
        self.stopped = threading.Event()
        self.sent = self.dropped = 0
        threading.Thread(target=self._loop, daemon=True).start()

    def emit(self, type_, label, **fields):
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
        # Second channel: if callbacks fail entirely the run is still recoverable.
        print(json.dumps(event), flush=True)

    def _loop(self):
        last = time.time()
        while not self.stopped.is_set():
            time.sleep(BATCH_INTERVAL_S)
            if time.time() - last >= HEARTBEAT_S:
                self.emit("heartbeat", "heartbeat")
                last = time.time()
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
                    self.callback, data=body,
                    headers={"content-type": "application/json", "x-tenki-signature": sig},
                    method="POST")
                with urllib.request.urlopen(req, timeout=10) as r:
                    r.read()
                self.sent += len(batch)
                return
            except (urllib.error.URLError, TimeoutError, OSError) as exc:
                if attempt == RETRIES - 1:
                    self.dropped += len(batch)
                    print(f"[runner] batch dropped: {exc}", file=sys.stderr, flush=True)
                    return
                time.sleep(0.4 * (2 ** attempt) + random.random() * 0.2)

    def close(self):
        self.stopped.set()
        self.flush()


def build_tools(names, spec):
    """Real tool objects. A tool whose credential is absent is omitted loudly."""
    from crewai.tools import BaseTool
    from pydantic import BaseModel, Field

    made = []
    for name in names:
        meta = spec.get("tools", {}).get(name, {})
        env = meta.get("env")
        if env and not os.environ.get(env):
            print(f"[runner] skipping tool {name}: {env} not set", file=sys.stderr, flush=True)
            continue

        if name in ("serper_search", "tavily_search"):
            made.append(_search_tool(name, env, BaseTool, BaseModel, Field))
        elif name == "run_python":
            made.append(_python_tool(BaseTool, BaseModel, Field))
    return made


def _search_tool(name, env, BaseTool, BaseModel, Field):
    class SearchInput(BaseModel):
        query: str = Field(description="The search query.")

    is_tavily = name == "tavily_search"

    class Search(BaseTool):
        name: str = "search_the_internet_with_tavily" if is_tavily else "search_the_internet_with_serper"
        description: str = "Search the web and return ranked results with snippets."
        args_schema: type = SearchInput

        def _run(self, query: str) -> str:
            key = os.environ[env]
            if is_tavily:
                url, payload = "https://api.tavily.com/search", {"query": query, "max_results": 5}
                headers = {"content-type": "application/json", "authorization": f"Bearer {key}"}
            else:
                url, payload = "https://google.serper.dev/search", {"q": query, "num": 5}
                headers = {"content-type": "application/json", "X-API-KEY": key}
            req = urllib.request.Request(url, data=json.dumps(payload).encode(),
                                         headers=headers, method="POST")
            with urllib.request.urlopen(req, timeout=30) as r:
                return r.read().decode()[:6000]

    return Search()


def _python_tool(BaseTool, BaseModel, Field):
    class CodeInput(BaseModel):
        code: str = Field(description="Python source to execute.")

    class RunPython(BaseTool):
        name: str = "run_python"
        description: str = "Execute Python in this sandbox and return stdout/stderr."
        args_schema: type = CodeInput

        def _run(self, code: str) -> str:
            import subprocess
            p = subprocess.run([sys.executable, "-c", code], capture_output=True, text=True, timeout=60)
            return (p.stdout + p.stderr).strip() or f"(exit {p.returncode}, no output)"

    return RunPython()


def run(spec, inputs, em):
    from crewai import Agent, Crew, Process, Task, LLM
    from crewai.utilities.events import crewai_event_bus

    missing = [e for e in spec.get("required_env", []) if not os.environ.get(e)]
    model_env = {a["api_key_env"] for a in spec["agents"]}
    blocking = [e for e in missing if e in model_env]
    if blocking:
        raise RuntimeError(
            "no model credential: " + ", ".join(sorted(blocking)) +
            " is not set in the sandbox. A run cannot call a model without it.")

    em.emit("run_started", f"Run started · {spec['name']}",
            payload={"inputs": inputs, "process": spec["process"],
                     "agents": len(spec["agents"]), "tasks": len(spec["tasks"])})

    agents, by_id = {}, {}
    for a in spec["agents"]:
        llm = LLM(model=a["model"], api_key=os.environ.get(a["api_key_env"]),
                  **({"base_url": a["base_url"]} if a.get("base_url") else {}))
        agents[a["id"]] = Agent(role=a["role"], goal=a["goal"], backstory=a["backstory"],
                                llm=llm, tools=build_tools(a["tools"], spec),
                                verbose=False, allow_delegation=False)

    tasks = []
    for t in spec["tasks"]:
        task = Task(description=t["description"], expected_output=t["expected_output"],
                    agent=agents.get(t["agent"]))
        by_id[t["id"]] = task
        tasks.append(task)
    for t in spec["tasks"]:  # wire context once every Task exists
        ctx = [by_id[c] for c in t["context"] if c in by_id]
        if ctx:
            by_id[t["id"]].context = ctx

    # Map CrewAI's event bus onto our wire schema. Names moved across releases,
    # so import what exists and skip what does not rather than failing the run.
    import crewai.utilities.events as ev
    wiring = [
        ("TaskStartedEvent", "task_started", "Started"),
        ("TaskCompletedEvent", "task_completed", "Completed"),
        ("LLMCallStartedEvent", "llm_call", "LLM call"),
        ("ToolUsageStartedEvent", "tool_usage_started", "Tool usage"),
        ("ToolUsageFinishedEvent", "tool_usage_finished", "Tool Usage Finished"),
        ("AgentExecutionCompletedEvent", "agent_completed", "Agent finished"),
    ]
    id_of = {id(v): k for k, v in agents.items()}
    task_id_of = {id(v): k for k, v in by_id.items()}

    for cls_name, type_, label in wiring:
        cls = getattr(ev, cls_name, None)
        if cls is None:
            continue

        @crewai_event_bus.on(cls)
        def _handler(source, event, _t=type_, _l=label):
            payload = {}
            for attr, key in (("output", "output"), ("input", "input"), ("tool_name", "tool")):
                val = getattr(event, attr, None)
                if val is not None:
                    payload[key] = str(val)[:8000]
            em.emit(_t, getattr(event, "tool_name", None) or _l,
                    agent_id=id_of.get(id(getattr(event, "agent", None))),
                    task_id=task_id_of.get(id(getattr(event, "task", None))),
                    payload=payload or None)

    crew = Crew(agents=list(agents.values()), tasks=tasks,
                process=Process.hierarchical if spec["process"] == "hierarchical" else Process.sequential,
                verbose=False)
    result = crew.kickoff(inputs=inputs)
    em.emit("run_completed", "Run completed", payload={"result": str(result)[:8000]})


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--crew", required=True, help="compiled crew.json")
    ap.add_argument("--callback", required=True)
    ap.add_argument("--secret", default=os.environ.get("TENKI_CALLBACK_SECRET", "spike-secret"))
    ap.add_argument("--run-id", default=f"run_{int(time.time())}")
    ap.add_argument("--inputs", default="{}")
    args = ap.parse_args()

    spec = json.load(open(args.crew))
    inputs = json.loads(args.inputs)
    em = Emitter(args.callback, args.secret, args.run_id)
    try:
        em.emit("provisioning", "Preparing the crew")
        run(spec, inputs, em)
    except Exception as exc:
        em.emit("run_failed", "Run failed", payload={"error": f"{type(exc).__name__}: {exc}"})
        print(f"[runner] FAILED: {exc}", file=sys.stderr, flush=True)
    finally:
        em.close()
        print(f"[runner] run={args.run_id} emitted={em.seq} delivered={em.sent} dropped={em.dropped}",
              file=sys.stderr, flush=True)


if __name__ == "__main__":
    main()
