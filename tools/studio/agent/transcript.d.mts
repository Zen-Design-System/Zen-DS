export type AgentStepState = "running" | "ok" | "error";
export type AgentCheckState = "running" | "ok" | "fixing" | "left";
export type AgentAskState = "waiting" | "answered" | "cancelled";
export type AgentTurnState = "working" | "done" | "stopped" | "error";

export type AgentUsage = { input: number; output: number; cacheRead: number; cacheWrite: number };

export type AgentEvent =
  | { type: "user"; turn: number; text: string; thumbs?: string[] }
  | { type: "text"; turn: number; delta: string }
  | { type: "tool"; turn: number; call: string; name: string; summary: string; state: AgentStepState; detail?: string | null }
  | { type: "check"; turn: number; state: AgentCheckState; count: number; findings?: string[] }
  | { type: "ask"; turn: number; call: string; question: string; options: string[]; state: AgentAskState; answer?: string | null }
  | { type: "end"; turn: number; state: Exclude<AgentTurnState, "working">; error?: string | null; usage?: AgentUsage | null; cost?: number | null; ms?: number | null; model?: string | null };

export type AgentTextPart = { kind: "text"; text: string };
export type AgentStepPart = { kind: "step"; call: string; name: string; summary: string; state: AgentStepState; detail: string | null };
export type AgentCheckPart = { kind: "check"; state: AgentCheckState; count: number; findings: string[] };
export type AgentAskPart = { kind: "ask"; call: string; question: string; options: string[]; state: AgentAskState; answer: string | null };
export type AgentPart = AgentTextPart | AgentStepPart | AgentCheckPart | AgentAskPart;

export type AgentUserItem = { kind: "user"; turn: number; text: string; thumbs: string[] };
export type AgentReplyItem = {
  kind: "agent";
  turn: number;
  parts: AgentPart[];
  text: string;
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
export function stepsOf(item: AgentReplyItem | null | undefined): AgentStepPart[];
export function checkOf(item: AgentReplyItem | null | undefined): AgentCheckPart | null;
export function waitingAskOf(item: AgentReplyItem | null | undefined): AgentAskPart | null;
