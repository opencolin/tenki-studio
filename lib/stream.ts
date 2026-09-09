/**
 * Live run streaming.
 *
 * Connects the studio to a real event source — the Phase 0 ingest service, and
 * later the orchestrator — instead of the scripted simulator. The wire format is
 * PRD §10.3; this module's whole job is turning it into the `RunEvent` shape the
 * Output and Traces views already read, so neither view knows the difference.
 *
 * Open the studio with `?stream=<ingest-base>&run=<run_id>` to use it.
 */

import type { RunEvent, RunState } from "./run";

/** One event as it arrives on the wire. */
interface WireEvent {
  run_id: string;
  seq: number;
  ts: string;
  type: string;
  label: string;
  agent_id?: string;
  task_id?: string;
  duration_ms?: number;
  payload?: Record<string, unknown>;
}

export interface StreamHandle {
  close: () => void;
}

const asText = (v: unknown) =>
  v == null ? undefined : typeof v === "string" ? v : JSON.stringify(v, null, 2);

function toRunEvent(wire: WireEvent, originMs: number): RunEvent {
  const payload = wire.payload ?? {};
  return {
    seq: wire.seq,
    at: Math.max(0, Date.parse(wire.ts) - originMs),
    type: wire.type as RunEvent["type"],
    taskId: wire.task_id,
    agentId: wire.agent_id,
    label: wire.label,
    durationMs: wire.duration_ms,
    detail: {
      description: asText(payload.description),
      prompt: asText(payload.prompt),
      input: asText(payload.input),
      output: asText(payload.output),
      error: asText(payload.error),
    },
  };
}

/**
 * Subscribe to a run. Heartbeats never reach the UI — they exist so the caller
 * can tell "still working" from "died", which is the only way to detect a lost
 * runner: a killed process sends no terminal event, it simply stops.
 */
export function subscribeToRun(
  base: string,
  runId: string,
  handlers: {
    onEvent: (event: RunEvent) => void;
    onStatus: (status: RunState["status"]) => void;
    onHeartbeat?: () => void;
    onError?: (message: string) => void;
    /** The run reached a terminal event: there is nothing more to stream. */
    onDone?: (status: "completed" | "failed") => void;
  },
): StreamHandle {
  const url = `${base.replace(/\/$/, "")}/stream/${encodeURIComponent(runId)}?after=0`;
  let origin: number | null = null;
  let closed = false;

  const source = new EventSource(url);

  source.onopen = () => handlers.onStatus("running");

  source.onmessage = (message) => {
    let wire: WireEvent;
    try {
      wire = JSON.parse(message.data);
    } catch {
      return;
    }
    if (origin === null) origin = Date.parse(wire.ts);

    if (wire.type === "heartbeat") {
      handlers.onHeartbeat?.();
      return;
    }

    handlers.onEvent(toRunEvent(wire, origin));

    if (wire.type === "provisioning") {
      handlers.onStatus("provisioning");
    } else if (wire.type === "run_completed" || wire.type === "run_failed") {
      const status = wire.type === "run_completed" ? "completed" : "failed";
      handlers.onStatus(status);
      handlers.onDone?.(status);
    } else {
      handlers.onStatus("running");
    }
  };

  source.addEventListener("end", () => {
    closed = true;
    source.close();
  });

  source.onerror = () => {
    // EventSource reconnects on its own and the server replays from
    // Last-Event-ID, so a blip is not an error worth surfacing — only a
    // connection that never opened is.
    if (!closed && source.readyState === EventSource.CLOSED) {
      handlers.onError?.("Lost the event stream and could not reconnect.");
    }
  };

  return {
    close: () => {
      closed = true;
      source.close();
    },
  };
}

/**
 * Ask the orchestrator to start a real run. Returns as soon as the runner is
 * detached — the run's progress arrives on the event stream, not here.
 */
export async function startRun(
  base: string,
  crew: unknown,
  inputs: Record<string, string>,
): Promise<string> {
  const res = await fetch(`${base.replace(/\/$/, "")}/runs`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ crew, inputs }),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body.error ?? `orchestrator returned ${res.status}`);
  return body.run_id as string;
}

/** Where the orchestrator lives. Same-origin through the proxy by default. */
export function orchestratorBase(): string {
  if (typeof window === "undefined") return "/_events";
  return new URLSearchParams(window.location.search).get("stream") ?? "/_events";
}

/** Reads `?stream=` and `?run=` if the studio was opened against a live run. */
export function liveRunFromLocation(): { base: string; runId: string } | null {
  if (typeof window === "undefined") return null;
  const params = new URLSearchParams(window.location.search);
  const base = params.get("stream");
  const runId = params.get("run");
  return base && runId ? { base, runId } : null;
}

/** One finished or in-flight run, summarised from its own event log. */
export interface RunSummary {
  runId: string;
  status: "running" | "completed" | "failed";
  events: number;
  startedAt: number | null;
  durationMs: number | null;
  inputs: Record<string, string>;
}

/**
 * Every run the orchestrator knows about. There is no separate run database:
 * the event log is the record, so a summary is derived from it rather than
 * stored alongside it — which means this page cannot drift from what happened.
 */
export async function listRuns(base: string): Promise<RunSummary[]> {
  const root = base.replace(/\/$/, "");
  const index = await fetch(`${root}/runs`).then((r) => r.json());
  const ids: string[] = Object.keys(index.runs ?? {});

  const summaries = await Promise.all(
    ids.map(async (runId): Promise<RunSummary | null> => {
      try {
        const body = await fetch(`${root}/events/${encodeURIComponent(runId)}?after=0`).then((r) =>
          r.json(),
        );
        const events: WireEvent[] = body.events ?? [];
        if (events.length === 0) return null;

        const terminal = events.find((e) => e.type === "run_completed" || e.type === "run_failed");
        const first = Date.parse(events[0].ts);
        const last = Date.parse(events[events.length - 1].ts);
        const started = events.find((e) => e.type === "run_started");

        return {
          runId,
          status: !terminal ? "running" : terminal.type === "run_completed" ? "completed" : "failed",
          events: events.length,
          startedAt: Number.isNaN(first) ? null : first,
          durationMs: Number.isNaN(first) || Number.isNaN(last) ? null : last - first,
          inputs: (started?.payload?.inputs as Record<string, string>) ?? {},
        };
      } catch {
        return null;
      }
    }),
  );

  return summaries
    .filter((s): s is RunSummary => s !== null)
    .sort((a, b) => (b.startedAt ?? 0) - (a.startedAt ?? 0));
}
