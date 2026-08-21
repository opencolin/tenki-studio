"use client";

import { useState } from "react";
import { PageShell } from "@/components/Chrome";
import * as I from "@/components/Icons";
import { PROVIDERS } from "@/lib/providers";
import { TOOLS } from "@/lib/crew";

const SCOPES = ["All", "Project", "Organization", "LLM connection", "Missing"] as const;

const GROUPS = [
  ...PROVIDERS.map((p) => ({
    label: p.name,
    scope: "LLM connection" as const,
    vars: [p.env],
  })),
  ...Object.entries(TOOLS)
    .filter(([, t]) => t.env)
    .map(([, t]) => ({ label: t.label, scope: "Organization" as const, vars: [t.env!] })),
];

export default function EnvironmentPage() {
  const [scope, setScope] = useState<(typeof SCOPES)[number]>("All");
  const counts: Record<string, number> = {
    All: GROUPS.reduce((n, g) => n + g.vars.length, 0),
    Project: 0,
    Organization: GROUPS.filter((g) => g.scope === "Organization").reduce((n, g) => n + g.vars.length, 0),
    "LLM connection": GROUPS.filter((g) => g.scope === "LLM connection").reduce((n, g) => n + g.vars.length, 0),
    Missing: 0,
  };
  const groups = GROUPS.filter((g) => scope === "All" || g.scope === scope);

  return (
    <PageShell
      breadcrumb="Environment Variables"
      title="Environment Variables"
      subtitle="Values are write-only and masked everywhere they could surface — logs, traces, and agent output."
      icon={I.Key}
      actions={
        <button className="btn pri lg">
          <I.Plus size={13} />
          Add variable
        </button>
      }
    >
      <div className="card" style={{ padding: "16px 18px" }}>
        <div className="field">
          <I.Search size={13} style={{ color: "var(--muted)", flex: "none" }} />
          <input placeholder="Search variables…" />
        </div>

        <div style={{ display: "flex", gap: 6, marginTop: 12, flexWrap: "wrap" }}>
          {SCOPES.map((s) => (
            <button
              key={s}
              onClick={() => setScope(s)}
              className={`seg${scope === s ? " on" : ""}`}
              style={{ borderRadius: 999, gap: 6 }}
            >
              {s}
              <span
                style={{
                  fontSize: 10.5,
                  background: scope === s ? "var(--surface)" : "var(--surface-2)",
                  color: scope === s ? "var(--accent-ink)" : "var(--muted)",
                  borderRadius: 999,
                  padding: "1px 6px",
                }}
              >
                {counts[s]}
              </span>
            </button>
          ))}
        </div>

        {groups.length === 0 && (
          <p style={{ fontSize: 12.5, color: "var(--muted)", marginTop: 18 }}>
            Nothing in this scope. Variables referenced by a crew but never set appear under Missing and block a
            run until they are filled in.
          </p>
        )}

        {groups.map((g) => (
          <div
            key={g.label}
            style={{ border: "1px solid var(--line)", borderRadius: 10, padding: "14px 16px", marginTop: 12 }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span className="sora" style={{ fontSize: 13, fontWeight: 600 }}>
                {g.label}
              </span>
              <span className="chip" style={{ height: 19, fontSize: 10.5 }}>
                {g.scope}
              </span>
              <I.CheckCircle size={15} style={{ marginLeft: "auto", color: "var(--ok-ink)" }} />
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "260px minmax(0,1fr)", gap: 10, marginTop: 11 }}>
              {g.vars.map((v) => (
                <div key={v} style={{ display: "contents" }}>
                  <div className="field mono" style={{ height: 34, fontSize: 11.5, background: "var(--page)" }}>
                    {v}
                  </div>
                  <div className="field mono" style={{ height: 34, fontSize: 11.5, color: "var(--muted)" }}>
                    Value is set — override if needed
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </PageShell>
  );
}
