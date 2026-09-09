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
MAX_TEXT = 8000


def jsonable(value, depth=0):
    """Coerce anything CrewAI hands us into something JSON can carry.

    CrewAI's event payloads are rich objects — a task's `output` drags along
    agent state, a `RuntimeState`, pydantic models. One of those in a batch
    used to raise inside the emitter thread, which killed the thread, which
    silently ended the event stream while the crew kept running: the run
    looked dead in the UI even though it was working. Never let payload shape
    take down delivery.
    """
    if value is None or isinstance(value, (bool, int, float)):
        return value
    if isinstance(value, str):
        return value[:MAX_TEXT]
    if depth >= 4:
        return str(value)[:MAX_TEXT]
    if isinstance(value, dict):
        return {str(k): jsonable(v, depth + 1) for k, v in list(value.items())[:50]}
    if isinstance(value, (list, tuple, set)):
        return [jsonable(v, depth + 1) for v in list(value)[:50]]
    for attr in ("model_dump", "dict"):
        fn = getattr(value, attr, None)
        if callable(fn):
            try:
                return jsonable(fn(), depth + 1)
            except Exception:
                break
    return str(value)[:MAX_TEXT]


class Emitter:
    """Buffers events and POSTs signed batches. Never blocks the crew."""

    def __init__(self, callback, secret, run_id):
        self.callback, self.secret, self.run_id = callback, secret.encode(), run_id
        self.seq, self.buf, self.lock = 0, [], threading.Lock()
        self.stopped = threading.Event()
        self.sent = self.dropped = 0
        threading.Thread(target=self._loop, daemon=True).start()

    def emit(self, type_, label, **fields):
        # Coerce at the door, not at flush time: an event that cannot be
        # serialized must never reach the buffer and poison the whole batch.
        safe = {k: jsonable(v) for k, v in fields.items()}
        with self.lock:
            self.seq += 1
            event = {
                "run_id": self.run_id,
                "seq": self.seq,
                # Millisecond precision: a whole-second stamp collapses every
                # duration the UI derives from these timestamps to zero.
                "ts": time.strftime("%Y-%m-%dT%H:%M:%S", time.gmtime())
                      + f".{int(time.time() * 1000) % 1000:03d}Z",
                "type": type_,
                "label": str(label)[:500],
                **safe,
            }
            self.buf.append(event)
        # Second channel: if callbacks fail entirely the run is still recoverable.
        print(json.dumps(event, default=str), flush=True)

    def _loop(self):
        # This thread is the only thing delivering events. If it raises, the
        # run goes dark while it is still working, so nothing here may escape.
        last = time.time()
        while not self.stopped.is_set():
            time.sleep(BATCH_INTERVAL_S)
            try:
                if time.time() - last >= HEARTBEAT_S:
                    self.emit("heartbeat", "heartbeat")
                    last = time.time()
                self.flush()
            except Exception as exc:  # noqa: BLE001 - delivery outlives any single failure
                print(f"emitter loop error: {type(exc).__name__}: {exc}",
                      file=sys.stderr, flush=True)

    def flush(self):
        with self.lock:
            if not self.buf:
                return
            batch, self.buf = self.buf[:BATCH_MAX], self.buf[BATCH_MAX:]
        body = json.dumps({"run_id": self.run_id, "events": batch}, default=str).encode()
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


def _event_api():
    """Locate CrewAI's event bus and event classes.

    Both moved between releases — `crewai.utilities.events` in 0.x,
    `crewai.events` in 1.x — and the PRD flags this drift as a standing risk.
    Try the known layouts and fail with something legible if none match.
    """
    import importlib

    bus = None
    for mod in ("crewai.events", "crewai.utilities.events", "crewai.events.event_bus"):
        try:
            bus = getattr(importlib.import_module(mod), "crewai_event_bus")
            break
        except (ImportError, AttributeError):
            continue

    types = None
    for mod in ("crewai.events.event_types", "crewai.events", "crewai.utilities.events"):
        try:
            candidate = importlib.import_module(mod)
        except ImportError:
            continue
        if any(hasattr(candidate, n) for n in ("TaskStartedEvent", "LLMCallStartedEvent")):
            types = candidate
            break

    if bus is None or types is None:
        raise RuntimeError(
            "could not locate CrewAI's event bus or event types; "
            "this CrewAI release moved them again")
    return bus, types


def run(spec, inputs, em):
    from crewai import Agent, Crew, Process, Task, LLM

    bus, ev = _event_api()

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
        # Name each Task with our own id: CrewAI echoes `task_name` on every
        # event, which makes attribution exact instead of inferred.
        task = Task(name=t["id"], description=t["description"],
                    expected_output=t["expected_output"], agent=agents.get(t["agent"]))
        by_id[t["id"]] = task
        tasks.append(task)
    for t in spec["tasks"]:  # wire context once every Task exists
        ctx = [by_id[c] for c in t["context"] if c in by_id]
        if ctx:
            by_id[t["id"]].context = ctx

    # Map CrewAI's event bus onto our wire schema.
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
    role_of = {}
    for a in spec["agents"]:
        role_of.setdefault(a["role"], a["id"])
    agent_for_task = {t["id"]: t["agent"] for t in spec["tasks"]}

    def which_agent(event, task_id=None):
        """Our agent id for a CrewAI event, or None. Never a guess: object
        identity first, then the role we ourselves set on the Agent, then the
        crew's own task-to-agent assignment — CrewAI leaves `agent_role` empty
        on task events, but the compiled crew already names the owner."""
        for attr in ("agent", "from_agent"):
            obj = getattr(event, attr, None)
            if obj is not None and id(obj) in id_of:
                return id_of[id(obj)]
        by_role = role_of.get(getattr(event, "agent_role", None))
        return by_role or agent_for_task.get(task_id)

    def which_task(event):
        """Our task id for a CrewAI event, or None."""
        for attr in ("task", "from_task"):
            obj = getattr(event, attr, None)
            if obj is not None and id(obj) in task_id_of:
                return task_id_of[id(obj)]
        name = getattr(event, "task_name", None)
        return name if name in by_id else None

    # CrewAI inspects a handler's arity: a handler taking three or more
    # positional parameters is called `(source, event, RuntimeState)`. Binding
    # the event type as a default argument therefore made it a 3-arg handler
    # and CrewAI overwrote that default with its RuntimeState — every event
    # arrived mislabelled. Close over the values instead of defaulting them,
    # and keep the handler exactly two arguments wide.
    def make_handler(type_, label):
        def handler(source, event):
            payload = {}
            for attr, key in (("output", "output"), ("input", "input"),
                              ("tool_args", "input"), ("tool_name", "tool"),
                              ("model", "model")):
                val = getattr(event, attr, None)
                if val is not None and key not in payload:
                    payload[key] = str(val)[:MAX_TEXT]
            task_id = which_task(event)
            if type_ == "task_started" and task_id in by_id:
                payload["description"] = by_id[task_id].description[:MAX_TEXT]
            em.emit(type_, getattr(event, "tool_name", None) or label,
                    agent_id=which_agent(event, task_id), task_id=task_id,
                    payload=payload or None)

        return handler

    for cls_name, type_, label in wiring:
        cls = getattr(ev, cls_name, None)
        if cls is None:
            continue
        bus.on(cls)(make_handler(type_, label))

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
