"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { NavPill } from "@/components/Chrome";
import * as I from "@/components/Icons";

const TEMPLATES = [
  { title: "Summarize customer support", blurb: "Categorize, prioritize, and draft replies." },
  { title: "Triage GitHub issues", blurb: "Auto-label, assign, and assess new issues." },
  { title: "Prep for a sales meeting", blurb: "Research attendees and build a briefing." },
  { title: "Reconcile vendor invoices", blurb: "Match invoices to POs and flag discrepancies." },
  { title: "Post weekly product updates", blurb: "Summarize what shipped each week." },
  { title: "Turn documents into data", blurb: "Extract clean, structured records from files." },
];

const PROJECTS = [
  {
    name: "Mad Men AI Poster Generator",
    href: "/studio",
    live: "v9",
    runs: 21,
    spark: [20, 16, 18, 10, 13, 6, 9, 4],
    modified: "7 min ago",
    starred: true,
  },
  { name: "Tenki Launch Campaign", href: "/studio", modified: "2 days ago" },
  { name: "Engineering Issue Triage", href: "/studio", modified: "8 days ago" },
];

export default function Home() {
  const [prompt, setPrompt] = useState("");
  const router = useRouter();

  const submit = () => {
    const q = prompt.trim();
    router.push(q ? `/studio?prompt=${encodeURIComponent(q)}` : "/studio");
  };

  return (
    <main style={{ minHeight: "100vh", position: "relative" }}>
      <NavPill defaultOpen />

      <div style={{ padding: "76px 28px 40px 296px", maxWidth: 1440, margin: "0 auto" }}>
        <div style={{ maxWidth: 760, margin: "18px auto 0" }}>
          <h1 className="sora" style={{ fontSize: 27, fontWeight: 700, lineHeight: 1.25, margin: 0 }}>
            Welcome, Colin!
            <br />
            What would you like to build today?
          </h1>

          <div className="card" style={{ marginTop: 18, padding: "14px 16px" }}>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) submit();
              }}
              placeholder="Describe your automation"
              rows={2}
              style={{
                width: "100%",
                border: 0,
                outline: "none",
                resize: "none",
                background: "none",
                fontSize: 13.5,
                lineHeight: 1.55,
                minHeight: 44,
              }}
            />
            <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 8 }}>
              <span className="chip" style={{ height: 28, fontWeight: 600, color: "var(--ink)" }}>
                Crew <I.ChevronDown size={12} />
              </span>
              <button
                onClick={submit}
                aria-label="Start building"
                className="btn pri"
                style={{ width: 30, height: 30, padding: 0, justifyContent: "center" }}
              >
                <I.Arrow size={14} />
              </button>
            </div>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
              gap: 10,
              marginTop: 12,
            }}
          >
            {TEMPLATES.map((t) => (
              <button
                key={t.title}
                onClick={() => setPrompt(`${t.title}. ${t.blurb}`)}
                className="card"
                style={{ padding: "12px 14px", textAlign: "left", display: "block" }}
              >
                <div className="sora" style={{ fontSize: 12.5, fontWeight: 600 }}>
                  {t.title}
                </div>
                <div style={{ fontSize: 11.5, color: "var(--muted)", marginTop: 4 }}>{t.blurb}</div>
              </button>
            ))}
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 10,
              marginTop: 14,
              fontSize: 12.5,
              color: "var(--muted)",
            }}
          >
            Don&apos;t know what to build yet?
            <Link href="/discovery" className="btn gho" style={{ height: 28 }}>
              Start from Discovery
            </Link>
          </div>
        </div>

        <section style={{ marginTop: 40 }}>
          <h2 className="sora" style={{ fontSize: 16, fontWeight: 600, margin: 0 }}>
            Recent projects
          </h2>
          <p style={{ fontSize: 12.5, color: "var(--muted)", margin: "2px 0 0" }}>
            Pick up where you left off or start something new
          </p>

          <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 14 }}>
            <div className="field" style={{ maxWidth: 320, height: 32 }}>
              <I.Search size={13} style={{ color: "var(--muted)", flex: "none" }} />
              <input placeholder="Search projects…" />
            </div>
            <span className="seg on">All</span>
            <span className="seg">Mine</span>
            <span className="seg">Shared with me</span>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(250px, 1fr))",
              gap: 12,
              marginTop: 14,
            }}
          >
            <Link
              href="/studio"
              style={{
                border: "1.5px dashed var(--line)",
                borderRadius: "var(--r-card)",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
                minHeight: 176,
                color: "var(--muted)",
                textDecoration: "none",
              }}
            >
              <span
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: 999,
                  background: "var(--surface-2)",
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <I.Plus size={16} />
              </span>
              <span className="sora" style={{ fontSize: 13, fontWeight: 600, color: "var(--ink)" }}>
                Create New
              </span>
              <span style={{ fontSize: 11.5 }}>Start fresh project</span>
            </Link>

            {PROJECTS.map((p) => (
              <Link
                key={p.name}
                href={p.href}
                className="card"
                style={{
                  padding: 16,
                  display: "flex",
                  flexDirection: "column",
                  minHeight: 176,
                  textDecoration: "none",
                  color: "inherit",
                }}
              >
                <div style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
                  <div className="sora" style={{ fontSize: 13.5, fontWeight: 600, flex: 1, lineHeight: 1.35 }}>
                    {p.name}
                  </div>
                  {p.starred && <I.Star size={15} filled style={{ color: "var(--accent)", flex: "none" }} />}
                </div>

                {p.live && (
                  <span className="badge ok" style={{ alignSelf: "flex-start", marginTop: 8 }}>
                    <span className="dot" />
                    LIVE {p.live.toUpperCase()}
                  </span>
                )}

                {p.runs != null && (
                  <>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "baseline",
                        justifyContent: "space-between",
                        marginTop: 14,
                        fontSize: 12,
                        color: "var(--muted)",
                      }}
                    >
                      <span style={{ fontWeight: 600, color: "var(--ink)" }}>{p.runs} runs</span>
                      <span>7 days</span>
                    </div>
                    <svg
                      width="100%"
                      height="26"
                      viewBox="0 0 200 26"
                      preserveAspectRatio="none"
                      style={{ marginTop: 4 }}
                      aria-hidden="true"
                    >
                      <polyline
                        points={p.spark!.map((v, i) => `${(i * 200) / (p.spark!.length - 1)},${v}`).join(" ")}
                        fill="none"
                        stroke="var(--accent)"
                        strokeWidth="2"
                        strokeLinecap="round"
                      />
                    </svg>
                  </>
                )}

                <div style={{ flex: 1 }} />
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    fontSize: 11.5,
                    color: "var(--muted)",
                  }}
                >
                  <span className="chip" style={{ height: 19, fontSize: 10.5 }}>
                    Crew
                  </span>
                  <span style={{ whiteSpace: "nowrap" }}>{p.modified}</span>
                  <span style={{ marginLeft: "auto", fontWeight: 600, color: "var(--accent-ink)" }}>Edit</span>
                </div>
              </Link>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
