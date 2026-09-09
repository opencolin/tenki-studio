"use client";

import Link from "next/link";
import { PageShell } from "@/components/Chrome";
import * as I from "@/components/Icons";

export default function AutomationsPage() {
  // Deploying a crew as a standing, addressable automation is not built. This
  // page says so rather than listing automations that were never deployed.
  return (
    <PageShell
      breadcrumb="Automations"
      title="Automations"
      subtitle="Deployed crews with their own URL and API key"
      icon={I.Stack}
    >
      <div className="card" style={{ padding: "48px 24px", textAlign: "center" }}>
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
          <I.Stack size={18} />
        </span>
        <div className="sora" style={{ fontSize: 15, fontWeight: 600, marginTop: 12 }}>
          Deployment isn&apos;t built yet
        </div>
        <p
          style={{
            fontSize: 12.5,
            color: "var(--muted)",
            lineHeight: 1.6,
            margin: "8px auto 0",
            maxWidth: 440,
          }}
        >
          Nothing has been deployed, so there is nothing to list. A crew today runs on demand: open it
          in the Studio and hit Run, and it executes real CrewAI agents inside a Tenki sandbox. Turning
          a crew into a standing endpoint with its own API key is still ahead.
        </p>
        <div style={{ display: "inline-flex", gap: 8, marginTop: 16 }}>
          <Link href="/studio" className="btn pri" style={{ height: 32, fontSize: 12.5 }}>
            <I.Pencil size={12} />
            Open the Studio
          </Link>
          <Link href="/traces" className="btn gho" style={{ height: 32, fontSize: 12.5 }}>
            <I.Waves size={12} />
            See past runs
          </Link>
        </div>
      </div>
    </PageShell>
  );
}
