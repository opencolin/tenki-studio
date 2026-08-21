"use client";

import { PageShell } from "@/components/Chrome";
import * as I from "@/components/Icons";

const ROWS = [
  {
    name: "Dabl Anthropic",
    provider: "Anthropic",
    models: "claude-fable-5, claude-opus-5, claude-sonnet-5, claude-haiku-4-5",
  },
  { name: "Colin's OpenAI", provider: "OpenAI", models: "gpt-5.2-chat-latest, gpt-5.2-pro, gpt-4o, gpt-4o-mini" },
  {
    name: "Gemini (shared)",
    provider: "Gemini",
    models: "gemini-3-pro-preview, gemini-2.5-pro, gemini-2.5-flash",
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
        sent to the browser. Models from every connection populate the agent and manager pickers on the canvas.
      </p>
    </PageShell>
  );
}
