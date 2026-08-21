"use client";

import { PageShell } from "@/components/Chrome";
import * as I from "@/components/Icons";

const STATS = [
  { label: "Active Crews", value: "3" },
  { label: "All Time Executions", value: "82" },
  { label: "Executions This Month", value: "14" },
  { label: "Sandbox minutes", value: "412", accent: true },
  { label: "Est. compute cost", value: "$6.41", accent: true },
];

const BARS = [
  { label: "Mad Men Ad Generator", value: 46 },
  { label: "Weather Digest Daily", value: 24 },
  { label: "Issue Triage", value: 12 },
];

const MINUTES = [18, 26, 21, 38, 44, 31, 52, 47, 63, 58, 71, 66];

export default function UsagePage() {
  const max = Math.max(...BARS.map((b) => b.value));
  return (
    <PageShell
      breadcrumb="Usage"
      title="Usage Dashboard"
      subtitle="Monitor your organization's usage and resource allocation"
      icon={I.Chart}
      actions={
        <>
          <span className="chip" style={{ height: 34 }}>
            Weekly <I.ChevronDown size={11} />
          </span>
          <span className="chip" style={{ height: 34 }}>
            Current Month <I.ChevronDown size={11} />
          </span>
        </>
      }
    >
      <div style={{ display: "flex", gap: 22, borderBottom: "1px solid var(--line)", marginBottom: 20 }}>
        {["Insights", "Deployments", "Limits"].map((t, i) => (
          <span
            key={t}
            className="sora"
            style={{
              fontSize: 13,
              fontWeight: 600,
              padding: "0 2px 10px",
              color: i === 0 ? "var(--accent-ink)" : "var(--muted)",
              borderBottom: i === 0 ? "2px solid var(--accent)" : "2px solid transparent",
            }}
          >
            {t}
          </span>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12 }}>
        {STATS.map((s) => (
          <div key={s.label} className="card" style={{ padding: "14px 16px" }}>
            <div
              className="sora"
              style={{ fontSize: 22, fontWeight: 700, color: s.accent ? "var(--accent-ink)" : undefined }}
            >
              {s.value}
            </div>
            <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 2 }}>{s.label}</div>
          </div>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 12, marginTop: 12 }}>
        <div className="card" style={{ padding: "16px 18px" }}>
          <div className="sora" style={{ fontSize: 14, fontWeight: 600 }}>
            Executions by deployment
          </div>
          <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 2 }}>
            How many times each crew was executed
          </div>
          <div style={{ marginTop: 18, display: "flex", flexDirection: "column", gap: 14 }}>
            {BARS.map((b) => (
              <div key={b.label}>
                <div style={{ display: "flex", fontSize: 12, marginBottom: 6 }}>
                  <span style={{ flex: 1 }}>{b.label}</span>
                  <span className="mono" style={{ color: "var(--muted)" }}>
                    {b.value}
                  </span>
                </div>
                <div style={{ height: 8, background: "var(--surface-2)", borderRadius: 999 }}>
                  <div
                    style={{
                      width: `${(b.value / max) * 100}%`,
                      height: "100%",
                      background: "var(--accent)",
                      borderRadius: 999,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="card" style={{ padding: "16px 18px" }}>
          <div className="sora" style={{ fontSize: 14, fontWeight: 600 }}>
            Sandbox minutes
          </div>
          <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 2 }}>
            Metered compute — the only thing a run actually costs
          </div>
          <svg viewBox="0 0 320 120" style={{ width: "100%", height: 140, marginTop: 14 }} role="img" aria-label="Sandbox minutes over the last twelve weeks">
            <polyline
              points={MINUTES.map((v, i) => `${(i * 320) / (MINUTES.length - 1)},${110 - v}`).join(" ")}
              fill="none"
              stroke="var(--accent)"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <polyline
              points={`0,110 ${MINUTES.map((v, i) => `${(i * 320) / (MINUTES.length - 1)},${110 - v}`).join(" ")} 320,110`}
              fill="var(--accent-soft)"
              stroke="none"
            />
            <circle cx="320" cy={110 - MINUTES[MINUTES.length - 1]} r="3.5" fill="var(--accent)" />
          </svg>
        </div>
      </div>

      <div className="card" style={{ padding: "16px 18px", marginTop: 12 }}>
        <div className="eyebrow">Limits</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 16, marginTop: 12 }}>
          {[
            { k: "Max concurrent sandboxes", v: "8" },
            { k: "Max run duration", v: "30 min" },
            { k: "Default sandbox size", v: "2 vCPU · 4096 MB" },
            { k: "Monthly compute cap", v: "$50.00" },
          ].map((l) => (
            <div key={l.k}>
              <div style={{ fontSize: 12, color: "var(--muted)" }}>{l.k}</div>
              <div className="sora" style={{ fontSize: 14, fontWeight: 600, marginTop: 3 }}>
                {l.v}
              </div>
            </div>
          ))}
        </div>
      </div>
    </PageShell>
  );
}
