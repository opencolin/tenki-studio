/** A simulated run.
 *
 *  In the real product these events arrive over SSE from the orchestrator,
 *  which receives them from `tenki-runner` inside the sandbox (PRD §10.3).
 *  Here we replay a scripted trace on timers so the Output and Traces views
 *  behave exactly as they will against a live run.
 */

import type { CrewSpec } from "./crew";

export type EventType =
  | "run_started"
  | "provisioning"
  | "task_started"
  | "llm_call"
  | "tool_usage_started"
  | "tool_usage_finished"
  | "task_completed"
  | "artifact"
  | "run_completed";

export interface RunEvent {
  seq: number;
  at: number; // ms offset from run start
  type: EventType;
  taskId?: string;
  agentId?: string;
  label: string;
  durationMs?: number;
  detail?: {
    description?: string;
    prompt?: string;
    input?: string;
    output?: string;
  };
}

export type RunStatus = "idle" | "provisioning" | "running" | "completed" | "stopped";

export interface RunState {
  status: RunStatus;
  startedAt: number | null;
  elapsedMs: number;
  events: RunEvent[];
  inputs: Record<string, string>;
}

const SERPER_OUTPUT = `{'searchParameters': {'q': 'Trends in cloud computing and weather data solutions 2026', 'type': 'search', 'num': 10},
 'organic': [
   {'title': '24 Key Cloud Computing Trends to Watch in 2026',
    'link': 'https://www.netsuite.com/portal/resource/articles/erp/cloud-computing-trends.shtml',
    'snippet': 'The future of cloud computing includes AI-driven automation, edge computing, and finding new ways to optimise costs while extracting greater value...',
    'position': 1},
   {'title': 'Top Cloud Computing Trends to Watch — GreenNode',
    'link': 'https://greennode.ai/blog/top-cloud-computing-trends-to-watch',
    'snippet': 'Explore the top cloud computing trends shaping 2026, from AI-driven automation to edge computing and security innovations.',
    'position': 2},
   {'title': 'Top 10 Data Center Industry Trends in 2026 — TierPoint',
    'link': 'https://www.tierpoint.com/blog/data-center-industry-trends/',
    'snippet': '1. Artificial Intelligence  2. Cloud Infrastructure Optimization and Refactoring  3. Hybrid Cloud  4. Hyperscale  5. Edge Computing',
    'position': 3}]}`;

/** Builds the scripted trace for a crew + inputs. Offsets are in ms. */
export function buildScript(spec: CrewSpec, inputs: Record<string, string>): RunEvent[] {
  const client = inputs.client_name || "your client";
  const fill = (s: string) => s.replace(/\{client_name\}/g, client);
  const events: Omit<RunEvent, "seq">[] = [];
  let t = 0;
  const push = (e: Omit<RunEvent, "seq" | "at">, advance: number) => {
    events.push({ ...e, at: t });
    t += advance;
  };

  push({ type: "provisioning", label: "Creating sandbox from project snapshot" }, 1200);
  push(
    {
      type: "run_started",
      label: `Run started · client_name = "${client}"`,
      detail: {
        description: "Sandbox booted from snapshot proj-mad-men-v9 (2 vCPU / 4096 MB) in 1.2s.",
      },
    },
    400,
  );

  const timings: Record<string, { llm: number[]; tools?: number; total: number }> = {
    tsk_overview: { llm: [9600], total: 9830 },
    tsk_discovery: { llm: [1700, 20600], tools: 1100, total: 25150 },
    tsk_visual: { llm: [9700], total: 9960 },
    tsk_prompt: { llm: [4080], total: 4300 },
  };

  for (const task of spec.tasks) {
    const timing = timings[task.id] ?? { llm: [5000], total: 5200 };
    const agent = spec.agents.find((a) => a.id === task.agent);
    push(
      {
        type: "task_started",
        taskId: task.id,
        agentId: task.agent,
        label: "Started",
        detail: {
          description: fill(task.description),
          prompt: `${fill(task.description)}\n\nCurrent Date: ${new Date().toISOString().slice(0, 10)}\n\nThis is the expected criteria for your final answer: ${fill(
            task.expectedOutput,
          )}\nyou MUST return the actual complete content as the final answer, not a summary.`,
        },
      },
      600,
    );

    push(
      {
        type: "llm_call",
        taskId: task.id,
        agentId: task.agent,
        label: "LLM call",
        durationMs: timing.llm[0],
        detail: { description: `${agent?.model ?? "model"} · ${task.name}` },
      },
      Math.min(timing.llm[0], 2600),
    );

    if (timing.tools) {
      push(
        {
          type: "tool_usage_started",
          taskId: task.id,
          agentId: task.agent,
          label: "search_the_internet_with_serper",
          durationMs: timing.tools,
          detail: {
            input: `{\n  "search_query": "Trends in cloud computing and weather data solutions 2026"\n}`,
            output: SERPER_OUTPUT,
          },
        },
        900,
      );
      push(
        { type: "tool_usage_finished", taskId: task.id, agentId: task.agent, label: "Tool Usage Finished" },
        500,
      );
      push(
        {
          type: "llm_call",
          taskId: task.id,
          agentId: task.agent,
          label: "LLM call",
          durationMs: timing.llm[1],
          detail: { description: `${agent?.model ?? "model"} · synthesising the brief` },
        },
        2400,
      );
    }

    push(
      {
        type: "task_completed",
        taskId: task.id,
        agentId: task.agent,
        label: "Completed",
        durationMs: timing.total,
        detail: {
          description: fill(task.description),
          output: taskOutput(task.id, client),
        },
      },
      700,
    );
  }

  push(
    {
      type: "artifact",
      label: `artifacts/poster_${client.toLowerCase().replace(/[^a-z0-9]+/g, "_")}.png`,
      detail: { description: "Written inside the sandbox by the art-direction task · 1.4 MB" },
    },
    300,
  );
  push({ type: "run_completed", label: "Run completed" }, 0);

  const withSeq = events.map((e, i) => ({ ...e, seq: i + 1 }));

  // Durations are derived from the timeline itself, so every number the UI
  // shows (step duration, +offset, elapsed) tells the same story.
  for (let i = 0; i < withSeq.length; i++) {
    const e = withSeq[i];
    if (e.type === "task_completed") {
      const start = withSeq.find((x) => x.type === "task_started" && x.taskId === e.taskId);
      if (start) e.durationMs = e.at - start.at;
    } else if (e.type === "llm_call" || e.type === "tool_usage_started") {
      const next = withSeq[i + 1];
      if (next) e.durationMs = Math.max(next.at - e.at, 50);
    }
  }

  return withSeq;
}

function taskOutput(taskId: string, client: string) {
  switch (taskId) {
    case "tsk_overview":
      return `# Client Briefing — ${client}

**Industry:** Cloud infrastructure
**Founded:** 2020 · **HQ:** San Francisco, CA

**Mission.** Give developers disposable, isolated compute they can trust with
agent-generated code.

### Business objectives
1. Grow awareness among AI engineers building agent products.
2. Position sandboxes as the default runtime for untrusted code.
3. Convert self-serve signups into workspace teams.`;
    case "tsk_discovery":
      return `# Creative Brief — ${client}

**The one true thing.** Every serious agent product eventually runs code it
did not write. ${client} makes that ordinary instead of frightening.

**Key messages**
- Disposable by design — the machine is gone when the work is done.
- Boots in about a second from a snapshot you control.
- Full Linux: any package, real files, a real network.

**Tone.** Confident, dry, engineer-to-engineer. No hyperbole.`;
    case "tsk_visual":
      return `# Visual Design Specification

**Format.** Single-page magazine advertisement, 2:3.

**Typography.** Condensed grotesque headline set tight, all caps, generous
letter-spacing on the kicker. Body in a warm serif at 11pt.

**Palette.** Sky blue field, cream ground, oxidised orange accent used exactly
once — on the call to action.

**Composition.** Strong horizontal rule beneath the headline; the product mark
sits bottom-right in the optical corner, not the geometric one.`;
    default:
      return `A vibrant 1960s magazine advertisement for ${client}, set in a bustling
mid-century cityscape. Diverse professionals in period business attire work
calmly at sleek terminals. Pastel sky, stylised geometric clouds. Bold condensed
headline reading "Innovative Cloud Solutions Tailored for You" locked to a clean
symmetrical grid. Warm cream ground, sky-blue field, a single oxidised-orange
call to action at the base of the page. Screen-printed texture, subtle paper
grain, no photographic realism.`;
  }
}

export const fmt = (ms: number) => {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(ms < 10000 ? 2 : 1)}s`;
  const m = Math.floor(ms / 60000);
  const s = Math.round((ms % 60000) / 1000);
  return `${m}m ${s}s`;
};
