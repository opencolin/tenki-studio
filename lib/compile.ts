/**
 * Graph → crew.json.
 *
 * The stored FBP graph is framework-neutral; CrewAI needs agents, tasks and
 * their wiring in its own shape. This is the compiler PRD 002 §4 calls for,
 * written for the first target only — the abstraction over three frameworks
 * gets extracted in phase 3, from working code rather than guessed.
 *
 * The output is consumed verbatim by `runner/tenki_runner.py` inside the
 * sandbox, so this file and that one are a contract: change one, change both.
 */

import type { CrewView } from "./crew";
import { TOOLS } from "./crew";
import { providerForModel } from "./providers";

export interface CompiledAgent {
  id: string;
  role: string;
  goal: string;
  backstory: string;
  /** LiteLLM model string, already provider-qualified. */
  model: string;
  /** Base URL for OpenAI-compatible providers; absent for first-party ones. */
  base_url?: string;
  /** Env var holding this agent's credential. Resolved inside the sandbox. */
  api_key_env: string;
  tools: string[];
}

export interface CompiledTask {
  id: string;
  description: string;
  expected_output: string;
  agent: string;
  context: string[];
}

export interface CompiledCrew {
  name: string;
  process: "sequential" | "hierarchical";
  inputs: string[];
  agents: CompiledAgent[];
  tasks: CompiledTask[];
  /** Every credential this crew needs, so the runner can fail fast and clearly. */
  required_env: string[];
  tools: Record<string, { label: string; env?: string }>;
}

/**
 * LiteLLM addresses OpenAI-compatible endpoints as `openai/<model>` plus a base
 * URL. Our ids carry a provider prefix (`nebius/…`, `aisa/…`) that identifies
 * the connection, not the wire protocol — strip it and let base_url do the work.
 */
function liteLLMModel(model: string, providerId: string | undefined): string {
  if (!providerId) return model;
  if (providerId === "nebius" || providerId === "aisa") {
    const bare = model.split("/").slice(1).join("/");
    return `openai/${bare}`;
  }
  if (providerId === "anthropic") return `anthropic/${model}`;
  if (providerId === "gemini") return `gemini/${model}`;
  return `openai/${model}`;
}

export function compileCrew(crew: CrewView): CompiledCrew {
  const required = new Set<string>();

  const agents: CompiledAgent[] = crew.agents.map((a) => {
    const provider = providerForModel(a.model);
    if (provider) required.add(provider.env);
    for (const t of a.tools) {
      const env = TOOLS[t]?.env;
      if (env) required.add(env);
    }
    return {
      id: a.id,
      role: a.role || a.name,
      goal: a.goal,
      backstory: a.backstory,
      model: liteLLMModel(a.model, provider?.id),
      base_url: provider?.baseUrl,
      api_key_env: provider?.env ?? "OPENAI_API_KEY",
      tools: a.tools,
    };
  });

  return {
    name: crew.name,
    process: crew.process,
    inputs: crew.inputs,
    agents,
    tasks: crew.tasks.map((t) => ({
      id: t.id,
      description: t.description,
      expected_output: t.expectedOutput,
      agent: t.agent,
      context: t.context,
    })),
    required_env: [...required],
    tools: Object.fromEntries(Object.entries(TOOLS).map(([k, v]) => [k, { label: v.label, env: v.env }])),
  };
}
