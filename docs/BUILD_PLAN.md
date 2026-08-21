# Build Plan — Tenki Studio

Companion to [PRD.md](./PRD.md). Assumes 2 full-time engineers (one product/frontend-lean, one platform/backend-lean) + Collin on product/design QA. Timeline: **15 weeks to public beta**, shippable checkpoints every 2–3 weeks. FR/SR references point at the PRD.

## 1. Stack decisions (and why)

| Layer | Choice | Rationale |
|---|---|---|
| Web app | Next.js 15 (App Router), TypeScript, Tailwind, shadcn/ui, `@xyflow/react` (React Flow), TanStack Query, `eventsource-parser` for SSE | Fastest path to the observed UI; React Flow matches the canvas 1:1 (custom nodes, edges, controls) |
| API + orchestrator | **Python 3.12 + FastAPI** | Same language as CrewAI and `tenki-sandbox` SDK; copilot, spec validation (Pydantic), and runner share models |
| Copilot LLM | Claude via LiteLLM (`claude-sonnet-5` default; org-swappable) | Strong tool-calling for graph edits; LiteLLM keeps crew agents provider-agnostic (OpenAI/Gemini/Anthropic model strings observed in screenshots) |
| DB | Postgres 16 (+ SQLAlchemy/Alembic) | Versioned JSONB crew specs, run events (partitioned), org scoping |
| Queue/bus | Redis (streams + pub/sub) | Run queue, SSE fan-out, kickoff concurrency |
| Secrets | KMS envelope encryption (age/libsodium in dev) | FR-8/9, §11 |
| Artifacts/exports | S3-compatible object store | Run artifacts (FR-5.7), ZIP export (FR-2.3) |
| Sandbox | `tenki-sandbox` Python SDK | `Sandbox.create/exec/files/snapshots/pause/resume/exposePort` per PRD §2.2 |
| Auth | Better Auth (or Clerk if we accept the dependency) — email + GitHub + Google, org support | FR-12 |
| Deploy | Web on Vercel; API + workers on Fly.io/Render (needs long-lived SSE + outbound callbacks); Postgres/Redis managed | Callback endpoint must be publicly reachable by sandboxes |

**Monorepo** (pnpm + uv workspaces):

```
tenki-studio/
  apps/web            Next.js app
  apps/api            FastAPI (routers: projects, chat, runs, automations, orgs, callbacks)
  packages/crew-spec  JSON Schema + Pydantic + TS types (generated) for crew.json
  packages/runner     tenki-runner pip pkg (baked into runtime snapshots)
  packages/ui         shared tokens/components (shadcn overlay, §8.2 tokens)
  infra/              IaC, runtime-snapshot builder job
  docs/               PRD.md, BUILD_PLAN.md, screenshots reference map
```

## 2. The execution spine (build this first, it de-risks everything)

**Runner protocol** (PRD §10.3): `tenki-runner` is a CLI: `tenki-runner run /workspace/crew.json --inputs /workspace/inputs.json --callback $CB_URL --hmac $CB_KEY`.

1. Parse crew.json → construct `Agent`s (LiteLLM model string per agent, tools from registry), `Task`s (context wiring), `Crew(process=sequential|hierarchical, manager_llm=…)`.
2. Subscribe to CrewAI event bus (`crewai.utilities.events`): CrewKickoffStarted/Completed, TaskStarted/Completed, AgentExecutionStarted/Completed, LLMCallStarted/Completed, ToolUsageStarted/Finished/Error → normalize to event schema, assign `seq`, `span_id` tree.
3. Emit each event as one JSONL line to stdout **and** buffer→POST batches (≤50 events / ≤1s) to callback with HMAC; retry 3× w/ backoff; heartbeat every 5s.
4. Interpolate `{placeholders}` + append `Current Date: <iso>` to task prompts (observed behavior) before kickoff.
5. Mask secrets (env values, `sk-|tk_|key-` patterns) in every payload.
6. Write final result + per-task outputs; copy `/workspace/artifacts/*` metadata into `artifact` events; exit 0/1.

**Orchestrator run loop**: claim queued run → resolve runtime snapshot (build if stale: `pip install` on base sandbox + `createSnapshotAndWait`, cache by deps-hash) → `createAndWait({snapshotId, cpu, memoryMb})` → `files.write(crew.json, inputs.json)` → `exec(tenki-runner …, timeout=max_run_s)` async → ingest callbacks (verify HMAC, upsert events, publish Redis) → on exit: fetch artifacts (chunked file read → S3), record sandbox seconds/cost, destroy sandbox → finalize state. Watchdog: no heartbeat 15s → probe; 3 misses → fail + reap. Stop: flag → SIGTERM via `exec(kill)` → destroy.

**Proof-of-spine exit test (end of M1):** POST a 2-agent/2-task crew spec (the cookbook's data-analyst pattern + Serper agent) to `/v1/projects/:id/runs`, watch `run_started → llm_call → tool_usage(serper) → task_completed ×2 → run_completed` stream over SSE in <5s warm, with the Fibonacci code-interpreter call executing inside the same sandbox.

## 3. Milestones

### M0 — Foundations (wk 1–2)
Monorepo, CI (lint/typecheck/pytest/playwright smoke), auth + orgs (FR-12.1), Postgres schema v1 (orgs, users, memberships, projects, versions, runs, run_events, llm_connections, env_vars, automations, api_keys), design tokens + app shell: left nav with all sections (stubs flagged Beta/Soon), breadcrumbs, dark/light.
**Exit:** deployed skeleton with auth, empty Studio home, tokens visible in Storybook.

### M1 — Execution spine, headless (wk 2–4) — SR-1..3, SR-7
`packages/crew-spec` v1 + validation; `tenki-runner` (§2); orchestrator (queue, snapshot builder, callback ingest, SSE); `POST /runs` + `GET /runs/:id/events`; secret injection + masking; cost recording; built-in tools: serper, scrape, http, code-interpreter, file read/write (FR-10.1).
**Exit:** proof-of-spine test green in CI (against a real Tenki workspace, nightly).

### M2 — Projects + Canvas editor (wk 4–7) — FR-1, FR-2, FR-4
Studio home (hero prompt creates project, templates, recent grid w/ sparklines); editor shell with **mirrored split (canvas left / chat right placeholder)**; React Flow canvas: custom agent/task/trigger/manager nodes, edges, mirrored controls (zoom bottom-right, prev-executions + undo top-left), Process Type card top-right (sequential/hierarchical + manager node + toast), validation warnings pill, versions (badge, list, restore), node edit forms, auto-layout (dagre), Download ZIP export.
**Exit:** manually build the Mad-Men crew on canvas, run it (M1 API), statuses overlay on nodes from Previous executions dropdown.

### M3 — Run experience (wk 6–8, overlaps M2) — FR-5
Inputs dialog from `{placeholders}`; Output tab (header, progress bar, STEPS list, live SSE, stop); Traces tab with **details LEFT / timeline RIGHT**: collapsible agent→task→event rows, duration pills, offsets, live tail-follow, virtualized list; event details (Details/Raw Data; Description / Task Prompt / Input / Output, copy buttons); artifacts list + download; toasts bottom-left.
**Exit:** side-by-side visual QA against screenshots `10.35.51–10.37.09` (mirrored), 5k-event run stays at 60fps.

### M4 — Studio Chat copilot (wk 8–11) — FR-3
Chat service (`POST /chat` SSE): agentic loop with §10.4 tools against draft spec, commit-as-version with change summary; streaming UI: markdown, thought-process accordion, live tool checklist, change-summary cards, suggestion chips (post-run + post-warning triggers, incl. "Improve automation based on last run" using `get_run` diff), chat history sessions, attachments (text/pdf → context), pane-width toggles.
**Exit:** the PRD §5 journey 1 & 3 demo end-to-end: prompt → populated canvas → run → improve-from-last-run adds an agent with explanation. Eval set: 15 scripted prompts must produce valid specs (schema-valid, 0 orphan tasks) ≥93%.

### M5 — Platform surfaces (wk 10–13) — FR-6..9, FR-12.2
LLM Connections CRUD + model fetch + picker integration; Env Vars org page + project modal (scope tabs, missing detection, run-block); Deploy: pin version → automation + kickoff API (`/a/:slug/kickoff`, API keys, per-automation concurrency), Automations Live table (Online/Offline, Edit in Studio, Options), LIVE badge on home cards; org Traces page (filters, parameter chips, View Execution → standalone trace viewer); Share modal + Shared-with-me; Tools & Integrations Connections tab (registry list + MCP add P1 if time, else stub).
**Exit:** journey 4 (deploy → external kickoff → org trace) demo; kickoff API docs page generated.

### M6 — Hardening + polish + beta (wk 13–15) — FR-11, SR-5/6, §11
Usage dashboard (stat cards incl. sandbox minutes/cost, charts, Limits with enforcement); warm pool + pause/resume HITL tool (P1 scope-cut candidate → post-beta if tight); orphan reaper + chaos tests (kill sandbox mid-run, drop callbacks); rate limits; audit log; a11y pass (focus states, keyboard canvas ops); mirrored-design QA sweep against all 29 screenshots; seed templates (6 cards incl. a Tenki-flavored "Mad Men poster generator"); onboarding checklist; beta invite flow.
**Exit:** private beta (5 orgs), SLOs wired (TTFEvent, failure rate dashboards).

### P2 backlog (post-beta)
Discovery Engine flow; Agents/Skills repositories; MCP connections UI + in-sandbox MCP servers; Slack/Zapier trigger integrations; Deploy-from-Code (Git/ZIP import of existing CrewAI projects — natural fit: build snapshot from their `pyproject.toml`); exposed-port previews on runs (SR-8); billing; OTel trace export; org egress policies.

## 4. Epic → ticket seed (first two milestones)

**E-M1-runner**: spec loader/validator · event-bus adapter + span tree · JSONL/stdout emitter · callback batcher w/ HMAC · heartbeats · masking · interpolation + current-date · tool registry (serper/scrape/http/code-interp/file) · artifact events · integration test vs pinned crewai.
**E-M1-orchestrator**: run state machine + queue · snapshot builder + cache (deps-hash) · sandbox provisioner (create/files/exec/destroy) · callback ingest + Redis publish · SSE endpoint w/ backfill (`after=seq`) · stop/reaper/watchdog · cost metering · env injection.
**E-M2-canvas**: node components (agent/task/trigger/manager) · edge styles + connector dots · mirrored controls cluster · process-type card + manager insertion · warnings engine + pill/popover · version service + badge/list/restore · prev-executions overlay · edit forms (Zod) · dagre auto-layout · ZIP export.
**E-M2-home**: prompt hero → create+seed · template cards · project cards (sparkline via runs agg) · tabs/search/filters · favorite/star.

(M3–M6 tickets cut the same way at milestone start; ~140 tickets total estimated.)

## 5. Testing strategy

- **Contract tests**: crew-spec schema (golden files, TS+Py generated types stay in sync); runner event schema (golden JSONL from recorded runs); kickoff API (schemathesis).
- **Runner integration** (nightly, real Tenki workspace): matrix {sequential, hierarchical} × {tools on/off} × {crewai pinned, latest} — catches CrewAI event-bus drift (PRD §13 risk 1).
- **E2E (Playwright)**: journeys 1–4 with a mock-LLM mode (deterministic copilot + agent responses) so CI needs no LLM keys; one smoke vs real Claude weekly.
- **Load**: 50 concurrent runs (queueing correctness), 5k-event trace render perf budget.
- **Security**: secret-masking corpus test; HMAC tamper tests; authz matrix per endpoint (org/member/public-key).

## 6. Visual parity QA (definition of "near-identical, mirrored")

Checklist derived from `/screenshots` — every item must match in content & behavior, mirrored per PRD §8.1, in Tenki skin:
home hero + templates + recent grid `(10.37.56, 10.38.02)` · editor chrome + tabs + header actions `(10.34.15)` · canvas nodes/process/triggers/warnings `(10.34.35, 10.35.26, 10.35.36)` · hierarchical manager `(10.35.36)` · share modal `(10.34.56)` · env-vars modal `(10.35.03)` · output steps `(10.35.51, 10.37.09)` · trace timeline + details incl. tool Input/Output `(10.34.15–10.34.28, 10.35.59–10.37.02)` · org traces `(10.37.29)` · LLM connections `(10.37.16)` · tools & integrations `(10.37.43, 10.37.50)` · skills empty state `(10.37.35)` · automations live `(10.38.09)` · usage `(10.37.22)` · discovery stub `(10.38.15, 10.38.22)`.

## 7. Sequencing risks

1. **Tenki account/quota for CI** needed by wk 2 (M1 nightly). Owner: Collin.
2. CrewAI version pin choice (latest stable at wk 2) — upgrade window scheduled M6.
3. Callback reachability requires public API URL before M1 e2e — deploy API skeleton in M0.
4. Copilot quality is the schedule's fat tail — M4 gets the eval harness on day 1, scope-cut path is "copilot edits only via explicit commands, suggestions post-beta".
5. If warm-pool work slips, ship with snapshot cold-boot (~5–8s) and honest "provisioning" UI; do not block beta.
