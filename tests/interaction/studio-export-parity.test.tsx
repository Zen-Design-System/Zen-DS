/**
 * Zen Studio export (core rebuild M5, plan criterion 5): a page you made, exported as React (tools/studio/compile.mjs),
 * draws what the canvas draws (builder/render/renderPage.tsx) — the same Zen layers in the same order with the same
 * variants, nested overrides and a row's own value (op setRowProp) included. The export is written next to this test
 * (vitest's writeFile, removed after) and imported as app code would be. Real browser (Chromium).
 */
import type { ComponentType, ReactNode } from "react";
import { afterAll, describe, expect, it } from "vitest";
import { render } from "vitest-browser-react";
import { commands } from "vitest/browser";
import * as Zen from "../../src/index";
import { ZenProvider } from "../../src/index";
import { renderNode, type PageNode, type PageTree } from "../../src/platform/studio/builder/render/renderPage";
// The Studio's own typed entry points to the compiler and the dialect.
import { compileReact } from "../../tools/studio/browser-compile.mjs";
import { parsePage } from "../../tools/studio/browser-engine.mjs";

const PAGE = `// @zen-page {"format":1,"title":"Crew parity"}
import { Board, Screen, proto } from "@zen-ds/react/builder";
import { Badge, Button, Card, Stack, Text } from "@zen-ds/react";

export const mock = {
  people: [
    { id: "alex", name: "Alex Duong", theme: "neutral" },
    { id: "binh", name: "Binh Tran", theme: "red" },
    { id: "chi", name: "Chi Le", theme: "neutral" },
  ],
};

export default function Page() {
  return (
    <Board>
      <Screen id="crew" title="Crew" device="desktop">
        <Stack gap="md" padding="xl">
          <Card subAction={{ label: "More", onClick: proto.toast("More") }} overrides={{ "Sub-Action": { level: "danger" }, "Sub-Action/Leading-Icon": { tone: "accent-base" } }}>
            <Text textStyle="Heading/3">Crew</Text>
          </Card>
          <Stack direction="row" gap="sm">
            {mock.people.map((person) => <Badge theme={person.theme}>{person.name}</Badge>)}
          </Stack>
          <Button level="primary" onClick={proto.toast("Saved")}>Save</Button>
        </Stack>
      </Screen>
    </Board>
  );
}
`;

// writeFile resolves from the project root; the import, from this file.
const GENERATED = "tests/interaction/.export-parity.tsx";
const IMPORTED = "./.export-parity.tsx";
const inert = { navigate: () => undefined, open: () => undefined, close: () => undefined, back: () => undefined, toast: () => undefined, link: () => undefined };

/** Every element with a Zen class, in document order: its tag, Zen classes and the variant attributes Zen sets. */
function layers(root: Element): string[] {
  return [...root.querySelectorAll("*")].flatMap((element) => {
    const classes = [...element.classList].filter((name) => /^zen-[a-z0-9-]+(__[a-z0-9-]+)?$/.test(name)).sort();
    if (!classes.length) return [];
    const variants = [...element.attributes].filter((attr) => /^data-(level|tone|theme|appearance|size|variant|state)$/.test(attr.name)).map((attr) => `${attr.name}=${attr.value}`).sort();
    return [`${element.tagName.toLowerCase()}.${classes.join(".")}${variants.length ? `[${variants.join(",")}]` : ""}`];
  });
}

describe("Zen Studio export: the exported page draws what the canvas draws", () => {
  afterAll(async () => { await commands.removeFile(GENERATED).catch(() => undefined); });

  it("same Zen layers, order and variants, with overrides and a row's own value", async () => {
    const exported = compileReact(PAGE, { file: "crew-parity.zen.tsx" });
    if ("error" in exported) throw new Error(exported.error);
    // The app's `@zen-ds/react` is the library's source here (the repo's tests have no alias for it).
    await commands.writeFile(GENERATED, exported.code.replace(/from "@zen-ds\/react";/g, 'from "../../src/index";'));
    const module = (await import(/* @vite-ignore */ IMPORTED)) as Record<string, ComponentType>;
    const Exported = module[exported.component];

    const tree = parsePage(PAGE, { components: new Set(Object.keys(Zen)) }) as unknown as PageTree;
    expect(tree.errors).toEqual([]);
    const screen = tree.board?.children.find((child): child is PageNode => child.kind === "element" && child.name === "Screen");
    const content = (screen?.children ?? []).filter((child): child is PageNode => child.kind === "element");
    const ctx = { file: "local:crew-parity.zen.tsx", mock: tree.mock, proto: inert };
    const canvas: ReactNode = content.map((node, index) => renderNode(node, { mock: tree.mock }, ctx, index));

    const drawn = await render(<ZenProvider><div data-testid="canvas">{canvas}</div><div data-testid="export"><Exported /></div></ZenProvider>);
    const fromCanvas = layers(drawn.getByTestId("canvas").element());
    const fromExport = layers(drawn.getByTestId("export").element());
    expect(fromCanvas.length).toBeGreaterThan(8);
    expect(fromExport).toEqual(fromCanvas);
    // The row's own value and the nested override really drew: one red Badge, a danger Sub-Action.
    expect(fromExport.filter((layer) => layer.includes("zen-badge") && layer.includes("data-tone=red"))).toHaveLength(1);
    expect(fromExport.some((layer) => layer.includes("data-level=danger"))).toBe(true);
  });
});
