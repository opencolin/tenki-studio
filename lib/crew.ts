/**
 * The crew *view* — a flat, typed projection of an FBP graph for the UI and
 * the run engine to read.
 *
 * Storage is `lib/fbp.ts` (an `@fbp/spec` Graph). Nothing here is persisted;
 * every field below is derived. Writes go through the `@fbp/spec` API against
 * the graph, never against these objects.
 */

import type { Graph, Node } from "./fbp";
import { providerForModel } from "./providers";
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

export { MODELS, PROVIDERS, providerForModel, shortModel } from "./providers";

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
  // A crew needs a credential for every tool it uses and every provider it
  // draws a model from — both feed the Missing tab and block a run.
  const env = new Set<string>();
  for (const a of agents) {
    for (const t of a.tools) {
      const e = TOOLS[t]?.env;
      if (e) env.add(e);
    }
    const provider = providerForModel(a.model);
    if (provider) env.add(provider.env);
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
