// Self-test of the data-slot item ops (tools/studio/items.mjs through slots.mjs applySlotOp): insertItem, removeItem,
// duplicateItem, moveItem, groupItem, ungroupItem. Run: node tools/studio/items.selftest.mjs
import assert from "node:assert/strict";
import { applySlotOp } from "./slots.mjs";
import { parseSource, sha1 } from "./jsx-source.mjs";

const FILE = "src/platform/examples/pages/items-demo.tsx";
const SOURCE = `import { useState } from "react";
import { TopNavigation } from "../../../components/TopNavigation";
import { Tabs } from "../../../components/Tabs";

export function Inline() {
  const [seen, setSeen] = useState(false);
  return (
    <TopNavigation title="Inbox" trailing={[{ icon: "icon-bell-01-line", label: "Notifications", dot: !seen, onClick: () => setSeen(true) }]} />
  );
}

export function Lines() {
  return (
    <TopNavigation
      title="Call"
      trailingGroup
      trailing={[
        { icon: "icon-phone-line", label: "Audio call" },
        { icon: "icon-video-recorder-line", label: "Video call" },
      ]}
    />
  );
}

export function Bare() {
  return <TopNavigation title="Bare" />;
}

export function Options() {
  return <Tabs options={[{ value: "all", label: "All" }, { value: "all-2", label: "All again" }]} />;
}

export function Computed({ actions }: { actions: { icon: string; label: string }[] }) {
  return <TopNavigation title="Computed" trailing={actions} largeTitleAction={{ icon: "icon-plus-line", label: "New" }} />;
}

export const InlinePlayground = () => <TopNavigation title="Play" trailing={[{ icon: "icon-x", label: "X" }]} />;
`;

/** "<line>:<column>" (Babel's 0-based column) of the n-th occurrence of `needle` in `text`. */
function locOf(text, needle, nth = 0) {
  let index = -1;
  for (let k = 0; k <= nth; k += 1) {
    index = text.indexOf(needle, index + 1);
    assert.ok(index >= 0, `"${needle}" #${nth} not found`);
  }
  const before = text.slice(0, index);
  const line = before.split("\n").length;
  return `${line}:${index - before.lastIndexOf("\n") - 1}`;
}

const MODULES = { TopNavigation: "TopNavigation", Tabs: "Tabs", useToast: "Toast" };
const run = (loc, name, op, code = SOURCE, extra = {}) => applySlotOp(code, loc, name, op, { file: FILE, hash: sha1(code), componentModules: MODULES, ...extra });
let passed = 0;
const test = (title, fn) => {
  try {
    fn();
    passed += 1;
  } catch (error) {
    console.error(`✗ ${title}`);
    throw error;
  }
};
const ok = (result) => {
  assert.ok(!result.error, result.error);
  assert.ok(parseSource(result.code), "the result parses");
  return result;
};

const inline = locOf(SOURCE, '<TopNavigation title="Inbox"');
const lines = locOf(SOURCE, "<TopNavigation\n");
const bare = locOf(SOURCE, '<TopNavigation title="Bare"');
const tabs = locOf(SOURCE, "<Tabs options");
const computed = locOf(SOURCE, '<TopNavigation title="Computed"');
const ACTION = '{ icon: "icon-star-line", label: "Action", onClick: () => toast({ title: "Action" }) }';

test("insertItem: last in an inline list, with the toast hook and import", () => {
  const result = ok(run(inline, "TopNavigation", { op: "insertItem", prop: "trailing", code: ACTION, requires: ["toast"] }));
  assert.match(result.code, /onClick: \(\) => setSeen\(true\) \}, \{ icon: "icon-star-line", label: "Action", onClick: \(\) => toast\(\{ title: "Action" \}\) \}\]\}/);
  assert.match(result.code, /export function Inline\(\) \{\n {2}const \{ toast \} = useToast\(\);\n/);
  assert.match(result.code, /import \{ useToast \} from "\.\.\/\.\.\/\.\.\/components\/Toast";/);
  assert.deepEqual(result.item, { prop: "trailing", index: 1 });
  assert.ok(result.updated);
});

test("insertItem: first in a one-per-line list keeps the layout", () => {
  const result = ok(run(lines, "TopNavigation", { op: "insertItem", prop: "trailing", index: 0, code: '{ icon: "icon-star-line", label: "Star" }' }));
  assert.match(result.code, /trailing=\{\[\n {8}\{ icon: "icon-star-line", label: "Star" \},\n {8}\{ icon: "icon-phone-line", label: "Audio call" \},/);
  assert.deepEqual(result.item, { prop: "trailing", index: 0 });
});

test("insertItem: last in a one-per-line list with a trailing comma", () => {
  const result = ok(run(lines, "TopNavigation", { op: "insertItem", prop: "trailing", code: '{ icon: "icon-star-line", label: "Star" }' }));
  assert.match(result.code, /label: "Video call" \},\n {8}\{ icon: "icon-star-line", label: "Star" \},\n {6}\]\}/);
  assert.deepEqual(result.item, { prop: "trailing", index: 2 });
});

test("insertItem: an absent prop becomes prop={[item]}; single makes it an object", () => {
  const list = ok(run(bare, "TopNavigation", { op: "insertItem", prop: "trailing", code: '{ icon: "icon-star-line", label: "Star" }' }));
  assert.match(list.code, /<TopNavigation title="Bare" trailing=\{\[\{ icon: "icon-star-line", label: "Star" \}\]\} \/>/);
  const one = ok(run(bare, "TopNavigation", { op: "insertItem", prop: "largeTitleAction", single: true, code: '{ icon: "icon-plus-line", label: "New" }' }));
  assert.match(one.code, /<TopNavigation title="Bare" largeTitleAction=\{\{ icon: "icon-plus-line", label: "New" \}\} \/>/);
});

test("insertItem refuses computed items, an object prop that is full, free names and JSX", () => {
  assert.match(run(computed, "TopNavigation", { op: "insertItem", prop: "trailing", code: "{ label: \"A\" }" }).error, /come from actions/);
  assert.match(run(computed, "TopNavigation", { op: "insertItem", prop: "largeTitleAction", single: true, code: "{ label: \"A\" }" }).error, /holds one item already/);
  assert.match(run(inline, "TopNavigation", { op: "insertItem", prop: "trailing", code: "{ label: name }" }).error, /reads `name`/);
  assert.match(run(inline, "TopNavigation", { op: "insertItem", prop: "trailing", code: "{ icon: <Icon /> }" }).error, /not JSX/);
  assert.match(run(inline, "TopNavigation", { op: "insertItem", prop: "trailing", code: "[1]" }).error, /object literal/);
  assert.match(run(inline, "TopNavigation", { op: "insertItem", prop: "trailing", index: 5, code: "{}" }).error, /past its end/);
});

test("removeItem: a middle item goes with its line; the only one takes the attribute", () => {
  const first = ok(run(lines, "TopNavigation", { op: "removeItem", prop: "trailing", index: 0 }));
  assert.match(first.code, /trailing=\{\[\n {8}\{ icon: "icon-video-recorder-line", label: "Video call" \},\n {6}\]\}/);
  assert.ok(first.removed);
  assert.deepEqual(first.item, { prop: "trailing", index: 0 });
  const only = ok(run(inline, "TopNavigation", { op: "removeItem", prop: "trailing", index: 0 }));
  assert.match(only.code, /<TopNavigation title="Inbox" \/>/);
});

test("removeItem: an object prop goes; a required one stays as []", () => {
  const object = ok(run(computed, "TopNavigation", { op: "removeItem", prop: "largeTitleAction" }));
  assert.match(object.code, /<TopNavigation title="Computed" trailing=\{actions\} \/>/);
  const required = ok(run(inline, "TopNavigation", { op: "removeItem", prop: "trailing", index: 0 }, SOURCE, { requiredProps: { TopNavigation: ["trailing"] } }));
  assert.match(required.code, /trailing=\{\[\]\}/);
});

test("list: one object and a new item become a list (index 0 first); duplicate makes two; remove from a list", () => {
  const added = ok(run(computed, "TopNavigation", { op: "insertItem", prop: "largeTitleAction", list: true, code: '{ icon: "icon-star-line", label: "Star" }' }));
  assert.match(added.code, /largeTitleAction=\{\[\{ icon: "icon-plus-line", label: "New" \}, \{ icon: "icon-star-line", label: "Star" \}\]\}/);
  assert.deepEqual(added.item, { prop: "largeTitleAction", index: 1 });
  const first = ok(run(computed, "TopNavigation", { op: "insertItem", prop: "largeTitleAction", list: true, index: 0, code: '{ icon: "icon-star-line", label: "Star" }' }));
  assert.match(first.code, /largeTitleAction=\{\[\{ icon: "icon-star-line", label: "Star" \}, \{ icon: "icon-plus-line", label: "New" \}\]\}/);
  const twice = ok(run(computed, "TopNavigation", { op: "duplicateItem", prop: "largeTitleAction", index: 0, list: true }));
  assert.match(twice.code, /largeTitleAction=\{\[\{ icon: "icon-plus-line", label: "New" \}, \{ icon: "icon-plus-line", label: "New" \}\]\}/);
  // Without `list` an object prop stays one item.
  assert.match(run(computed, "TopNavigation", { op: "duplicateItem", prop: "largeTitleAction", index: 0 }).error, /holds one item/);
  // Once a list, it is edited like any list: the second item goes, the first stays in its brackets.
  const back = ok(run(locOf(added.code, '<TopNavigation title="Computed"'), "TopNavigation", { op: "removeItem", prop: "largeTitleAction", index: 1 }, added.code));
  assert.match(back.code, /largeTitleAction=\{\[\{ icon: "icon-plus-line", label: "New" \}\]\}/);
});

test("an object item added on its own line and removed again leaves the file as it was", () => {
  const added = ok(run(lines, "TopNavigation", { op: "insertItem", prop: "largeTitleAction", single: true, code: '{ icon: "icon-plus-line", label: "New" }' }));
  assert.match(added.code, /\]\}\n {6}largeTitleAction=\{\{ icon: "icon-plus-line", label: "New" \}\}\n {4}\/>/);
  const removed = ok(run(locOf(added.code, "<TopNavigation\n"), "TopNavigation", { op: "removeItem", prop: "largeTitleAction" }, added.code));
  assert.equal(removed.code, SOURCE);
  const inline = `<TopNavigation title="A" trailing={[{ icon: "icon-x", label: "X" }]}\n  largeTitleAction={{ icon: "icon-plus-line", label: "New" }} />;\n`;
  const back = applySlotOp(inline, "1:0", "TopNavigation", { op: "removeItem", prop: "largeTitleAction" }, { file: FILE, hash: sha1(inline) });
  assert.equal(back.code, `<TopNavigation title="A" trailing={[{ icon: "icon-x", label: "X" }]} />;\n`);
});

test("removeItem drops the toast hook an inserted item brought", () => {
  const added = ok(run(inline, "TopNavigation", { op: "insertItem", prop: "trailing", code: ACTION, requires: ["toast"] }));
  const at = locOf(added.code, '<TopNavigation title="Inbox"');
  const removed = ok(run(at, "TopNavigation", { op: "removeItem", prop: "trailing", index: 1 }, added.code));
  assert.ok(!removed.code.includes("useToast()"), "the hook went with the item");
});

test("removeItem all: every item and the attribute go, the toast hook two inserted items brought too", () => {
  const one = ok(run(inline, "TopNavigation", { op: "insertItem", prop: "trailing", code: ACTION, requires: ["toast"] }));
  const two = ok(run(locOf(one.code, '<TopNavigation title="Inbox"'), "TopNavigation", { op: "insertItem", prop: "trailing", code: ACTION, requires: ["toast"] }, one.code));
  const all = ok(run(locOf(two.code, '<TopNavigation title="Inbox"'), "TopNavigation", { op: "removeItem", prop: "trailing", all: true }, two.code));
  assert.match(all.code, /<TopNavigation title="Inbox" \/>/);
  assert.ok(!all.code.includes("useToast"), "the hook and its import went with the items");
  const required = ok(run(lines, "TopNavigation", { op: "removeItem", prop: "trailing", all: true }, SOURCE, { requiredProps: { TopNavigation: ["trailing"] } }));
  assert.match(required.code, /trailing=\{\[\]\}/);
});

test("duplicateItem: a copy after it; id/value/key strings get a fresh value", () => {
  const copy = ok(run(lines, "TopNavigation", { op: "duplicateItem", prop: "trailing", index: 0 }));
  assert.match(copy.code, /label: "Audio call" \},\n {8}\{ icon: "icon-phone-line", label: "Audio call" \},\n {8}\{ icon: "icon-video/);
  assert.deepEqual(copy.item, { prop: "trailing", index: 1 });
  const option = ok(run(tabs, "Tabs", { op: "duplicateItem", prop: "options", index: 0 }));
  assert.match(option.code, /\{ value: "all", label: "All" \}, \{ value: "all-3", label: "All" \}, \{ value: "all-2"/);
});

test("moveItem: down and back up; commas and lines stay", () => {
  const down = ok(run(lines, "TopNavigation", { op: "moveItem", prop: "trailing", index: 0, to: 1 }));
  assert.match(down.code, /\{ icon: "icon-video-recorder-line", label: "Video call" \},\n {8}\{ icon: "icon-phone-line", label: "Audio call" \},\n {6}\]\}/);
  assert.deepEqual(down.item, { prop: "trailing", index: 1 });
  const back = ok(run(locOf(down.code, "<TopNavigation\n"), "TopNavigation", { op: "moveItem", prop: "trailing", index: 1, to: 0 }, down.code));
  assert.equal(back.code, SOURCE);
  assert.match(run(lines, "TopNavigation", { op: "moveItem", prop: "trailing", index: 0, to: 4 }).error, /past its end/);
});

test("item ops: hash required, playground refused, outside example pages refused, bad prop refused", () => {
  assert.match(applySlotOp(SOURCE, inline, "TopNavigation", { op: "removeItem", prop: "trailing", index: 0 }, { file: FILE }).error, /hash/);
  assert.match(run(locOf(SOURCE, '<TopNavigation title="Play"'), "TopNavigation", { op: "removeItem", prop: "trailing", index: 0 }).error, /playground/);
  assert.match(applySlotOp(SOURCE, inline, "TopNavigation", { op: "removeItem", prop: "trailing", index: 0 }, { file: "src/platform/PlatformExamples.tsx", hash: sha1(SOURCE) }).error, /example pages/);
  assert.match(run(inline, "TopNavigation", { op: "removeItem", prop: "onClick", index: 0 }).error, /not a prop that holds items/);
});

test("the example snippet follows the same edit at the same index", () => {
  const withSnippet = `import { TopNavigation } from "../../../components/TopNavigation";

function Screen() {
  return <TopNavigation title="Inbox" trailing={[{ icon: "icon-a", label: "A" }, { icon: "icon-b", label: "B" }]} />;
}

export const examples = [
  {
    title: "Inbox",
    render: () => <Screen />,
    code: \`<TopNavigation title="Inbox" trailing={[{ icon: "icon-a", label: "A" }, { icon: "icon-b", label: "B" }]} />\`,
  },
];
`;
  const result = ok(run(locOf(withSnippet, "<TopNavigation"), "TopNavigation", { op: "moveItem", prop: "trailing", index: 0, to: 1 }, withSnippet));
  assert.deepEqual(result.snippet, { synced: true });
  assert.equal(result.code.split('trailing={[{ icon: "icon-b", label: "B" }, { icon: "icon-a", label: "A" }]}').length, 3, "file and snippet both moved");
});

/* ── groups (TopNavigation trailing `group`: actions next to each other with one group share a pill) ───────────── */

const GROUPS = `import { TopNavigation } from "../../../components/TopNavigation";

export function Inline() {
  return <TopNavigation title="Call" trailing={[{ icon: "icon-a", label: "Audio call" }, { icon: "icon-b", label: "Video call" }, { icon: "icon-c", label: "More" }]} />;
}

export function Lines() {
  return (
    <TopNavigation
      title="Call"
      trailing={[
        { icon: "icon-a", label: "Audio call", group: "call" },
        { icon: "icon-b", label: "Video call", group: "call" },
        {
          icon: "icon-c",
          label: "More",
          onClick: () => undefined,
        },
      ]}
    />
  );
}

export function Kind({ kind }: { kind: string }) {
  return <TopNavigation title="Kind" trailing={[{ icon: "icon-a", label: "A", group: kind }, { icon: "icon-b", label: "B" }]} />;
}
`;
const gInline = locOf(GROUPS, '<TopNavigation title="Call" trailing');
const gLines = locOf(GROUPS, "<TopNavigation\n");
const gRun = (loc, op, code = GROUPS) => ok(run(loc, "TopNavigation", { prop: "trailing", ...op }, code));

test("groupItem: a drop onto an item pairs them, named after the target's label; inline fields stay inline", () => {
  const result = gRun(gInline, { op: "groupItem", index: 2, with: 1 });
  assert.match(result.code, /\[\{ icon: "icon-a", label: "Audio call" \}, \{ icon: "icon-b", label: "Video call", group: "video-call" \}, \{ icon: "icon-c", label: "More", group: "video-call" \}\]/);
  assert.deepEqual(result.item, { prop: "trailing", index: 2 });
  // From the left: it lands before the target (the side it came from).
  const left = gRun(gInline, { op: "groupItem", index: 0, with: 2 });
  assert.match(left.code, /\[\{ icon: "icon-b", label: "Video call" \}, \{ icon: "icon-a", label: "Audio call", group: "more" \}, \{ icon: "icon-c", label: "More", group: "more" \}\]/);
  assert.deepEqual(left.item, { prop: "trailing", index: 1 });
});

test("groupItem: joining a group takes its name and lands beside the whole group; one field per line", () => {
  const result = gRun(gLines, { op: "groupItem", index: 2, with: 0 });
  assert.match(result.code, /label: "Video call", group: "call" \},\n {8}\{\n {10}icon: "icon-c",\n {10}label: "More",\n {10}group: "call",\n {10}onClick: \(\) => undefined,\n {8}\},/);
  assert.deepEqual(result.item, { prop: "trailing", index: 2 });
  assert.deepEqual(gRun(gLines, { op: "groupItem", index: 1, with: 0 }).code, GROUPS, "already together: nothing changes");
});

test("ungroupItem: the item leaves in place (from the middle: after the group); a group left with one item is no group", () => {
  const result = gRun(gLines, { op: "ungroupItem", index: 0 });
  assert.match(result.code, /\{ icon: "icon-a", label: "Audio call" \},\n {8}\{ icon: "icon-b", label: "Video call" \},\n {8}\{\n {10}icon: "icon-c"/);
  assert.deepEqual(result.item, { prop: "trailing", index: 0 });
  const three = gRun(gLines, { op: "groupItem", index: 2, with: 1 });
  const middle = gRun(locOf(three.code, "<TopNavigation\n"), { op: "ungroupItem", index: 1 }, three.code);
  assert.match(middle.code, /label: "Audio call", group: "call" \},\n {8}\{\n {10}icon: "icon-c",\n {10}label: "More",\n {10}group: "call",[\s\S]*?\},\n {8}\{ icon: "icon-b", label: "Video call" \},\n {6}\]\}/);
  assert.deepEqual(middle.item, { prop: "trailing", index: 2 });
  assert.match(run(gInline, "TopNavigation", { op: "ungroupItem", prop: "trailing", index: 0 }, GROUPS).error, /in no group/);
});

test("moveItem regroup: a drag out of the group leaves it; inside a group joins it; tidy keeps groups as written", () => {
  const out = gRun(gLines, { op: "moveItem", index: 0, to: 2, regroup: "drop" });
  assert.match(out.code, /\{ icon: "icon-b", label: "Video call" \},\n {8}\{\n {10}icon: "icon-c",[\s\S]*?\},\n {8}\{ icon: "icon-a", label: "Audio call" \},\n {6}\]\}/);
  assert.deepEqual(out.item, { prop: "trailing", index: 2 });
  const into = gRun(gLines, { op: "moveItem", index: 2, to: 1, regroup: "drop" });
  assert.match(into.code, /label: "Audio call", group: "call" \},\n {8}\{\n {10}icon: "icon-c",\n {10}label: "More",\n {10}group: "call",/);
  const swap = gRun(gLines, { op: "moveItem", index: 1, to: 0, regroup: "tidy" });
  assert.match(swap.code, /\{ icon: "icon-b", label: "Video call", group: "call" \},\n {8}\{ icon: "icon-a", label: "Audio call", group: "call" \},/);
  assert.match(run(gLines, "TopNavigation", { op: "moveItem", prop: "trailing", index: 0, to: 1, regroup: "yes" }, GROUPS).error, /regroup/);
});

test("removeItem: the item left alone in its group loses its group field", () => {
  const result = gRun(gLines, { op: "removeItem", index: 1 });
  assert.match(result.code, /trailing=\{\[\n {8}\{ icon: "icon-a", label: "Audio call" \},\n {8}\{\n {10}icon: "icon-c"/);
});

test("groups the code computes are refused, never rewritten", () => {
  assert.match(run(locOf(GROUPS, '<TopNavigation title="Kind"'), "TopNavigation", { op: "groupItem", prop: "trailing", index: 1, with: 0 }, GROUPS).error, /computes its group/);
});

console.log(`✓ items (insertItem · removeItem · duplicateItem · moveItem · groupItem · ungroupItem) self-test: ${passed} cases`);
