/**
 * Crew graphs, stored as Flow-Based Programming graphs (`@fbp/spec`).
 *
 * The FBP `Graph` is the source of truth on disk and in state. Everything the
 * UI needs — agents, tasks, assignments, dependencies — is *derived* from it:
 *
 *   - an agent or task is a `Node` whose `type` names a `NodeDefinition`
 *   - its fields live in `props` (PropValue[]), not in bespoke interfaces
 *   - assignment and dependency are real `Edge`s between named ports,
 *     replacing the foreign keys (`task.agent`, `task.context[]`) we used to
 *     derive edges from
 *   - layout lives in `meta.x/y`, so nothing UI-only leaks into the contract
 *   - the crew's own inputs are `graphInput` boundary nodes, and configuration
 *     like the process type is a `graphProp` — per the spec, boundary nodes are
 *     the only source of truth for a scope's interface
 *
 * Because edges are stored rather than inferred, they can carry things a
 * foreign key cannot: a `channel` for error/control routing, and fan-in into a
 * `multi` port.
 */

import type { Edge, Graph, Node, NodeDefinition, PropValue } from "@fbp/spec";
import { getEdges, getNodes } from "@fbp/spec";

export type { Edge, Graph, Node, PropValue };

export const CREW = "crew";

/** Node types used by a crew graph. */
export const NODE_TYPES = {
  agent: "agent",
  task: "task",
  trigger: "trigger",
  graphInput: "graphInput",
  graphOutput: "graphOutput",
  graphProp: "graphProp",
} as const;

/** Port names, so edge construction never hardcodes strings. */
export const PORTS = {
  /** An agent's output, and the task input it lands on. */
  agent: "agent",
  /** A task's result, and the (multi) input other tasks consume it through. */
  output: "output",
  context: "context",
  /** A trigger's firing signal. */
  fire: "fire",
  /** Boundary nodes expose a single `value` port. */
  value: "value",
} as const;

export const definitions: NodeDefinition[] = [
  {
    context: CREW,
    name: NODE_TYPES.agent,
    category: "Crew",
    icon: "user",
    description: "A role on the crew, backed by a model and a set of tools.",
    outputs: [{ name: PORTS.agent, type: "crew/agent", description: "Assign this agent to a task." }],
    props: [
      { name: "title", type: "string" },
      { name: "role", type: "string" },
      { name: "goal", type: "string" },
      { name: "backstory", type: "string" },
      { name: "model", type: "string" },
      { name: "tools", type: "string[]", default: [] },
    ],
  },
  {
    context: CREW,
    name: NODE_TYPES.task,
    category: "Crew",
    icon: "clipboard",
    description: "One unit of work, performed by exactly one agent.",
    inputs: [
      { name: PORTS.agent, type: "crew/agent", description: "The agent that performs this task." },
      {
        name: PORTS.context,
        type: "crew/output",
        multi: true,
        description: "Outputs of upstream tasks fed in as context.",
      },
    ],
    outputs: [{ name: PORTS.output, type: "crew/output", description: "This task's final answer." }],
    props: [
      { name: "title", type: "string" },
      { name: "description", type: "string" },
      { name: "expectedOutput", type: "string" },
    ],
  },
  {
    context: CREW,
    name: NODE_TYPES.trigger,
    category: "Crew",
    icon: "bolt",
    description: "Starts the crew on an event or a schedule.",
    outputs: [{ name: PORTS.fire, type: "crew/signal" }],
    props: [{ name: "mode", type: "string", default: "manual" }],
  },
];

/* ------------------------------ construction ------------------------------ */

const p = (name: string, value: unknown): PropValue => ({ name, value });

function agent(
  name: string,
  x: number,
  y: number,
  props: { title: string; role: string; goal: string; backstory: string; model: string; tools: string[] },
): Node {
  return {
    name,
    context: CREW,
    type: NODE_TYPES.agent,
    meta: { x, y, description: props.role },
    props: [
      p("title", props.title),
      p("role", props.role),
      p("goal", props.goal),
      p("backstory", props.backstory),
      p("model", props.model),
      p("tools", props.tools),
    ],
  };
}

function task(
  name: string,
  x: number,
  y: number,
  props: { title: string; description: string; expectedOutput: string },
): Node {
  return {
    name,
    context: CREW,
    type: NODE_TYPES.task,
    meta: { x, y, description: props.title },
    props: [p("title", props.title), p("description", props.description), p("expectedOutput", props.expectedOutput)],
  };
}

/** agent → task assignment. */
const assign = (from: string, to: string): Edge => ({
  src: { node: from, port: PORTS.agent },
  dst: { node: to, port: PORTS.agent },
});

/** upstream task output → downstream task context (fan-in via a `multi` port). */
const feeds = (from: string, to: string): Edge => ({
  src: { node: from, port: PORTS.output },
  dst: { node: to, port: PORTS.context },
});

export const madMenGraph: Graph = {
  name: "Mad Men AI Poster Generator",
  context: CREW,
  definitions,
  meta: { description: "A Sterling Cooper-style agency that produces a period advertising poster." },
  nodes: [
    // The crew's public interface: one input, one output, one config prop.
    {
      name: "input_client_name",
      type: NODE_TYPES.graphInput,
      meta: { x: 40, y: 640 },
      props: [p("portName", "client_name"), p("dataType", "string")],
    },
    {
      name: "prop_process",
      type: NODE_TYPES.graphProp,
      meta: { x: 40, y: 720 },
      props: [p("propName", "process"), p("dataType", "string"), p("default", "sequential")],
    },
    {
      name: "output_prompt",
      type: NODE_TYPES.graphOutput,
      meta: { x: 900, y: 470 },
      props: [p("portName", "prompt"), p("dataType", "string")],
    },

    {
      name: "triggers",
      context: CREW,
      type: NODE_TYPES.trigger,
      meta: { x: 40, y: 470, description: "No triggers configured" },
      props: [p("mode", "manual")],
    },

    agent("pete_campbell", 40, 0, {
      title: "Pete Campbell",
      role: "Account Executive",
      goal: "Manage client relationships for {client_name} and run a thorough discovery.",
      backstory:
        "You are the account man. You get the client talking, and you come back with the brief nobody else could get.",
      model: "claude-sonnet-5",
      tools: ["serper_search"],
    }),
    agent("don_draper", 342, 0, {
      title: "Don Draper",
      role: "Creative Director",
      goal: "Develop the strategic creative framework for the {client_name} campaign.",
      backstory:
        "You find the one true thing about a product and say it in a way nobody forgets. You are never precious about a draft.",
      model: "gpt-4o",
      tools: ["serper_search"],
    }),
    agent("sal_romano", 644, 0, {
      title: "Sal Romano",
      role: "Art Director",
      goal: "Design visually stunning and strategically effective creative for {client_name}.",
      backstory:
        "You think in layouts. You know how a 1960s magazine spread breathes, and you can specify it precisely.",
      model: "claude-sonnet-5",
      tools: ["serper_search"],
    }),
    agent("peggy_olson", 272, 470, {
      title: "Peggy Olson",
      role: "Copywriter",
      goal: "Craft compelling, persuasive copy for {client_name} campaigns.",
      backstory:
        "You started in the typing pool and you write better headlines than anyone on the floor. You fight for the good line.",
      model: "claude-sonnet-5",
      tools: [],
    }),

    task("client_business_overview_and_requirements", 40, 240, {
      title: "Client Business Overview and Requirements",
      description:
        "Provide comprehensive information about {client_name} including company background, business objectives, target audience demographics, competitive positioning, current marketing challenges, budget considerations, and campaign goals.",
      expectedOutput:
        "A detailed client briefing document outlining business background, marketing objectives, target audience analysis, competitive landscape, budget parameters, and specific campaign requirements.",
    }),
    task("client_discovery_and_briefing", 342, 240, {
      title: "Client Discovery and Briefing",
      description:
        "Conduct comprehensive client discovery for {client_name}, researching their business, industry, competitors, target audience, and campaign objectives. Gather everything needed for a detailed creative brief.",
      expectedOutput:
        "A creative brief including brand positioning, key messages, budget parameters, timeline, and success metrics.",
    }),
    task("visual_design_specifications", 644, 240, {
      title: "Visual Design Specifications for {client_name} Poster",
      description:
        "Create comprehensive visual design specifications for the 1960s Mad Men-style {client_name} poster including typography choices, colour palette refinements, geometric compositions, layout principles, and visual hierarchy.",
      expectedOutput:
        "A detailed visual design brief specifying typography, colour schemes, composition layouts, geometric elements, spacing, and period-accurate design principles.",
    }),
    task("final_advertisement_prompt", 574, 470, {
      title: "Final Advertisement Prompt",
      description:
        "Create ONE comprehensive, image-model-optimised prompt for a 1960s Mad Men-style advertising poster featuring {client_name}. The prompt should be for the advertisement poster itself — not boardroom scenes or office depictions.",
      expectedOutput: "A single production-ready image prompt, plus a one-line note on the creative rationale.",
    }),
  ],
  edges: [
    assign("pete_campbell", "client_business_overview_and_requirements"),
    assign("don_draper", "client_discovery_and_briefing"),
    assign("sal_romano", "visual_design_specifications"),
    assign("peggy_olson", "final_advertisement_prompt"),
    feeds("client_business_overview_and_requirements", "client_discovery_and_briefing"),
    feeds("client_discovery_and_briefing", "visual_design_specifications"),
    feeds("visual_design_specifications", "final_advertisement_prompt"),
    { src: { node: "final_advertisement_prompt", port: PORTS.output }, dst: { node: "output_prompt", port: PORTS.value } },
  ],
};

/* -------------------------------- reading -------------------------------- */

/** Read one prop value off a node. */
export function prop<T = string>(node: Node | null | undefined, name: string, fallback?: T): T | undefined {
  const hit = node?.props?.find((v) => v.name === name);
  return (hit?.value as T) ?? fallback;
}

export const isAgent = (n: Node) => n.type === NODE_TYPES.agent;
export const isTask = (n: Node) => n.type === NODE_TYPES.task;
export const isBoundary = (n: Node) =>
  n.type === NODE_TYPES.graphInput || n.type === NODE_TYPES.graphOutput || n.type === NODE_TYPES.graphProp;

export const rootNodes = (graph: Graph) => getNodes(graph, "/");
export const rootEdges = (graph: Graph) => getEdges(graph, "/");

export const agentNodes = (graph: Graph) => rootNodes(graph).filter(isAgent);
export const taskNodes = (graph: Graph) => rootNodes(graph).filter(isTask);

/** The agent assigned to a task, read from the assignment edge. */
export function agentOf(graph: Graph, taskName: string): string | undefined {
  return rootEdges(graph).find((e) => e.dst.node === taskName && e.dst.port === PORTS.agent)?.src.node;
}

/** Upstream task names feeding a task's context port. */
export function contextOf(graph: Graph, taskName: string): string[] {
  return rootEdges(graph)
    .filter((e) => e.dst.node === taskName && e.dst.port === PORTS.context)
    .map((e) => e.src.node);
}

/** Tasks in dependency order (topological; falls back to declaration order). */
export function orderedTasks(graph: Graph): Node[] {
  const tasks = taskNodes(graph);
  const byName = new Map(tasks.map((t) => [t.name, t]));
  const seen = new Set<string>();
  const out: Node[] = [];
  const visit = (node: Node) => {
    if (seen.has(node.name)) return;
    seen.add(node.name);
    for (const upstream of contextOf(graph, node.name)) {
      const dep = byName.get(upstream);
      if (dep) visit(dep);
    }
    out.push(node);
  };
  tasks.forEach(visit);
  return out;
}

/** The crew's declared inputs, from `graphInput` boundary nodes. */
export function graphInputs(graph: Graph): string[] {
  return rootNodes(graph)
    .filter((n) => n.type === NODE_TYPES.graphInput)
    .map((n) => prop(n, "portName", n.name)!)
    .filter(Boolean);
}

/** A graph-level configuration value, from a `graphProp` boundary node. */
export function graphProp<T = string>(graph: Graph, name: string, fallback: T): T {
  const node = rootNodes(graph).find(
    (n) => n.type === NODE_TYPES.graphProp && prop(n, "propName") === name,
  );
  return (prop<T>(node, "value") ?? prop<T>(node, "default") ?? fallback) as T;
}
