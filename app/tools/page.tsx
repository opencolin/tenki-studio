"use client";

import { useState } from "react";
import { PageShell } from "@/components/Chrome";
import * as I from "@/components/Icons";
import { TOOLS } from "@/lib/crew";

const CONNECTIONS = [
  { app: "Serper", type: "Built-in", status: "Connected", by: "Tenki Studio" },
  { app: "Google Calendar", type: "Agent App", status: "Connected", by: "Google Calendar" },
  { app: "Databricks", type: "MCP", status: "Available", by: "Databricks" },
  { app: "Snowflake", type: "MCP", status: "Available", by: "Snowflake" },
];

const INTEGRATIONS = [
  { name: "Slack", blurb: "Kick off crews from a channel with a slash command.", state: "Connected" },
  { name: "Zapier", blurb: "Trigger crews from thousands of apps.", state: "Open" },
  { name: "HubSpot", blurb: "Run automations on CRM events.", state: "Connect" },
  { name: "Salesforce", blurb: "Trigger crews from Salesforce records.", state: "Connect" },
];

export default function ToolsPage() {
  const [tab, setTab] = useState<"connections" | "internal" | "integrations">("connections");

  return (
    <PageShell
      breadcrumb="Tools &amp; Integrations"
      title="Tools & Integrations"
      subtitle="Manage apps, internal tools, and integrations for your agents"
      icon={I.Wrench}
      actions={
        <button className="btn pri lg">
          <I.Plus size={13} />
          Add Connection
        </button>
      }
    >
      <div style={{ display: "flex", gap: 22, borderBottom: "1px solid var(--line)", marginBottom: 18 }}>
        {(
          [
            ["connections", "Connections"],
            ["internal", "Internal Tools"],
            ["integrations", "Integrations"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className="sora"
            style={{
              fontSize: 13,
              fontWeight: 600,
              padding: "0 2px 10px",
              color: tab === id ? "var(--accent-ink)" : "var(--muted)",
              borderBottom: tab === id ? "2px solid var(--accent)" : "2px solid transparent",
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "connections" && (
        <div className="card" style={{ overflow: "hidden" }}>
          <table className="table">
            <thead>
              <tr>
                <th style={{ width: "34%" }}>Application</th>
                <th>Type</th>
                <th>Status</th>
                <th>Created by</th>
                <th style={{ textAlign: "right" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {CONNECTIONS.map((c) => (
                <tr key={c.app}>
                  <td className="sora" style={{ fontWeight: 600 }}>
                    {c.app}
                  </td>
                  <td>
                    <span className="chip">{c.type}</span>
                  </td>
                  <td>
                    <span className={`badge ${c.status === "Connected" ? "ok" : "idle"}`}>
                      <span className="dot" />
                      {c.status}
                    </span>
                  </td>
                  <td style={{ color: "var(--muted)" }}>{c.by}</td>
                  <td style={{ textAlign: "right" }}>
                    <button className="btn gho" style={{ height: 29, fontSize: 12 }}>
                      {c.status === "Connected" ? "Disconnect" : "Connect"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === "internal" && (
        <div className="card" style={{ padding: "18px 20px" }}>
          <div className="eyebrow">Built-in tools</div>
          <p style={{ fontSize: 12.5, color: "var(--muted)", margin: "8px 0 14px", lineHeight: 1.55 }}>
            These ship with every crew. The code interpreter and file tools execute inside the run&apos;s own
            sandbox — the same machine as the crew, so they share a filesystem.
          </p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 12 }}>
            {Object.entries(TOOLS).map(([id, t]) => (
              <div key={id} style={{ border: "1px solid var(--line)", borderRadius: 10, padding: "12px 14px" }}>
                <div className="sora" style={{ fontSize: 13, fontWeight: 600 }}>
                  {t.label}
                </div>
                <div className="mono" style={{ fontSize: 10.5, color: "var(--muted)", marginTop: 4 }}>
                  {id}
                  {t.env ? ` · needs ${t.env}` : " · no credentials"}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === "integrations" && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 12 }}>
          {INTEGRATIONS.map((i) => (
            <div key={i.name} className="card" style={{ padding: "16px 18px" }}>
              <div className="sora" style={{ fontSize: 14, fontWeight: 600 }}>
                {i.name}
              </div>
              <p style={{ fontSize: 12.5, color: "var(--muted)", margin: "6px 0 12px", lineHeight: 1.5 }}>
                {i.blurb}
              </p>
              <button className={i.state === "Connected" ? "btn danger" : "btn gho"} style={{ height: 29, fontSize: 12 }}>
                {i.state === "Connected" ? "Disconnect" : i.state}
              </button>
            </div>
          ))}
        </div>
      )}
    </PageShell>
  );
}
