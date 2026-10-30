#!/usr/bin/env node
// Self-test of ./popoverModel.ts (imported directly: Node strips the types): the Popover option's rows (Sample or the
// page's mock), the code it writes and reads back, and which layers take it.
// Run: node src/platform/studio/builder/proto/popoverModel.selftest.mjs
import { parsePage } from "../../../../../tools/studio/dialect.mjs";
import { freePopoverId, labelField, mockLists, mockRows, openersOf, popoverDataOf, popoverItemsCode, popoverOpenedBy, popoverOverlayCode, POPOVER_ROWS, sampleLabels, takesPopover } from "./popoverModel.ts";

const failures = [];
let passed = 0;
const check = (label, actual, expected) => {
  const a = JSON.stringify(actual);
  const e = JSON.stringify(expected);
  if (a === e) passed += 1;
  else failures.push(`${label}\n    expected ${e}\n    actual   ${a}`);
};

const mock = {
  people: [
    { id: "ha", name: "Hà Trần", role: "Designer", photo: "zen-media:avatar-ava" },
    { id: "minh", name: "Minh Lê", role: "Engineer", photo: "zen-media:avatar-bao" },
    { id: "lan", name: "Lan Phạm", role: "PM", photo: "zen-media:avatar-chi" },
  ],
  statuses: [{ title: "Đang làm" }, { title: "Hoàn thành" }],
  team: { members: [{ label: "A", "full name": "Ava" }] },
  tags: ["a", "b"],
  count: 3,
};

// Which mock lists fill a Popover: lists of objects with a text field (one level of nesting); id and pictures apart.
const lists = mockLists(mock);
check("mock lists", lists.map((list) => [list.path, list.count, list.fields, list.images, list.ids]), [
  ["people", 3, ["name", "role"], ["photo"], true],
  ["statuses", 2, ["title"], [], false],
  ["team.members", 1, ["label", "full name"], [], false],
]);
check("label field: name first", labelField(lists[0]), "name");
check("label field: title", labelField(lists[1]), "title");
check("mock rows: all, at most the max", [mockRows(lists[0]), mockRows({ ...lists[0], count: 40 })], [3, POPOVER_ROWS.max]);
check("no mock", mockLists(undefined), []);

// Sample rows: Option N, written labels kept, clamped.
check("sample labels", sampleLabels(3), ["Option 1", "Option 2", "Option 3"]);
check("sample labels keep words", sampleLabels(3, ["Tất cả", "Đang làm"]), ["Tất cả", "Đang làm", "Option 3"]);
check("sample labels clamp", [sampleLabels(0).length, sampleLabels(99).length], [POPOVER_ROWS.min, POPOVER_ROWS.max]);

// Code: Sample ids from the words (marks dropped, unique); mock rows as references.
check("sample code", popoverItemsCode({ kind: "sample", labels: ["Tất cả", "Đang làm", "Tất cả"] }), '[{ id: "tat-ca", label: "Tất cả" }, { id: "dang-lam", label: "Đang làm" }, { id: "tat-ca-3", label: "Tất cả" }]');
check("mock code with ids", popoverItemsCode({ kind: "mock", list: "people", rows: 2, label: "name", caption: "role", image: "photo" }, lists[0]), "[{ id: mock.people[0].id, label: mock.people[0].name, caption: mock.people[0].role, photoSrc: mock.people[0].photo }, { id: mock.people[1].id, label: mock.people[1].name, caption: mock.people[1].role, photoSrc: mock.people[1].photo }]");
check("mock code without ids, rows clamped to the list", popoverItemsCode({ kind: "mock", list: "statuses", rows: 9, label: "title" }, lists[1]), '[{ id: "statuses-1", label: mock.statuses[0].title }, { id: "statuses-2", label: mock.statuses[1].title }]');
check("mock code: a key that is not a name", popoverItemsCode({ kind: "mock", list: "team.members", rows: 1, label: "full name" }, lists[2]), '[{ id: "members-1", label: mock.team.members[0]["full name"] }]');

// The written code parses as the page dialect and reads back the same way.
const page = (screen, overlays = "") => [
  `// @zen-page {"format":1,"title":"Popover"}`,
  `import { Board, Overlay, Screen, proto } from "@zen-ds/react/builder";`,
  `import { Button, Chip, Popover, Stack } from "@zen-ds/react";`,
  "",
  `export const mock = ${JSON.stringify(mock)};`,
  "",
  "export default function Page() {",
  "  return (",
  "    <Board>",
  '      <Screen id="home" title="Home" device="phone">',
  `        ${screen}`,
  "      </Screen>",
  overlays,
  "    </Board>",
  "  );",
  "}",
  "",
].join("\n");
const sampleOverlay = popoverOverlayCode("popover-1", "Filters popover", popoverItemsCode({ kind: "sample", labels: ["All", "Open"] }));
const mockOverlay = popoverOverlayCode("popover-2", "People <popover>", popoverItemsCode({ kind: "mock", list: "people", rows: 3, label: "name", image: "photo" }, lists[0]));
const text = page('<Stack><Button onClick={proto.open("popover-1")}>Filters</Button><Button onClick={proto.open("popover-2")}>People</Button><Button onClick={proto.navigate("home")}>Home</Button><Chip popoverItems={[{ id: "a", label: "A" }]}>Pick</Chip></Stack>', `${sampleOverlay}\n${mockOverlay}`);
const tree = parsePage(text, { components: new Set(["Button", "Chip", "Popover", "Stack"]) });
check("page parses", tree.errors, []);
check("overlay title keeps no angle brackets", mockOverlay.split("\n")[0], '<Overlay id="popover-2" title="People popover">');
const stack = tree.board.children[0].children.find((child) => child.kind === "element");
const [filters, people, home, chip] = stack.children.filter((child) => child.kind === "element");
const opened = popoverOpenedBy(tree, filters);
check("opened popover", [opened?.id, opened?.overlay.name, opened?.popover.name], ["popover-1", "Overlay", "Popover"]);
check("a pick closes it", opened?.popover.props.onSelect, { kind: "proto", action: "close", args: [] });
check("sample reads back", popoverDataOf(opened?.popover.props.items), { kind: "sample", labels: ["All", "Open"] });
check("mock reads back", popoverDataOf(popoverOpenedBy(tree, people)?.popover.props.items), { kind: "mock", list: "people", rows: 3, label: "name", image: "photo" });
check("chip items read back", popoverDataOf(chip.props.popoverItems), { kind: "sample", labels: ["A"] });
check("navigate is no popover", popoverOpenedBy(tree, home), null);
check("not a list", popoverDataOf({ kind: "ref", root: "mock", path: ["people"] }), null);
check("openers", [openersOf(tree, "popover-1"), openersOf(tree, "popover-2"), openersOf(tree, "popover-3")], [1, 1, 0]);
check("free id", freePopoverId(tree), "popover-3");

// Which layers take it: a component with On click; a Chip by its own prop; never a frame.
check("takes popover", [takesPopover("Button", ["onClick"]), takesPopover("Chip", []), takesPopover("Stack", ["onClick"]), takesPopover("Avatar", []), takesPopover("Popover", ["onClick"])], [true, true, false, false, false]);

if (failures.length) {
  console.error(`popoverModel selftest: ${failures.length} failed, ${passed} passed`);
  for (const failure of failures) console.error(`  ✗ ${failure}`);
  process.exit(1);
}
console.log(`popoverModel selftest: ${passed} passed`);
