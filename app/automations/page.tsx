"use client";

import Link from "next/link";
import { PageShell } from "@/components/Chrome";
import * as I from "@/components/Icons";

const ROWS = [
  {
    crew: "Mad Men Ad Generator",
    owner: "Colin Lowenberg",
    status: "Online" as const,
    url: "https://api.tenki.app/a/mad-men-67f228fc",
    version: "v9",
  },
  {
    crew: "Weather Digest Daily",
    owner: "Colin Lowenberg",
    status: "Offline" as const,
    url: "https://api.tenki.app/a/weather-digest-1a09e2",
    version: "v3",
  },
];

export default function AutomationsPage() {
  return (
    <PageShell
      breadcrumb="Automations"
      title="Automations Live"
      subtitle="Manage and monitor your active crew automations from this dashboard."
      icon={I.Stack}
      actions={
        <div className="card" style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 16px" }}>
          <span
            style={{
              width: 34,
              height: 34,
              borderRadius: 9,
              background: "var(--accent-soft)",
              color: "var(--accent-ink)",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <I.Code size={16} />
          </span>
          <div>
            <div className="sora" style={{ fontSize: 13, fontWeight: 600 }}>
              Deploy from Code
            </div>
            <div style={{ fontSize: 11.5, color: "var(--muted)" }}>
              GitHub OAuth, any Git provider, or upload a ZIP
            </div>
          </div>
          <I.ChevronRight size={14} style={{ color: "var(--muted)" }} />
        </div>
      }
    >
      <div className="card" style={{ overflow: "hidden" }}>
        <div style={{ padding: "14px 16px", borderBottom: "1px solid var(--line)" }}>
          <div className="field">
            <I.Search size={13} style={{ color: "var(--muted)", flex: "none" }} />
            <input placeholder="Search by automation name" />
          </div>
          <div
            style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 11, fontSize: 12, color: "var(--muted)", flexWrap: "wrap" }}
          >
            Filter by:
            {["Status: All", "Source: All", "Tag: All", "Owner: All"].map((f) => (
              <span key={f} className="chip" style={{ height: 26 }}>
                {f}
                <I.ChevronDown size={11} />
              </span>
            ))}
          </div>
        </div>

        <div style={{ overflowX: "auto" }}>
          <table className="table">
            <thead>
              <tr>
                <th style={{ width: "30%" }}>Crew</th>
                <th style={{ width: "15%" }}>Owner</th>
                <th style={{ width: "12%" }}>Status</th>
                <th>URL</th>
                <th style={{ textAlign: "right" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {ROWS.map((r) => (
                <tr key={r.crew}>
                  <td>
                    <div className="sora" style={{ fontWeight: 600, fontSize: 13.5 }}>
                      {r.crew}
                    </div>
                    <span className="chip" style={{ height: 19, fontSize: 10.5, marginTop: 6 }}>
                      <I.Pencil size={10} />
                      Studio · {r.version}
                    </span>
                  </td>
                  <td style={{ whiteSpace: "nowrap" }}>{r.owner}</td>
                  <td>
                    <span className={`badge ${r.status === "Online" ? "ok" : "idle"}`}>
                      <span className="dot" />
                      {r.status}
                    </span>
                  </td>
                  <td>
                    <span className="mono" style={{ fontSize: 11, color: "var(--muted)" }}>
                      {r.url}
                    </span>
                  </td>
                  <td style={{ textAlign: "right", whiteSpace: "nowrap" }}>
                    <button className="btn gho" style={{ height: 29, fontSize: 12 }}>
                      Options
                      <I.ChevronDown size={11} />
                    </button>
                    <button className="btn danger" style={{ height: 29, fontSize: 12, marginLeft: 6 }}>
                      <I.Trash size={12} />
                      Delete
                    </button>
                    <Link href="/studio" className="btn gho" style={{ height: 29, fontSize: 12, marginLeft: 6 }}>
                      <I.Pencil size={12} />
                      Edit in Studio
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div style={{ display: "flex", alignItems: "center", padding: "13px 16px", fontSize: 12, color: "var(--muted)" }}>
          Viewing 1–{ROWS.length} of {ROWS.length}
          <span style={{ marginLeft: "auto" }}>Page 1 of 1</span>
        </div>
      </div>

      <div className="card" style={{ marginTop: 16, padding: "16px 18px" }}>
        <div className="eyebrow">Kickoff API</div>
        <p style={{ fontSize: 12.5, color: "var(--muted)", margin: "8px 0 10px", lineHeight: 1.55 }}>
          Every deployed automation gets an API key and two endpoints. A kickoff creates a sandbox, runs the
          crew inside it, and streams events back.
        </p>
        <pre
          className="dblock mono"
          style={{ margin: 0, whiteSpace: "pre", overflowX: "auto" }}
        >{`curl -X POST https://api.tenki.app/a/mad-men-67f228fc/kickoff \\
  -H "Authorization: Bearer $TENKI_STUDIO_KEY" \\
  -d '{"inputs": {"client_name": "Heinz Ketchup"}}'

# → 202 {"run_id": "run_7f2a"}
# GET /a/mad-men-67f228fc/runs/run_7f2a        status + result
# GET /a/mad-men-67f228fc/runs/run_7f2a/events SSE trace`}</pre>
      </div>
    </PageShell>
  );
}
