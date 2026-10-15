import type { Plugin } from "vite";

/** Dev only: mounts the AI UI compose loop at `/ai-ui/*` on the dev server (a model when credentials resolve). */
export function aiUiDevServer(options?: { prefix?: string }): Plugin;
