"use client";

import { useEffect, useState } from "react";
import { formatBytes, type Artifact } from "@/lib/artifacts";
import * as I from "./Icons";

function iconFor(a: Artifact) {
  return a.kind === "image" ? I.Image : I.File;
}

/** Rows under the run's Artifacts heading. Clicking one opens the viewer. */
export function ArtifactList({ artifacts }: { artifacts: Artifact[] }) {
  const [open, setOpen] = useState<Artifact | null>(null);

  if (artifacts.length === 0) return null;

  return (
    <>
      <div className="eyebrow" style={{ marginTop: 18 }}>
        Artifacts
      </div>
      {artifacts.map((a) => {
        const Icon = iconFor(a);
        return (
          <div
            key={a.name}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              padding: "11px 4px",
              borderBottom: "1px solid var(--line)",
            }}
          >
            <button
              onClick={() => setOpen(a)}
              style={{ display: "flex", alignItems: "center", gap: 12, flex: 1, minWidth: 0, textAlign: "left" }}
              aria-label={`Open ${a.name}`}
            >
              {a.kind === "image" ? (
                <img
                  src={a.url}
                  alt=""
                  style={{
                    width: 34,
                    height: 46,
                    objectFit: "cover",
                    borderRadius: 5,
                    border: "1px solid var(--line)",
                    flex: "none",
                    background: "var(--surface-2)",
                  }}
                />
              ) : (
                <span
                  style={{
                    width: 34,
                    height: 46,
                    borderRadius: 5,
                    background: "var(--accent-soft)",
                    color: "var(--accent-ink)",
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flex: "none",
                  }}
                >
                  <Icon size={15} />
                </span>
              )}
              <span style={{ flex: 1, minWidth: 0 }}>
                <span className="mono" style={{ fontSize: 12, display: "block" }}>
                  {a.name}
                </span>
                <span style={{ fontSize: 11, color: "var(--muted)", marginTop: 2, display: "block" }}>
                  {a.source} · {formatBytes(a.size)}
                </span>
              </span>
            </button>
            <a
              href={a.url}
              download={a.name.split("/").pop()}
              className="btn gho"
              style={{ height: 28, fontSize: 12, flex: "none" }}
              onClick={(e) => e.stopPropagation()}
            >
              <I.Download size={13} />
              Download
            </a>
          </div>
        );
      })}

      {open && <ArtifactViewer artifact={open} onClose={() => setOpen(null)} />}
    </>
  );
}

export function ArtifactViewer({ artifact, onClose }: { artifact: Artifact; onClose: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="scrim" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div
        className="modal"
        style={{ maxWidth: artifact.kind === "image" ? 720 : 820 }}
        role="dialog"
        aria-modal="true"
        aria-label={artifact.name}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            padding: "16px 20px",
            borderBottom: "1px solid var(--line)",
          }}
        >
          <span
            style={{
              width: 32,
              height: 32,
              borderRadius: 8,
              background: "var(--accent-soft)",
              color: "var(--accent-ink)",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              flex: "none",
            }}
          >
            {artifact.kind === "image" ? <I.Image size={15} /> : <I.File size={15} />}
          </span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="mono" style={{ fontSize: 12.5, fontWeight: 600 }}>
              {artifact.name}
            </div>
            <div style={{ fontSize: 11.5, color: "var(--muted)", marginTop: 2 }}>
              {artifact.mime} · {formatBytes(artifact.size)} · {artifact.source}
            </div>
          </div>
          <a
            href={artifact.url}
            download={artifact.name.split("/").pop()}
            className="btn pri"
            style={{ flex: "none" }}
          >
            <I.Download size={13} />
            Download
          </a>
          <button className="ico" onClick={onClose} aria-label="Close">
            <I.X size={16} />
          </button>
        </div>

        <div
          className="scroll"
          style={{
            flex: 1,
            minHeight: 0,
            padding: artifact.kind === "image" ? 22 : 0,
            background: artifact.kind === "image" ? "var(--surface-2)" : undefined,
            display: artifact.kind === "image" ? "flex" : undefined,
            justifyContent: "center",
            alignItems: "flex-start",
          }}
        >
          {artifact.kind === "image" ? (
            <img
              src={artifact.url}
              alt={`Preview of ${artifact.name}`}
              style={{
                maxWidth: "100%",
                borderRadius: 6,
                boxShadow: "var(--shadow-panel)",
                background: "var(--surface)",
              }}
            />
          ) : (
            <pre
              className="mono"
              style={{
                margin: 0,
                padding: "18px 22px",
                fontSize: 12,
                lineHeight: 1.6,
                whiteSpace: "pre-wrap",
                wordBreak: "break-word",
              }}
            >
              {artifact.text}
            </pre>
          )}
        </div>
      </div>
    </div>
  );
}
