#!/usr/bin/env node
// Self-test of ./protoModel.ts (imported directly: Node strips the types): what the Prototype tab, the canvas
// connections and Play read from a page — trigger words, a choice control's items, per-item actions and their links.
// Run: node src/platform/studio/builder/proto/protoModel.selftest.mjs
import { parsePage } from "../../../../../tools/studio/dialect.mjs";
import { actionsFor, choiceItemsOf, connectTrigger, findNode, frameNodeOf, framesOf, isItemTrigger, itemActionCode, linksOf, optionsOf, protoActionCode, protoSourcesOf, targetOfFrame, targetsByItem, triggerLabel } from "./protoModel.ts";

const failures = [];
let passed = 0;
const check = (label, actual, expected) => {
  const a = JSON.stringify(actual);
  const e = JSON.stringify(expected);
  if (a === e) passed += 1;
  else failures.push(`${label}\n    expected ${e}\n    actual   ${a}`);
};

const page = [
  `// @zen-page {"format":1,"title":"Tabs"}`,
  `import { Board, Overlay, Screen, proto } from "@zen-ds/react/builder";`,
  `import { BottomNavigation, Button, Dialog, Segmented, Sidebar, SidebarMenuItem, Stack } from "@zen-ds/react";`,
  "",
  "export const mock = {};",
  "",
  "export default function Page() {",
  "  return (",
  "    <Board>",
  '      <Screen id="home" title="Home" device="phone"',
  '        bottomNavigation={<BottomNavigation value="home" items={[{ id: "home", label: "Home", icon: "icon-home-03-line" }, { id: "files", label: "Files", icon: "icon-folder-line" }]} onValueChange={proto.navigate({ files: "files" })} />}>',
  '        <Stack gap="md" padding="lg">',
  '          <Button onClick={proto.navigate("files")}>Open files</Button>',
  '          <Segmented aria-label="View" value="list" options={[{ id: "list", label: "List" }, { id: "map", label: "Map" }]} />',
  '          <Sidebar aria-label="Main" selectedId="home">',
  '            <SidebarMenuItem id="home" label="Home" icon="icon-home-03-line" />',
  '            <SidebarMenuItem id="people" label="People" icon="icon-users-line" />',
  "          </Sidebar>",
  "        </Stack>",
  "      </Screen>",
  '      <Screen id="files" title="Files" device="phone" state="empty" />',
  '      <Overlay id="confirm">',
  '        <Dialog title="Leave?" primaryAction={{ label: "Leave", onClick: proto.navigate("home") }} />',
  "      </Overlay>",
  "    </Board>",
  "  );",
  "}",
  "",
].join("\n");
const tree = parsePage(page, { components: new Set(["BottomNavigation", "Button", "Dialog", "Segmented", "Sidebar", "SidebarMenuItem", "Stack"]) });
check("the sample parses", tree.errors, []);

// Words.
check("trigger words", ["onClick", "onValueChange", "onRowClick", "onOpenChange"].map((trigger) => triggerLabel(trigger)), ["On click", "On change", "On row click", "On open or close"]);
check("a phone is tapped", triggerLabel("onClick", true), "On tap");

// Frames.
check("frames: screens with their state, overlays by their title", framesOf(tree).map((frame) => `${frame.frameId} ${frame.title}`), ["screen:home Home", "screen:files:empty Files", "overlay:confirm Leave?"]);
check("a frame as a target", [targetOfFrame("screen:files:empty"), targetOfFrame("overlay:confirm"), targetOfFrame("example:0")], [{ action: "navigate", target: "files" }, { action: "open", target: "confirm" }, null]);

// Choice controls.
function nodesOf(parsed) {
  const out = [];
  const walk = (node) => { out.push(node); for (const child of node.children) if (child.kind === "element") walk(child); for (const value of Object.values(node.props)) if (value.kind === "element") walk(value.node); };
  walk(parsed.board);
  return out;
}
const nodes = nodesOf(tree);
const named = (name) => nodes.find((node) => node.name === name);
check("items: a list of objects", choiceItemsOf(named("BottomNavigation")), [{ value: "home", label: "Home" }, { value: "files", label: "Files" }]);
check("items: options with ids", choiceItemsOf(named("Segmented")), [{ value: "list", label: "List" }, { value: "map", label: "Map" }]);
check("items: children that name an id", choiceItemsOf(named("Sidebar")), [{ value: "home", label: "Home" }, { value: "people", label: "People" }]);
check("items: none on a button", choiceItemsOf(named("Button")), []);
check("item trigger: a choice control's On change, never a button's click", [isItemTrigger(named("BottomNavigation"), "onValueChange"), isItemTrigger(named("Button"), "onClick")], [true, false]);
check("⊕ connects a choice control by item, a button by click", [connectTrigger(named("Segmented"), ["onClick", "onChange", "onValueChange"]), connectTrigger(named("Button"), ["onClick"])], ["onValueChange", "onClick"]);
check("⊕ keeps the trigger that already leads somewhere", connectTrigger(named("BottomNavigation"), ["onClick", "onValueChange"]), "onValueChange");

// Per-item actions.
check("targets by item: a map, or one target for every item", [targetsByItem({ files: "files", bad: 3 }, []), targetsByItem("files", [{ value: "home", label: "Home" }, { value: "files", label: "Files" }])], [{ files: "files" }, { home: "files", files: "files" }]);
check("item action code: names and quoted keys, items without a target left out", [itemActionCode("navigate", { home: "home", "my-files": "files", inbox: undefined }), itemActionCode("open", {})], ['proto.navigate({ home: "home", "my-files": "files" })', "proto.open({})"]);
const reparsed = parsePage(page.replace('proto.navigate({ files: "files" })', itemActionCode("navigate", { home: "home", "my-files": "files" })), { components: new Set(["BottomNavigation", "Button", "Dialog", "Segmented", "Sidebar", "SidebarMenuItem", "Stack"]) });
check("item action code reads back", reparsed.errors, []);

// Links and hotspots.
check("links: a button, a tab, a dialog's action (not its own prop)", linksOf(tree).map((link) => `${link.trigger} ${link.frameId}${link.item ? ` [${link.item}]` : ""}${link.own ? "" : " (inside)"}`).sort(), ["onClick screen:files", "onValueChange screen:files [files]", "primaryAction screen:home (inside)"]);
const sources = protoSourcesOf(tree);
const bottom = named("BottomNavigation");
check("hotspots: the tab bar's leading items only, the button and dialog whole", [sources.get(bottom.loc), sources.get(named("Button").loc), sources.get(named("Dialog").loc), sources.has(named("Segmented").loc)], [[{ value: "files", label: "Files" }], null, null, false]);
check("findNode reaches an element prop's layer", findNode(tree, bottom.loc)?.name, "BottomNavigation");

// Round 2: animations, After delay, While hovering.
check("trigger words: After delay, While hovering", [triggerLabel("onDelay"), triggerLabel("whileHovering")], ["After delay", "While hovering"]);
check("While hovering opens an overlay only", actionsFor("whileHovering").map((entry) => entry.value), ["none", "open"]);
check("action code: defaults left out, a direction only when it moves, delay kept", [
  protoActionCode("navigate", "home", { animation: "dissolve", direction: "left", duration: "base" }),
  protoActionCode("navigate", "home", { animation: "push", direction: "right", duration: "slow" }),
  protoActionCode("navigate", "home", { animation: "instant", duration: "slow" }),
  protoActionCode("back", undefined, { delay: 800 }),
  protoActionCode("toast", "Saved", { delay: 300 }),
  protoActionCode("open", { files: "files" }, { animation: "move", direction: "up" }),
], ['proto.navigate("home")', 'proto.navigate("home", { animation: "push", direction: "right", duration: "slow" })', 'proto.navigate("home", { animation: "instant" })', "proto.back({ delay: 800 })", 'proto.toast({ title: "Saved" }, { delay: 300 })', 'proto.open({ files: "files" }, { animation: "move", direction: "up" })']);
check("options read back from either place, unknown values dropped", [optionsOf("navigate", ["home", { animation: "push", direction: "sideways", delay: 500 }]), optionsOf("back", [{ delay: 900 }]), optionsOf("toast", [{ title: "x" }])], [{ animation: "push", delay: 500 }, { delay: 900 }, {}]);
const motion = parsePage(page.replace('<Button onClick={proto.navigate("files")}>', '<Button onClick={proto.navigate("files", { animation: "slide", direction: "up" })} whileHovering={proto.open("confirm")}>').replace('<Screen id="files" title="Files" device="phone" state="empty" />', '<Screen id="files" title="Files" device="phone" state="empty" onDelay={proto.back({ delay: 900 })} />'), { components: new Set(["BottomNavigation", "Button", "Dialog", "Segmented", "Sidebar", "SidebarMenuItem", "Stack"]) });
check("round 2 parses", motion.errors, []);
check("a frame id finds its Screen (state) or Overlay", [frameNodeOf(motion, "screen:files:empty")?.props.onDelay?.action, frameNodeOf(motion, "overlay:confirm")?.name, frameNodeOf(motion, "screen:nope")], ["back", "Overlay", null]);
check("the ⊕ never takes While hovering", connectTrigger(nodesOf(motion).find((node) => node.name === "Button"), ["whileHovering", "onClick"]), "onClick");
check("links: a hover and an animated click lead somewhere", linksOf(motion).filter((link) => link.trigger === "whileHovering" || link.trigger === "onClick").map((link) => `${link.trigger} ${link.frameId}`).sort(), ["onClick screen:files", "whileHovering overlay:confirm"]);

if (failures.length) {
  console.error(`✗ protoModel selftest: ${failures.length} failed, ${passed} passed\n  ${failures.join("\n  ")}`);
  process.exit(1);
}
console.log(`✓ protoModel selftest: ${passed} checks pass.`);
