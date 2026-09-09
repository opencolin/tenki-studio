"use client";

import { useEffect, useRef, useState } from "react";
import * as I from "./Icons";

export interface ChatMessage {
  id: number;
  from: "user" | "copilot";
  text: string;
  checklist?: { label: string; done: boolean }[];
  change?: { title: string; bullets: [string, string][]; workflow: string[] };
  thought?: string;
}

/** The copilot has no backend yet, so the panel opens empty rather than on a
 *  conversation that never happened. */
const SEED: ChatMessage[] = [];

/** The only honest answer available until a copilot backend exists. Typing at
 *  the copilot must not produce invented tool calls or invented findings. */
function reply(id: number): ChatMessage {
  return {
    id,
    from: "copilot",
    text:
      "The studio copilot isn't connected yet, so it can't read or edit your crew — anything it told you here would be invented. " +
      "What does work: edit agents and tasks on the canvas, then hit Run to execute the crew for real in the sandbox.",
  };
}

export function ChatPanel({ onRun, onCollapse }: { onRun: () => void; onCollapse: () => void }) {
  const [messages, setMessages] = useState<ChatMessage[]>(SEED);
  const [draft, setDraft] = useState("");
  const [openThought, setOpenThought] = useState<number | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  const send = () => {
    const text = draft.trim();
    if (!text) return;
    const id = messages.length + 1;
    setMessages((m) => [...m, { id, from: "user", text }]);
    setDraft("");
    // "Run" is the one thing the copilot can genuinely do: open the real run
    // dialog. Everything else it would have to make up, so it says so instead.
    const wantsRun = /\brun\b|\btest\b/i.test(text);
    setMessages((m) => [...m, reply(id + 1)]);
    if (wantsRun) onRun();
  };

  return (
    <aside
      style={{
        position: "absolute",
        zIndex: 20,
        top: 12,
        right: 12,
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
      aria-label="Studio Chat"
    >
      <header
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          padding: "11px 14px",
          borderBottom: "1px solid var(--line)",
        }}
      >
        <I.Sparkle size={15} style={{ color: "var(--accent)" }} />
        <span className="sora" style={{ fontSize: 13.5, fontWeight: 600, flex: 1 }}>
          Studio Chat
        </span>
        <button className="ico" style={{ width: 26, height: 26 }} aria-label="Chat history">
          <I.Clock size={15} />
        </button>
        <button
          className="ico"
          style={{ width: 26, height: 26 }}
          aria-label="New chat"
          onClick={() => setMessages(SEED)}
        >
          <I.Plus size={15} />
        </button>
        <button
          className="ico"
          style={{ width: 26, height: 26 }}
          aria-label="Collapse Studio Chat"
          title="Collapse chat"
          onClick={onCollapse}
        >
          <I.ChevronRight size={15} />
        </button>
      </header>

      <div ref={scrollRef} className="scroll" style={{ flex: 1, minHeight: 0, padding: "12px 14px" }}>
        {messages.length === 0 && (
          <div style={{ padding: "8px 2px" }}>
            <div className="sora" style={{ fontSize: 13, fontWeight: 600 }}>
              Not connected yet
            </div>
            <p style={{ fontSize: 12.5, color: "var(--muted)", lineHeight: 1.55, marginTop: 6 }}>
              The copilot that edits crews from a description isn&apos;t wired up. The canvas and the
              Run button are — a run executes real CrewAI agents inside a Tenki sandbox and streams
              back what actually happens.
            </p>
          </div>
        )}
        {messages.map((m) => (
          <div key={m.id} style={{ marginBottom: 12 }}>
            {m.from === "user" ? (
              <div
                style={{
                  background: "var(--surface-2)",
                  borderRadius: 10,
                  padding: "10px 12px",
                  fontSize: 12.5,
                  lineHeight: 1.5,
                }}
              >
                {m.text}
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {m.thought && (
                  <div>
                    <button
                      onClick={() => setOpenThought(openThought === m.id ? null : m.id)}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 7,
                        fontSize: 12,
                        color: "var(--muted)",
                      }}
                      aria-expanded={openThought === m.id}
                    >
                      {openThought === m.id ? <I.ChevronDown size={11} /> : <I.ChevronRight size={11} />}
                      Thought process
                    </button>
                    {openThought === m.id && (
                      <p
                        style={{
                          fontSize: 12,
                          color: "var(--muted)",
                          lineHeight: 1.55,
                          margin: "6px 0 0",
                          paddingLeft: 18,
                          borderLeft: "2px solid var(--line)",
                        }}
                      >
                        {m.thought}
                      </p>
                    )}
                  </div>
                )}

                {m.checklist && (
                  <div>
                    {m.checklist.map((c) => (
                      <div
                        key={c.label}
                        style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12.5, padding: "3px 0" }}
                      >
                        <span
                          style={{
                            width: 16,
                            height: 16,
                            borderRadius: 999,
                            background: "var(--ok-soft)",
                            color: "var(--ok-ink)",
                            display: "inline-flex",
                            alignItems: "center",
                            justifyContent: "center",
                            flex: "none",
                          }}
                        >
                          <I.Check size={9} />
                        </span>
                        {c.label}
                      </div>
                    ))}
                  </div>
                )}

                <div style={{ fontSize: 12.5, lineHeight: 1.5 }}>{m.text}</div>

                {m.change && (
                  <div style={{ border: "1px solid var(--line)", borderRadius: 10, padding: "11px 12px" }}>
                    <div className="sora" style={{ fontSize: 12, fontWeight: 600, color: "var(--accent-ink)" }}>
                      {m.change.title}
                    </div>
                    <div style={{ fontSize: 11.5, color: "var(--muted)", lineHeight: 1.6, marginTop: 5 }}>
                      {m.change.bullets.map(([k, v]) => (
                        <div key={k}>
                          <b style={{ color: "var(--ink)" }}>{k}:</b> {v}
                        </div>
                      ))}
                    </div>
                    <div style={{ borderTop: "1px solid var(--line)", marginTop: 9, paddingTop: 8 }}>
                      <div className="sora" style={{ fontSize: 11.5, fontWeight: 600 }}>
                        Enhanced workflow
                      </div>
                      {m.change.workflow.map((w) => (
                        <div
                          key={w}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 8,
                            fontSize: 11.5,
                            color: "var(--muted)",
                            padding: "3px 0",
                          }}
                        >
                          <I.Check size={11} style={{ color: "var(--ok-ink)", flex: "none" }} />
                          {w}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      <div style={{ margin: "0 14px 14px", border: "1px solid var(--line)", borderRadius: 10, padding: "10px 12px" }}>
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              send();
            }
          }}
          placeholder="Describe your automation"
          rows={2}
          style={{
            width: "100%",
            border: 0,
            outline: "none",
            resize: "none",
            background: "none",
            fontSize: 12.5,
            lineHeight: 1.5,
            minHeight: 34,
          }}
        />
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <button className="ico" style={{ width: 26, height: 26 }} aria-label="Attach a file">
            <I.Clip size={15} />
          </button>
          <button className="btn pri" style={{ height: 28, fontSize: 12 }} onClick={send}>
            Send
            <I.Arrow size={12} />
          </button>
        </div>
      </div>
    </aside>
  );
}
