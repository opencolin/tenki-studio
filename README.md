# Tenki Studio

An agent-automation studio in the shape of a design tool: describe an automation in
plain language, edit the resulting crew on a canvas, run it, and read the trace —
where **every run executes inside a disposable [Tenki.cloud](https://tenki.cloud)
sandbox** instead of on shared infrastructure.

> **Status: front-end prototype.** Every screen here is real and interactive, but the
> run engine is *simulated* — it replays a scripted trace on timers so the Output and
> Traces views behave exactly as they will against a live run. The orchestrator and the
> in-sandbox runner described below are specified in [`docs/PRD.md`](docs/PRD.md) and
> planned in [`docs/BUILD_PLAN.md`](docs/BUILD_PLAN.md), not yet implemented. Nothing in
> this repository talks to the Tenki API today.

## Why sandboxes

A crew is a program you did not write, calling tools you did not audit, on inputs you
did not review. Running that on shared application infrastructure means constraining it
until it is safe but not very useful. Running it in a microVM that is destroyed
afterwards inverts the trade:

- **Hard isolation per run.** Agent-generated code is contained in a VM that goes away.
  A code interpreter becomes a first-class tool rather than a risk to be minimised.
- **Reproducible runtimes.** A project's dependencies are baked into a snapshot; runs
  fork it and boot in about a second. Dev and deployed runs are the same image.
- **Honest economics.** Compute is metered sandbox-seconds. Models are your own keys.
- **Sandbox-native features.** Pause/resume for human-in-the-loop gates, snapshot forking
  for run replay, `exposePort()` preview URLs for crews that build something you want to see.

The integration this is modelled on lives in the
[Tenki cookbook](https://github.com/luxorlabs/cookbook/tree/main/examples/crewai-code-interpreter):
a CrewAI `BaseTool` whose `_run` calls `sandbox.exec("python3", "-c", code)`.

## What's in the box

| Route | What it is |
|---|---|
| `/` | Studio home — prompt hero, templates, recent projects |
| `/studio` | The editor: canvas, live run output, trace inspector, copilot chat |
| `/automations` | Deployed automations and the kickoff API |
| `/traces` | Org-wide execution history |
| `/connections` | LLM connections (bring your own keys) |
| `/environment` | Environment variables, scoped and write-only |
| `/usage` | Usage, sandbox minutes, limits |
| `/tools`, `/discovery` | Tool registry and the discovery wizard |

The editor is the heart of it: a React Flow canvas of agents and tasks, a copilot panel,
and a run you can start and watch. Hit **Run**, give it a `client_name`, and the trace
streams in — steps completing, LLM calls and tool calls with durations, an inspector for
every event, and the artifact the crew "wrote" into the sandbox.

### Design notes

Two deliberate departures from the tool this is modelled on:

- **Mirrored layout.** Canvas on the left, chat on the right; the trace inspector docks
  left of the timeline; tool rail on the left edge, zoom bottom-right. The full rule is
  in PRD §8.1.
- **Canvas-first chrome.** No docked navigation rail and no page header — the work
  surface runs edge to edge and every control floats over it as a grouped bar, Figma-style.
  The nav is a pill in the top-left corner that expands into a floating panel.

Design tokens (Sora / Public Sans / JetBrains Mono, a sky-blue accent, semantic colours
reserved for status) live in [`app/globals.css`](app/globals.css). The source design
canvas — artboards, tokens, and a component sheet — is in [`design/`](design) as
`.dc.html` files.

## Running it

```bash
npm install
npm run dev          # http://localhost:3000
```

Build the static site (it is fully client-side, so it exports cleanly):

```bash
npm run build        # → ./out
npm start            # serve ./out on $PORT (default 3000)
```

## Hosting it on a Tenki sandbox

The site is static, so a sandbox can serve it with nothing but Node:

```bash
tenki sandbox create --name tenki-studio --sticky --allow-inbound --cpu 2 --memory-mb 2048
tenki sandbox write --session tenki-studio --file site.tgz < site.tgz
tenki sandbox exec --session tenki-studio -- bash -lc 'mkdir -p /srv && tar xzf /root/site.tgz -C /srv'
tenki sandbox exec --session tenki-studio -- bash -lc 'setsid npx --yes serve@14 /srv -l 8080 >/tmp/serve.log 2>&1 & sleep 2'
tenki sandbox expose --session tenki-studio 8080 --slug tenki-studio
```

`--slug` gives you a stable preview subdomain; `--sticky` keeps the sandbox alive until
you terminate it. `scripts/deploy-tenki.sh` in this repo does all of the above in one go.

## Architecture (as specified)

```
Browser (this app) ──REST/SSE──▶ Orchestrator (FastAPI) ──SDK──▶ Tenki sandbox
                                      │                              │
                                      │  Postgres · Redis · KMS      │ tenki-runner
                                      ◀───── HMAC event callbacks ───┘  + CrewAI
```

One run, one sandbox. The orchestrator is the only component holding Tenki credentials;
the runner inside the sandbox hooks CrewAI's event bus and streams events back. Crew code
never touches the API tier. Event schema, crew-spec schema, and the copilot's tool surface
are all in [`docs/PRD.md`](docs/PRD.md) §9–10.

## Repository layout

```
app/            routes (Next.js App Router, all client-side)
components/     chrome, canvas, chat, run views, modals, icons
lib/            crew spec + the simulated run engine
design/         source design canvas (.dc.html artboards + tokens)
docs/           PRD and build plan
scripts/        deploy-to-Tenki helper
```

## Contributing

Issues and pull requests are welcome. The most useful contributions right now are the
parts that are specified but unbuilt: the `tenki-runner` package, the orchestrator's run
loop, and replacing the simulated run engine with real SSE.

## License

MIT — see [LICENSE](LICENSE).

Not affiliated with CrewAI. Built on [CrewAI](https://github.com/crewAIInc/crewAI) concepts
and the Tenki Sandbox SDK.
