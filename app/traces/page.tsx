"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { PageShell } from "@/components/Chrome";
import * as I from "@/components/Icons";
import { fmt } from "@/lib/run";
import { listRuns, orchestratorBase, type RunSummary } from "@/lib/stream";

const ago = (at: number | null) => {
  if (at === null) return "—";
  const s = Math.max(0, Math.round((Date.now() - at) / 1000));
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.round(s / 60)} min ago`;
  if (s < 86400) return `${Math.round(s / 3600)}h ago`;
  return `${Math.round(s / 86400)}d ago`;
};

export default function TracesPage() {
  // The orchestrator's event log is the only record of a run, so this page
  // shows exactly the runs that happened — and nothing when none have.
  const [runs, setRuns] = useState<RunSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");

  useEffect(() => {
    let live = true;
    listRuns(orchestratorBase())
      .then((r) => live && setRuns(r))
      .catch((e) => live && setError(e instanceof Error ? e.message : "Could not reach the orchestrator."));
    return () => {
      live = false;
    };
  }, []);

  const base = orchestratorBase();
  const shown = (runs ?? []).filter((r) =>
    query.trim()
      ? (r.runId + " " + Object.values(r.inputs).join(" ")).toLowerCase().includes(query.toLowerCase())
      : true,
  );

  return (
    <PageShell
      breadcrumb="Traces"
      title="Traces"
      subtitle="Every run the orchestrator has recorded"
      icon={I.Waves}
    >
      <div className="card" style={{ overflow: "hidden" }}>
        <div style={{ padding: "14px 16px", borderBottom: "1px solid var(--line)" }}>
          <div className="field">
            <I.Search size={13} style={{ color: "var(--muted)", flex: "none" }} />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by run ID or input value"
            />
          </div>
        </div>

        {error ? (
          <Empty
            title="Can't reach the orchestrator"
            body={`${error} Runs are recorded inside the sandbox; if it is paused or reaped there is nothing to read.`}
          />
        ) : runs === null ? (
          <Empty title="Loading runs…" body="Reading the event log from the sandbox." />
        ) : shown.length === 0 ? (
          <Empty
            title={runs.length === 0 ? "No runs yet" : "No runs match that search"}
            body={
              runs.length === 0
                ? "Open the Studio and hit Run. Each execution appears here with its real event count and duration."
                : "Try a different run ID or input value."
            }
          />
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table className="table">
              <thead>
                <tr>
                  <th style={{ width: "22%" }}>Run</th>
                  <th style={{ width: "28%" }}>Inputs</th>
                  <th>Status &amp; Activity</th>
                  <th>Timing</th>
                  <th style={{ textAlign: "right" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {shown.map((r) => (
                  <tr key={r.runId}>
                    <td className="mono" style={{ fontSize: 12, whiteSpace: "nowrap" }}>
                      {r.runId}
                    </td>
                    <td>
                      {Object.keys(r.inputs).length > 0 ? (
                        <span style={{ display: "inline-flex", gap: 6, flexWrap: "wrap" }}>
                          {Object.entries(r.inputs).map(([k, v]) => (
                            <span className="chip" key={k}>
                              <span className="mono" style={{ fontSize: 10.5 }}>
                                {k}
                              </span>
                              <span style={{ color: "var(--ink)" }}>{String(v)}</span>
                            </span>
                          ))}
                        </span>
                      ) : (
                        <span style={{ fontSize: 12, color: "var(--muted)", fontStyle: "italic" }}>
                          No inputs
                        </span>
                      )}
                    </td>
                    <td>
                      <span
                        className={`badge ${
                          r.status === "running" ? "running" : r.status === "completed" ? "ok" : "failed"
                        }`}
                      >
                        <span className="dot" />
                        {r.status[0].toUpperCase() + r.status.slice(1)}
                      </span>
                      <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 5 }}>
                        {r.events} event{r.events === 1 ? "" : "s"}
                      </div>
                    </td>
                    <td>
                      <div className="mono" style={{ fontSize: 12 }}>
                        {r.durationMs === null ? "—" : fmt(r.durationMs)}
                      </div>
                      <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 3 }}>
                        {ago(r.startedAt)}
                      </div>
                    </td>
                    <td style={{ textAlign: "right" }}>
                      <Link
                        href={`/studio/?stream=${encodeURIComponent(base)}&run=${encodeURIComponent(r.runId)}`}
                        className="btn ink"
                        style={{ height: 29, fontSize: 12 }}
                      >
                        View Execution
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {runs !== null && shown.length > 0 && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              padding: "13px 16px",
              fontSize: 12,
              color: "var(--muted)",
              borderTop: "1px solid var(--line)",
            }}
          >
            Viewing 1–{shown.length} of {shown.length}
          </div>
        )}
      </div>
    </PageShell>
  );
}

function Empty({ title, body }: { title: string; body: string }) {
  return (
    <div style={{ padding: "48px 24px", textAlign: "center" }}>
      <div className="sora" style={{ fontSize: 14.5, fontWeight: 600 }}>
        {title}
      </div>
      <p
        style={{
          fontSize: 12.5,
          color: "var(--muted)",
          lineHeight: 1.55,
          margin: "7px auto 0",
          maxWidth: 400,
        }}
      >
        {body}
      </p>
    </div>
  );
}
