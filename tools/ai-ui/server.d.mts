import type { IncomingMessage, Server, ServerResponse } from "node:http";
import type { ModelFn } from "./compose.mjs";

export type AiUiRequest = { method: string; path: string; body?: unknown };
export type AiUiResponse = { status: number; body: unknown };
export type AiUiHandler = (request: AiUiRequest) => Promise<AiUiResponse>;
export type HandlerOptions = {
  model?: ModelFn | null;
  catalog?: unknown;
  modelName?: string;
  data?: Record<string, unknown> | ((body: unknown) => Record<string, unknown> | Promise<Record<string, unknown>>);
  chrome?: boolean;
  experimental?: boolean;
  maxAttempts?: number;
};
export function loadCatalog(): unknown;
export function createAiUiHandler(options?: HandlerOptions): AiUiHandler;
export function createNodeListener(handle: AiUiHandler, options?: { prefix?: string; origin?: string }): (request: IncomingMessage, response: ServerResponse) => Promise<void>;
export function serve(options?: { port?: number; model?: ModelFn; modelName?: string }): Promise<Server>;
