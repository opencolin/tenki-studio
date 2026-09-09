/** Run state and the event schema (PRD §10.3).
 *
 *  Events come from the orchestrator over SSE; it receives them from
 *  `runner/tenki_runner.py` inside the sandbox, driving real CrewAI. There is
 *  no simulated path — a run either executes or fails and says why.
 */

export type EventType =
  | "run_started"
  | "provisioning"
  | "task_started"
  | "llm_call"
  | "tool_usage_started"
  | "tool_usage_finished"
  | "task_completed"
  | "agent_completed"
  | "artifact"
  | "run_completed"
  | "run_failed"
  | "heartbeat";

export interface RunEvent {
  seq: number;
  at: number; // ms offset from run start
  type: EventType;
  taskId?: string;
  agentId?: string;
  label: string;
  durationMs?: number;
  detail?: {
    description?: string;
    prompt?: string;
    input?: string;
    output?: string;
    /** Present on `run_failed`: why the run stopped, straight from the sandbox. */
    error?: string;
  };
}

/** `stopped` means the user detached; `failed` means the run itself died. The
 *  two must stay distinct — a failure has a reason the user needs to read. */
export type RunStatus = "idle" | "provisioning" | "running" | "completed" | "stopped" | "failed";

export interface RunState {
  status: RunStatus;
  startedAt: number | null;
  elapsedMs: number;
  events: RunEvent[];
  inputs: Record<string, string>;
  /** The orchestrator's id for this run, once it has issued one. */
  runId?: string | null;
  /** Set when the run never got far enough to emit a `run_failed` event. */
  error?: string | null;
}

export const fmt = (ms: number) => {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(ms < 10000 ? 2 : 1)}s`;
  const m = Math.floor(ms / 60000);
  const s = Math.round((ms % 60000) / 1000);
  return `${m}m ${s}s`;
};
