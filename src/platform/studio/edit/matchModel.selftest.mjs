#!/usr/bin/env node
// Self-test of ./matchModel.ts (imported directly: Node strips the types): Figma's Select matching layers (⌥⌘A) and
// Select all with same › on a page you made (user, 2026-10-22). Run: node src/platform/studio/edit/matchModel.selftest.mjs
import { parsePage } from "../../../../tools/studio/dialect.mjs";
import { matchName, matchingLocs, pageLayers, sameLocs } from "./matchModel.ts";

const failures = [];
let passed = 0;
const check = (label, actual, expected) => {
  const a = JSON.stringify(actual);
  const e = JSON.stringify(expected);
  if (a === e) passed += 1;
  else failures.push(`${label}\n    expected ${e}\n    actual   ${a}`);
};

/** One phone Screen: a free frame with a rectangle, an ellipse, a caption and a Button. */
const screen = (id, x, { rectName = "", button = "primary", caption = "Caption/Regular", fill = "accent-solid" } = {}) => `
      <Screen id="${id}" title="${id}" device="phone" x={${x}} y={0} width={390} height={844}>
        <Box width={358} height={200}>
          <Shape type="rectangle" position="absolute" insetLeft={20} insetTop={20} width={80} height={60} fill="${fill}"${rectName ? ` data-name="${rectName}"` : ""} />
          <Shape type="ellipse" position="absolute" insetLeft={140} insetTop={40} width={60} height={60} />
        </Box>
        <Text textStyle="${caption}">Hello</Text>
        <Button level="${button}">Save</Button>
      </Screen>`;
const text = `// @zen-page {"format":1,"title":"Match"}
import { Board, Screen, Section } from "@zen-ds/react/builder";
import { Box, Button, Shape, Text } from "@zen-ds/react";
export const mock = {};

export default function Page() {
  return (
    <Board>${screen("one", 0)}${screen("two", 500, { button: "secondary", fill: "support-teal-solid" })}${screen("three", 1000, { rectName: "Hero", caption: "Body/Base/Bold" })}${screen("four", 2000)}
      <Section id="s" title="Later" x={1960} y={-80} width={500} height={1000} />
    </Board>
  );
}
`;
const { board, errors } = parsePage(text);
check("the page parses", errors.length, 0);
const layers = pageLayers(board);
/** The loc of the n-th layer named `tag` in the frame `frameId`. */
const locOf = (frameId, tag, n = 0, type) => [...layers.values()].filter((entry) => entry.frameId === frameId && entry.node.name === tag && (!type || entry.node.props.type?.value === type))[n]?.node.loc;
const frameOfLoc = (loc) => layers.get(loc)?.frameId;
const context = {
  // Screen four sits in the Section "s" (the canvas measures it; here, by id).
  sectionOf: (frameId) => (frameId === "screen:four" ? "section:s" : null),
  variantAxes: (component) => (component === "Button" ? [{ prop: "level", default: "primary" }, { prop: "size", default: "md" }] : []),
  fontOf: (style) => ({ "Caption/Regular": "Inter Regular", "Body/Base/Bold": "Inter Semi Bold", "Body/Base/Regular": "Inter Regular" })[style] ?? null,
};
const frames = (locs) => locs.map(frameOfLoc).sort();

// Names as compared: the page-wide number is left out, a given name is kept, an instance carries its variant.
check("an automatic name compares by its kind", matchName(layers.get(locOf("screen:one", "Shape", 0)).node, context), "auto:Rectangle");
check("a given name compares as written", matchName(layers.get(locOf("screen:three", "Shape", 0)).node, context), "name:Hero");
check("a text compares by its style", matchName(layers.get(locOf("screen:one", "Text")).node, context), "text:Caption/Regular");
check("an instance compares by its component and variant", matchName(layers.get(locOf("screen:two", "Button")).node, context), "instance:Button|level=secondary,size=md");

// Select matching layers: the same layer in the other frames outside a Section; never in its own frame.
const rect = locOf("screen:one", "Shape", 0);
check("the Rectangle's match: screen two only (three's is renamed Hero, four sits in a Section)", frames(matchingLocs(board, rect, context)), ["screen:two"]);
check("the Ellipse's matches: two and three", frames(matchingLocs(board, locOf("screen:one", "Shape", 1), context)), ["screen:three", "screen:two"]);
check("the free frame (Box) matches its twins", frames(matchingLocs(board, locOf("screen:one", "Box"), context)), ["screen:three", "screen:two"]);
check("a renamed layer matches only its name", matchingLocs(board, locOf("screen:three", "Shape", 0), context), []);
check("a text matches texts of its style only", frames(matchingLocs(board, locOf("screen:one", "Text"), context)), ["screen:two"]);
check("a Button matches Buttons of its variant only", frames(matchingLocs(board, locOf("screen:one", "Button"), context)), ["screen:three"]);
check("a frame in a Section matches nothing outside it", matchingLocs(board, locOf("screen:four", "Shape", 1), context), []);
check("an unknown loc: nothing", matchingLocs(board, "99:1", context), []);

// Select all with same ›: across the whole page, whatever the frame.
const same = (loc, kind) => { const result = sameLocs(board, loc, kind, context); return { value: result.value, frames: frames(result.locs) }; };
check("same fill: the accent rectangles", same(rect, "fill"), { value: "accent-solid", frames: ["screen:four", "screen:three"] });
check("same fill: the default-filled ellipses", same(locOf("screen:one", "Shape", 1), "fill").frames, ["screen:four", "screen:three", "screen:two"]);
check("same stroke: a shape with none says so", same(rect, "stroke"), { value: null, frames: [] });
check("same text properties: the Caption texts", same(locOf("screen:one", "Text"), "text"), { value: "Caption/Regular", frames: ["screen:four", "screen:two"] });
check("same font: by family and weight", same(locOf("screen:three", "Text"), "font"), { value: "Inter Semi Bold", frames: [] });
check("same instance: every Button, any variant", same(locOf("screen:one", "Button"), "instance"), { value: "Button", frames: ["screen:four", "screen:three", "screen:two"] });
check("same properties: the accent rectangles (the teal one differs)", same(rect, "properties").frames, ["screen:four", "screen:three"]);
check("same instance on a shape: none", same(rect, "instance").value, null);

if (failures.length) {
  console.error(`matchModel self-test: ${failures.length} failed, ${passed} passed\n  ${failures.join("\n  ")}`);
  process.exit(1);
}
console.log(`matchModel self-test: ${passed} passed`);
