import { platformMedia } from "../../../PlatformMedia";
import { builderCode, type PaletteContext, type PaletteItem } from "../../slots/palette";
import type { ContentSlot } from "../../slots/registry";

/*
 * The preview of a library item (Studio builder GĐ3 M2, spec docs/research/studio-builder-library-spec-2026-10-06.md
 * §3c; the user's choice Q1: the focused item only, drawn for real). The item's code goes into a one-Screen builder page
 * that the engine parses (dialect.mjs parsePage) and the page renderer draws, without eval: a value a page cannot hold
 * (a state variable, a handler) is left out, so the component shows its default; toasts become proto.toast (inert);
 * platformMedia photos become their URLs.
 */

/** platformMedia.<path> → its value as a literal (a string, a number), so the page needs no import for it. */
export function inlineMedia(code: string): string {
  return code.replace(/\{platformMedia((?:\.[A-Za-z_$][\w$]*|\[\d+\])+)\}/g, (whole, path: string) => {
    let value: unknown = platformMedia;
    for (const match of path.matchAll(/\.([A-Za-z_$][\w$]*)|\[(\d+)\]/g)) {
      const key = match[1] ?? Number(match[2]);
      value = value !== null && typeof value === "object" ? (value as Record<string | number, unknown>)[key] : undefined;
    }
    return typeof value === "string" || typeof value === "number" ? `{${JSON.stringify(value)}}` : whole;
  });
}

/** The item's code as Assets would insert it into a layout (a Stack's children). */
export function itemCode(item: PaletteItem): string {
  const slot = { component: "Stack", prop: "children", name: "Children", kind: "layout" } as unknown as ContentSlot;
  const context: PaletteContext = { host: "Stack", slot, headingLevel: 4, mobile: false, uid: "preview" };
  const code = item.build(context);
  return inlineMedia(builderCode(code) ?? code);
}

/** A builder page whose one Screen holds the item: what the engine parses for the preview. */
export function previewPageText(item: PaletteItem): string {
  const code = itemCode(item).split("\n").map((line) => `        ${line}`).join("\n");
  const names = [...new Set(item.components.map((name) => name.split(".")[0]))].sort();
  return [
    '// @zen-page {"format":1,"title":"Preview"}',
    'import { Board, Screen, proto } from "@zen-ds/react/builder";',
    `import { ${names.join(", ")} } from "@zen-ds/react";`,
    "",
    "export default function Page() {",
    "  return (",
    "    <Board>",
    '      <Screen id="preview">',
    code,
    "      </Screen>",
    "    </Board>",
    "  );",
    "}",
    "",
  ].join("\n");
}
