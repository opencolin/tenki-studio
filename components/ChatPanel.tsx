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

const SEED: ChatMessage[] = [
  {
    id: 1,
    from: "user",
    text:
      "All right, you're going to build a marketing and advertising agency similar to Sterling Cooper from Mad Men. There will be a Don Draper-style creative director, account executives that bring in customers, copywriters, and artists that create art.",
  },
  {
    id: 2,
    from: "copilot",
    text: "Love it. I've set up a Sterling Cooper-style agency with four agents in a sequential workflow.",
    thought:
      "The user wants an agency with distinct roles. A sequential crew maps cleanly: discovery → strategy → art direction → copy. Each role becomes an agent with one task, and the tasks chain through context.",
    checklist: [
      { label: "Getting the state of the automation", done: true },
      { label: "Getting the list of ready-to-use tools", done: true },
    ],
    change: {
      title: "New Agent · Mad Men Advertising Historian",
      bullets: [
        ["Deep knowledge", "expert on 92+ campaigns from the show"],
        ["Strategic insight", "knows why “It's toasted” and “The Carousel” worked"],
        ["Modern application", "adapts classic techniques for today's brands"],
      ],
      workflow: ["References proven Mad Men techniques", "Avoids approaches that historically failed"],
    },
  },
];

/** Canned copilot replies — the shape a real tool-calling loop would stream. */
function reply(input: string, id: number): ChatMessage {
  const q = input.toLowerCase();
  if (q.includes("run") || q.includes("test")) {
    return {
      id,
      from: "copilot",
      text:
        "Starting a run. The sandbox boots from your project snapshot, so the first timeline event should land in about a second — watch the Output tab.",
      checklist: [
        { label: "Checked required inputs", done: true },
        { label: "Created sandbox from snapshot proj-mad-men-v9", done: true },
      ],
    };
  }
  if (q.includes("faster") || q.includes("slow") || q.includes("speed")) {
    return {
      id,
      from: "copilot",
      text:
        "The discovery task is the long pole — one 20.6s synthesis call after two quick searches. I can split it into a short summary task, or move that agent to a lighter model. Which would you prefer?",
    };
  }
  if (q.includes("tool") || q.includes("peggy")) {
    return {
      id,
      from: "copilot",
      text: "Peggy has no tools, which is why the canvas is showing a warning. Want me to give her Serper search plus the sandbox file writer?",
      checklist: [{ label: "Inspected agent agt_peggy", done: true }],
    };
  }
  return {
    id,
    from: "copilot",
    text:
      "Got it. I can add agents, rewire tasks, switch the process to hierarchical, or run the crew and read the trace back to you — tell me which and I'll apply it as a new version.",
    checklist: [{ label: "Getting the state of the automation", done: true }],
  };
}

export function ChatPanel({
  onRun,
  suggestion,
  onSuggestion,
}: {
  onRun: () => void;
  suggestion: boolean;
  onSuggestion: () => void;
}) {
  const [messages, setMessages] = useState<ChatMessage[]>(SEED);
  const [draft, setDraft] = useState("");
  const [openThought, setOpenThought] = useState<number | null>(null);
  const [dismissed, setDismissed] = useState(false);
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
    const wantsRun = /\brun\b|\btest\b/i.test(text);
    setTimeout(() => {
      setMessages((m) => [...m, reply(text, id + 1)]);
      if (wantsRun) onRun();
    }, 550);
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
      </header>

      <div ref={scrollRef} className="scroll" style={{ flex: 1, minHeight: 0, padding: "12px 14px" }}>
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

      {suggestion && !dismissed && (
        <div
          style={{
            margin: "0 14px 10px",
            border: "1px solid var(--line)",
            borderRadius: 10,
            padding: "10px 12px",
            background: "var(--page)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span className="chip" style={{ height: 20, fontSize: 10.5, fontWeight: 600 }}>
              <span style={{ width: 6, height: 6, borderRadius: 999, background: "var(--accent)" }} />
              Suggestion
            </span>
            <button
              onClick={() => setDismissed(true)}
              style={{ fontSize: 11, color: "var(--muted)", fontWeight: 600 }}
            >
              Dismiss
            </button>
          </div>
          <button
            className="btn ink"
            style={{ width: "100%", justifyContent: "center", marginTop: 9 }}
            onClick={() => {
              onSuggestion();
              setMessages((m) => [
                ...m,
                { id: m.length + 1, from: "user", text: "Improve the automation based on the last run." },
                {
                  id: m.length + 2,
                  from: "copilot",
                  text:
                    "Discovery spent 20.6s in one synthesis call. I'd split it into a research task and a briefing task so the second can start from a shorter context, and give Peggy the Serper tool so her prompt isn't written blind.",
                  checklist: [
                    { label: "Read run trace (37 events)", done: true },
                    { label: "Compared task durations", done: true },
                  ],
                },
              ]);
            }}
          >
            <I.Sparkle size={12} />
            Improve automation based on last run
          </button>
        </div>
      )}

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
