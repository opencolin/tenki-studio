/**
 * The crew *view* — a flat, typed projection of an FBP graph for the UI and
 * the run engine to read.
 *
 * Storage is `lib/fbp.ts` (an `@fbp/spec` Graph). Nothing here is persisted;
 * every field below is derived. Writes go through the `@fbp/spec` API against
 * the graph, never against these objects.
 */

import type { Graph, Node } from "./fbp";
import {
  agentNodes,
  agentOf,
  contextOf,
  graphInputs,
  graphProp,
  madMenGraph,
  orderedTasks,
  prop,
} from "./fbp";

export type Process = "sequential" | "hierarchical";

export interface AgentView {
  id: string;
  name: string;
  role: string;
  goal: string;
  backstory: string;
  model: string;
  tools: string[];
  position: { x: number; y: number };
}

export interface TaskView {
  id: string;
  /** Runtime identifier — what the trace shows. Same as the graph node name. */
  name: string;
  title: string;
  description: string;
  expectedOutput: string;
  agent: string;
  context: string[];
  position: { x: number; y: number };
}

export interface CrewView {
  name: string;
  process: Process;
  inputs: string[];
  envRequirements: string[];
  agents: AgentView[];
  tasks: TaskView[];
}

export const TOOLS: Record<string, { label: string; env?: string; note?: string }> = {
  serper_search: { label: "Search the internet with Serper", env: "SERPER_API_KEY" },
  tavily_search: {
    label: "Search the web with Tavily",
    env: "TAVILY_API_KEY",
    note: "LLM-oriented search returning ranked results, optional answers and raw page content.",
  },
  aisa_resource: {
    label: "Call a resource on AIsa",
    env: "AISA_API_KEY",
    note: "One credential onto AIsa's aggregated APIs and skills; billed per call.",
  },
  scrape_website: { label: "Scrape a website" },
  http_request: { label: "HTTP request" },
  run_python: { label: "Run Python in the sandbox" },
  read_write_file: { label: "Read / write a file" },
};

export const MODELS = [
  "claude-fable-5",
  "claude-sonnet-5",
  "claude-haiku-4-5",
  "gpt-4o",
  "gpt-4o-mini",
  "gemini-3-pro-preview",
  "nebius/deepseek-ai/DeepSeek-V3",
  "nebius/Qwen/Qwen3-235B-A22B",
  "nebius/meta-llama/Llama-3.3-70B-Instruct",
  "aisa/openai/gpt-4o",
  "aisa/anthropic/claude-sonnet-5",
];

const pos = (node: Node) => ({ x: node.meta?.x ?? 0, y: node.meta?.y ?? 0 });

function toAgent(node: Node): AgentView {
  return {
    id: node.name,
    name: prop(node, "title", node.name)!,
    role: prop(node, "role", "")!,
    goal: prop(node, "goal", "")!,
    backstory: prop(node, "backstory", "")!,
    model: prop(node, "model", "")!,
    tools: prop<string[]>(node, "tools", [])!,
    position: pos(node),
  };
}

function toTask(graph: Graph, node: Node): TaskView {
  return {
    id: node.name,
    name: node.name,
    title: prop(node, "title", node.name)!,
    description: prop(node, "description", "")!,
    expectedOutput: prop(node, "expectedOutput", "")!,
    agent: agentOf(graph, node.name) ?? "",
    context: contextOf(graph, node.name),
    position: pos(node),
  };
}

/** Project a stored graph into the shape the UI reads. */
export function toCrew(graph: Graph): CrewView {
  const agents = agentNodes(graph).map(toAgent);
  const tasks = orderedTasks(graph).map((n) => toTask(graph, n));
  const env = new Set<string>();
  for (const a of agents) {
    for (const t of a.tools) {
      const e = TOOLS[t]?.env;
      if (e) env.add(e);
    }
  }
  return {
    name: graph.name ?? "Untitled crew",
    process: graphProp<Process>(graph, "process", "sequential"),
    inputs: graphInputs(graph),
    envRequirements: [...env],
    agents,
    tasks,
  };
}

export const defaultGraph = madMenGraph;

export const agentById = (crew: CrewView, id: string) => crew.agents.find((a) => a.id === id);
export const taskById = (crew: CrewView, id: string) => crew.tasks.find((t) => t.id === id);

/** Warnings surfaced by the canvas pill — PRD FR-4.7. */
export function validate(crew: CrewView) {
  const out: { id: string; nodeId: string; text: string }[] = [];
  for (const a of crew.agents) {
    const assigned = crew.tasks.filter((t) => t.agent === a.id);
    if (a.tools.length === 0 && assigned.length > 0) {
      out.push({
        id: `tools-${a.id}`,
        nodeId: a.id,
        text: `${a.name} has no tools but is assigned ${assigned.length} task${assigned.length > 1 ? "s" : ""}.`,
      });
    }
  }
  for (const t of crew.tasks) {
    if (!t.agent) {
      out.push({ id: `agent-${t.id}`, nodeId: t.id, text: `${t.title} has no agent assigned.` });
    }
  }
  if (crew.process === "hierarchical") {
    out.push({ id: "manager", nodeId: "manager", text: "Crew Manager has no model selected." });
  }
  return out;
}
