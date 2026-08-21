"use client";

import { useEffect, useState } from "react";
import type { CrewSpec } from "@/lib/crew";
import * as I from "./Icons";

function Shell({
  title,
  subtitle,
  icon: Icon,
  onClose,
  children,
  footer,
  width = 880,
}: {
  title: string;
  subtitle?: string;
  icon: React.ElementType;
  onClose: () => void;
  children: React.ReactNode;
  footer?: React.ReactNode;
  width?: number;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="scrim" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: width }} role="dialog" aria-modal="true" aria-label={title}>
        <div style={{ display: "flex", alignItems: "flex-start", gap: 13, padding: "20px 24px 16px" }}>
          <span
            style={{
              width: 38,
              height: 38,
              borderRadius: 10,
              background: "var(--accent-soft)",
              color: "var(--accent-ink)",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              flex: "none",
            }}
          >
            <Icon size={17} />
          </span>
          <div style={{ flex: 1 }}>
            <div className="sora" style={{ fontSize: 16, fontWeight: 600 }}>
              {title}
            </div>
            {subtitle && <div style={{ fontSize: 12.5, color: "var(--muted)", marginTop: 2 }}>{subtitle}</div>}
          </div>
          <button className="ico" onClick={onClose} aria-label="Close">
            <I.X size={16} />
          </button>
        </div>
        <div className="scroll" style={{ padding: "0 24px", flex: 1, minHeight: 0 }}>
          {children}
        </div>
        {footer && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "18px 24px 20px",
              marginTop: 6,
              borderTop: "1px solid var(--line)",
            }}
          >
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}

/* --------------------------- Environment variables --------------------------- */

const SCOPES = ["All", "Project", "Organization", "LLM connection", "Missing"] as const;

export function EnvModal({ spec, onClose }: { spec: CrewSpec; onClose: () => void }) {
  const [scope, setScope] = useState<(typeof SCOPES)[number]>("All");
  const counts: Record<string, number> = { All: 3, Project: 0, Organization: 1, "LLM connection": 2, Missing: 0 };

  const groups = [
    {
      label: "anthropic/claude-sonnet-5, openai/gpt-4o",
      scope: "LLM connection",
      vars: ["ANTHROPIC_API_KEY", "OPENAI_API_KEY"],
    },
    { label: "SerperDevTool", scope: "Organization", vars: spec.envRequirements },
  ].filter((g) => scope === "All" || g.scope === scope || (scope === "Missing" && false));

  return (
    <Shell
      title="Environment variables"
      subtitle="Manage environment variables of this project"
      icon={I.Key}
      onClose={onClose}
      footer={
        <>
          <button className="btn gho" onClick={onClose}>
            Close
          </button>
          <button className="btn gho" style={{ marginLeft: "auto" }}>
            <I.Plus size={13} />
            Add variable
          </button>
          <button className="btn pri" onClick={onClose}>
            Save
          </button>
        </>
      }
    >
      <div className="field">
        <I.Search size={13} style={{ color: "var(--muted)", flex: "none" }} />
        <input placeholder="Search variables…" />
      </div>

      <div style={{ display: "flex", gap: 6, marginTop: 12, flexWrap: "wrap" }}>
        {SCOPES.map((s) => (
          <button
            key={s}
            onClick={() => setScope(s)}
            className={`seg${scope === s ? " on" : ""}`}
            style={{ borderRadius: 999, gap: 6 }}
          >
            {s}
            <span
              style={{
                fontSize: 10.5,
                background: scope === s ? "var(--surface)" : "var(--surface-2)",
                color: scope === s ? "var(--accent-ink)" : "var(--muted)",
                borderRadius: 999,
                padding: "1px 6px",
              }}
            >
              {counts[s]}
            </span>
          </button>
        ))}
      </div>

      {groups.map((g) => (
        <div
          key={g.label}
          style={{ border: "1px solid var(--line)", borderRadius: 10, padding: "14px 16px", marginTop: 12 }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span className="sora" style={{ fontSize: 13, fontWeight: 600 }}>
              {g.label}
            </span>
            <I.CheckCircle size={15} style={{ marginLeft: "auto", color: "var(--ok-ink)" }} />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "250px minmax(0,1fr)", gap: 10, marginTop: 11 }}>
            {g.vars.map((v) => (
              <div key={v} style={{ display: "contents" }}>
                <div className="field mono" style={{ height: 34, fontSize: 11.5, background: "var(--page)" }}>
                  {v}
                </div>
                <div className="field mono" style={{ height: 34, fontSize: 11.5, color: "var(--muted)" }}>
                  Value is set — override if needed
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
      <div style={{ height: 8 }} />
    </Shell>
  );
}

/* --------------------------------- Share --------------------------------- */

export function ShareModal({ onClose }: { onClose: () => void }) {
  return (
    <Shell
      title="Share project"
      subtitle="Anyone you add can open this automation in Studio"
      icon={I.Share}
      onClose={onClose}
      width={520}
      footer={
        <button className="btn pri" style={{ marginLeft: "auto" }} onClick={onClose}>
          Done
        </button>
      }
    >
      <div className="field">
        <I.Search size={13} style={{ color: "var(--muted)", flex: "none" }} />
        <input placeholder="Add people or roles…" autoFocus />
      </div>
      <div style={{ border: "1px solid var(--line)", borderRadius: 10, marginTop: 10, overflow: "hidden" }}>
        {[
          { label: "Member Role", sub: "Can edit and run" },
          { label: "Owner Role", sub: "Can edit, run, deploy and share" },
        ].map((r) => (
          <button
            key={r.label}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 11,
              padding: "11px 14px",
              width: "100%",
              textAlign: "left",
              borderBottom: "1px solid var(--line)",
            }}
          >
            <span
              style={{
                width: 30,
                height: 30,
                borderRadius: 999,
                background: "var(--surface-2)",
                color: "var(--muted)",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <I.People size={15} />
            </span>
            <span>
              <span className="sora" style={{ fontSize: 13, fontWeight: 600, display: "block" }}>
                {r.label}
              </span>
              <span style={{ fontSize: 11.5, color: "var(--muted)" }}>{r.sub}</span>
            </span>
          </button>
        ))}
      </div>
      <div style={{ height: 12 }} />
    </Shell>
  );
}

/* --------------------------------- Inputs --------------------------------- */

export function InputsModal({
  spec,
  initial,
  onCancel,
  onRun,
}: {
  spec: CrewSpec;
  initial: Record<string, string>;
  onCancel: () => void;
  onRun: (inputs: Record<string, string>) => void;
}) {
  const [values, setValues] = useState<Record<string, string>>({
    ...Object.fromEntries(spec.inputs.map((k) => [k, ""])),
    ...initial,
  });

  return (
    <Shell
      title="Run automation"
      subtitle="These inputs are interpolated into every task prompt inside the sandbox"
      icon={I.Play}
      onClose={onCancel}
      width={520}
      footer={
        <>
          <button className="btn gho" onClick={onCancel}>
            Cancel
          </button>
          <button
            className="btn pri"
            style={{ marginLeft: "auto" }}
            onClick={() => onRun(values)}
            disabled={spec.inputs.some((k) => !values[k]?.trim())}
          >
            <I.Play size={12} />
            Run crew
          </button>
        </>
      }
    >
      {spec.inputs.map((key) => (
        <label key={key} style={{ display: "block", marginBottom: 12 }}>
          <span className="mono" style={{ fontSize: 11.5, color: "var(--muted)" }}>
            {key}
          </span>
          <div className="field" style={{ marginTop: 5 }}>
            <input
              autoFocus
              value={values[key] ?? ""}
              placeholder="Tenki.cloud"
              onChange={(e) => setValues((v) => ({ ...v, [key]: e.target.value }))}
            />
          </div>
        </label>
      ))}
      <p style={{ fontSize: 12, color: "var(--muted)", lineHeight: 1.55 }}>
        A fresh sandbox is created for this run and destroyed when it finishes. Nothing the crew writes
        touches your machine.
      </p>
      <div style={{ height: 4 }} />
    </Shell>
  );
}
