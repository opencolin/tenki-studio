# PRD — Tenki Studio

**An agent-automation studio, functionally equivalent to CrewAI's Crew Studio, where every crew executes inside a Tenki.cloud Sandbox (disposable Linux microVM).**

| | |
|---|---|
| Status | Draft v1 |
| Author | Collin (Dabl Club) + Claude |
| Date | 2026-08-19 |
| Sources | 29 screenshots of app.crewai.com (Studio v2, project `Mad Men AI Poster Generator`); [luxorlabs/cookbook](https://github.com/luxorlabs/cookbook) `examples/crewai-code-interpreter`; [tenki.cloud/docs/sandbox/sdk](https://tenki.cloud/docs/sandbox/sdk) |

---

## 1. Summary

Tenki Studio lets a user describe an automation in plain language, get a multi-agent CrewAI crew scaffolded by an AI copilot, edit it on a visual canvas, run it with full tracing, and deploy it as a hosted API — the Crew Studio experience — with one architectural difference that is the whole point: **every run executes inside a fresh Tenki Sandbox**, a disposable Linux microVM with CPU/memory limits, its own filesystem, outbound network, snapshot/pause/resume, and public port exposure.

What that buys over CrewAI's managed runtime:

1. **Hard isolation per run.** Agent-generated code, shell commands, and tool side effects are contained in a VM that is destroyed after the run. Arbitrary code execution becomes a first-class feature (code-interpreter tools run *natively in the run's own sandbox*), not a security risk.
2. **Reproducible runtimes.** A project's dependency set is baked into a Tenki snapshot; runs boot from it in ~1s. "Works in dev" is the same VM image as "works deployed."
3. **BYO models + BYO compute economics.** LLM keys are the user's; compute is metered Tenki sandbox time. No per-seat platform lock-in.
4. **Sandbox superpowers surfaced in product.** Pause/resume for human-in-the-loop gates, snapshot forking for run replay/debugging, `exposePort()` preview URLs for crews that build things.

Visually, Tenki Studio is a **mirrored** take on Crew Studio: same information architecture, panels flipped (canvas left / chat right — see §8.1), Tenki sky-blue brand instead of CrewAI coral.

## 2. Background

### 2.1 What Crew Studio is (observed feature inventory)

From the screenshots (all on `app.crewai.com`), Crew Studio comprises:

**Studio home** (`/studio/v2`) — "Welcome, Colin! What would you like to build today?" prompt box with automation-type dropdown (`Crews`) and submit; six template cards with app icons ("Summarize customer support…", "Triage GitHub issues", "Prep for a sales meeting", "Reconcile vendor invoices", "Post weekly product updates", "Turn documents into data"); "Don't know what to build yet? → Start from Discovery"; **Recent projects** grid: Create New card, project cards with star/favorite, `LIVE V8` badge, run count + sparkline + "7 days", `Crew` tag, member avatar, `Manage`/`Edit` actions, filter tabs (All / Mine / Shared with me), search, project-type dropdown.

**Project editor** (`/studio/v2/projects/:id/editor`) — breadcrumb `Studio / <name>`; title + "Build, test, and deploy your AI agent automation."; header actions: **Try new view / Classic view** toggle, **Environment variables**, **Share**, **Download**, **Deploy**, **Run/Stop** (primary). Two view modes:
- *Classic view*: tabs `Canvas | Run`.
- *New view*: tabs `Canvas | Output | Traces`, plus pane-width toggles (chat-only / split / canvas-only icons).

**Studio Chat** (copilot panel) — conversational builder. Observed behaviors: rich markdown responses; collapsible **Thought process**; progress checklist while acting ("Getting the state of the automation", "Getting the list of ready-to-use tools"); structured change summaries ("New Agent: …", "New Task: …", "Enhanced Workflow" with ✅ bullets); **Suggestion** chip with dismiss + one-click action ("Improve automation based on last run"); chat history dropdown (clock icon) and new-chat (+); composer "Describe your automation" with attach and Send; "Show 4 earlier steps" collapsing.

**Canvas** — node graph editor (React-Flow-like): dotted grid, zoom in/out/fit/lock controls, minimap-less; **Version 9** badge; **Process Type** selector: `Sequential — Tasks run in order` / `Hierarchical — Manager coordinates agents` (hierarchical adds a **Crew Manager** node with "Select a model" and a "Delegation Layer" grouping, plus a "Process Updated" toast); **Triggers** node ("No triggers configured") with Event / Schedule / Manage rows; **Agent nodes**: person icon, name, role summary, model chip (`gpt-4o-mini`, `gpt-4o`), tool chips ("Search the internet with Serper"), expand chevron + edit icon, empty **"Drop tools here"** slot with warning badge when unconfigured; **Task nodes**: clipboard icon, blue title, description, `Completed` status chip after runs, re-run/play buttons, doc + edit icons; edges with connector dots; warnings pill (`⚠ 39`) bottom-center; **Previous executions** dropdown + undo + clear-canvas icons top-right.

**Run views**
- *Output tab*: run header (icon, name, `N of M steps complete · 1m 19s`, `Running`/`Completed` chip, orange progress bar, Stop button while running); **STEPS** list — per task: status icon (✓/spinner), task title, agent chip, duration, expand arrow; empty state "Starting your automation…"; toast "Execution started — Your automation is now running…".
- *Traces tab / Run tab*: **Timeline** pane — collapsible rows per agent (`Sal Romano · 66.12s (+10.06s) · 1 task`) → per task (`9.96s +66.12s`) → sub-events: `Started +0.00s`, `LLM call` with duration pill (`12.0s`) and offset, `search_the_internet_with_serper` tool spans (spinner while running), `Tool Usage Finished`, `Completed`; **Event details** pane — tabs `Details | Raw Data`; event header (type + timestamp); sections: **Description**, **Task Prompt** (inputs interpolated, e.g. `{client_name}` → `Tenki.cloud`, plus `Current Date: 2026-08-19` and expected-output criteria), **Input** (tool-call JSON, e.g. `{"search_query": "…"}`), **Output** (full markdown / raw tool JSON).

**Org pages** (left nav: Build → Discovery *Beta*, Automations, Crew Studio, Agents Repository, Tools & Integrations, Skills Repository; Operate → Traces, LLM Connections, Environment Variables; Manage → Usage, Billing, Settings, Resources; footer Collapse Nav; org switcher "Dabl Club" top):
- **Automations Live** (`/crewai_plus/dashboard`): "Manage and monitor your active crew automations"; **Deploy from Code** card ("GitHub OAuth or any Git provider or upload ZIP"); search + filters (Status/Source/Tag/Owner); table `Crew | Owner | Status | URL | Actions` — row shows `Studio` source tag, `Online` badge, kickoff URL (`https://mad-men-67f228fc-885d-4259-…`), Options ▾, Delete, **Edit in Studio**; pagination.
- **Traces** (`/crewai_plus/trace_batches`): search by automation/execution id; Status/Type filters; table `Automation | Parameters | Status & Activity | Timing | Actions` — parameter chips (`client_name Vapi`), `Completed/Running` badge + `98 events`, duration + relative age, **View Execution**.
- **LLM Connections**: table `Name | Provider | Available Models | Actions`; Add Connection (brand-colored), Refresh; e.g. `Google Voice / Gemini / gemini-2.5-flash…`, `Colin's OpenAI / OpenAI / gpt-5.2-chat-latest, gpt-5.2-pro`.
- **Environment Variables** (org page + per-project modal): search; scope filter tabs `All 2 | Project 0 | Organization 2 | LLM connection 0 | Missing 0`; groups per provider/tool (`openai/gpt-4o-mini, openai/gpt-4o` → `OPENAI_API_KEY`; `SerperDevTool` → `SERPER_API_KEY`) with green check + "Value is set — override if needed"; `+ Add variable`, Save/Close.
- **Tools & Integrations**: tabs `Connections | Internal Tools | Integrations`. Connections: "agent apps and MCP server connections" table `Applications | Visibility | Type | Status | Created by | Actions` (Google Calendar (6) `Agent App` `Connected` visibility `All`, Databricks/Snowflake `MCP`, Disconnect), **Browse Agent Apps**, **Add Connection**. Integrations: trigger platforms as cards — Slack (Connected/Disconnect), HubSpot (Connect), Zapier (Open), Salesforce (Connect).
- **Skills Repository**: search; empty state "No skills yet — Publish reusable instructions that agents can carry across Studio projects and repository agents… publish from the CrewAI CLI with `crewai skill push`."
- **Usage Dashboard**: tabs `Insights | Deployments | Limits`; stat cards `1 Active Crews · 82 All Time Executions · 2 Executions This Month · 9 Deploys · 1 Users`; filters Time Range/Period/Data type; charts "Executions by deployment" (bar) and "Contributors" (pie).
- **Discovery Engine** (Beta): hero "Answer a few questions about your business, and we'll map out the agentic systems worth building" + Start Discovery; session step 1 of 2 "Which tools does your company use?" — searchable multi-select grid of ~20 tool cards (Airtable, Asana, BambooHR, BigQuery, Box, ClickUp, Confluence, Databricks, Datadog, DocuSign, Dropbox, Freshdesk, GitHub, GitLab, Google Workspace, Greenhouse, HubSpot, Intercom, Internal APIs, Jira, Linear…).
- **Share modal**: "Add people or roles…" search with `Member Role` / `Owner Role` options, Done.

### 2.2 What Tenki Sandbox is (SDK surface we build on)

From the cookbook and docs:

- **Create**: Python `Sandbox.create(cpu_cores=1..16, memory_mb=512..65536, workspace_id=…, allow_inbound=…, enable_opencode=…, github_token=…, snapshot_id=…, pause_retention_ms=…)` — waits for `RUNNING`, usable as a context manager. TS: `new TenkiSandbox({authToken, baseUrl})` → `createAndWait({...})`. Defaults: 2 cores / 4096 MB. Auth: `TENKI_AUTH_TOKEN` (keys prefixed `tk_`), workspace via `TENKI_WORKSPACE_ID` or `~/.config/tenki/config.yaml`.
- **Exec**: `sandbox.exec(command, *args, timeout=…)` → `stdout_text`, `stderr_text`, exit code. Args passed without shell interpretation. Default exec timeout 30s (configurable); create 180s.
- **Files**: read, write, list, stat, delete; chunked streaming (no base64 shuttling).
- **Git**: clone, checkout, diff, log, fetchPR.
- **Ports**: `exposePort(port)` → `{previewUrl, port, expiration}` public HTTPS endpoint (requires `allowInbound: true` at create); `unexposePort`, `listExposedPorts`.
- **Lifecycle**: `pause()` (memory+disk snapshot, releases compute), `resume()` (same id, ~1s), `refresh()`/`state` (`RUNNING/PAUSING/PAUSED/RESUMING`); explicit snapshots `createSnapshotAndWait(id, {name})` (~20s), fork new sandbox via `createAndWait({snapshotId})`, `listSnapshots`, `getSnapshotDownloadURL`, `deleteSnapshot`. Paused sandboxes expire per `pauseRetentionMs`.
- **Errors**: typed (`SessionNotFoundError`, `CommandTimeoutError`, `QuotaExceededError`, `CommandFailedError`, …). `whoAmI()` returns owner + workspaces.
- **Proven CrewAI integration** (`examples/crewai-code-interpreter`): a `BaseTool` subclass whose `_run(code)` calls `sandbox.exec("python3", "-c", code)`; agent constructed with `tools=[TenkiCodeInterpreter(sandbox=sandbox)]`; crew via `Crew(agents=[…], tasks=[…]).kickoff()`.

### 2.3 Why this product

CrewAI's cloud runs crews on shared managed infrastructure; code execution and custom dependencies are constrained, and platform pricing scales with usage of *their* runtime. Tenki's whole business is disposable compute. Marrying the two: the Studio UX everyone likes, with a runtime that is safer (VM isolation), more capable (full Linux, any pip package, real filesystem, exposed ports), and more transparent (a run = a sandbox you can inspect, pause, snapshot, and bill by the second). It is also the flagship demo of Tenki for the agents market.

## 3. Goals & non-goals

### Goals (v1, "near-identical")

1. Feature-parity with the observed Crew Studio core loop: **describe → scaffold → edit on canvas → run with live traces → deploy as API**.
2. Every run executes in a Tenki Sandbox; zero crew code runs on our web/API tier.
3. Copilot (Studio Chat) can build and modify crews via tool calls, explain changes, and propose improvements from the last run.
4. Sub-5s cold start from "Run" click to first timeline event (snapshot-warmed).
5. Mirrored visual design (§8.1) with Tenki branding — recognizably the same product category, visibly not the same product.

### Non-goals (v1)

- Discovery Engine (P2 — nav item present, marketing page only).
- Agents Repository / Skills Repository as full products (P2 — read-only stubs acceptable).
- CrewAI **Flows** (event-driven graphs beyond crews), multi-crew composition.
- Marketplace/"Browse Agent Apps" catalog; OAuth agent-app connections beyond a curated set (P1: Serper, HTTP, code-interpreter, file tools; P2: MCP servers).
- Fine-grained RBAC beyond Owner/Member.
- Self-serve billing (usage metering yes; payments P2).
- Mobile layouts (desktop-first; ≥1024px).

## 4. Personas

- **Builder Bea** (indie automation consultant): non-ML dev, lives in the chat panel, wants working automations fast and a URL to hand clients.
- **Platform Pat** (staff eng at a startup): cares about isolation, secrets handling, reproducibility; will read the traces pane before trusting anything.
- **Ops Omar** (agency operator): runs deployed automations with different inputs daily; lives in Automations + Traces; never opens the canvas.

## 5. Core user journeys

1. **Describe → crew**: Bea types "Build me a Sterling Cooper-style ad agency…" → copilot streams thought process + checklist → canvas populates with agents/tasks wired sequentially → suggestion chip offers a test run.
2. **Run + watch**: Bea hits Run → Output tab shows steps completing with durations → she flips to Traces, clicks an LLM call, reads the interpolated Task Prompt and Output.
3. **Iterate from a run**: chip "Improve automation based on last run" → copilot diffs the run, adds an agent, explains "New Agent / New Task / Enhanced Workflow".
4. **Deploy**: Deploy → version pinned → Automations row `Online` with kickoff URL → Omar `POST`s inputs `{client_name: "Heinz Ketchup"}` → trace appears org-wide with parameter chips.
5. **Sandbox-native moment** (differentiator): a task's code-interpreter tool writes `poster.png` in the sandbox; run artifacts panel lists it; Bea downloads it / exposes a preview URL. Pat pauses a run at an approval gate, resumes it after review.

## 6. Functional requirements

Priorities: **P0** = v1 launch, **P1** = fast-follow, **P2** = later.

### FR-1 Studio home (P0)

- FR-1.1 Hero prompt ("Describe your automation") with type dropdown (v1: `Crew`) and submit → creates project, opens editor, seeds first copilot message.
- FR-1.2 Six curated template cards (title, one-liner, app icons) → prefill prompt.
- FR-1.3 Recent projects grid: Create New card; cards show name, favorite star, `LIVE vN` badge when deployed, runs count + 7-day sparkline, type tag, last-modified, Manage/Edit.
- FR-1.4 Search, All/Mine/Shared-with-me tabs, type filter.

### FR-2 Projects & versions (P0)

- FR-2.1 Project = named crew spec (graph JSON) + settings; auto-save; **immutable version** snapshot on every copilot edit batch or manual save (observed "Version 9").
- FR-2.2 Version badge on canvas; version list; restore.
- FR-2.3 Download = export bundle (crew spec JSON + generated CrewAI Python project) as ZIP.
- FR-2.4 Delete/rename/duplicate; favorite.

### FR-3 Studio Chat copilot (P0)

- FR-3.1 Docked **right** panel in editor (mirrored); resizable; pane toggles (chat-only / split / canvas-only).
- FR-3.2 Streaming markdown; collapsible **Thought process**; live action checklist (tool-call progress: "Getting the state of the automation…", ✓ on completion).
- FR-3.3 Copilot mutates the crew via typed tools (see §10.4): add/update/remove agent/task/edge, set process type, set trigger, manage env-var requirements, run automation. Every mutation renders a structured change summary card (New Agent / New Task / Enhanced Workflow ✅ list) and bumps the version.
- FR-3.4 **Suggestion chips** below transcript (e.g. "Improve automation based on last run") with Dismiss; generated after runs complete or validation warnings change.
- FR-3.5 Chat history: sessions list (clock dropdown), new chat (+), "Show N earlier steps" collapsing.
- FR-3.6 Composer: multiline, attach files (context for copilot; stored per project), Send; disabled while a batch of tool calls is applying.
- FR-3.7 Copilot model: Claude (default `claude-sonnet-5`; org-configurable via LLM Connections); system prompt includes crew-spec schema + current graph + last-run summary.

### FR-4 Canvas editor (P0)

- FR-4.1 Node-graph editor (React Flow) on a full-bleed dotted grid; pan/zoom. All chrome floats over the canvas as grouped bars (surface, 1px border, 11px radius, elevation): tool rail **left edge** (select / pan / comment · insert agent, task, trigger · view code); history + zoom cluster **bottom-right** (previous executions, undo | zoom out, %, zoom in | fit); version + process-type card **top-right**, under the actions bar; warnings pill **bottom-center**.
- FR-4.2 **Agent node**: icon, name, role one-liner (truncated), model chip, tool chips, expand (inline detail), edit (opens form: role, goal, backstory, model, tools, max_iter, verbose); empty "Drop tools here" slot with amber warning when agent has no tools and its tasks reference tools.
- FR-4.3 **Task node**: title (accent color), description (truncated), expected_output, assigned agent (edge), context/dependency edges, per-task status chip from selected execution (`Completed`, running spinner), re-run-from-here + run-single buttons, view-doc icon (last output), edit.
- FR-4.4 **Triggers node**: rows `Event | Schedule | Manage`; configuring creates trigger records (FR-9.4).
- FR-4.5 Edges: task-order edges + agent→task assignment edges with connector dots; drag to rewire; delete.
- FR-4.6 **Process Type** card top-left of canvas: `Sequential` / `Hierarchical`; switching to hierarchical inserts **Crew Manager** node ("Select a model") in a "Delegation Layer" band + toast "Process Updated — a manager agent will coordinate your crew."
- FR-4.7 Validation: warnings pill (count) bottom-center; expandable list (missing tools, unassigned tasks, missing env vars, no tasks, manager model unset); each warning deep-links to the node.
- FR-4.8 Drag from a palette is **not** required for v1 (copilot-first creation), but nodes are manually addable via canvas context menu (P1).
- FR-4.9 Canvas state (positions) persisted per project; auto-layout button for copilot-generated graphs.

### FR-5 Runs (P0)

- FR-5.1 **Run** button (header, primary): if the project declares inputs (`{placeholders}` in any task/agent text), show inputs dialog (key → value, remembered per project) then start; button becomes **Stop** while running.
- FR-5.2 Run states: `queued → provisioning → running → completed | failed | stopped`; provisioning surfaces sandbox boot ("Starting your automation…").
- FR-5.3 **Output tab**: run header (name, `N of M steps complete · elapsed`, status chip, progress bar); STEPS list per task (status icon, title, agent chip, duration, expand → final output markdown); live via SSE.
- FR-5.4 **Traces tab** (in-editor): mirrored split — **Event details pane LEFT, Timeline RIGHT** (§8.1). Timeline: rows grouped agent → task → events (`Started`, `LLM call` + duration pill, tool spans with live spinner, `Tool Usage Finished`, `Completed`) with `+offset`s; auto-follow tail while running; click selects event. Details pane: tabs `Details | Raw Data`; sections Description / Task Prompt (inputs interpolated + current date + expected-output criteria) / Input / Output; copy buttons.
- FR-5.5 **Previous executions** dropdown on canvas overlays per-task status chips from that execution.
- FR-5.6 Stop = graceful cancel (SIGTERM runner, sandbox destroyed); partial trace retained.
- FR-5.7 **Run artifacts** (sandbox-native, beyond parity): files the crew wrote under `/workspace/artifacts` are listed on the run (name, size, download); images previewed inline. (P0-lite: list + download; P1: inline preview.)
- FR-5.8 Toasts **bottom-left** (mirrored): "Execution started", "Process Updated", errors.

### FR-6 Deploy & Automations (P0)

- FR-6.1 **Deploy** pins current version → automation (slug, kickoff URL, status `Online/Offline`, `LIVE vN` badge on project card). Redeploy updates pinned version (`V8` → `V9`).
- FR-6.2 **Automations Live** page: table `Crew | Owner | Status | URL | Actions` (Options: copy URL, view API docs, offline/online, delete; **Edit in Studio**); search + Status/Source/Tag/Owner filters; source tag `Studio` (P2: `Code` via "Deploy from Code" card — GitHub/ZIP import of a CrewAI project).
- FR-6.3 Kickoff API (per automation): `POST /kickoff {inputs}` → `{run_id}` (202); `GET /runs/:id` status+result; `GET /runs/:id/events` SSE; bearer auth with automation-scoped API keys.
- FR-6.4 Triggers (P1): Schedule (cron → kickoff with stored inputs); Event (inbound webhook URL); Manage lists them. Slack/Zapier/HubSpot/Salesforce trigger cards P2.

### FR-7 Org Traces (P0)

- FR-7.1 Table of all executions (studio + deployed): `Automation | Parameters (input chips) | Status & Activity (badge + event count) | Timing (duration + age) | Actions (View Execution)`; search by name/automation id/execution id; Status + Type filters; pagination.
- FR-7.2 View Execution opens the run in the trace viewer (same component as FR-5.4, standalone page).
- FR-7.3 Retention: events 30 days (configurable per org, P1).

### FR-8 LLM Connections (P0)

- FR-8.1 CRUD named connections: `Name | Provider | Available Models | Actions`; providers v1: Anthropic, OpenAI, Google Gemini, OpenRouter, custom OpenAI-compatible base URL.
- FR-8.2 Key stored encrypted (§12); "available models" fetched from provider on save + Refresh.
- FR-8.3 Models from connections populate the agent model picker and Crew Manager model picker; keys are injected into the run sandbox as provider env vars, never sent to the browser.

### FR-9 Environment Variables (P0)

- FR-9.1 Org-level and project-level vars; project overrides org; **LLM-connection**-derived vars shown read-only in the same list; **Missing** tab = vars referenced by the crew's tools/models but unset (blocks Run with warning).
- FR-9.2 Project modal (from editor header): search; scope tabs with counts `All | Project | Organization | LLM connection | Missing`; grouped by consumer ("SerperDevTool → SERPER_API_KEY"); values write-only ("Value is set — override if needed"); Add variable; Save.
- FR-9.3 Injected into the sandbox process env at run start; masked (`tk_…`, `sk-…` patterns + known names) in all logs/traces.

### FR-10 Tools & Integrations (P0-lite)

- FR-10.1 v1 built-in tool registry (served to copilot + canvas picker): `Search the internet with Serper`, `Scrape website`, `HTTP request`, `Run Python in sandbox` (code interpreter — executes in the run's own sandbox), `Read/Write file` (sandbox FS), `Human input` (P1, uses pause/resume).
- FR-10.2 Connections tab table (`Applications | Visibility | Type | Status | Created by | Actions`) listing configured tools + MCP servers; **Add Connection** (P1: MCP server by URL/command, runs inside the sandbox); Browse Agent Apps P2.
- FR-10.3 Integrations tab: trigger-platform cards (Slack, Zapier, HubSpot, Salesforce) — P2, rendered as "coming soon" tiles.

### FR-11 Usage dashboard (P1)

- FR-11.1 Stat cards: Active Crews, All-Time Executions, Executions This Month, Deploys, Users — plus Tenki-specific: **Sandbox minutes**, **Est. compute cost**.
- FR-11.2 Insights charts: Executions by deployment (bar), Contributors (pie), Sandbox minutes over time (line); Time Range / Period / Data type filters. Tabs Deployments + Limits (quotas: max concurrent sandboxes, max run duration).

### FR-12 Sharing, orgs, auth (P0)

- FR-12.1 Auth: email+OAuth (GitHub, Google); orgs with switcher; roles Owner/Member.
- FR-12.2 Share modal per project: add people (email) or role groups; Member = edit+run, Owner = + deploy/delete/share. Shared-with-me tab on home.
- FR-12.3 Org settings: name, Tenki workspace binding (`TENKI_AUTH_TOKEN`, `TENKI_WORKSPACE_ID`), default sandbox size.

### FR-13 Nav & shell (P0)

- FR-13.1 Figma-style floating nav (no docked rail — see §8.1): collapsed state is a floating org pill top-left (logo mark, org switcher, panel toggle); expanding opens a floating panel with sections **Build**: Discovery *(Beta, P2 stub)*, Automations, Studio, Agents Repository *(P2 stub)*, Tools & Integrations, Skills Repository *(P2 stub)*; **Operate**: Traces, LLM Connections, Environment Variables; **Manage**: Usage, Billing *(stub)*, Settings, Resources *(docs links)*. Content renders full-bleed beneath the pill.
- FR-13.2 Breadcrumbs top of content (`Studio / <project>`).

## 7. Sandbox execution requirements (the differentiator)

- SR-1 **One run = one sandbox.** Orchestrator calls `Sandbox.create()` (default 2 cpu / 4096 MB; org-configurable) from a **project runtime snapshot**; injects env; uploads `crew.json` + inputs; execs the runner; destroys the sandbox on completion (grace 60s for artifact collection). No user code on the API tier, ever.
- SR-2 **Runtime snapshots.** First run (or dependency change) builds the runtime: base sandbox + `pip install crewai crewai-tools litellm tenki-runner` + project extras → `createSnapshotAndWait(name: proj-<id>-v<n>)`. Subsequent runs `createAndWait({snapshotId})` → boot ≈1s, target ≤5s to first event (SR-6).
- SR-3 **Event streaming.** Runner hooks CrewAI's event bus (crew/task/agent/LLM/tool start-finish events), emits JSONL (schema §10.3) to stdout **and** POSTs batches to the orchestrator callback (HMAC-signed, outbound net is on by default). Orchestrator persists + fans out via SSE. Heartbeat every 5s; missing 3 heartbeats → mark run `failed(lost)` and reap sandbox.
- SR-4 **Code interpreter is native.** The `Run Python` tool executes `sandbox.exec("python3","-c", code)` *inside the same sandbox as the crew* — no second sandbox, shared filesystem with artifacts dir.
- SR-5 **Pause/resume for HITL (P1).** `Human input` tool writes a question event, runner blocks, orchestrator `pause()`s the sandbox (releases compute); on human reply, `resume()` + answer file; `pauseRetentionMs` = 7 days.
- SR-6 **Warm pool (P1).** Keep N pre-booted sandboxes per hot runtime snapshot; claim-on-run. v1 acceptable: cold `createAndWait({snapshotId})`.
- SR-7 **Limits & reaping.** Max run duration (default 30 min), max concurrent runs per org, sandbox TTL watchdog (orphan reaper cron), per-run cost estimate = sandbox seconds × size rate, stored on the run.
- SR-8 **Exposed ports (P2).** Crews that start servers can request `exposePort` → preview URL shown on the run page with expiry.
- SR-9 **Deployed automations** run identically (same snapshot path); kickoff queue with per-automation concurrency (default 3).

## 8. Design specification

### 8.1 Mirrored layout (differentiation rule)

Requested explicitly: flip the major panel arrangement relative to Crew Studio, product-wide.

**Rule:** *Panel-level docking is mirrored horizontally; app chrome (left nav, top header, primary CTA at top-right) and micro-conventions inside a pane (LTR reading, send button at composer right, centered modals) stay conventional.*

| Surface | Crew Studio (observed) | Tenki Studio (mirrored) |
|---|---|---|
| Editor shell | Page header + card-framed workspace | **Canvas-first: full-bleed work surface with floating toolbars over it (Figma-style) — no page header row** |
| Editor split | Chat left · Canvas/Run right | **Canvas/Run left · Chat right (chat is a floating panel, inset 12px)** |
| Header actions | Inline header row | **Floating actions bar top-right: collaborators · overflow · Deploy · Share · Run** |
| Project identity | Breadcrumb row under the header | **Inside the top-left project pill: org › project ▾, with the nav-panel toggle** |
| View switcher | Tabs on the workspace card | **Floating segmented control, top-center** |
| Trace viewer split | Timeline left · Event details right | **Event details left · Timeline right** |
| Canvas floating controls | Zoom cluster bottom-left; Previous executions + undo/clear top-right; tools rail right edge | **Zoom bottom-right; Previous executions + undo/clear top-left; tools rail left edge** |
| Process Type / Version card | Top-left | **Top-right** |
| Toasts | Bottom-right | **Bottom-left** |
| Node action icons (expand/edit) | Expand left, edit right | **Edit left, expand right** |
| Detail drawers | Slide from right | **Slide from left** |
| App nav | Docked left rail | **No docked rail — a floating org pill (top-left) expands into a floating nav panel, Figma-style; content is full-bleed** |
| Breadcrumbs, Run/Deploy cluster top-right, modals | — | Unchanged (convention) |

### 8.2 Brand & tokens

- **Name**: Tenki Studio. 天気 = weather: iconography of sky, clear-day gradients; sandbox states as weather glyphs is permitted *only* as accent (e.g. empty states), never for statuses (statuses use standard semantic colors).
- **Palette (light)**: page `#F5F8FA`; surface `#FFFFFF`; ink `#14212B`; muted `#5A7184`; line `#DCE6ED`; **accent sky `#0A7ABF`** (primary buttons, links, task-node titles); accent-pressed `#075E94`; success `#1E7F4F`; running/progress `#E17F0E`; warning amber `#B97709`; danger `#C4372C`. Dark theme: page `#0D161D`; surface `#152029`; ink `#E4EEF5`; muted `#8FA6B5`; line `#24384A`; accent `#4FB3E8`.
- **Type**: UI `"Sora"` for headings/nav, `"Public Sans"` for body/controls, `"JetBrains Mono"` for code, ids, prompts, raw JSON. (Deliberately not CrewAI's neutral grotesk look.)
- **Shape**: 10px radius cards, 8px controls, 999px chips; 1px `line` borders; shadows only on floating layers (nodes, modals, toasts).
- **Canvas**: dotted grid 16px; node width 260px; agent nodes neutral surface, task nodes surface with accent title; edges `line` with accent connector dots; selected node ring accent.

### 8.3 Component inventory (build once, reuse)

Nav rail + org switcher · breadcrumb header · primary/secondary/ghost buttons · tab bar (underline) · pill filter tabs with counts · search input · data table (sortable, sticky header, pagination) · status badges (Online/Running/Completed/Failed/Queued) · chips (model, tool, agent, parameter) · node cards (agent/task/trigger/manager) · edge + connector dot · canvas controls cluster · warnings pill + popover · version badge · dropdown (Previous executions) · timeline row (collapsible, offset column) · duration pill · event-details section (label + copy + mono body) · steps list row · progress bar · stat card · bar/pie/line charts · modal (env vars, share, inputs) · toast (bottom-left) · suggestion chip · thought-process accordion · checklist item (spinner→check) · composer · template card · project card (sparkline) · empty states.

### 8.4 Screen specs

Each v1 screen mirrors §2.1 content with §8.1 flips and §8.2 skin. Reference screenshots live in `/screenshots`; the build plan maps each milestone to the screenshots it must visually match (mirrored).

## 9. System architecture

```
Browser (Next.js) ──SSE/REST──▶ API + Orchestrator (FastAPI) ──SDK──▶ Tenki.cloud
     │                                │      │                          sandboxes
     │  React Flow canvas             │      ├─ Postgres (specs, runs,   (runner +
     │  Studio Chat stream            │      │  events, connections)      CrewAI)
     └──────────────────────────────  │      ├─ Redis (queues, SSE bus)      │
                                      │      └─ KMS envelope (secrets)       │
                                      ◀──────── HMAC callback events ────────┘
Copilot LLM (Claude via LiteLLM) ◀────┘
```

- **Web**: Next.js 15 + TypeScript + Tailwind + shadcn/ui + `@xyflow/react` + TanStack Query; SSE consumers for runs and chat.
- **API/Orchestrator**: FastAPI (Python — same language as CrewAI + `tenki-sandbox` SDK). Manages projects/versions, copilot loop (LLM tool-calls → graph mutations), run lifecycle (SR-1..9), callback ingestion, SSE fan-out, kickoff API.
- **Runner** (`tenki-runner`, pip package baked into runtime snapshots): loads `crew.json` → constructs CrewAI `Agent`/`Task`/`Crew` (LiteLLM model strings from connections) → registers event-bus listeners → `kickoff(inputs)` → emits events + writes `/workspace/artifacts`.
- **Data**: Postgres 16 (row-level org scoping); Redis for run queue + pub/sub; object storage for artifacts/exports.

## 10. Contracts

### 10.1 Crew spec (stored per version, edited by canvas + copilot)

```json
{
  "name": "Mad Men AI Poster Generator",
  "process": "sequential",
  "manager": null,
  "inputs": ["client_name"],
  "agents": [{
    "id": "agt_saul", "name": "Sal Romano",
    "role": "Art Director", "goal": "…", "backstory": "…",
    "model": "conn_openai/gpt-4o-mini",
    "tools": ["serper_search"], "max_iter": 15, "verbose": true
  }],
  "tasks": [{
    "id": "tsk_visual", "name": "visual_design_specifications_for_client_name_poster",
    "description": "Create comprehensive visual design specifications for the 1960s Mad Men-style {client_name} poster…",
    "expected_output": "A detailed visual design brief…",
    "agent": "agt_saul", "context": ["tsk_discovery"], "tools": []
  }],
  "triggers": [], "env_requirements": ["SERPER_API_KEY"],
  "canvas": {"positions": {"agt_saul": [980, 420]}}
}
```

### 10.2 Public API (selection)

```
POST   /v1/projects                         create (from prompt or blank)
GET    /v1/projects?filter=mine|shared      list (home grid)
GET    /v1/projects/:id / PATCH / DELETE
POST   /v1/projects/:id/versions/:n/restore
POST   /v1/projects/:id/chat                SSE: copilot turn (tool-call events inline)
POST   /v1/projects/:id/runs {inputs}       → {run_id}
POST   /v1/runs/:id/stop
GET    /v1/runs/:id                          status, steps, artifacts, cost
GET    /v1/runs/:id/events?after=seq        SSE live + backfill
GET    /v1/orgs/:id/traces?status=&type=    org traces table
CRUD   /v1/orgs/:id/llm-connections | env-vars | tool-connections
POST   /v1/projects/:id/deploy              → automation {slug, url, version}
POST   /a/:slug/kickoff  (public, API-key)  → 202 {run_id}
GET    /a/:slug/runs/:id (public, API-key)
```

### 10.3 Run event schema (JSONL from runner; stored; SSE'd)

```json
{"run_id":"run_x","seq":41,"ts":"2026-08-19T10:36:08Z",
 "type":"tool_usage_started","span_id":"sp_9","parent_span_id":"sp_7",
 "agent_id":"agt_pete","task_id":"tsk_discovery",
 "payload":{"tool":"search_the_internet_with_serper",
            "input":{"search_query":"Trends in cloud computing 2026"}}}
```

Types: `run_started|provisioning|task_started|agent_started|llm_call_started|llm_call_completed{duration_ms,model,tokens}|tool_usage_started|tool_usage_finished|task_completed{output}|run_completed{result}|run_failed{error}|heartbeat|artifact{path,bytes}`.

### 10.4 Copilot tools (function-calling surface)

`get_automation_state` · `list_available_tools` · `list_llm_connections` · `upsert_agent` · `remove_agent` · `upsert_task` · `remove_task` · `set_task_order/context` · `set_process_type` · `set_trigger` · `require_env_vars` · `auto_layout` · `run_automation` · `get_run(run_id, depth)` · `propose_suggestion(label, action)`. All mutations validate against schema, apply to a draft, commit as one version with a change summary.

## 11. Non-functional requirements

- **Isolation**: no crew code outside sandboxes; sandbox has org-scoped env only; callback auth HMAC per run; egress is sandbox-native (user code can reach the internet — documented, acceptable for v1; org-level egress policy P2).
- **Secrets**: envelope-encrypted (KMS) at rest; write-only UI; masked in traces (pattern + known-name scrub in runner *and* ingest).
- **Performance**: TTFEvent ≤5s warm (SR-2), ≤90s cold build; SSE latency ≤500ms p95; canvas 60fps to 60 nodes; trace timeline virtualizes ≥5k events.
- **Reliability**: run state machine crash-safe (Postgres source of truth); orphan-sandbox reaper; idempotent kickoff (client key).
- **Cost**: per-run sandbox-seconds recorded; org monthly cap with hard stop (Limits tab).
- **Compliance-ready**: audit log of deploys/secret changes/shares (P1).

## 12. Success metrics (first 90 days post-beta)

- Activation: ≥60% of new projects reach a first successful run in <10 min (median).
- TTFEvent p75 ≤5s warm; run failure rate from infra (vs. crew logic) <2%.
- ≥30% of active projects deployed; ≥50 kickoffs/week via API among beta orgs.
- Copilot acceptance: ≥70% of copilot change batches kept (not undone within 24h).

## 13. Risks & mitigations

| Risk | Mitigation |
|---|---|
| CrewAI event bus internals shift between releases | Pin crewai version per runtime snapshot; runner adapter layer; contract tests in CI against pinned + latest |
| Sandbox cold-start hurts the demo moment | Runtime snapshots (SR-2) + warm pool (SR-6); provisioning shown honestly in UI |
| Copilot makes destructive edits | Draft-then-commit versions, one-click restore, diff summary cards |
| Secret leakage via agent output | Dual masking (runner + ingest), never inject org secrets not required by the project |
| Tenki API quotas (`QuotaExceededError`) | Org concurrency limits, queueing with clear "queued" state, backoff |
| Legal/brand: "near-identical" clone | Mirrored layout, own brand system, no copied copy/assets; parity is functional, not visual-pixel |

## 14. Open questions

1. Kickoff URL shape: per-automation subdomain (`mad-men-<hash>.tenki.app`, closer to CrewAI) vs. path-based `/a/:slug` (simpler, v1 default).
2. Do we expose sandbox SSH/OpenCode (`enable_opencode`) for power-user debugging of failed runs?
3. Multi-workspace Tenki orgs: bind one workspace per org (v1) or per project?
4. Trace retention & export format (OTel-compatible spans?) for Platform Pat.
