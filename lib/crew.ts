/** The crew spec — PRD §10.1. This is the shape the canvas edits, the copilot
 *  mutates, and the runner would receive as crew.json inside the sandbox. */

export type Process = "sequential" | "hierarchical";

export interface Agent {
  id: string;
  name: string;
  role: string;
  goal: string;
  backstory: string;
  model: string;
  tools: string[];
  position: { x: number; y: number };
}

export interface Task {
  id: string;
  name: string;
  title: string;
  description: string;
  expectedOutput: string;
  agent: string;
  context: string[];
  position: { x: number; y: number };
}

export interface CrewSpec {
  slug: string;
  name: string;
  process: Process;
  version: number;
  inputs: string[];
  envRequirements: string[];
  agents: Agent[];
  tasks: Task[];
  triggerPosition: { x: number; y: number };
}

export const TOOLS: Record<string, { label: string; env?: string }> = {
  serper_search: { label: "Search the internet with Serper", env: "SERPER_API_KEY" },
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
];

export const madMen: CrewSpec = {
  slug: "mad-men-poster-generator",
  name: "Mad Men AI Poster Generator",
  process: "sequential",
  version: 9,
  inputs: ["client_name"],
  envRequirements: ["SERPER_API_KEY"],
  triggerPosition: { x: 40, y: 470 },
  agents: [
    {
      id: "agt_pete",
      name: "Pete Campbell",
      role: "Account Executive",
      goal: "Manage client relationships for {client_name} and run a thorough discovery.",
      backstory:
        "You are the account man. You get the client talking, and you come back with the brief nobody else could get.",
      model: "claude-sonnet-5",
      tools: ["serper_search"],
      position: { x: 40, y: 0 },
    },
    {
      id: "agt_don",
      name: "Don Draper",
      role: "Creative Director",
      goal: "Develop the strategic creative framework for the {client_name} campaign.",
      backstory:
        "You find the one true thing about a product and say it in a way nobody forgets. You are never precious about a draft.",
      model: "gpt-4o",
      tools: ["serper_search"],
      position: { x: 342, y: 0 },
    },
    {
      id: "agt_sal",
      name: "Sal Romano",
      role: "Art Director",
      goal: "Design visually stunning and strategically effective creative for {client_name}.",
      backstory:
        "You think in layouts. You know how a 1960s magazine spread breathes, and you can specify it precisely.",
      model: "claude-sonnet-5",
      tools: ["serper_search"],
      position: { x: 644, y: 0 },
    },
    {
      id: "agt_peggy",
      name: "Peggy Olson",
      role: "Copywriter",
      goal: "Craft compelling, persuasive copy for {client_name} campaigns.",
      backstory:
        "You started in the typing pool and you write better headlines than anyone on the floor. You fight for the good line.",
      model: "claude-sonnet-5",
      tools: [],
      position: { x: 272, y: 470 },
    },
  ],
  tasks: [
    {
      id: "tsk_overview",
      name: "client_business_overview_and_requirements",
      title: "Client Business Overview and Requirements",
      description:
        "Provide comprehensive information about {client_name} including company background, business objectives, target audience demographics, competitive positioning, current marketing challenges, budget considerations, and campaign goals.",
      expectedOutput:
        "A detailed client briefing document outlining business background, marketing objectives, target audience analysis, competitive landscape, budget parameters, and specific campaign requirements.",
      agent: "agt_pete",
      context: [],
      position: { x: 40, y: 240 },
    },
    {
      id: "tsk_discovery",
      name: "client_discovery_and_briefing",
      title: "Client Discovery and Briefing",
      description:
        "Conduct comprehensive client discovery for {client_name}, researching their business, industry, competitors, target audience, and campaign objectives. Gather everything needed for a detailed creative brief.",
      expectedOutput:
        "A creative brief including brand positioning, key messages, budget parameters, timeline, and success metrics.",
      agent: "agt_don",
      context: ["tsk_overview"],
      position: { x: 342, y: 240 },
    },
    {
      id: "tsk_visual",
      name: "visual_design_specifications",
      title: "Visual Design Specifications for {client_name} Poster",
      description:
        "Create comprehensive visual design specifications for the 1960s Mad Men-style {client_name} poster including typography choices, colour palette refinements, geometric compositions, layout principles, and visual hierarchy.",
      expectedOutput:
        "A detailed visual design brief specifying typography, colour schemes, composition layouts, geometric elements, spacing, and period-accurate design principles.",
      agent: "agt_sal",
      context: ["tsk_discovery"],
      position: { x: 644, y: 240 },
    },
    {
      id: "tsk_prompt",
      name: "final_advertisement_prompt",
      title: "Final Advertisement Prompt",
      description:
        "Create ONE comprehensive, image-model-optimised prompt for a 1960s Mad Men-style advertising poster featuring {client_name}. The prompt should be for the advertisement poster itself — not boardroom scenes or office depictions.",
      expectedOutput:
        "A single production-ready image prompt, plus a one-line note on the creative rationale.",
      agent: "agt_peggy",
      context: ["tsk_visual"],
      position: { x: 574, y: 470 },
    },
  ],
};

export const agentById = (spec: CrewSpec, id: string) => spec.agents.find((a) => a.id === id);
export const taskById = (spec: CrewSpec, id: string) => spec.tasks.find((t) => t.id === id);

/** Warnings surfaced by the canvas pill — PRD FR-4.7. */
export function validate(spec: CrewSpec) {
  const out: { id: string; nodeId: string; text: string }[] = [];
  for (const a of spec.agents) {
    const assigned = spec.tasks.filter((t) => t.agent === a.id);
    if (a.tools.length === 0 && assigned.length > 0) {
      out.push({
        id: `tools-${a.id}`,
        nodeId: a.id,
        text: `${a.name} has no tools but is assigned ${assigned.length} task${assigned.length > 1 ? "s" : ""}.`,
      });
    }
  }
  for (const t of spec.tasks) {
    if (!agentById(spec, t.agent)) {
      out.push({ id: `agent-${t.id}`, nodeId: t.id, text: `${t.title} has no agent assigned.` });
    }
  }
  if (spec.process === "hierarchical") {
    out.push({ id: "manager", nodeId: "manager", text: "Crew Manager has no model selected." });
  }
  return out;
}
