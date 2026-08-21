# PRD 002 — Make one run real

**Status** Draft v1 · 2026-08-21 · Colin (Dabl Club) + Claude
**Supersedes nothing.** [PRD 001](./PRD.md) still describes the target product; this
document decides what to build next and, more importantly, what not to.

---

## 1. The decision

**Build the execution path first, starting with a one-week de-risking spike, and
build the node inspector alongside it. Defer multi-framework support, the copilot,
and deployment until one real run works.**

Everything below is the argument for that, and the plan that follows from it.

## 2. Where we actually are

The studio looks finished and is, functionally, a façade over four `useState` calls.
An honest inventory:

| Surface | Real | Façade |
|---|---|---|
| Canvas | Renders the stored FBP graph; drag persists to `meta.x/y` via the spec API | Node editing is a toast; the rail's add-agent / add-task / add-trigger buttons are toasts |
| Runs | Output and Traces stream, group, inspect, and time correctly | The events come from `setTimeout` over a scripted array in `lib/run.ts` |
| Artifacts | Genuine files, real byte counts, viewer, working download | Rendered in the browser, not written by a crew |
| Storage | Crew graphs are `@fbp/spec` graphs; writes go through the immutable API | Nothing persists. A reload loses every edit |
| Tools | `TOOLS` is a real registry with env requirements that flow to the env screen | No implementations. `tavily_search` is a label that renders a chip |
| Providers | — | `const ROWS` inside a React page, duplicated by hand in the env page; `MODELS` is dead code nothing imports |
| Env vars, Deploy, Kickoff API, Copilot | — | Static markup and canned replies |

Two conclusions follow. First, the product's entire thesis — *every run executes
inside a disposable sandbox* — is currently unevidenced. Second, several things we
"added" recently (Tavily, AIsa, Nebius) cannot fire, because a registry entry is a
label until something compiles it into a call site and something else runs it.

## 3. Why the execution path goes first

Three reasons, in order of weight.

**It is the only thing that is ours.** Canvas, chat, traces and deploy are table
stakes reproduced from a competitor. Sandbox-per-run is the differentiator, and it
is the one part not yet demonstrated. A studio that cannot run a crew is a diagram
editor.

**It carries the unretired risk.** The editor is known work — forms writing through
an API that already exists. The run path has genuine unknowns, and we hit one in
this session: `tenki sandbox exec` had its connection reset on a long-running
command, which is exactly the failure mode a naive "exec the runner and stream
stdout" design would build on. Long-lived streaming out of a sandbox needs a design
that survives gateway resets — backgrounded process, callbacks, resumable `?after=seq`
backfill. Better to learn that in week one than week five.

**It unblocks the cheap wins.** Tavily, AIsa and Nebius each become a few dozen lines
once a compiler emits them and an orchestrator injects their credentials. They are
not separate projects; they are the second commit after the runner exists.

Against this, the case for the editor first is real but weaker: a run of a crew you
cannot change is a demo, not a product. That argues for building it *alongside*, not
before — the two touch disjoint files.

## 4. What we are explicitly not building yet

| Deferred | Why |
|---|---|
| LangGraph and OpenAI Agents SDK targets | Three backends for zero runs. The compiler's shape should be learned from writing the first one, not guessed for three. |
| Copilot tool-calling loop | The most demo-able feature, and it edits a spec that cannot persist and cannot run. It also reuses the same mutation API the inspector needs — build that first. |
| Deploy, kickoff API, triggers | Nothing to deploy. |
| Hierarchical process, pause/resume HITL, warm pools, exposed-port previews | Sandbox-native features worth having, none on the critical path to one working run. |
| Discovery, Agents/Skills repositories, billing, Slack/Zapier | Stubs that should stay stubs. |
| Multi-user collaboration | Single-editor persistence first; the avatars in the toolbar are decoration and should be labelled as such. |

## 5. Plan

### Phase 0 — Spike: one crew, one sandbox, one event (week 1)

Throwaway code is acceptable. The question is whether the streaming design holds.

- A Python script in a sandbox constructs the demo crew with CrewAI, subscribes to
  its event bus, and POSTs HMAC-signed event batches to a public callback.
- A minimal service ingests them and re-emits SSE; the studio's Traces view consumes
  it in place of `buildScript`.
- Deliberately test the nasty cases: a run longer than the gateway's patience, a
  dropped callback, a sandbox killed mid-run, reconnect with `?after=seq`.

**Exit:** the existing Traces UI renders a real CrewAI run, and we can state with
evidence how streaming behaves under failure.

### Phase 1a — The runner and orchestrator (weeks 2–5)

Productionise the spike per PRD 001 §7 and §10.3.

- `tenki-runner` pip package: crew spec → CrewAI objects → normalized event stream,
  with secret masking and `{placeholder}` interpolation.
- Orchestrator: runtime snapshot build and cache, sandbox create/exec/destroy,
  callback ingest, SSE with backfill, watchdog and orphan reaping, cost metering.
- Encrypted environment-variable storage, injected at run start.
- Artifacts collected from `/workspace/artifacts` instead of rendered in the browser
  — the viewer and download path already built stay unchanged.

**Exit:** pressing Run boots a real sandbox, streams real events, and returns real
files; `lib/run.ts`'s simulator is deleted, not disabled.

### Phase 1b — The editor, in parallel (weeks 2–4)

Independent files, so it does not contend with 1a.

- **Provider registry** (`lib/providers.ts`): name, provider, base URL, env var,
  model list. The connections page renders it, the model picker reads it, the
  compiler will consume it. Deletes the duplication in the env page and gives
  `MODELS` a reason to exist or a reason to go.
- **Node inspector**: a properties panel — mirrored to the left, per §8.1 — editing
  agent role, goal, backstory, model and tools, and task title, description,
  expected output and context. Every write goes through `setProps`; nothing mutates
  a graph object directly.
- **Graph mutation on canvas**: the rail's add buttons create nodes via `insertNode`;
  edges are drawn and removed via `addEdge`/`removeEdge`; delete removes both.
- **Persistence**: IndexedDB, keyed by project, with explicit import/export of the
  graph JSON. Not multi-user, honest about it, and it makes the app usable solo
  without waiting for a backend.

**Exit:** a user builds a crew that is not the demo crew, reloads, and it is still there.

### Phase 2 — Make the registries fire (week 6)

Small once 1a lands.

- Tool implementations behind the registry entries: Tavily search, AIsa resource
  call, plus the sandbox-native code interpreter and file tools.
- Provider wiring: Nebius Token Factory and AIsa as OpenAI-compatible endpoints
  through LiteLLM, resolved from the provider registry.
- Per-tool credential checks surface in the existing Missing tab and block a run.

**Exit:** an agent given the Tavily tool makes a real search, and its response
appears in the trace inspector.

### Phase 3 — Second target: LangGraph (weeks 7–9)

Only now is the compiler abstraction worth building, informed by having written one.

- `compile(view) → { files, requirements, capabilities }` per target.
- One event contract, two adapters (CrewAI event bus, LangGraph `astream_events`).
- Capability declarations per target, surfaced in the existing warnings pill: a graph
  using conditional routing is invalid on CrewAI and should say so before a run.
- Target selected as a `graphProp` boundary node, feeding the snapshot's deps-hash.

**Exit:** the same stored graph runs on both targets and produces the same trace shape.

### Phase 4 and beyond

OpenAI Agents SDK (with an honest note that handoff-driven routing is not represented
by a static DAG), the copilot's real tool-calling loop, deploy and the kickoff API,
then collaboration.

## 6. Success criteria

- **Phase 0:** a real CrewAI run renders in Traces, and failure behaviour under
  gateway reset, dropped callbacks and mid-run kill is documented from observation.
- **Phase 1:** time-to-first-event ≤5s warm; infra-caused failure rate under 2% over
  100 runs; zero crew code executed outside a sandbox.
- **Phase 1b:** a crew built entirely through the UI survives a reload and exports to
  a JSON file that re-imports faithfully.
- **Phase 2:** the trace shows a real Tavily response, and a Nebius-backed agent
  completes a task.
- **Phase 3:** one graph, two targets, one trace schema.

## 7. Risks

| Risk | Mitigation |
|---|---|
| Streaming out of a sandbox is fragile (observed: connection reset on long exec) | Phase 0 exists precisely to characterise this; design for backgrounded processes, batched HMAC callbacks and resumable backfill rather than a held-open stream |
| Event models drift across CrewAI, LangGraph, Agents SDK | Pin versions per runtime snapshot; nightly contract tests per target against pinned and latest |
| The compiler is designed too early and fits none of the targets | Ship one target first; extract the abstraction in Phase 3 from working code |
| IndexedDB persistence becomes accidental permanence | Ship import/export from day one so nothing is trapped in a browser |
| Scope creep back into stubs | The deferral table in §4 is the contract; anything on it needs a written argument to move |

## 8. Open questions

1. Does the orchestrator run on our infrastructure or as a long-lived sandbox itself?
   The second is the more interesting demo and the harder operational story.
2. Do we keep the browser-rendered poster as a fallback when a run produces no
   artifacts, or delete it once real collection lands? It is genuinely nice, and
   genuinely not what the crew produced.
3. Does the graph get a formal version/hash (the FBP format is merkle-friendly), or
   does versioning stay in the storage layer around it as PRD 001 assumed?
4. Is single-editor persistence acceptable through Phase 3, or does the toolbar's
   collaborator UI need to be removed until it is true?
