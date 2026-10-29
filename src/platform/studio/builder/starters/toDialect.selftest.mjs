#!/usr/bin/env node
// Starters (./toDialect.ts, imported directly: Node strips the types): a snapshot written as a builder page — props as
// literals, text JSX keeps exactly, a page the dialect accepts. Run: node src/platform/studio/builder/starters/toDialect.selftest.mjs
import { validateDialect } from "../../../../../tools/studio/dialect.mjs";
import { componentsOf, element, linkOverlays, mergeText, starterPage, starterTitle } from "./toDialect.ts";

const failures = [];
let passed = 0;
function check(label, actual, expected) {
  const a = JSON.stringify(actual);
  const e = JSON.stringify(expected);
  if (a === e) passed += 1;
  else failures.push(`${label}\n    expected ${e}\n    actual   ${a}`);
}

const lit = (value) => ({ kind: "literal", value });
const node = (name, props = [], children = []) => ({ kind: "element", name, props, children });
const text = (value) => ({ kind: "text", value });

check("attributes: string, shorthand true, false, number, null",
  element(node("Button", [["level", lit("accent")], ["fullWidth", lit(true)], ["disabled", lit(false)], ["count", lit(3)], ["icon", lit(null)]], [text("Save")]), ""),
  '<Button level="accent" fullWidth disabled={false} count={3} icon={null}>Save</Button>');
check("a string JSX would read differently goes in braces", element(node("Text", [["title", lit('Say "hi" & go')]]), ""), '<Text title={"Say \\"hi\\" & go"} />');
check("text with braces, angle brackets or edge spaces goes in braces",
  [element(node("Text", [], [text("{a} < b")]), ""), element(node("Text", [], [text(" padded ")]), ""), element(node("Text", [], [text("two\nlines")]), "")],
  ['<Text>{"{a} < b"}</Text>', '<Text>{" padded "}</Text>', '<Text>{"two\\nlines"}</Text>']);
check("adjacent text merges, empty text goes", mergeText([text("a"), text(""), text("b"), node("Icon"), text("c")]), [text("ab"), node("Icon"), text("c")]);
check("arrays and objects inline when short",
  element(node("Tabs", [["items", { kind: "array", items: [{ kind: "object", fields: [["id", lit("a")], ["label", lit("A")]] }] }]]), ""),
  '<Tabs items={[{ id: "a", label: "A" }]} />');
check("an element in a prop", element(node("ListItem", [["leading", { kind: "element", node: node("Avatar", [["alt", lit("Ava")]]) }]]), ""), '<ListItem leading={<Avatar alt="Ava" />} />');
check("object keys that are not names are quoted", element(node("Box", [["data", { kind: "object", fields: [["aria-x", lit(1)]] }]]), ""), '<Box data={{ "aria-x": 1 }} />');
const long = element(node("Button", [["level", lit("accent")], ["size", lit("lg")], ["startIcon", lit("icon-plus-line")], ["endIcon", lit("icon-arrow-right-line")], ["aria-label", lit("Save the whole thing now")]], [text("Save")]), "");
check("a long tag breaks into one prop per line", long.split("\n"), ["<Button", '  level="accent"', '  size="lg"', '  startIcon="icon-plus-line"', '  endIcon="icon-arrow-right-line"', '  aria-label="Save the whole thing now"', ">", "  Save", "</Button>"]);
check("components used (Card.Header counts as Card)", [...componentsOf([node("Card", [], [node("Card.Header"), node("Stack", [["x", { kind: "element", node: node("Icon") }]])])])].sort(), ["Card", "Icon", "Stack"]);
check("titles", [starterTitle("Example: Sign in"), starterTitle("Dashboard"), starterTitle("Example: ")], ["Sign in", "Dashboard", "Untitled"]);

const components = new Set(["Stack", "Text", "Button", "ListItem", "Avatar", "Card", "Dialog", "Badge"]);
const one = starterPage({ title: "Sign in", device: "desktop", nodes: [node("Card", [["padding", lit("xl")]], [node("Text", [["textStyle", lit("Heading/3")]], [text("Welcome")]), node("Button", [["level", lit("primary")]], [text("Continue")])])] });
check("one node: straight in the Screen, a valid page", validateDialect(one, { components }), []);
check("one node: the Screen holds it", one.includes('      <Screen id="screen-1" title="Sign in" device="desktop">\n        <Card padding="xl">'), true);
check("one node: imports what it uses", one.includes('import { Button, Card, Text } from "@zen-ds/react";'), true);
const several = starterPage({ title: "Bits", device: "phone", nodes: [node("Badge", [], [text("New")]), node("ListItem", [["title", lit("Ava")], ["leading", { kind: "element", node: node("Avatar", [["alt", lit("Ava")]]) }]])] });
check("several nodes: in a padded Stack (lg on a phone), a valid page", [validateDialect(several, { components }), several.includes('<Stack gap="md" padding="lg">')], [[], true]);
const padded = starterPage({ title: "Card", device: "desktop", nodes: [node("Badge", [], [text("New")])], padding: "2xl" });
check("one node with room around it: in a Stack with that padding, a valid page", [validateDialect(padded, { components }), padded.includes('<Stack gap="md" padding="2xl">')], [[], true]);
check("an overlay's own action closes it", element(node("Dialog", [["primaryAction", { kind: "object", fields: [["label", lit("Done")], ["onClick", { kind: "proto", action: "close" }]] }]]), ""), '<Dialog primaryAction={{ label: "Done", onClick: proto.close() }} />');
const overlay = starterPage({ title: "With dialog", device: "desktop", nodes: [node("Button", [], [text("Open")])], overlays: [{ id: "dialog-1", node: node("Dialog", [["title", lit("Delete?")], ["primaryAction", { kind: "object", fields: [["label", lit("Delete")], ["onClick", { kind: "proto", action: "close" }]] }]], [text("Sure?")]) }] });
check("an overlay: an Overlay frame after the Screen, a valid page", [validateDialect(overlay, { components }), overlay.includes('<Overlay id="dialog-1">'), overlay.includes("import { Board, Overlay, Screen, proto }")], [[], true, true]);
check("a quote in the title stays valid", validateDialect(starterPage({ title: 'Say "hi"', device: "tablet", nodes: [node("Text", [], [text("x")])] }), { components }), []);

// A template's overlays open from the buttons named as they are (walk 2026-10-29 W-50).
{
  const clicked = (built) => ({ ...built, clicks: true });
  const invite = clicked(node("Button", [], [text("Invite members")]));
  const date = clicked(node("Button", [["aria-label", lit("Date")]], [text("Date")]));
  const plain = node("Button", [], [text("Remove")]);
  const help = clicked(node("Button", [], [text("Get help")]));
  const nodes = [node("Stack", [], [invite, date, plain, help])];
  const overlays = [
    { id: "filter", node: node("Dialog", [["title", lit("Filter")]]) },
    { id: "invite-members", node: node("Dialog", [["title", lit("Invite members")]]) },
    { id: "date-placed", node: node("Dialog", [["title", lit("Date placed")]]) },
    { id: "remove", node: node("Dialog", [["title", lit("Remove")]]) },
  ];
  const linked = linkOverlays(nodes, overlays);
  const openOf = (button) => button.props.find(([key]) => key === "onClick")?.[1];
  check("linked: by the same words, then by their start; a button that took no click and a name no button reads stay out", linked.sort(), ["date-placed", "invite-members"]);
  check("the buttons open their overlays", [openOf(invite), openOf(date), openOf(plain), openOf(help)], [{ kind: "proto", action: "open", target: "invite-members" }, { kind: "proto", action: "open", target: "date-placed" }, undefined, undefined]);
  const page = starterPage({ title: "Admin", device: "desktop", nodes, overlays });
  check("the page writes proto.open and stays valid", [page.includes('onClick={proto.open("invite-members")}'), validateDialect(page, { components })], [true, []]);
}

if (failures.length) {
  console.error(`✗ starters (toDialect) selftest: ${failures.length} failed, ${passed} passed\n  ${failures.join("\n  ")}`);
  process.exit(1);
}
console.log(`✓ starters (toDialect) selftest: ${passed} checks pass.`);
