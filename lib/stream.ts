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

    if (wire.type === "provisioning") handlers.onStatus("provisioning");
    else if (wire.type === "run_completed") handlers.onStatus("completed");
    else if (wire.type === "run_failed") handlers.onStatus("stopped");
    else handlers.onStatus("running");
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

/** Reads `?stream=` and `?run=` if the studio was opened against a live run. */
export function liveRunFromLocation(): { base: string; runId: string } | null {
  if (typeof window === "undefined") return null;
  const params = new URLSearchParams(window.location.search);
  const base = params.get("stream");
  const runId = params.get("run");
  return base && runId ? { base, runId } : null;
}
