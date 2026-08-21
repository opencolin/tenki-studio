"use client";

import { getNode, removeNode, setProps } from "@fbp/spec";
import { TOOLS } from "@/lib/crew";
import { MODELS, providerForModel, shortModel } from "@/lib/providers";
import { NODE_TYPES, agentOf, contextOf, prop, type Graph, type Node } from "@/lib/fbp";
import * as I from "./Icons";

/**
 * The properties panel. Docks left, per the mirror rule (PRD §8.1) — detail
 * drawers open from the left while the copilot holds the right.
 *
 * Every edit is a `setProps` against the stored graph; this component never
 * holds a draft copy, so what you see is what is stored.
 */
export function Inspector({
  graph,
  nodeName,
  onChange,
  onClose,
}: {
  graph: Graph;
  nodeName: string;
  onChange: (next: Graph) => void;
  onClose: () => void;
}) {
  const node = getNode(graph, `/${nodeName}`) as Node | null;
  if (!node) return null;

  const write = (name: string, value: unknown) =>
    onChange(setProps(graph, `/${nodeName}`, [{ name, value }]));

  const isAgent = node.type === NODE_TYPES.agent;
  const isTask = node.type === NODE_TYPES.task;
  const tools = prop<string[]>(node, "tools", [])!;
  const provider = isAgent ? providerForModel(prop(node, "model", "")!) : undefined;

  return (
    <aside
      style={{
        position: "absolute",
        zIndex: 30,
        top: 60,
        left: 12,
        bottom: 12,
        width: 340,
        background: "var(--surface)",
        border: "1px solid var(--line)",
        borderRadius: "var(--r-card)",
        boxShadow: "var(--shadow-panel)",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
      }}
      aria-label={`Properties — ${prop(node, "title", node.name)}`}
    >
      <header
        style={{
          display: "flex",
          alignItems: "center",
          gap: 9,
          padding: "11px 14px",
          borderBottom: "1px solid var(--line)",
        }}
      >
        {isAgent ? (
          <I.User size={15} style={{ color: "var(--muted)" }} />
        ) : isTask ? (
          <I.Clipboard size={15} style={{ color: "var(--accent)" }} />
        ) : (
          <I.Gear size={15} style={{ color: "var(--muted)" }} />
        )}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="sora" style={{ fontSize: 13, fontWeight: 600 }}>
            {isAgent ? "Agent" : isTask ? "Task" : "Node"}
          </div>
          <div className="mono" style={{ fontSize: 10.5, color: "var(--muted)" }}>
            /{node.name}
          </div>
        </div>
        <button className="ico" style={{ width: 26, height: 26 }} onClick={onClose} aria-label="Close properties">
          <I.X size={15} />
        </button>
      </header>

      <div className="scroll" style={{ flex: 1, minHeight: 0, padding: "14px 14px 4px" }}>
        <Field label="Title">
          <input
            className="inp"
            value={prop(node, "title", "")!}
            onChange={(e) => write("title", e.target.value)}
          />
        </Field>

        {isAgent && (
          <>
            <Field label="Role">
              <input className="inp" value={prop(node, "role", "")!} onChange={(e) => write("role", e.target.value)} />
            </Field>
            <Field label="Goal" hint="Interpolated with the crew's inputs at run time.">
              <textarea
                className="inp"
                rows={3}
                value={prop(node, "goal", "")!}
                onChange={(e) => write("goal", e.target.value)}
              />
            </Field>
            <Field label="Backstory">
              <textarea
                className="inp"
                rows={4}
                value={prop(node, "backstory", "")!}
                onChange={(e) => write("backstory", e.target.value)}
              />
            </Field>
            <Field
              label="Model"
              hint={
                provider
                  ? `${provider.name} · needs ${provider.env}`
                  : "No provider claims this model id."
              }
            >
              <select className="inp" value={prop(node, "model", "")!} onChange={(e) => write("model", e.target.value)}>
                {MODELS.map((m) => (
                  <option key={m} value={m}>
                    {shortModel(m)}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Tools" hint="Each tool declares the credential it needs.">
              <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                {Object.entries(TOOLS).map(([id, t]) => {
                  const on = tools.includes(id);
                  return (
                    <label
                      key={id}
                      style={{
                        display: "flex",
                        alignItems: "flex-start",
                        gap: 9,
                        padding: "7px 8px",
                        borderRadius: 8,
                        background: on ? "var(--accent-soft)" : undefined,
                        cursor: "pointer",
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={on}
                        onChange={() =>
                          write("tools", on ? tools.filter((x) => x !== id) : [...tools, id])
                        }
                        style={{ marginTop: 2 }}
                      />
                      <span style={{ flex: 1, minWidth: 0 }}>
                        <span style={{ fontSize: 12.5, display: "block" }}>{t.label}</span>
                        <span className="mono" style={{ fontSize: 10, color: "var(--muted)" }}>
                          {t.env ?? "no credentials"}
                        </span>
                      </span>
                    </label>
                  );
                })}
              </div>
            </Field>
          </>
        )}

        {isTask && (
          <>
            <Field label="Description" hint="Becomes the task prompt inside the sandbox.">
              <textarea
                className="inp"
                rows={6}
                value={prop(node, "description", "")!}
                onChange={(e) => write("description", e.target.value)}
              />
            </Field>
            <Field label="Expected output">
              <textarea
                className="inp"
                rows={3}
                value={prop(node, "expectedOutput", "")!}
                onChange={(e) => write("expectedOutput", e.target.value)}
              />
            </Field>
            <Field label="Wiring" hint="Assignment and context are edges — rewire them on the canvas.">
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <Row k="agent" v={agentOf(graph, node.name) ?? "unassigned"} />
                <Row k="context" v={contextOf(graph, node.name).join(", ") || "none"} />
              </div>
            </Field>
          </>
        )}
      </div>

      <footer style={{ padding: "10px 14px 14px", borderTop: "1px solid var(--line)" }}>
        <button
          className="btn danger"
          style={{ width: "100%", justifyContent: "center" }}
          onClick={() => {
            onChange(removeNode(graph, `/${node.name}`));
            onClose();
          }}
        >
          <I.Trash size={13} />
          Delete node
        </button>
      </footer>
    </aside>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label style={{ display: "block", marginBottom: 14 }}>
      <span className="eyebrow" style={{ fontSize: 10, display: "block", marginBottom: 5 }}>
        {label}
      </span>
      {children}
      {hint && (
        <span style={{ display: "block", fontSize: 10.5, color: "var(--muted)", marginTop: 4, lineHeight: 1.45 }}>
          {hint}
        </span>
      )}
    </label>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div style={{ display: "flex", gap: 8, fontSize: 11.5 }}>
      <span className="mono" style={{ color: "var(--muted)", width: 62, flex: "none" }}>
        {k}
      </span>
      <span className="mono" style={{ flex: 1, minWidth: 0, wordBreak: "break-word" }}>
        {v}
      </span>
    </div>
  );
}
