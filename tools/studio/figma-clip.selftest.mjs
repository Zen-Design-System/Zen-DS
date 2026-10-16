// Self-test of tools/studio/figma-clip.mjs (a Studio frame on the clipboard for Figma, docs/research/
// studio-copy-to-figma-2026-10-16.md P2): the export through the clipboard's HTML and back, one frame of a page.
// Run: node tools/studio/figma-clip.selftest.mjs
import { FIGMA_CLIP_ATTRIBUTE, figmaClipHtml, onlyFrame, packageFromClip } from "./figma-clip.mjs";
import { docFromText, printPage } from "./doc.mjs";
import { figmaPackage } from "./figma-push.mjs";
import { repoMapping } from "./figma-pull.mjs";
import { NESTED_LAYERS } from "../../src/platform/studio/inspector/nestedLayers.generated.ts";

let passed = 0;
const failures = [];
const check = (label, actual, expected) => {
  const a = JSON.stringify(actual);
  const e = JSON.stringify(expected);
  if (a === e) passed += 1;
  else failures.push(`${label}\n    expected ${e}\n    actual   ${a}`);
};

// 1. Through the HTML and back: non-ASCII text, a large export (base64 in chunks), nothing else in the markup.
const pkg = { format: "zen-studio-figma", version: 1, page: { id: "p1", title: "Chi phí", frame: "screen-2" }, frame: { type: "FRAME", name: "Đìzai® Studio — 2026", children: [] }, images: { "zen-asset:a": "x".repeat(200000) } };
const html = figmaClipHtml(pkg);
check("the HTML is one empty span with the attribute", new RegExp(`^<meta charset="utf-8"><span ${FIGMA_CLIP_ATTRIBUTE}="[A-Za-z0-9+/=]+"></span>$`).test(html), true);
check("the export comes back whole", packageFromClip({ html, text: "<Screen />" }), pkg);
check("a .figma.json's text pasted as is", packageFromClip({ html: "", text: `  ${JSON.stringify(pkg)}` })?.page, pkg.page);
check("a re-binding is an export too", packageFromClip({ text: JSON.stringify({ format: "zen-studio-rebind", version: 1, changes: [] }) })?.format, "zen-studio-rebind");
check("anything else is not", [packageFromClip({ html: "<b>hi</b>", text: "hello" }), packageFromClip({ text: '{"format":"other"}' }), packageFromClip({ html: `<span ${FIGMA_CLIP_ATTRIBUTE}="bm90IGpzb24="></span>` }), packageFromClip()], [null, null, null, null]);

// 2. One frame of a page: its Board keeps only that Screen, and the export is that frame.
const page = `// @zen-page {"format":1,"title":"Two"}
import { Board, Screen } from "@zen-ds/react/builder";
import { Button, Stack, Text } from "@zen-ds/react";

export const mock = {};

export default function Page() {
  return (
    <Board>
      <Screen id="screen-1" title="Home" device="desktop" x={0} y={0}>
        <Stack gap="md"><Text>First</Text></Stack>
      </Screen>
      <Screen id="screen-2" title="Settings" device="phone" x={1600} y={0}>
        <Stack gap="md"><Button>Save</Button></Stack>
      </Screen>
    </Board>
  );
}
`;
const { doc } = docFromText(page);
const second = onlyFrame(doc, "screen-2");
check("onlyFrame: the Board holds that frame alone", second.board.children.map((child) => child.props.id.value), ["screen-2"]);
check("onlyFrame: a frame not on the page", onlyFrame(doc, "screen-9"), null);
check("onlyFrame: the canvas's frame id (its kind; a state the Screen does not have is another frame)", [onlyFrame(doc, "screen:screen-2")?.board.children[0].props.id.value, onlyFrame(doc, "screen:screen-1:loading"), onlyFrame(doc, "overlay:screen-1")], ["screen-2", null, null]);
const { pkg: framed } = figmaPackage(printPage(second, { ids: true }), { mapping: await repoMapping(), nestedLayers: NESTED_LAYERS, page: { id: "two", title: "Two" } });
check("the export of one frame is that frame (a phone, its Button)", [framed.frame.name, framed.frame.width, JSON.stringify(framed.frame).includes("Save"), JSON.stringify(framed.frame).includes("First")], ["Settings", 390, true, false]);

if (failures.length) {
  console.error(`✗ figma-clip selftest: ${failures.length} failed, ${passed} passed\n  ${failures.join("\n  ")}`);
  process.exit(1);
}
console.log(`✓ figma-clip selftest: ${passed} checks pass.`);
