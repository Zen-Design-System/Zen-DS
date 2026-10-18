export type AgentStepState = "running" | "ok" | "error";
export type AgentCheckState = "running" | "ok" | "fixing" | "left";
export type AgentTurnState = "working" | "done" | "stopped" | "error";

export type AgentUsage = { input: number; output: number; cacheRead: number; cacheWrite: number };

export type AgentEvent =
  | { type: "user"; turn: number; text: string }
  | { type: "text"; turn: number; delta: string }
  | { type: "tool"; turn: number; call: string; name: string; summary: string; state: AgentStepState; detail?: string | null }
  | { type: "check"; turn: number; state: AgentCheckState; count: number; findings?: string[] }
  | { type: "end"; turn: number; state: Exclude<AgentTurnState, "working">; error?: string | null; usage?: AgentUsage | null; cost?: number | null; ms?: number | null; model?: string | null };

export type AgentStep = { call: string; name: string; summary: string; state: AgentStepState; detail: string | null };

export type AgentUserItem = { kind: "user"; turn: number; text: string };
export type AgentReplyItem = {
  kind: "agent";
  turn: number;
  text: string;
  steps: AgentStep[];
  check: { state: AgentCheckState; count: number; findings: string[] } | null;
  state: AgentTurnState;
  error: string | null;
  usage: AgentUsage | null;
  cost: number | null;
  ms: number | null;
  model: string | null;
};
export type AgentItem = AgentUserItem | AgentReplyItem;

export function reduceTranscript(items: AgentItem[], event: AgentEvent): AgentItem[];
export function transcriptOf(events: AgentEvent[]): AgentItem[];
