"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import * as I from "./Icons";

const SECTIONS: { label: string; items: { href: string; label: string; icon: React.ElementType; soon?: boolean; beta?: boolean }[] }[] = [
  {
    label: "Build",
    items: [
      { href: "/discovery", label: "Discovery", icon: I.Bolt, beta: true },
      { href: "/automations", label: "Automations", icon: I.Stack },
      { href: "/studio", label: "Studio", icon: I.Pencil },
      { href: "/agents", label: "Agents Repository", icon: I.People, soon: true },
      { href: "/tools", label: "Tools & Integrations", icon: I.Wrench },
      { href: "/skills", label: "Skills Repository", icon: I.Book, soon: true },
    ],
  },
  {
    label: "Operate",
    items: [
      { href: "/traces", label: "Traces", icon: I.Waves },
      { href: "/connections", label: "LLM Connections", icon: I.Link },
      { href: "/environment", label: "Environment Variables", icon: I.Key },
    ],
  },
  {
    label: "Manage",
    items: [
      { href: "/usage", label: "Usage", icon: I.Chart },
      { href: "/billing", label: "Billing", icon: I.Card, soon: true },
      { href: "/settings", label: "Settings", icon: I.Gear, soon: true },
    ],
  },
];

function useTheme() {
  const [theme, setTheme] = useState<"light" | "dark" | null>(null);
  useEffect(() => {
    const stored = typeof window !== "undefined" ? localStorage.getItem("tenki-theme") : null;
    if (stored === "dark" || stored === "light") setTheme(stored);
  }, []);
  const toggle = () => {
    const current =
      theme ??
      (typeof window !== "undefined" && window.matchMedia("(prefers-color-scheme: dark)").matches
        ? "dark"
        : "light");
    const next = current === "dark" ? "light" : "dark";
    document.documentElement.dataset.theme = next;
    localStorage.setItem("tenki-theme", next);
    setTheme(next);
  };
  return { theme, toggle };
}

/**
 * The Figma-style floating nav: a pill that expands into a panel.
 * `project` renders the org › project breadcrumb used inside the editor.
 */
export function NavPill({ project, defaultOpen = false }: { project?: string; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  const pathname = usePathname();
  const ref = useRef<HTMLDivElement>(null);
  const { theme, toggle } = useTheme();

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={ref} style={{ position: "absolute", top: 12, left: 12, zIndex: 40 }}>
      <div className="bar" style={{ position: "static", height: 38, gap: 8, padding: "0 6px" }}>
        <Link
          href="/"
          aria-label="Tenki Studio home"
          style={{
            width: 24,
            height: 24,
            borderRadius: 7,
            background: "var(--accent)",
            color: "var(--on-accent)",
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            flex: "none",
          }}
        >
          <I.Cloud size={14} />
        </Link>
        <span style={{ fontSize: 12.5, color: "var(--muted)" }}>Dabl Club</span>
        {project && (
          <>
            <I.ChevronRight size={11} style={{ color: "var(--muted)", flex: "none" }} />
            <span
              className="sora"
              style={{
                fontSize: 12.5,
                fontWeight: 600,
                maxWidth: 230,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
              title={project}
            >
              {project}
            </span>
          </>
        )}
        <I.ChevronDown size={12} style={{ color: "var(--muted)", flex: "none" }} />
        <span className="bar-div" />
        <button
          className={`ico sm${open ? " on" : ""}`}
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-label={open ? "Close navigation" : "Open navigation"}
        >
          <I.PanelIcon size={15} />
        </button>
      </div>

      {open && (
        <div
          className="card"
          style={{
            marginTop: 8,
            width: 248,
            padding: 10,
            boxShadow: "var(--shadow-panel)",
          }}
        >
          {SECTIONS.map((section) => (
            <div key={section.label}>
              <div className="eyebrow" style={{ fontSize: 10, padding: "8px 6px 4px" }}>
                {section.label}
              </div>
              {section.items.map((item) => {
                const active = pathname === item.href || pathname.startsWith(item.href + "/");
                const Icon = item.icon;
                const content = (
                  <>
                    <Icon
                      size={14}
                      style={{ flex: "none", opacity: active ? 1 : 0.7, color: active ? "var(--accent)" : undefined }}
                    />
                    <span style={{ flex: 1 }}>{item.label}</span>
                    {item.beta && (
                      <span className="chip" style={{ height: 17, padding: "0 6px", fontSize: 9.5 }}>
                        Beta
                      </span>
                    )}
                    {item.soon && (
                      <span style={{ fontSize: 10, color: "var(--muted)" }}>Soon</span>
                    )}
                  </>
                );
                const style: React.CSSProperties = {
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "6px 8px",
                  borderRadius: 8,
                  fontSize: 12.5,
                  fontWeight: 500,
                  width: "100%",
                  color: active ? "var(--ink)" : "var(--muted)",
                  background: active ? "var(--surface-2)" : undefined,
                  textDecoration: "none",
                };
                return item.soon ? (
                  <div key={item.href} style={{ ...style, cursor: "default" }}>
                    {content}
                  </div>
                ) : (
                  <Link key={item.href} href={item.href} style={style} onClick={() => setOpen(false)}>
                    {content}
                  </Link>
                );
              })}
            </div>
          ))}

          <div style={{ borderTop: "1px solid var(--line)", marginTop: 10, paddingTop: 8 }}>
            <button
              onClick={toggle}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: "6px 8px",
                borderRadius: 8,
                fontSize: 12.5,
                fontWeight: 500,
                width: "100%",
                color: "var(--muted)",
              }}
            >
              {theme === "dark" ? <I.Sun size={14} /> : <I.Moon size={14} />}
              <span style={{ flex: 1, textAlign: "left" }}>
                {theme === "dark" ? "Light theme" : "Dark theme"}
              </span>
            </button>
            <a
              href="https://github.com/opencolin/tenki-studio"
              target="_blank"
              rel="noreferrer"
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: "6px 8px",
                borderRadius: 8,
                fontSize: 12.5,
                fontWeight: 500,
                color: "var(--muted)",
                textDecoration: "none",
              }}
            >
              <I.Code size={14} />
              <span style={{ flex: 1 }}>Source on GitHub</span>
              <I.External size={12} />
            </a>
          </div>
        </div>
      )}
    </div>
  );
}

/** Page shell for the non-editor screens: floating pill over a plain page. */
export function PageShell({
  breadcrumb,
  title,
  subtitle,
  actions,
  icon: Icon,
  children,
}: {
  breadcrumb: string;
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
  icon?: React.ElementType;
  children: React.ReactNode;
}) {
  return (
    <main style={{ minHeight: "100vh", position: "relative" }}>
      <NavPill />
      <div className="page-wrap">
        <div style={{ fontSize: 12.5, color: "var(--muted)" }}>{breadcrumb}</div>
        <div style={{ display: "flex", alignItems: "flex-start", gap: 16, margin: "10px 0 22px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 13, flex: 1, minWidth: 0 }}>
            {Icon && (
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
            )}
            <div style={{ minWidth: 0 }}>
              <h1 className="sora" style={{ fontSize: 20, fontWeight: 600, margin: 0 }}>
                {title}
              </h1>
              {subtitle && (
                <p style={{ fontSize: 12.5, color: "var(--muted)", margin: "3px 0 0" }}>{subtitle}</p>
              )}
            </div>
          </div>
          {actions && <div style={{ display: "flex", gap: 8, flex: "none" }}>{actions}</div>}
        </div>
        {children}
      </div>
    </main>
  );
}
