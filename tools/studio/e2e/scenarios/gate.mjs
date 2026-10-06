// Gate rows: when the Studio cannot edit, it says why and how to get editing back (GĐ1 "Gate").
import { E2E_HOST_ALIAS } from "../lib/server.mjs";
import { openStudio } from "../lib/studio.mjs";

/** The Studio chrome's visible text (toolbar + Inspector + status), whitespace collapsed. */
const chromeText = (page) => page.evaluate(() => [...document.querySelectorAll("header, .studio-toolbar, #studio-right, [role=status]")].map((el) => el.innerText).join(" ").replace(/\s+/g, " "));

export const rows = [
  {
    id: "G-01", feature: "Viewer role: the toolbar says Read-only and offers Admin back", wp: "Gate",
    async run(ctx) {
      const { page, context } = await openStudio(ctx.browser, { url: ctx.server.url, page: ctx.host, role: "viewer" });
      try {
        const chip = page.getByRole("button", { name: /Read-only/i });
        if (!(await chip.count())) throw new Error(`no Read-only explanation (chrome reads: "${(await chromeText(page)).slice(0, 90)}")`);
        await chip.first().click();
        if (!(await page.getByRole("button", { name: /Switch to Admin|Admin/ }).count())) throw new Error("the Read-only chip offers no way back to Admin");
        return "explained, with a way back";
      } finally {
        await context.close();
      }
    },
  },
  {
    id: "G-02", feature: "Opened on a non-localhost address: says why read-only and links to 127.0.0.1", wp: "Gate",
    async run(ctx) {
      const port = new URL(ctx.server.url).port;
      const { page, context } = await openStudio(ctx.browser, { url: `http://${E2E_HOST_ALIAS}:${port}`, page: ctx.host });
      try {
        const text = await chromeText(page);
        if (!/localhost|127\.0\.0\.1/i.test(text)) throw new Error(`the reason does not mention localhost (chrome reads: "${text.slice(0, 100)}")`);
        return "reason names localhost";
      } finally {
        await context.close();
      }
    },
  },
  {
    id: "G-03", feature: "\"Reset Studio settings\" is available from the read-only explanation", wp: "Gate",
    async run(ctx) {
      const { page, context } = await openStudio(ctx.browser, { url: ctx.server.url, page: ctx.host, role: "viewer" });
      try {
        const chip = page.getByRole("button", { name: /Read-only/i });
        if (!(await chip.count())) throw new Error("no Read-only chip to open");
        await chip.first().click();
        if (!(await page.getByRole("button", { name: /Reset Studio settings/i }).count())) throw new Error("no Reset Studio settings action");
        return "offered";
      } finally {
        await context.close();
      }
    },
  },
];
