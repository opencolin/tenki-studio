"use client";

import { PageShell } from "@/components/Chrome";
import * as I from "@/components/Icons";

const ROWS = [
  {
    name: "Dabl Anthropic",
    provider: "Anthropic",
    models: "claude-fable-5, claude-opus-5, claude-sonnet-5, claude-haiku-4-5",
    env: "ANTHROPIC_API_KEY",
  },
  {
    name: "Colin's OpenAI",
    provider: "OpenAI",
    models: "gpt-5.2-chat-latest, gpt-5.2-pro, gpt-4o, gpt-4o-mini",
    env: "OPENAI_API_KEY",
  },
  {
    name: "Gemini (shared)",
    provider: "Gemini",
    models: "gemini-3-pro-preview, gemini-2.5-pro, gemini-2.5-flash",
    env: "GEMINI_API_KEY",
  },
  {
    name: "Nebius Token Factory",
    provider: "Nebius",
    models: "deepseek-ai/DeepSeek-V3, Qwen/Qwen3-235B-A22B, meta-llama/Llama-3.3-70B-Instruct, +60 open models",
    env: "NEBIUS_API_KEY",
    base: "https://api.tokenfactory.nebius.com",
  },
  {
    name: "AIsa",
    provider: "AIsa",
    models: "110+ models routed through one key — openai/*, anthropic/*, gemini/*",
    env: "AISA_API_KEY",
    base: "https://aisa.one",
  },
];

export default function ConnectionsPage() {
  return (
    <PageShell
      breadcrumb="LLM Connections"
      title="LLM Connections"
      subtitle="Manage your language model API connections"
      icon={I.Link}
      actions={
        <>
          <button className="btn gho lg">
            <I.Refresh size={13} />
            Refresh
          </button>
          <button className="btn pri lg">
            <I.Plus size={13} />
            Add Connection
          </button>
        </>
      }
    >
      <div className="card" style={{ overflow: "hidden" }}>
        <div style={{ padding: "14px 16px", borderBottom: "1px solid var(--line)" }}>
          <div className="field" style={{ maxWidth: 420 }}>
            <I.Search size={13} style={{ color: "var(--muted)", flex: "none" }} />
            <input placeholder="Search by name or provider…" />
          </div>
        </div>
        <div style={{ overflowX: "auto" }}>
          <table className="table">
            <thead>
              <tr>
                <th style={{ width: "22%" }}>Name</th>
                <th style={{ width: "14%" }}>Provider</th>
                <th>Available Models</th>
                <th style={{ width: "18%" }}>Credential</th>
                <th style={{ textAlign: "right", width: "8%" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {ROWS.map((r) => (
                <tr key={r.name}>
                  <td className="sora" style={{ fontWeight: 600 }}>
                    {r.name}
                  </td>
                  <td>
                    <span className="chip">{r.provider}</span>
                  </td>
                  <td className="mono" style={{ fontSize: 11, color: "var(--muted)" }}>
                    {r.models}
                  </td>
                  <td>
                    <span className="mono" style={{ fontSize: 11 }}>
                      {r.env}
                    </span>
                    {r.base && (
                      <div className="mono" style={{ fontSize: 10.5, color: "var(--muted)", marginTop: 3 }}>
                        {r.base}
                      </div>
                    )}
                  </td>
                  <td style={{ textAlign: "right", color: "var(--muted)" }}>
                    <I.Dots size={16} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <p style={{ fontSize: 12.5, color: "var(--muted)", marginTop: 14, lineHeight: 1.6, maxWidth: 640 }}>
        Keys are encrypted at rest and injected into the run sandbox as environment variables — they are never
        sent to the browser, committed to the repo, or pasted into Studio Chat. Models from every connection
        populate the agent and manager pickers on the canvas. Nebius Token Factory and AIsa are both
        OpenAI-compatible, so they need a base URL alongside the key.
      </p>
    </PageShell>
  );
}
