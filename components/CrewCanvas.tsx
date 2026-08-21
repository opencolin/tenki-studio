"use client";

import {
  Background,
  BackgroundVariant,
  Handle,
  Position,
  ReactFlow,
  ReactFlowProvider,
  useReactFlow,
  type Edge,
  type Node,
  type NodeProps,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { useEffect, useMemo } from "react";
import type { CrewSpec } from "@/lib/crew";
import { TOOLS, agentById } from "@/lib/crew";
import * as I from "./Icons";

export type TaskStatus = "idle" | "running" | "done";

type AgentData = { spec: CrewSpec; agentId: string; warn: boolean; onEdit: (id: string) => void };
type TaskData = { spec: CrewSpec; taskId: string; status: TaskStatus; onEdit: (id: string) => void };

function AgentNode({ data, selected }: NodeProps & { data: AgentData }) {
  const agent = agentById(data.spec, data.agentId)!;
  return (
    <div className={`rf-node${selected ? " selected" : ""}`}>
      <Handle type="target" position={Position.Top} />
      {data.warn && (
        <span
          style={{
            position: "absolute",
            top: -9,
            right: 10,
            width: 20,
            height: 20,
            borderRadius: 999,
            background: "var(--warn-soft)",
            border: "1px solid var(--warn-line)",
            color: "var(--warn-ink)",
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
          }}
          title="This agent has no tools"
        >
          <I.Warning size={11} />
        </span>
      )}
      <div style={{ padding: "11px 12px 9px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <I.User size={14} style={{ color: "var(--muted)", flex: "none" }} />
          <span className="sora" style={{ fontSize: 13, fontWeight: 600 }}>
            {agent.name}
          </span>
        </div>
        <div
          style={{
            fontSize: 11,
            color: "var(--muted)",
            lineHeight: 1.35,
            marginTop: 5,
            display: "-webkit-box",
            WebkitLineClamp: 2,
            WebkitBoxOrient: "vertical",
            overflow: "hidden",
          }}
        >
          {agent.goal}
        </div>
      </div>
      <div className="nrow">
        <I.Sparkle size={13} style={{ flex: "none" }} />
        <span className="mono" style={{ fontSize: 10.5 }}>
          {agent.model}
        </span>
      </div>
      {agent.tools.length > 0 ? (
        agent.tools.map((t) => (
          <div className="nrow" key={t}>
            <I.Search size={13} style={{ flex: "none" }} />
            {TOOLS[t]?.label ?? t}
          </div>
        ))
      ) : (
        <div
          style={{
            margin: "8px 12px",
            border: "1.5px dashed var(--line)",
            borderRadius: 8,
            padding: "6px 10px",
            fontSize: 11,
            color: "var(--muted)",
            textAlign: "center",
          }}
        >
          Drop tools here
        </div>
      )}
      <div className="nrow" style={{ justifyContent: "space-between" }}>
        <button
          className="ico"
          style={{ width: 20, height: 20 }}
          onClick={() => data.onEdit(agent.id)}
          aria-label={`Edit ${agent.name}`}
        >
          <I.Pencil size={13} />
        </button>
        <I.ChevronDown size={13} style={{ color: "var(--muted)" }} />
      </div>
      <Handle type="source" position={Position.Bottom} />
    </div>
  );
}

function TaskNode({ data, selected }: NodeProps & { data: TaskData }) {
  const task = data.spec.tasks.find((t) => t.id === data.taskId)!;
  return (
    <div className={`rf-node${selected ? " selected" : ""}`}>
      <Handle type="target" position={Position.Left} />
      <Handle type="target" position={Position.Top} id="assign" />
      {data.status === "done" && (
        <span
          className="badge ok float-badge"
          style={{ border: "1px solid var(--ok-line)" }}
        >
          <I.Check size={10} />
          Completed
        </span>
      )}
      {data.status === "running" && (
        <span className="badge running float-badge">
          <span className="spinner" style={{ width: 10, height: 10 }} />
          Running
        </span>
      )}
      <div style={{ padding: "12px 12px 9px" }}>
        <div style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
          <I.Clipboard size={14} style={{ color: "var(--accent)", flex: "none", marginTop: 1 }} />
          <span
            className="sora"
            style={{ fontSize: 12.5, fontWeight: 600, color: "var(--accent-ink)", lineHeight: 1.3 }}
          >
            {task.title}
          </span>
        </div>
        <div
          style={{
            fontSize: 11,
            color: "var(--muted)",
            lineHeight: 1.35,
            marginTop: 5,
            display: "-webkit-box",
            WebkitLineClamp: 3,
            WebkitBoxOrient: "vertical",
            overflow: "hidden",
          }}
        >
          {task.description}
        </div>
      </div>
      <div className="nrow" style={{ justifyContent: "space-between" }}>
        <button
          className="ico"
          style={{ width: 20, height: 20 }}
          onClick={() => data.onEdit(task.id)}
          aria-label={`Edit ${task.title}`}
        >
          <I.Pencil size={13} />
        </button>
        <span style={{ display: "inline-flex", gap: 10, color: "var(--muted)" }}>
          <I.File size={13} />
          <I.Play size={13} />
          <I.ChevronDown size={13} />
        </span>
      </div>
      <Handle type="source" position={Position.Right} />
    </div>
  );
}

function TriggerNode() {
  return (
    <div className="rf-node" style={{ width: 200 }}>
      <div style={{ padding: "11px 12px 9px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <I.Gear size={14} style={{ color: "var(--muted)", flex: "none" }} />
          <span className="sora" style={{ fontSize: 13, fontWeight: 600 }}>
            Triggers
          </span>
        </div>
        <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 4 }}>No triggers configured</div>
      </div>
      <div className="nrow">
        <I.Bolt size={13} style={{ flex: "none" }} />
        Event
      </div>
      <div className="nrow">
        <I.Clock size={13} style={{ flex: "none" }} />
        Schedule
      </div>
      <div className="nrow">
        <I.Menu size={13} style={{ flex: "none" }} />
        Manage
      </div>
    </div>
  );
}

const nodeTypes = { agent: AgentNode, task: TaskNode, trigger: TriggerNode } as never;

function Flow({
  spec,
  statuses,
  warnings,
  onEdit,
  onApi,
  onZoomChange,
}: {
  spec: CrewSpec;
  statuses: Record<string, TaskStatus>;
  warnings: string[];
  onEdit: (id: string) => void;
  onApi?: (api: CanvasApi) => void;
  onZoomChange?: (zoom: number) => void;
}) {
  const rf = useReactFlow();

  useEffect(() => {
    onApi?.({
      zoomIn: () => rf.zoomIn({ duration: 160 }),
      zoomOut: () => rf.zoomOut({ duration: 160 }),
      fitView: () => rf.fitView({ padding: 0.14, duration: 220 }),
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rf]);

  const nodes: Node[] = useMemo(() => {
    const agentNodes = spec.agents.map<Node>((a) => ({
      id: a.id,
      type: "agent",
      position: a.position,
      data: { spec, agentId: a.id, warn: warnings.includes(a.id), onEdit },
    }));
    const taskNodes = spec.tasks.map<Node>((t) => ({
      id: t.id,
      type: "task",
      position: t.position,
      data: { spec, taskId: t.id, status: statuses[t.id] ?? "idle", onEdit },
    }));
    return [
      ...agentNodes,
      ...taskNodes,
      { id: "triggers", type: "trigger", position: spec.triggerPosition, data: {} },
    ];
  }, [spec, statuses, warnings, onEdit]);

  const edges: Edge[] = useMemo(() => {
    const out: Edge[] = [];
    for (const t of spec.tasks) {
      out.push({
        id: `assign-${t.id}`,
        source: t.agent,
        target: t.id,
        targetHandle: "assign",
        type: "smoothstep",
      });
      for (const c of t.context) {
        out.push({ id: `ctx-${c}-${t.id}`, source: c, target: t.id, type: "smoothstep" });
      }
    }
    return out;
  }, [spec]);

  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      nodeTypes={nodeTypes}
      defaultViewport={{ x: 44, y: 124, zoom: 0.82 }}
      minZoom={0.25}
      maxZoom={1.75}
      proOptions={{ hideAttribution: true }}
      nodesDraggable
      nodesConnectable={false}
      onMove={(_, vp) => onZoomChange?.(vp.zoom)}
      onInit={(inst) => onZoomChange?.(inst.getZoom())}
      style={{ background: "transparent" }}
    >
      <Background variant={BackgroundVariant.Dots} gap={16} size={1.4} color="var(--dots)" />
    </ReactFlow>
  );
}

export interface CanvasApi {
  zoomIn: () => void;
  zoomOut: () => void;
  fitView: () => void;
}

export function CrewCanvas(props: {
  spec: CrewSpec;
  statuses: Record<string, TaskStatus>;
  warnings: string[];
  onEdit: (id: string) => void;
  onApi?: (api: CanvasApi) => void;
  onZoomChange?: (zoom: number) => void;
}) {
  return (
    <ReactFlowProvider>
      <Flow {...props} />
    </ReactFlowProvider>
  );
}
