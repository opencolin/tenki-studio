"use client";

import {
  Background,
  BackgroundVariant,
  Handle,
  Position,
  ReactFlow,
  ReactFlowProvider,
  useReactFlow,
  type Edge as RfEdge,
  type Node as RfNode,
  type NodeProps,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { useEffect, useMemo } from "react";
import { TOOLS } from "@/lib/crew";
import { NODE_TYPES, PORTS, prop, rootEdges, rootNodes, type Graph, type Node } from "@/lib/fbp";
import * as I from "./Icons";

export type TaskStatus = "idle" | "running" | "done";

export interface CanvasApi {
  zoomIn: () => void;
  zoomOut: () => void;
  fitView: () => void;
}

type Shared = { node: Node; onEdit: (id: string) => void };
type AgentData = Shared & { warn: boolean };
type TaskData = Shared & { status: TaskStatus };

/* --------------------------------- nodes --------------------------------- */

function AgentNode({ data, selected }: NodeProps & { data: AgentData }) {
  const { node } = data;
  const tools = prop<string[]>(node, "tools", [])!;
  return (
    <div className={`rf-node${selected ? " selected" : ""}`}>
      {data.warn && (
        <span className="warn-dot" title="This agent has no tools">
          <I.Warning size={11} />
        </span>
      )}
      <div style={{ padding: "11px 12px 9px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <I.User size={14} style={{ color: "var(--muted)", flex: "none" }} />
          <span className="sora" style={{ fontSize: 13, fontWeight: 600 }}>
            {prop(node, "title", node.name)}
          </span>
        </div>
        <div className="clamp-2" style={{ fontSize: 11, color: "var(--muted)", lineHeight: 1.35, marginTop: 5 }}>
          {prop(node, "goal")}
        </div>
      </div>
      <div className="nrow">
        <I.Sparkle size={13} style={{ flex: "none" }} />
        <span className="mono" style={{ fontSize: 10.5 }}>
          {prop(node, "model")}
        </span>
      </div>
      {tools.length > 0 ? (
        tools.map((t) => (
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
          onClick={() => data.onEdit(node.name)}
          aria-label={`Edit ${prop(node, "title", node.name)}`}
        >
          <I.Pencil size={13} />
        </button>
        <I.ChevronDown size={13} style={{ color: "var(--muted)" }} />
      </div>
      <Handle type="source" id={PORTS.agent} position={Position.Bottom} title="agent" />
    </div>
  );
}

function TaskNode({ data, selected }: NodeProps & { data: TaskData }) {
  const { node } = data;
  return (
    <div className={`rf-node${selected ? " selected" : ""}`}>
      <Handle type="target" id={PORTS.agent} position={Position.Top} title="agent" />
      <Handle type="target" id={PORTS.context} position={Position.Left} title="context" />
      {data.status === "done" && (
        <span className="badge ok float-badge" style={{ border: "1px solid var(--ok-line)" }}>
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
            {prop(node, "title", node.name)}
          </span>
        </div>
        <div className="clamp-3" style={{ fontSize: 11, color: "var(--muted)", lineHeight: 1.35, marginTop: 5 }}>
          {prop(node, "description")}
        </div>
      </div>
      <div className="nrow" style={{ justifyContent: "space-between" }}>
        <button
          className="ico"
          style={{ width: 20, height: 20 }}
          onClick={() => data.onEdit(node.name)}
          aria-label={`Edit ${prop(node, "title", node.name)}`}
        >
          <I.Pencil size={13} />
        </button>
        <span style={{ display: "inline-flex", gap: 10, color: "var(--muted)" }}>
          <I.File size={13} />
          <I.Play size={13} />
          <I.ChevronDown size={13} />
        </span>
      </div>
      <Handle type="source" id={PORTS.output} position={Position.Right} title="output" />
    </div>
  );
}

function TriggerNode({ data }: NodeProps & { data: Shared }) {
  return (
    <div className="rf-node" style={{ width: 200 }}>
      <div style={{ padding: "11px 12px 9px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <I.Gear size={14} style={{ color: "var(--muted)", flex: "none" }} />
          <span className="sora" style={{ fontSize: 13, fontWeight: 600 }}>
            Triggers
          </span>
        </div>
        <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 4 }}>
          {prop(data.node, "mode") === "manual" ? "No triggers configured" : prop(data.node, "mode")}
        </div>
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
      <Handle type="source" id={PORTS.fire} position={Position.Right} title="fire" />
    </div>
  );
}

/** graphInput / graphOutput / graphProp — the crew's public interface. */
function BoundaryNode({ data, selected }: NodeProps & { data: Shared }) {
  const { node } = data;
  const isOut = node.type === NODE_TYPES.graphOutput;
  const isProp = node.type === NODE_TYPES.graphProp;
  const label = prop(node, isProp ? "propName" : "portName", node.name);
  const kind = isProp ? "prop" : isOut ? "output" : "input";
  return (
    <div
      className={`rf-boundary${selected ? " selected" : ""}`}
      title={`${kind} · ${prop(node, "dataType", "any")}`}
    >
      {isOut && <Handle type="target" id={PORTS.value} position={Position.Left} />}
      <span className="eyebrow" style={{ fontSize: 9.5 }}>
        {kind}
      </span>
      <span className="mono" style={{ fontSize: 11.5, fontWeight: 600 }}>
        {label}
      </span>
      {isProp && (
        <span className="mono" style={{ fontSize: 10.5, color: "var(--muted)" }}>
          = {String(prop(node, "value") ?? prop(node, "default") ?? "")}
        </span>
      )}
      {!isOut && <Handle type="source" id={PORTS.value} position={Position.Right} />}
    </div>
  );
}

const nodeTypes = {
  agent: AgentNode,
  task: TaskNode,
  trigger: TriggerNode,
  graphInput: BoundaryNode,
  graphOutput: BoundaryNode,
  graphProp: BoundaryNode,
} as never;

/* --------------------------------- flow ---------------------------------- */

function Flow({
  graph,
  statuses,
  warnings,
  onEdit,
  onMoveNode,
  onApi,
  onZoomChange,
}: {
  graph: Graph;
  statuses: Record<string, TaskStatus>;
  warnings: string[];
  onEdit: (id: string) => void;
  onMoveNode?: (name: string, x: number, y: number) => void;
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

  // Nodes and edges map 1:1 out of storage — the canvas is a projection of the
  // graph, and the stored edge list is what gets drawn.
  const nodes: RfNode[] = useMemo(
    () =>
      rootNodes(graph).map((node) => ({
        id: node.name,
        type: node.type,
        position: { x: node.meta?.x ?? 0, y: node.meta?.y ?? 0 },
        data: {
          node,
          onEdit,
          warn: warnings.includes(node.name),
          status: statuses[node.name] ?? "idle",
        },
      })),
    [graph, statuses, warnings, onEdit],
  );

  const edges: RfEdge[] = useMemo(
    () =>
      rootEdges(graph).map((e) => ({
        id: `${e.src.node}.${e.src.port}->${e.dst.node}.${e.dst.port}`,
        source: e.src.node,
        sourceHandle: e.src.port,
        target: e.dst.node,
        targetHandle: e.dst.port,
        type: "smoothstep",
        // Non-main channels (error, control) render dashed.
        style: e.channel && e.channel !== "main" ? { strokeDasharray: "4 3" } : undefined,
        label: e.channel && e.channel !== "main" ? e.channel : undefined,
      })),
    [graph],
  );

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
      onNodeDragStop={(_, node) => onMoveNode?.(node.id, Math.round(node.position.x), Math.round(node.position.y))}
      onMove={(_, vp) => onZoomChange?.(vp.zoom)}
      onInit={(inst) => onZoomChange?.(inst.getZoom())}
      style={{ background: "transparent" }}
    >
      <Background variant={BackgroundVariant.Dots} gap={16} size={1.4} color="var(--dots)" />
    </ReactFlow>
  );
}

export function CrewCanvas(props: {
  graph: Graph;
  statuses: Record<string, TaskStatus>;
  warnings: string[];
  onEdit: (id: string) => void;
  onMoveNode?: (name: string, x: number, y: number) => void;
  onApi?: (api: CanvasApi) => void;
  onZoomChange?: (zoom: number) => void;
}) {
  return (
    <ReactFlowProvider>
      <Flow {...props} />
    </ReactFlowProvider>
  );
}
