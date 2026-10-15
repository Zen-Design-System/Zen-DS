/**
 * A generated UI lives in a chat column: at 600px (desktop chat) and 390px (a phone) a Table, a form and a chart
 * rendered from a spec must not overflow their column sideways (W6 of the AI UI plan, docs/ai-ui/README.md).
 */
import { describe, expect, it } from "vitest";
import { render } from "vitest-browser-react";
import { ZenProvider } from "../../src/index";
import { AiUi, validateSpec, type Catalog, type UiSpec } from "../../src/ai-ui/index";
import catalogJson from "../../docs/ai-ui/catalog.json";

const catalog = catalogJson as unknown as Catalog;
const rows = Array.from({ length: 4 }, (_, i) => ({ id: `r${i}`, name: ["Ava Nguyen", "Minh Tran", "Linh Pham", "Quang Le"][i], role: ["Admin", "Editor", "Viewer", "Editor"][i], since: "Oct 2026", plan: "Team" }));

const specs: Record<string, UiSpec> = {
  table: { version: 1, data: { rows }, root: { type: "Table", id: "members", props: { "aria-label": "Members", columns: [{ id: "name", header: "Name" }, { id: "role", header: "Role" }, { id: "since", header: "Since" }, { id: "plan", header: "Plan" }], rows: { $ref: "rows" } } } },
  form: {
    version: 1,
    data: { services: [{ value: "cut", label: "Haircut" }, { value: "colour", label: "Colour and highlights" }], slots: [{ value: "09:00", label: "09:00" }, { value: "10:30", label: "10:30" }, { value: "14:00", label: "14:00" }, { value: "16:30", label: "16:30" }] },
    root: {
      type: "Stack", id: "root", props: { gap: "lg" },
      children: [
        { type: "Heading", id: "h", props: { level: 3 }, children: ["Book an appointment"] },
        { type: "SelectField", id: "service", props: { label: "Service", options: { $ref: "services" } } },
        { type: "DateField", id: "date", props: { label: "Date" } },
        { type: "ChipGroup", id: "slot", props: { "aria-label": "Time", options: { $ref: "slots" } } },
        { type: "TextAreaField", id: "note", props: { label: "Note", helpText: "Anything the stylist should know." } },
        { type: "Stack", id: "actions", props: { direction: "row", gap: "sm", justify: "end" }, children: [{ type: "Button", id: "cancel", props: { level: "tertiary" }, children: ["Cancel"] }, { type: "Button", id: "book", props: { level: "primary" }, children: ["Book"] }] },
      ],
    },
  },
  chart: { version: 1, root: { type: "Stack", id: "root", props: { gap: "md" }, children: [{ type: "BarChart", id: "bars", props: { "aria-label": "Visits per month", data: [{ label: "Jun", value: 12 }, { label: "Jul", value: 18 }, { label: "Aug", value: 9 }, { label: "Sep", value: 21 }, { label: "Oct", value: 15 }] } }, { type: "LineChart", id: "line", props: { "aria-label": "Revenue", data: [{ label: "Jun", value: 1200 }, { label: "Jul", value: 1800 }, { label: "Aug", value: 900 }, { label: "Sep", value: 2100 }] } }] } },
};

/** Elements drawn past the column's right edge, except inside a box that scrolls sideways on its own (a wide Table). */
const overflow = (column: HTMLElement) => {
  const right = column.getBoundingClientRect().right + 1;
  const scrolls = (el: HTMLElement) => { for (let node = el.parentElement; node && node !== column; node = node.parentElement) if (/auto|scroll/.test(getComputedStyle(node).overflowX)) return true; return false; };
  return [...column.querySelectorAll<HTMLElement>("*")].filter((el) => el.getBoundingClientRect().width > 0 && el.getBoundingClientRect().right > right && getComputedStyle(el).position !== "fixed" && !scrolls(el)).map((el) => `${el.tagName.toLowerCase()}.${el.className.toString().split(" ")[0]} right=${Math.round(el.getBoundingClientRect().right)}`);
};

describe("a generated UI fits a chat column", () => {
  for (const width of [600, 390]) {
    for (const [name, spec] of Object.entries(specs)) {
      it(`${name} at ${width}px`, async () => {
        expect(validateSpec(spec, catalog).errors).toEqual([]);
        const screen = await render(
          <ZenProvider density={width < 480 ? "comfortable" : undefined}>
            <div data-testid="column" style={{ width, overflow: "hidden" }}><AiUi spec={spec} catalog={catalog} /></div>
          </ZenProvider>,
        );
        const column = screen.container.querySelector('[data-testid="column"]') as HTMLElement;
        await expect.poll(() => column.querySelector("[data-ai-ui-id]")).not.toBeNull();
        expect(column.scrollWidth, `the column scrolls sideways: scrollWidth ${column.scrollWidth} > ${width}`).toBeLessThanOrEqual(width + 1);
        expect(overflow(column), "elements past the column's right edge").toEqual([]);
      });
    }
  }
});
