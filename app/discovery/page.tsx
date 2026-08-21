"use client";

import Link from "next/link";
import { useState } from "react";
import { PageShell } from "@/components/Chrome";
import * as I from "@/components/Icons";

const STACK = [
  "Airtable", "Asana", "BambooHR", "BigQuery", "Box", "ClickUp", "Confluence", "Databricks",
  "Datadog", "DocuSign", "Dropbox", "Freshdesk", "GitHub", "GitLab", "Google Workspace",
  "Greenhouse", "HubSpot", "Intercom", "Internal APIs", "Jira", "Linear", "Notion",
  "Salesforce", "Slack", "Snowflake", "Stripe", "Zendesk",
];

export default function DiscoveryPage() {
  const [picked, setPicked] = useState<string[]>([]);
  const [query, setQuery] = useState("");
  const shown = STACK.filter((s) => s.toLowerCase().includes(query.toLowerCase()));

  return (
    <PageShell
      breadcrumb="Discovery / New session"
      title="Discovery Engine"
      subtitle="Answer a few questions about your business and we'll map out the agentic systems worth building."
      icon={I.Bolt}
      actions={
        <span className="chip" style={{ height: 34 }}>
          Beta
        </span>
      }
    >
      <div className="card" style={{ padding: "22px 24px" }}>
        <div className="eyebrow">Step 1 of 2</div>
        <h2 className="sora" style={{ fontSize: 18, fontWeight: 600, margin: "8px 0 4px" }}>
          Which tools does your company use?
        </h2>
        <p style={{ fontSize: 12.5, color: "var(--muted)", margin: 0 }}>
          Knowing your stack helps us suggest automations that fit your workflow — and surface ones you
          haven&apos;t considered.
        </p>

        <div className="field" style={{ marginTop: 16 }}>
          <I.Search size={13} style={{ color: "var(--muted)", flex: "none" }} />
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search tools" />
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
            gap: 10,
            marginTop: 14,
          }}
        >
          {shown.map((s) => {
            const on = picked.includes(s);
            return (
              <button
                key={s}
                onClick={() => setPicked((p) => (on ? p.filter((x) => x !== s) : [...p, s]))}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  padding: "11px 13px",
                  borderRadius: 10,
                  border: `1px solid ${on ? "var(--accent)" : "var(--line)"}`,
                  background: on ? "var(--accent-soft)" : "var(--surface)",
                  textAlign: "left",
                }}
                aria-pressed={on}
              >
                <span
                  style={{
                    width: 26,
                    height: 26,
                    borderRadius: 7,
                    background: "var(--surface-2)",
                    color: "var(--muted)",
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flex: "none",
                    fontSize: 11,
                    fontWeight: 600,
                  }}
                  className="sora"
                >
                  {s.slice(0, 1)}
                </span>
                <span className="sora" style={{ fontSize: 12.5, fontWeight: 600, flex: 1 }}>
                  {s}
                </span>
                <span
                  style={{
                    width: 16,
                    height: 16,
                    borderRadius: 5,
                    border: `1px solid ${on ? "var(--accent)" : "var(--line)"}`,
                    background: on ? "var(--accent)" : "transparent",
                    color: "var(--on-accent)",
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flex: "none",
                  }}
                >
                  {on && <I.Check size={10} />}
                </span>
              </button>
            );
          })}
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 20 }}>
          <span style={{ fontSize: 12.5, color: "var(--muted)" }}>
            {picked.length} selected
          </span>
          <Link href="/studio" className="btn pri lg" style={{ marginLeft: "auto" }}>
            Continue
            <I.ChevronRight size={13} />
          </Link>
        </div>
      </div>
    </PageShell>
  );
}
