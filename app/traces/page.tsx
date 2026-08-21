"use client";

import Link from "next/link";
import { PageShell } from "@/components/Chrome";
import * as I from "@/components/Icons";

const ROWS = [
  { param: "Tenki.cloud", status: "Completed", events: 37, time: "21.4s", age: "4 min ago" },
  { param: "Vapi", status: "Completed", events: 98, time: "278.7s", age: "3 months ago" },
  { param: "Nebius", status: "Completed", events: 88, time: "206.1s", age: "3 months ago" },
  { param: "Ask Dolorez", status: "Completed", events: 90, time: "233.6s", age: "3 months ago" },
  { param: "justiguide.com", status: "Completed", events: 106, time: "405.8s", age: "3 months ago" },
  { param: null, status: "Running", events: 0, time: "96.8s", age: "3 months ago" },
  { param: "Sidecar.network", status: "Completed", events: 106, time: "360.5s", age: "3 months ago" },
  { param: "Heinz Ketchup", status: "Completed", events: 70, time: "169.6s", age: "3 months ago" },
];

export default function TracesPage() {
  return (
    <PageShell
      breadcrumb="Traces"
      title="Traces"
      subtitle="Monitor and analyze your execution traces"
      icon={I.Waves}
    >
      <div className="card" style={{ overflow: "hidden" }}>
        <div style={{ padding: "14px 16px", borderBottom: "1px solid var(--line)" }}>
          <div className="field">
            <I.Search size={13} style={{ color: "var(--muted)", flex: "none" }} />
            <input placeholder="Search by automation name, automation ID, or execution ID" />
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 11, fontSize: 12, color: "var(--muted)" }}>
            Filter by:
            <span className="chip" style={{ height: 26 }}>
              Status: All <I.ChevronDown size={11} />
            </span>
            <span className="chip" style={{ height: 26 }}>
              Type: All <I.ChevronDown size={11} />
            </span>
          </div>
        </div>

        <div style={{ overflowX: "auto" }}>
          <table className="table">
            <thead>
              <tr>
                <th style={{ width: "26%" }}>Automation</th>
                <th style={{ width: "26%" }}>Parameters</th>
                <th>Status &amp; Activity</th>
                <th>Timing</th>
                <th style={{ textAlign: "right" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {ROWS.map((r, i) => (
                <tr key={i}>
                  <td className="sora" style={{ fontWeight: 600, whiteSpace: "nowrap" }}>
                    Mad Men Ad Generator
                  </td>
                  <td>
                    {r.param ? (
                      <span className="chip">
                        <span className="mono" style={{ fontSize: 10.5 }}>
                          client_name
                        </span>
                        <span style={{ color: "var(--ink)" }}>{r.param}</span>
                      </span>
                    ) : (
                      <span style={{ fontSize: 12, color: "var(--muted)", fontStyle: "italic" }}>No inputs</span>
                    )}
                  </td>
                  <td>
                    <span className={`badge ${r.status === "Running" ? "running" : "ok"}`}>
                      <span className="dot" />
                      {r.status}
                    </span>
                    <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 5 }}>{r.events} events</div>
                  </td>
                  <td>
                    <div className="mono" style={{ fontSize: 12 }}>
                      {r.time}
                    </div>
                    <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 3 }}>{r.age}</div>
                  </td>
                  <td style={{ textAlign: "right" }}>
                    <Link href="/studio" className="btn ink" style={{ height: 29, fontSize: 12 }}>
                      View Execution
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </PageShell>
  );
}
