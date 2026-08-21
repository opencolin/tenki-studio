"use client";

import { useState } from "react";
import type { CrewView } from "@/lib/crew";
import { agentById } from "@/lib/crew";
import { fmt, type RunEvent, type RunState } from "@/lib/run";
import type { Artifact } from "@/lib/artifacts";
import { ArtifactList } from "./Artifacts";
import * as I from "./Icons";

const surface: React.CSSProperties = {
  position: "absolute",
  top: 60,
  left: 12,
  right: 364,
  bottom: 12,
  background: "var(--surface)",
  border: "1px solid var(--line)",
  borderRadius: "var(--r-card)",
  boxShadow: "0 1px 2px rgba(19,36,48,.05)",
  overflow: "hidden",
};

/* ------------------------------- Output ------------------------------- */

export function OutputView({
  spec,
  run,
  artifacts,
}: {
  spec: CrewView;
  run: RunState;
  artifacts: Artifact[];
}) {
  const seen = run.events;
  const done = new Set(seen.filter((e) => e.type === "task_completed").map((e) => e.taskId));
  const started = new Set(seen.filter((e) => e.type === "task_started").map((e) => e.taskId));
  const [open, setOpen] = useState<string | null>(null);

  if (run.status === "idle") {
    return (
      <div style={{ ...surface, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ textAlign: "center", maxWidth: 340 }}>
          <span
            style={{
              width: 44,
              height: 44,
              borderRadius: 12,
              background: "var(--surface-2)",
              color: "var(--muted)",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <I.Play size={16} />
          </span>
          <div className="sora" style={{ fontSize: 15, fontWeight: 600, marginTop: 12 }}>
            No runs yet
          </div>
          <p style={{ fontSize: 12.5, color: "var(--muted)", lineHeight: 1.55, marginTop: 6 }}>
            Hit Run to start the crew. A fresh sandbox boots from this project&apos;s snapshot and the steps
            appear here as they complete.
          </p>
        </div>
      </div>
    );
  }

  const total = spec.tasks.length;
  const pct = run.status === "completed" ? 100 : Math.round((done.size / total) * 100);

  return (
    <div style={{ ...surface, padding: "22px 26px", display: "flex", flexDirection: "column" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 13 }}>
        <span
          style={{
            width: 38,
            height: 38,
            borderRadius: 10,
            border: "1px solid var(--line)",
            color: "var(--muted)",
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            flex: "none",
          }}
        >
          <I.Crew size={17} />
        </span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="sora" style={{ fontSize: 15, fontWeight: 600 }}>
            Run · client_name = &ldquo;{run.inputs.client_name}&rdquo;
          </div>
          <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 1 }}>
            {run.status === "provisioning"
              ? "Creating sandbox from project snapshot…"
              : `${done.size} of ${total} steps complete · ${fmt(run.elapsedMs)} · sandbox booted in 1.2s`}
          </div>
        </div>
        {run.status === "completed" ? (
          <span className="badge ok">
            <span className="dot" />
            Completed
          </span>
        ) : run.status === "stopped" ? (
          <span className="badge idle">
            <span className="dot" />
            Stopped
          </span>
        ) : (
          <span className="badge running">
            <span className="dot" />
            {run.status === "provisioning" ? "Provisioning" : "Running"}
          </span>
        )}
      </div>

      <div
        style={{
          height: 6,
          borderRadius: 999,
          background: "var(--surface-2)",
          marginTop: 14,
          position: "relative",
          overflow: "hidden",
        }}
      >
        <span
          style={{
            position: "absolute",
            inset: "0 auto 0 0",
            width: `${pct}%`,
            borderRadius: 999,
            background: run.status === "completed" ? "var(--ok)" : "var(--run)",
            transition: "width 400ms ease",
          }}
        />
      </div>

      <div className="eyebrow" style={{ marginTop: 24 }}>
        Steps
      </div>

      <div className="scroll" style={{ flex: 1, minHeight: 0, marginTop: 2 }}>
        {spec.tasks.map((task) => {
          const isDone = done.has(task.id);
          const isRunning = !isDone && started.has(task.id);
          const completed = seen.find((e) => e.type === "task_completed" && e.taskId === task.id);
          const agent = agentById(spec, task.agent);
          return (
            <div key={task.id} style={{ borderBottom: "1px solid var(--line)" }}>
              <button
                onClick={() => setOpen(open === task.id ? null : task.id)}
                style={{ display: "flex", alignItems: "center", gap: 12, padding: "13px 4px", width: "100%", textAlign: "left" }}
              >
                <span style={{ flex: "none", display: "inline-flex" }}>
                  {isDone ? (
                    <span
                      style={{
                        width: 20,
                        height: 20,
                        borderRadius: 999,
                        background: "var(--ok-soft)",
                        color: "var(--ok-ink)",
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <I.Check size={11} />
                    </span>
                  ) : isRunning ? (
                    <span className="spinner" style={{ width: 20, height: 20, color: "var(--run)" }} />
                  ) : (
                    <span
                      style={{ width: 20, height: 20, borderRadius: 999, border: "2px solid var(--line)" }}
                    />
                  )}
                </span>
                <span style={{ flex: 1, minWidth: 0 }}>
                  <span
                    className="sora"
                    style={{ fontSize: 13, fontWeight: 600, color: isDone || isRunning ? "var(--ink)" : "var(--muted)", display: "block" }}
                  >
                    {task.title}
                  </span>
                  <span style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 5 }}>
                    <span className="chip" style={{ height: 20, fontSize: 10.5 }}>
                      {agent?.name}
                    </span>
                    {completed?.durationMs && (
                      <span className="mono" style={{ fontSize: 11, color: "var(--muted)" }}>
                        {fmt(completed.durationMs)}
                      </span>
                    )}
                    {isRunning && (
                      <span style={{ fontSize: 11, color: "var(--run-ink)", fontWeight: 600 }}>Running…</span>
                    )}
                  </span>
                </span>
                {isDone && <I.ChevronDown size={14} style={{ color: "var(--muted)", flex: "none" }} />}
              </button>
              {open === task.id && completed?.detail?.output && (
                <div className="dblock" style={{ margin: "0 4px 14px" }}>
                  {completed.detail.output}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <ArtifactList artifacts={artifacts} />
    </div>
  );
}

/* ------------------------------- Traces ------------------------------- */

export function TracesView({ spec, run }: { spec: CrewView; run: RunState }) {
  const [selected, setSelected] = useState<number | null>(null);
  const [tab, setTab] = useState<"details" | "raw">("details");

  if (run.status === "idle") {
    return (
      <div style={{ ...surface, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ textAlign: "center", maxWidth: 360 }}>
          <span
            style={{
              width: 44,
              height: 44,
              borderRadius: 12,
              background: "var(--surface-2)",
              color: "var(--muted)",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <I.Waves size={18} />
          </span>
          <div className="sora" style={{ fontSize: 15, fontWeight: 600, marginTop: 12 }}>
            No trace yet
          </div>
          <p style={{ fontSize: 12.5, color: "var(--muted)", lineHeight: 1.55, marginTop: 6 }}>
            Every LLM call and tool call the crew makes inside the sandbox lands here, with its inputs,
            outputs and timings.
          </p>
        </div>
      </div>
    );
  }

  const event = run.events.find((e) => e.seq === selected) ?? null;

  // Group events by agent, then by task, in arrival order.
  const groups: { agentId: string; taskId: string; events: RunEvent[] }[] = [];
  for (const e of run.events) {
    if (!e.taskId || !e.agentId) continue;
    const last = groups[groups.length - 1];
    if (last && last.taskId === e.taskId) last.events.push(e);
    else groups.push({ agentId: e.agentId, taskId: e.taskId, events: [e] });
  }

  return (
    <div style={{ ...surface, display: "flex" }}>
      {/* Event details — LEFT (mirrored) */}
      <div
        style={{
          width: 388,
          flex: "none",
          borderRight: "1px solid var(--line)",
          display: "flex",
          flexDirection: "column",
          minHeight: 0,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "11px 16px",
            borderBottom: "1px solid var(--line)",
          }}
        >
          <I.File size={14} style={{ color: "var(--muted)" }} />
          <span className="sora" style={{ fontSize: 13, fontWeight: 600, flex: 1 }}>
            Event details
          </span>
          {(["details", "raw"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className="sora"
              style={{
                fontSize: 11.5,
                fontWeight: 600,
                color: tab === t ? "var(--accent-ink)" : "var(--muted)",
                borderBottom: tab === t ? "2px solid var(--accent)" : "2px solid transparent",
                paddingBottom: 2,
              }}
            >
              {t === "details" ? "Details" : "Raw Data"}
            </button>
          ))}
        </div>

        <div className="scroll" style={{ flex: 1, minHeight: 0, padding: "14px 16px" }}>
          {!event ? (
            <p style={{ fontSize: 12.5, color: "var(--muted)", lineHeight: 1.55 }}>
              Select an event in the timeline to inspect its prompt, inputs and output.
            </p>
          ) : tab === "raw" ? (
            <div className="dblock" style={{ maxHeight: "none" }}>
              {JSON.stringify(
                {
                  run_id: "run_7f2a",
                  seq: event.seq,
                  ts: new Date((run.startedAt ?? 0) + event.at).toISOString(),
                  type: event.type,
                  agent_id: event.agentId,
                  task_id: event.taskId,
                  payload: event.detail ?? {},
                },
                null,
                2,
              )}
            </div>
          ) : (
            <>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                {event.type === "tool_usage_started" ? (
                  <I.Wrench size={15} style={{ color: "var(--accent)" }} />
                ) : (
                  <I.Clipboard size={15} style={{ color: "var(--accent)" }} />
                )}
                <span className="mono" style={{ fontSize: 12.5, fontWeight: 600 }}>
                  {event.label}
                </span>
              </div>
              <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 4 }}>
                {new Date((run.startedAt ?? 0) + event.at).toLocaleString()}
              </div>
              <div style={{ display: "flex", gap: 6, marginTop: 10, flexWrap: "wrap" }}>
                {event.agentId && (
                  <span className="chip" style={{ height: 20, fontSize: 10.5 }}>
                    <I.User size={10} />
                    {agentById(spec, event.agentId)?.name}
                  </span>
                )}
                {event.taskId && (
                  <span className="chip mono" style={{ height: 20, fontSize: 10 }}>
                    {spec.tasks.find((t) => t.id === event.taskId)?.name}
                  </span>
                )}
                {event.durationMs && (
                  <span className="dur-pill">{fmt(event.durationMs)}</span>
                )}
              </div>

              {event.detail?.description && (
                <Section label="Description">{event.detail.description}</Section>
              )}
              {event.detail?.prompt && <Section label="Task Prompt" tinted>{event.detail.prompt}</Section>}
              {event.detail?.input && <Section label="Input" tinted>{event.detail.input}</Section>}
              {event.detail?.output && <Section label="Output">{event.detail.output}</Section>}
            </>
          )}
        </div>
      </div>

      {/* Timeline — RIGHT (mirrored) */}
      <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", minHeight: 0 }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "11px 16px",
            borderBottom: "1px solid var(--line)",
          }}
        >
          <I.Clock size={14} style={{ color: "var(--muted)" }} />
          <span className="sora" style={{ fontSize: 13, fontWeight: 600, flex: 1 }}>
            Timeline
          </span>
          {(run.status === "running" || run.status === "provisioning") && (
            <span style={{ display: "inline-flex", alignItems: "center", gap: 7, fontSize: 12, color: "var(--run-ink)", fontWeight: 600 }}>
              <span className="spinner" style={{ width: 11, height: 11 }} />
              Running…
            </span>
          )}
        </div>

        <div className="scroll" style={{ flex: 1, minHeight: 0 }}>
          {groups.map((g, gi) => {
            const agent = agentById(spec, g.agentId);
            const task = spec.tasks.find((t) => t.id === g.taskId);
            const completed = g.events.find((e) => e.type === "task_completed");
            return (
              <div key={`${g.taskId}-${gi}`}>
                <div className="trow" style={{ background: "var(--page)", borderBottom: "1px solid var(--line)" }}>
                  <I.ChevronDown size={11} style={{ color: "var(--muted)", flex: "none" }} />
                  <I.User size={12} style={{ color: "var(--muted)", flex: "none" }} />
                  <span className="sora" style={{ fontWeight: 600 }}>
                    {agent?.name}
                  </span>
                  <span style={{ color: "var(--muted)", fontSize: 11 }}>
                    {completed?.durationMs ? fmt(completed.durationMs) : "running"} · 1 task
                  </span>
                </div>
                <div className="trow" style={{ paddingLeft: 32 }}>
                  <I.Clipboard size={12} style={{ color: "var(--ok-ink)", flex: "none" }} />
                  <span className="mono" style={{ fontSize: 11 }}>
                    {task?.name}
                  </span>
                  <span className="off">{completed?.durationMs ? fmt(completed.durationMs) : "—"}</span>
                </div>
                {g.events.map((e) => (
                  <button
                    key={e.seq}
                    className={`trow${selected === e.seq ? " sel" : ""}`}
                    style={{ paddingLeft: selected === e.seq ? 52 : 54 }}
                    onClick={() => setSelected(e.seq)}
                  >
                    {e.type === "tool_usage_started" && (
                      <I.Wrench size={12} style={{ color: "var(--accent)", flex: "none" }} />
                    )}
                    <span
                      className={e.type === "tool_usage_started" ? "mono" : undefined}
                      style={{
                        fontSize: e.type === "tool_usage_started" ? 11 : 12,
                        color: e.type === "tool_usage_started" ? "var(--accent-ink)" : undefined,
                        fontWeight: e.type === "tool_usage_started" ? 600 : 400,
                      }}
                    >
                      {e.label}
                    </span>
                    {e.durationMs && <span className="dur-pill">{fmt(e.durationMs)}</span>}
                    <span className="off">+{fmt(e.at)}</span>
                  </button>
                ))}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function Section({ label, children, tinted }: { label: string; children: React.ReactNode; tinted?: boolean }) {
  return (
    <>
      <div
        className="sora"
        style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 12, fontWeight: 600, margin: "14px 0 6px" }}
      >
        {label}
        <I.Copy size={12} style={{ marginLeft: "auto", color: "var(--muted)" }} />
      </div>
      <div
        className="dblock"
        style={
          tinted
            ? { background: "var(--accent-soft)", borderColor: "var(--accent-line)" }
            : undefined
        }
      >
        {children}
      </div>
    </>
  );
}
