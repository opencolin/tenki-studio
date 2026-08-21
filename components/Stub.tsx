"use client";

import Link from "next/link";
import { PageShell } from "./Chrome";
import * as I from "./Icons";

export function Stub({
  breadcrumb,
  title,
  blurb,
  icon,
  planned,
}: {
  breadcrumb: string;
  title: string;
  blurb: string;
  icon: React.ElementType;
  planned: string[];
}) {
  return (
    <PageShell breadcrumb={breadcrumb} title={title} icon={icon}>
      <div className="card" style={{ padding: "40px 36px", textAlign: "center" }}>
        <span
          style={{
            width: 46,
            height: 46,
            borderRadius: 12,
            background: "var(--surface-2)",
            color: "var(--muted)",
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <I.Box size={20} />
        </span>
        <h2 className="sora" style={{ fontSize: 16, fontWeight: 600, margin: "14px 0 0" }}>
          Not built yet
        </h2>
        <p
          style={{
            fontSize: 13,
            color: "var(--muted)",
            lineHeight: 1.6,
            margin: "8px auto 0",
            maxWidth: 460,
          }}
        >
          {blurb}
        </p>

        <div
          style={{
            display: "inline-flex",
            flexDirection: "column",
            gap: 8,
            margin: "22px auto 0",
            textAlign: "left",
          }}
        >
          {planned.map((p) => (
            <div key={p} style={{ display: "flex", gap: 9, fontSize: 12.5, color: "var(--muted)" }}>
              <I.ChevronRight size={12} style={{ color: "var(--accent)", flex: "none", marginTop: 3 }} />
              {p}
            </div>
          ))}
        </div>

        <div style={{ marginTop: 26 }}>
          <Link href="/studio" className="btn pri lg">
            Back to Studio
          </Link>
        </div>
      </div>
    </PageShell>
  );
}
