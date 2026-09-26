/**
 * Model providers.
 *
 * One registry, three consumers: the LLM Connections screen renders it, the
 * node inspector's model picker reads it, and the Environment Variables screen
 * derives its credential groups from it. When the compiler lands (PRD 002 §4,
 * phase 3) it resolves a model id to a base URL and an env var from here too —
 * which is why this is data rather than markup inside a page.
 */

export interface Provider {
  id: string;
  /** Connection name as the user sees it. */
  name: string;
  /** Vendor label. */
  vendor: string;
  /** Credential this provider needs in the sandbox. */
  env: string;
  /** Set for OpenAI-compatible endpoints that need an explicit base URL. */
  baseUrl?: string;
  /** Model ids exactly as they are stored on an agent node. */
  models: string[];
  note?: string;
}

export const PROVIDERS: Provider[] = [
  {
    id: "anthropic",
    name: "Dabl Anthropic",
    vendor: "Anthropic",
    env: "ANTHROPIC_API_KEY",
    models: ["claude-fable-5", "claude-opus-5", "claude-sonnet-5", "claude-haiku-4-5"],
  },
  {
    id: "openai",
    name: "Colin's OpenAI",
    vendor: "OpenAI",
    env: "OPENAI_API_KEY",
    models: ["gpt-5.2-chat-latest", "gpt-5.2-pro", "gpt-4o", "gpt-4o-mini"],
  },
  {
    id: "gemini",
    name: "Gemini (shared)",
    vendor: "Gemini",
    env: "GEMINI_API_KEY",
    models: ["gemini-3-pro-preview", "gemini-2.5-pro", "gemini-2.5-flash"],
  },
  {
    id: "nebius",
    name: "Nebius Token Factory",
    vendor: "Nebius",
    env: "NEBIUS_API_KEY",
    baseUrl: "https://api.tokenfactory.nebius.com/v1",
    note: "OpenAI-compatible · 60+ open models",
    models: [
      "nebius/deepseek-ai/DeepSeek-V3",
      "nebius/Qwen/Qwen3-235B-A22B",
      "nebius/meta-llama/Llama-3.3-70B-Instruct",
    ],
  },
  {
    id: "aisa",
    name: "AIsa",
    vendor: "AIsa",
    env: "AISA_API_KEY",
    // api.aisa.one, not aisa.one — the bare host serves the marketing site and
    // answers /v1/* with an HTML 404, which surfaces as an unintelligible
    // parse error rather than a 404 from the SDK.
    baseUrl: "https://api.aisa.one/v1",
    note: "OpenAI-compatible · 108 models behind one credential",
    // AIsa takes its own flat ids — not `vendor/model`. The single `aisa/`
    // prefix here is ours: the compiler strips it and passes the rest through
    // untouched, so what reaches AIsa is exactly the id from their catalog.
    // Their docs say not to invent ids, so every one of these is copied from
    // https://aisa.one/docs/guides/models.
    models: [
      "aisa/qwen3.8-max",
      "aisa/qwen3.7-max",
      "aisa/qwen3-max",
      "aisa/qwen3.7-flash",
      "aisa/qwen3-coder-plus",
      "aisa/qwen-flash",
    ],
  },
];

/** Every model id, in provider order — what the inspector's picker offers. */
export const MODELS = PROVIDERS.flatMap((p) => p.models);

export const providerById = (id: string) => PROVIDERS.find((p) => p.id === id);

/** Which provider serves a model id, so a crew can declare the credentials it needs. */
export const providerForModel = (model: string) => PROVIDERS.find((p) => p.models.includes(model));

/** Short label for a model id: the trailing segment is enough on a node chip. */
export const shortModel = (model: string) => model.split("/").slice(-1)[0];
