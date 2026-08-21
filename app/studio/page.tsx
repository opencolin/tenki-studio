"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { NavPill } from "@/components/Chrome";
import { CrewCanvas, type CanvasApi, type TaskStatus } from "@/components/CrewCanvas";
import { ChatPanel } from "@/components/ChatPanel";
import { EnvModal, InputsModal, ShareModal } from "@/components/Modals";
import { OutputView, TracesView } from "@/components/RunViews";
import { Inspector } from "@/components/Inspector";
import * as I from "@/components/Icons";
import { defaultGraph, toCrew, validate, type Process } from "@/lib/crew";
import type { Graph } from "@/lib/fbp";
import { setPosition, setProps } from "@fbp/spec";
import { buildScript, fmt, type RunState } from "@/lib/run";
import { buildArtifacts, releaseArtifacts, type Artifact } from "@/lib/artifacts";
import { liveRunFromLocation, subscribeToRun } from "@/lib/stream";

type View = "canvas" | "output" | "traces";

const IDLE: RunState = { status: "idle", startedAt: null, elapsedMs: 0, events: [], inputs: {} };

export default function StudioPage() {
  // The FBP graph is the source of truth; the crew view is derived from it.
  const [graph, setGraph] = useState<Graph>(defaultGraph);
  const [version, setVersion] = useState(9);
  const crew = useMemo(() => toCrew(graph), [graph]);
  const [view, setView] = useState<View>("canvas");
  const [run, setRun] = useState<RunState>(IDLE);
  const [modal, setModal] = useState<null | "env" | "share" | "inputs">(null);
  const [toast, setToast] = useState<{ title: string; body: string } | null>(null);
  const [artifacts, setArtifacts] = useState<Artifact[]>([]);
  const [zoom, setZoom] = useState(1);
  const [showWarnings, setShowWarnings] = useState(false);
  const [tool, setTool] = useState("select");
  const [inspecting, setInspecting] = useState<string | null>(null);
  const [live, setLive] = useState<{ base: string; runId: string } | null>(null);
  const [beat, setBeat] = useState<number | null>(null);
  const api = useRef<CanvasApi | null>(null);
  const timers = useRef<number[]>([]);
  const artifactsRef = useRef<Artifact[]>([]);

  artifactsRef.current = artifacts;
  const warnings = validate(crew);

  const clearTimers = () => {
    timers.current.forEach((t) => window.clearTimeout(t));
    timers.current = [];
  };
  useEffect(() => clearTimers, []);

  // A live run replaces the simulator entirely: same views, real events.
  useEffect(() => {
    const target = liveRunFromLocation();
    if (!target) return;
    setLive(target);
    setView("output");
    setRun({
      status: "provisioning",
      startedAt: Date.now(),
      elapsedMs: 0,
      events: [],
      inputs: { run_id: target.runId },
    });
    const handle = subscribeToRun(target.base, target.runId, {
      onEvent: (event) =>
        setRun((r) =>
          r.events.some((e) => e.seq === event.seq)
            ? r
            : {
                ...r,
                elapsedMs: Math.max(r.elapsedMs, event.at),
                events: [...r.events, event].sort((a, b) => a.seq - b.seq),
              },
        ),
      onStatus: (status) => setRun((r) => (r.status === status ? r : { ...r, status })),
      onHeartbeat: () => setBeat(Date.now()),
      onError: (message) => setToast({ title: "Stream lost", body: message }),
    });
    return handle.close;
  }, []);
  useEffect(() => () => releaseArtifacts(artifactsRef.current), []);

  // Elapsed clock while a run is in flight.
  useEffect(() => {
    if (run.status !== "running" && run.status !== "provisioning") return;
    if (live) return;
    const id = window.setInterval(
      () => setRun((r) => (r.startedAt ? { ...r, elapsedMs: Date.now() - r.startedAt } : r)),
      250,
    );
    return () => window.clearInterval(id);
  }, [run.status, live]);

  useEffect(() => {
    if (!toast) return;
    const id = window.setTimeout(() => setToast(null), 5200);
    return () => window.clearTimeout(id);
  }, [toast]);

  const startRun = useCallback(
    (inputs: Record<string, string>) => {
      clearTimers();
      releaseArtifacts(artifactsRef.current);
      setArtifacts([]);
      const script = buildScript(crew, inputs);
      setRun({ status: "provisioning", startedAt: Date.now(), elapsedMs: 0, events: [], inputs });
      setView("output");
      setToast({
        title: "Execution started",
        body: `Booting a sandbox for client_name = "${inputs.client_name}".`,
      });
      for (const ev of script) {
        const t = window.setTimeout(() => {
          setRun((r) => ({
            ...r,
            status: ev.type === "run_completed" ? "completed" : "running",
            events: [...r.events, ev],
          }));
          if (ev.type === "run_completed") {
            setToast({ title: "Run completed", body: "Sandbox destroyed · 21.4 sandbox-seconds billed." });
            const outputOf = (id: string) =>
              script.find((e) => e.type === "task_completed" && e.taskId === id)?.detail?.output;
            buildArtifacts(inputs.client_name || "your client", {
              brief: outputOf("client_discovery_and_briefing"),
              design: outputOf("visual_design_specifications"),
              prompt: outputOf("final_advertisement_prompt"),
            })
              .then(setArtifacts)
              .catch(() => setArtifacts([]));
          }
        }, ev.at);
        timers.current.push(t);
      }
    },
    [crew],
  );

  const stopRun = () => {
    clearTimers();
    setRun((r) => ({ ...r, status: "stopped" }));
    setToast({ title: "Run stopped", body: "The sandbox was destroyed; the partial trace is kept." });
  };

  const statuses: Record<string, TaskStatus> = {};
  for (const t of crew.tasks) statuses[t.id] = "idle";
  for (const e of run.events) {
    if (e.type === "task_started" && e.taskId) statuses[e.taskId] = "running";
    if (e.type === "task_completed" && e.taskId) statuses[e.taskId] = "done";
  }

  const busy = run.status === "running" || run.status === "provisioning";
  const canvasBg =
    view === "canvas"
      ? { background: "var(--canvas)" }
      : { background: "var(--page)" };

  return (
    <main style={{ height: "100vh", overflow: "hidden", position: "relative", ...canvasBg }}>
      <NavPill project={crew.name} />

      {/* View switcher */}
      <div className="bar" style={{ top: 12, left: 429, height: 38, padding: 4 }}>
        {(["canvas", "output", "traces"] as View[]).map((v) => (
          <button key={v} className={`seg${view === v ? " on" : ""}`} onClick={() => setView(v)}>
            {v[0].toUpperCase() + v.slice(1)}
          </button>
        ))}
      </div>

      {/* Actions */}
      <div className="bar" style={{ top: 12, right: 364, height: 38, gap: 8, padding: "0 6px" }}>
        <span style={{ display: "inline-flex", paddingLeft: 4 }}>
          <span className="avatar" style={{ background: "var(--accent)" }}>
            CL
          </span>
          <span className="avatar" style={{ background: "var(--ok)", marginLeft: -8 }}>
            PO
          </span>
        </span>
        <I.ChevronDown size={12} style={{ color: "var(--muted)" }} />
        <span className="bar-div" />
        <button className="ico sm" onClick={() => setModal("env")} aria-label="Environment variables">
          <I.Dots size={16} />
        </button>
        <button className="btn" onClick={() => setToast({ title: "Deploy", body: "Version 9 pinned — the automation is online." })}>
          <I.Bolt size={13} />
          Deploy
        </button>
        <button className="btn gho" onClick={() => setModal("share")}>
          Share
        </button>
        {live ? (
          <span className="badge running" title={`Streaming ${live.runId}`}>
            <span className="dot" />
            Live{beat ? "" : " · connecting"}
          </span>
        ) : busy ? (
          <button className="btn ink" onClick={stopRun}>
            <I.Stop size={11} />
            Stop
          </button>
        ) : (
          <button className="btn pri" onClick={() => setModal("inputs")}>
            <I.Play size={12} />
            Run
          </button>
        )}
      </div>

      {view === "canvas" && (
        <>
          {/* Version + process */}
          <div
            className="bar"
            style={{ top: 60, right: 364, width: 212, flexDirection: "column", alignItems: "stretch", padding: "10px 12px" }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 11.5, color: "var(--muted)" }}>
              Version {version}
              <span className="badge ok" style={{ marginLeft: "auto", height: 19, fontSize: 10 }}>
                Autosaved
              </span>
            </div>
            <div style={{ marginTop: 8 }}>
              <select
                value={crew.process}
                onChange={(e) => {
                  const process = e.target.value as Process;
                  setGraph((g) => setProps(g, "/prop_process", [{ name: "value", value: process }]));
                  setVersion((v) => v + 1);
                  setToast({
                    title: "Process updated",
                    body:
                      process === "hierarchical"
                        ? "A manager agent will now coordinate your crew."
                        : "Tasks will run in order.",
                  });
                }}
                aria-label="Process type"
                style={{
                  width: "100%",
                  height: 32,
                  border: "1px solid var(--line)",
                  borderRadius: 8,
                  background: "var(--surface)",
                  padding: "0 8px",
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                <option value="sequential">Sequential</option>
                <option value="hierarchical">Hierarchical</option>
              </select>
              <div style={{ fontSize: 10.5, color: "var(--muted)", marginTop: 4 }}>
                {crew.process === "sequential" ? "Tasks run in order" : "Manager coordinates agents"}
              </div>
            </div>
          </div>

          {/* Tool rail */}
          <div
            className="bar"
            style={{
              top: 200,
              left: inspecting ? 364 : 12,
              width: 44,
              flexDirection: "column",
              padding: 6,
              gap: 2,
              transition: "left 160ms ease",
            }}
          >
            {[
              { id: "select", icon: I.Cursor, label: "Select" },
              { id: "pan", icon: I.Hand, label: "Pan" },
              { id: "comment", icon: I.Comment, label: "Comment" },
            ].map((t) => (
              <button
                key={t.id}
                className={`ico${tool === t.id ? " on" : ""}`}
                onClick={() => setTool(t.id)}
                aria-label={t.label}
                aria-pressed={tool === t.id}
              >
                <t.icon size={16} />
              </button>
            ))}
            <span style={{ height: 1, background: "var(--line)", margin: "5px 3px" }} />
            {[
              { icon: I.User, label: "Add agent" },
              { icon: I.Clipboard, label: "Add task" },
              { icon: I.Bolt, label: "Add trigger" },
            ].map((t) => (
              <button
                key={t.label}
                className="ico"
                aria-label={t.label}
                onClick={() => setToast({ title: t.label, body: "Ask Studio Chat to add it, or drop it on the canvas." })}
              >
                <t.icon size={16} />
              </button>
            ))}
            <span style={{ height: 1, background: "var(--line)", margin: "5px 3px" }} />
            <button className="ico" aria-label="View crew.json">
              <I.Code size={16} />
            </button>
          </div>

          {/* Warnings */}
          {warnings.length > 0 && (
            <div style={{ position: "absolute", bottom: 14, left: "calc(50% - 240px)", zIndex: 12 }}>
              {showWarnings && (
                <div
                  className="card"
                  style={{ marginBottom: 8, padding: "10px 12px", width: 320, boxShadow: "var(--shadow-panel)" }}
                >
                  {warnings.map((w) => (
                    <div
                      key={w.id}
                      style={{ display: "flex", gap: 8, fontSize: 12, lineHeight: 1.5, padding: "4px 0" }}
                    >
                      <I.Warning size={12} style={{ color: "var(--warn-ink)", flex: "none", marginTop: 2 }} />
                      {w.text}
                    </div>
                  ))}
                </div>
              )}
              <button
                className="bar"
                style={{
                  position: "static",
                  height: 32,
                  padding: "0 13px",
                  gap: 7,
                  borderColor: "var(--warn-line)",
                }}
                onClick={() => setShowWarnings((v) => !v)}
                aria-expanded={showWarnings}
              >
                <I.Warning size={13} style={{ color: "var(--warn-ink)" }} />
                <span className="sora" style={{ fontSize: 12, fontWeight: 600, color: "var(--warn-ink)" }}>
                  {warnings.length} warning{warnings.length > 1 ? "s" : ""}
                </span>
                <I.ChevronDown size={11} style={{ color: "var(--warn-ink)" }} />
              </button>
            </div>
          )}

          {/* History + zoom */}
          <div className="bar" style={{ bottom: 14, right: 364, height: 36, padding: "0 4px", gap: 2 }}>
            <button className="ico" aria-label="Previous executions">
              <I.Clock size={15} />
            </button>
            <button className="ico" aria-label="Undo">
              <I.Undo size={15} />
            </button>
            <span className="bar-div" />
            <button className="ico" onClick={() => api.current?.zoomOut()} aria-label="Zoom out">
              <I.Minus size={15} />
            </button>
            <span className="mono" style={{ fontSize: 11.5, padding: "0 2px", fontWeight: 600, minWidth: 40, textAlign: "center" }}>
              {Math.round(zoom * 100)}%
            </span>
            <button className="ico" onClick={() => api.current?.zoomIn()} aria-label="Zoom in">
              <I.Plus size={15} />
            </button>
            <span className="bar-div" />
            <button className="ico" onClick={() => api.current?.fitView()} aria-label="Fit to view">
              <I.Fit size={15} />
            </button>
          </div>

          <div style={{ position: "absolute", inset: 0, right: 364 }}>
            <CrewCanvas
              graph={graph}
              statuses={statuses}
              warnings={warnings.map((w) => w.nodeId)}
              onEdit={setInspecting}
              onMoveNode={(name, x, y) => setGraph((g) => setPosition(g, `/${name}`, x, y))}
              onApi={(a) => (api.current = a)}
              onZoomChange={setZoom}
            />
          </div>
        </>
      )}

      {view === "canvas" && inspecting && (
        <Inspector
          graph={graph}
          nodeName={inspecting}
          onChange={(next) => {
            setGraph(next);
            setVersion((v) => v + 1);
          }}
          onClose={() => setInspecting(null)}
        />
      )}

      {view === "output" && <OutputView spec={crew} run={run} artifacts={artifacts} />}
      {view === "traces" && <TracesView spec={crew} run={run} />}

      <ChatPanel
        onRun={() => setModal("inputs")}
        suggestion={run.status === "completed"}
        onSuggestion={() => setView("canvas")}
      />

      {modal === "env" && <EnvModal spec={crew} onClose={() => setModal(null)} />}
      {modal === "share" && <ShareModal onClose={() => setModal(null)} />}
      {modal === "inputs" && (
        <InputsModal
          spec={crew}
          initial={run.inputs.client_name ? run.inputs : { client_name: "Tenki.cloud" }}
          onCancel={() => setModal(null)}
          onRun={(inputs) => {
            setModal(null);
            startRun(inputs);
          }}
        />
      )}

      {toast && (
        <div className="toast" role="status">
          <span
            style={{
              width: 8,
              height: 8,
              borderRadius: 999,
              background: "var(--ok)",
              marginTop: 5,
              flex: "none",
            }}
          />
          <div style={{ flex: 1 }}>
            <div className="sora" style={{ fontSize: 12.5, fontWeight: 600 }}>
              {toast.title}
            </div>
            <div style={{ fontSize: 11.5, color: "var(--muted)", marginTop: 2 }}>{toast.body}</div>
          </div>
          <button className="ico" style={{ width: 22, height: 22 }} onClick={() => setToast(null)} aria-label="Dismiss">
            <I.X size={13} />
          </button>
        </div>
      )}

      {busy && view !== "output" && (
        <div
          className="bar"
          style={{ bottom: 14, left: "calc(50% - 240px)", height: 32, padding: "0 13px", gap: 8, zIndex: 14 }}
        >
          <span className="spinner" style={{ width: 11, height: 11, color: "var(--run)" }} />
          <span style={{ fontSize: 12, fontWeight: 600 }}>{fmt(run.elapsedMs)}</span>
        </div>
      )}
    </main>
  );
}
