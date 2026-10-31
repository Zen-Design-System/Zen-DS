#!/usr/bin/env node
// Self-test of ./protoModel.ts (imported directly: Node strips the types): what the Prototype tab, the canvas
// connections and Play read from a page — trigger words, a choice control's items, per-item actions and their links.
// Run: node src/platform/studio/builder/proto/protoModel.selftest.mjs
import { parsePage } from "../../../../../tools/studio/dialect.mjs";
import { actionsIn, actionsFor, actionTriggerLabel, actionTriggersOf, cellText, choicesOf, frameNamed, layerWordsOf, choiceItemsOf, columnsOf, connectTrigger, filterCode, filterOf, filterRows, filterValuesOf, findNode, frameNodeOf, framesOf, isItemTrigger, itemActionCode, layersIn, linksOf, openerOf, optionsOf, playStartOf, protoOf, protoActionCode, protoSourcesOf, screenTargetOf, stepCode, stepOf, stepperOf, steppedIndex, stepTargetsOf, targetLayerOf, targetOfFrame, targetsByItem, triggerLabel, triggerValue } from "./protoModel.ts";

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
check("a frame as a target: a Screen's state is its own (Figma: every frame)", [targetOfFrame("screen:files:empty"), targetOfFrame("screen:files"), targetOfFrame("overlay:confirm"), targetOfFrame("example:0")], [{ action: "navigate", target: "files:empty" }, { action: "navigate", target: "files" }, { action: "open", target: "confirm" }, null]);

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
check("links: a button, a tab, a dialog's button (its own trigger, walk W-41)", linksOf(tree).map((link) => `${link.trigger} ${link.frameId}${link.item ? ` [${link.item}]` : ""}${link.own ? "" : " (inside)"}`).sort(), ["onClick screen:files", "onValueChange screen:files [files]", "primaryAction.onClick screen:home"]);
// Action objects (walk 2026-10-29 W-36/W-41): a Dialog's buttons and a TopNavigation's Back are triggers of their layer.
const dialog = named("Dialog");
check("action triggers: each action object's onClick", actionTriggersOf(dialog), ["primaryAction.onClick"]);
check("action trigger value: the field, the plain prop, nothing for a missing field", [triggerValue(dialog, "primaryAction.onClick")?.kind, triggerValue(dialog, "secondaryAction.onClick"), triggerValue(named("Button"), "onClick")?.kind], ["proto", undefined, "proto"]);
check("action trigger words with the button's label", [actionTriggerLabel(dialog, "primaryAction.onClick"), actionTriggerLabel(dialog, "onOpenChange")], [`Primary button · ${dialog.props.primaryAction.fields.label.value}`, null]);
check("⊕ on a layer with no click of its own takes its first button", connectTrigger({ ...dialog, props: {} }, ["onOpenChange", "primaryAction.onClick"]), "primaryAction.onClick");
// Open overlay / Navigate to by name (walk 2026-10-29 W-57): the frame named as the layer reads, else none.
const byName = [{ kind: "overlay", id: "filter", title: "Filter", frameId: "overlay:filter", device: "desktop" }, { kind: "overlay", id: "invite-members", title: "Invite members", frameId: "overlay:invite-members", device: "desktop" }, { kind: "overlay", id: "date-placed", title: "Date placed", frameId: "overlay:date-placed", device: "desktop" }];
check("frame by name: same words, then their start, marks dropped; none for other words", [frameNamed(byName, "Invite members"), frameNamed(byName, "Date"), frameNamed(byName, "INVITE  members!"), frameNamed(byName, "Export"), frameNamed(byName, "")], ["invite-members", "date-placed", "invite-members", undefined, undefined]);
check("a layer's words: an action object's label, else its text", [layerWordsOf(dialog, "primaryAction.onClick") === dialog.props.primaryAction.fields.label.value, layerWordsOf(named("Button"), "onClick").length > 0], [true, true]);
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

// Present from an Overlay frame: the Screen that opens it (a layer's action, or a Screen state's After delay), or none.
check("the opener of an Overlay: none, a hovered Button's Screen", [openerOf(tree, "confirm"), openerOf(motion, "confirm"), openerOf(motion, "nope")], [null, "home", null]);
const delayed = parsePage(page.replace('<Screen id="files" title="Files" device="phone" state="empty" />', '<Screen id="files" title="Files" device="phone" state="empty" onDelay={proto.open("confirm", { delay: 500 })} />'), { components: new Set(["BottomNavigation", "Button", "Dialog", "Segmented", "Sidebar", "SidebarMenuItem", "Stack"]) });
check("the opener of an Overlay: a Screen state's After delay", openerOf(delayed, "confirm"), "files");
check("playStartOf: a Screen, a Screen's state, an Overlay, anything else", [playStartOf("screen:checkout"), playStartOf("screen:checkout:paid"), playStartOf("overlay:confirm"), playStartOf("section:s1"), playStartOf(null)], ["checkout", "checkout:paid", "overlay:confirm", null, null]);

// Option C (user 2026-10-23): a Screen's states as targets, Manual overlays by their trigger, Filter table, Change step.
check("a Navigate to target: a Screen, or one of its states", [screenTargetOf("orders"), screenTargetOf("orders:filtered"), screenTargetOf("orders:")], [{ id: "orders" }, { id: "orders", state: "filtered" }, { id: "orders" }]);
const COMPONENTS_C = new Set(["Button", "Chip", "DatePicker", "Search", "Stack", "Stepper", "Table"]);
const optionC = [
  `// @zen-page {"format":1,"title":"Orders"}`,
  `import { Board, Overlay, Screen, proto } from "@zen-ds/react/builder";`,
  `import { Button, Chip, DatePicker, Search, Stack, Stepper, Table } from "@zen-ds/react";`,
  "",
  "export const mock = {};",
  "",
  "export default function Page() {",
  "  return (",
  "    <Board>",
  '      <Screen id="orders" title="Orders">',
  '        <Stack gap="md" padding="lg">',
  '          <Chip onClick={proto.open("pick-date")}>Date</Chip>',
  `          <Chip onClick={${protoActionCode("filter", { column: "status", value: "Paid" })}}>Paid</Chip>`,
  `          <Search aria-label="Search orders" onValueChange={${protoActionCode("filter", { match: "contains" })}} />`,
  '          <Table aria-label="Orders" columns={[{ id: "client", header: "Client", captionField: "email" }, { id: "status", header: "Status" }]} rows={[{ id: "1", client: "Acme", email: "ops@acme.io", status: "Paid" }, { id: "2", client: "Globex", email: "it@globex.com", status: "Overdue" }]} />',
  '          <Table data-name="Archive" columns={[{ id: "client", header: "Client" }]} rows={[]} />',
  '          <Stepper steps={[{ id: "a", title: "Cart" }, { id: "b", title: "Pay" }, { id: "c", title: "Done" }]} defaultCurrent={1} />',
  `          <Button onClick={${protoActionCode("step", "next")}}>Next</Button>`,
  `          <Button onClick={${protoActionCode("step", "previous")}}>Back</Button>`,
  '          <Button onClick={proto.navigate("orders:paid")}>Only paid</Button>',
  "        </Stack>",
  "      </Screen>",
  '      <Screen id="orders" title="Orders · paid" state="paid" />',
  '      <Overlay id="pick-date" position="manual">',
  "        <DatePicker />",
  "      </Overlay>",
  "    </Board>",
  "  );",
  "}",
  "",
].join("\n");
const c = parsePage(optionC, { components: COMPONENTS_C });
check("option C parses (filter and step are interactions)", c.errors, []);
check("filter and step code: fields in order, defaults left out", [
  protoActionCode("filter", { table: "Archive", value: "Paid", column: "status", match: "is" }),
  filterCode({}),
  protoActionCode("step", "previous"),
  protoActionCode("step", { to: "next", stepper: "Checkout" }),
  stepCode("next"),
], ['proto.filter({ column: "status", value: "Paid", table: "Archive" })', "proto.filter({})", 'proto.step("previous")', 'proto.step("next", { stepper: "Checkout" })', 'proto.step("next")']);
check("filter and step read back (unknown and empty fields dropped)", [filterOf([{ column: "status", value: "", match: "fuzzy", extra: 1 }]), filterOf([{ value: 3, match: "contains", table: "Archive" }]), filterOf(["x"]), stepOf(["previous", { stepper: "Pay" }]), stepOf([])], [{ column: "status" }, { value: "3", match: "contains", table: "Archive" }, {}, { to: "previous", stepper: "Pay" }, { to: "next" }]);
check("a filter has no animation options", optionsOf("filter", [{ animation: "push" }]), {});
check("what a trigger hands over: text, items, an item's id and label, never a press", [filterValuesOf("ow"), filterValuesOf(["paid", 2]), filterValuesOf({ id: "owner", label: "Owner" }), filterValuesOf({ nativeEvent: {}, target: {} }), filterValuesOf(undefined)], [["ow"], ["paid", "2"], ["owner", "Owner"], [], []]);
check("a cell's words: text, numbers, lists, an object's label", [cellText("Paid"), cellText(3), cellText(["a", "b"]), cellText({ name: "Ann", avatar: "x" }), cellText(null)], ["Paid", "3", "a b", "Ann", ""]);
const ROWS = [{ id: "1", client: "Acme", email: "ops@acme.io", status: "Paid" }, { id: "2", client: "Globex", email: "it@globex.com", status: "Overdue" }, { id: "3", client: "Paidwell", status: "Draft" }];
check("filterRows: is (a column), contains (typed, its caption too), any field, nothing to match", [
  filterRows(ROWS, ["paid"], "is", ["status"]).map((row) => row.id),
  filterRows(ROWS, ["GLOBEX.COM"], "contains", ["client", "email"]).map((row) => row.id),
  filterRows(ROWS, ["paid"], "contains").map((row) => row.id),
  filterRows(ROWS, ["owner", "Draft"], "is").map((row) => row.id),
  filterRows(ROWS, [" "], "is").length,
], [["1"], ["2"], ["1", "3"], ["3"], 3]);
const screenC = frameNodeOf(c, "screen:orders");
const tables = layersIn(screenC, "Table");
check("a Table's columns as items", columnsOf(tables[0]), [{ value: "client", label: "Client" }, { value: "status", label: "Status" }]);
check("the Table a filter drives: by its name, else the first", [targetLayerOf(screenC, "Table")?.loc === tables[0].loc, targetLayerOf(screenC, "Table", "Archive")?.loc === tables[1].loc, targetLayerOf(screenC, "Table", "Orders")?.loc === tables[0].loc, targetLayerOf(screenC, "Table", "Nope")?.loc === tables[0].loc, targetLayerOf(null, "Table")], [true, true, true, true, null]);
const stepper = layersIn(screenC, "Stepper")[0];
check("a Stepper's steps and start; a step stays within them", [stepperOf(stepper), steppedIndex(1, "next", 3), steppedIndex(2, "next", 3), steppedIndex(0, "previous", 3), steppedIndex(0, "next", 0)], [{ count: 3, start: 1 }, 2, 2, 0, 0]);
check("Play holds the Steppers a Change step drives (each Screen's first)", [...stepTargetsOf(c)], [stepper.loc]);
check("no Change step on a page: Play holds no Stepper", stepTargetsOf(tree).size, 0);
check("links: a state target leads to the state's frame; filter and step lead nowhere", linksOf(c).map((link) => `${link.action} ${link.frameId}`).sort(), ["navigate screen:orders:paid", "open overlay:pick-date"]);
const cSources = protoSourcesOf(c);
check("hotspots: a filter chip and a Next button are whole layers", [cSources.get(nodesOf(c).find((node) => node.name === "Chip" && node.children.some((child) => child.value === "Paid")).loc), cSources.get(nodesOf(c).find((node) => node.name === "Button").loc)], [null, null]);

// W-52 A: the choice groups Play keeps and the Chip that shows the pick of the sheet it opens.
const livePage = [
  `// @zen-page {"format":1,"title":"Live"}`,
  `import { Board, Overlay, Screen, proto } from "@zen-ds/react/builder";`,
  `import { BottomSheet, Chip, Icon, List, ListItem, RadioButton, Stack } from "@zen-ds/react";`,
  "",
  "export const mock = { rows: [{ id: \"a\" }, { id: \"b\" }] };",
  "",
  "export default function Page() {",
  "  return (",
  "    <Board>",
  '      <Screen id="orders" title="Orders" device="phone">',
  '        <Stack direction="row" gap="xs">',
  '          <Chip variant="advanced" dropdown onClick={proto.open("date")}>Date</Chip>',
  '          <Chip variant="normal" defaultSelected>All</Chip>',
  '          <Chip variant="normal">Processing</Chip>',
  "        </Stack>",
  '        <Stack direction="row" gap="xs">',
  '          <Chip variant="normal" defaultSelected>One</Chip>',
  '          <Chip variant="normal" defaultSelected>Two</Chip>',
  "        </Stack>",
  "        <Stack>",
  '          <RadioButton label="Card" />',
  '          <RadioButton label="Cash" defaultChecked />',
  "        </Stack>",
  "        <List>",
  '          <ListItem title="Home" onClick={proto.navigate("orders")} />',
  '          <ListItem title="Files" />',
  "        </List>",
  "        <List>",
  '          {mock.rows.map((row) => <ListItem key={row.id} title="Row" selected />)}',
  "        </List>",
  "      </Screen>",
  '      <Overlay id="date">',
  '        <BottomSheet title="Date placed">',
  "          <List>",
  '            <ListItem title="Any time" selected trailing={<Icon name="icon-check-line" />} onClick={proto.close()} />',
  '            <ListItem title="Last 30 days" onClick={proto.close()} />',
  '            <ListItem title="Last 3 months" onClick={proto.close()} />',
  "          </List>",
  "        </BottomSheet>",
  "      </Overlay>",
  "    </Board>",
  "  );",
  "}",
].join("\n");
const live = parsePage(livePage, { components: new Set(["BottomSheet", "Chip", "Icon", "List", "ListItem", "RadioButton", "Stack"]) });
const liveNodes = nodesOf(live);
const choices = choicesOf(live);
const titled = (name, words) => liveNodes.find((node) => node.name === name && (node.props.title?.value === words || node.props.label?.value === words || node.children.some((child) => child.value === words)));
const sheet = choices.groups.get(titled("ListItem", "Any time").loc);
check("a sheet's ListItems with a ✓ row are one group: the ✓ row starts, it is drawn selected and marked", [sheet?.kind, sheet?.items.length, sheet?.start === titled("ListItem", "Any time").loc, sheet?.selects, sheet?.mark?.name, sheet?.titles.get(titled("ListItem", "Last 3 months").loc)], ["ListItem", 3, true, true, "Icon", "Last 3 months"]);
check("rows with no pick drawn, and rows from the page data, make no group", [choices.groups.has(titled("ListItem", "Home").loc), liveNodes.filter((node) => node.name === "ListItem" && node.props.title?.value === "Row").some((node) => choices.groups.has(node.loc))], [false, false]);
check("a Chip that opens the sheet shows its pick; a chip row with the opener in it is no one-of group", [choices.openers.get(titled("Chip", "Date").loc)?.[0] === sheet, choices.groups.has(titled("Chip", "All").loc)], [true, false]);
check("two chips both drawn selected toggle on their own", choices.groups.has(titled("Chip", "One").loc), false);
const radios = choices.groups.get(titled("RadioButton", "Card").loc);
check("sibling radios are one group, starting on the checked one", [radios?.kind, radios?.start === titled("RadioButton", "Cash").loc], ["RadioButton", true]);
const statusChips = choicesOf(parsePage(livePage.replace('<Chip variant="advanced" dropdown onClick={proto.open("date")}>Date</Chip>', ""), { components: new Set(["BottomSheet", "Chip", "Icon", "List", "ListItem", "RadioButton", "Stack"]) }));
const all = [...statusChips.groups.values()].find((group) => group.kind === "Chip");
check("status chips with one selected are one group (W-55)", [all?.items.length, Boolean(all?.start)], [2, true]);

// W-52 B: a group whose pick a variable holds is the variable's, a Chip that reads one shows it; nested actions count.
const varsPage = livePage
  .replace('export const mock = { rows: [{ id: \"a\" }, { id: \"b\" }] };', 'export const mock = { rows: [{ id: \"a\" }, { id: \"b\" }] };\nexport const vars = { range: "Any time" };')
  .replace('<Chip variant="advanced" dropdown onClick={proto.open("date")}>Date</Chip>', '<Chip variant="advanced" dropdown onClick={proto.open("date")}>{vars.range}</Chip>')
  .replace('<ListItem title="Any time" selected trailing={<Icon name="icon-check-line" />} onClick={proto.close()} />', '<ListItem title="Any time" selected={vars.range === "Any time"} onClick={proto.run(proto.set("range", "Any time"), proto.close())} />')
  .replace('<ListItem title="Last 30 days" onClick={proto.close()} />', '<ListItem title="Last 30 days" selected={vars.range === "Last 30 days"} onClick={proto.run(proto.set("range", "Last 30 days"), proto.navigate("orders"))} />');
const boundTree = parsePage(varsPage, { components: new Set(["BottomSheet", "Chip", "Icon", "List", "ListItem", "RadioButton", "Stack"]) });
check("vars: the page parses", boundTree.errors, []);
const bound = choicesOf(boundTree);
const boundNodes = nodesOf(boundTree);
const boundRow = boundNodes.find((node) => node.name === "ListItem" && node.props.title?.value === "Any time");
check("vars: a bound sheet is no Play group, and the Chip that reads the variable shows no pick", [bound.groups.has(boundRow.loc), bound.openers.size], [false, 0]);
check("vars: Set variable, Conditional and several actions are written in code (B1)", [protoOf(boundRow.props.onClick), protoOf({ kind: "proto", action: "set", args: ["range", "x"] })], [null, null]);
check("vars: a link inside several actions is the layer's link", linksOf(boundTree).filter((link) => link.target === "orders").map((link) => link.trigger), ["onClick", "onClick"]);
check("vars: actionsIn sees nested actions", actionsIn(boundTree.board).filter((entry) => entry.action === "set").length, 2);

if (failures.length) {
  console.error(`✗ protoModel selftest: ${failures.length} failed, ${passed} passed\n  ${failures.join("\n  ")}`);
  process.exit(1);
}
console.log(`✓ protoModel selftest: ${passed} checks pass.`);
