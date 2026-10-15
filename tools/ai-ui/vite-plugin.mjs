// The compose loop on the platform's dev server: `/ai-ui/*` answers from this process with the Anthropic adapter when
// credentials resolve (ANTHROPIC_API_KEY or an `ant auth login` profile — the key stays in Node, never in the page).
// Without them `/ai-ui/status` says `enabled: false` and the AI UI page keeps its deterministic composer. Dev only.
import { createAiUiHandler, createNodeListener } from "./server.mjs";

export function aiUiDevServer({ prefix = "/ai-ui" } = {}) {
  return {
    name: "zen-ai-ui-dev-server",
    apply: "serve",
    async configureServer(server) {
      let model = null, modelName = null;
      if (process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_AUTH_TOKEN || process.env.ZEN_AI_UI_MODEL === "on") {
        try {
          const { anthropicModel, DEFAULT_MODEL } = await import("./adapters/anthropic.mjs");
          modelName = process.env.ZEN_AI_MODEL ?? DEFAULT_MODEL;
          model = anthropicModel({ model: modelName, effort: process.env.ZEN_AI_EFFORT ?? "medium" });
          server.config.logger.info(`[zen ai-ui] ${prefix}/compose answers with ${modelName}`);
        } catch (error) {
          server.config.logger.warn(`[zen ai-ui] no model: ${error.message} (npm i -D @anthropic-ai/sdk)`);
        }
      }
      const handler = createAiUiHandler({ model, modelName });
      // A failed model call shows in this terminal too, not only as the 500 the page falls back from.
      const listener = createNodeListener(async (request) => {
        const result = await handler(request);
        if (result.status >= 500) server.config.logger.warn(`[zen ai-ui] ${request.method} ${prefix}${request.path} → ${result.status}: ${result.body?.error ?? ""}`);
        return result;
      }, { prefix });
      server.middlewares.use((request, response, next) => {
        if (!request.url?.startsWith(`${prefix}/`)) return next();
        listener(request, response).catch((error) => { response.statusCode = 500; response.end(JSON.stringify({ error: error.message })); });
      });
    },
  };
}
