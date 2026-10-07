#!/usr/bin/env node
// handoff.md (./handoff.ts, imported directly: Node strips the types; Studio builder GĐ5 M3): the guideline notes read
// from the real guidelines, the token and text style names of a parsed page, and the sections the file must hold.
// Run: node src/platform/studio/builder/export/handoff.selftest.mjs
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parsePage } from "../../../../../tools/studio/dialect.mjs";
import { designNames, guidelineNotes, handoffMarkdown } from "./handoff.ts";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../../../..");
const failures = [];
let passed = 0;
function check(label, actual, expected) {
  const a = JSON.stringify(actual);
  const e = JSON.stringify(expected);
  if (a === e) passed += 1;
  else failures.push(`${label}\n    expected ${e}\n    actual   ${a}`);
}
const ok = (label, value) => check(label, Boolean(value), true);

// Guideline notes, from the generated guidelines.
const dialog = guidelineNotes(fs.readFileSync(path.join(root, "docs/guidelines/dialog.md"), "utf8"));
ok("guideline: the purpose line", /^Interrupt to confirm/.test(dialog.purpose));
ok("guideline: keyboard rows as 'keys — action'", dialog.keyboard.includes("Escape — Close (when dismissible)") && !dialog.keyboard.some((line) => /^Keys|^-/.test(line)));
ok("guideline: accessibility bullets", dialog.accessibility.length >= 2 && dialog.accessibility[0].startsWith("role=dialog"));
check("guideline: none of a section it lacks", guidelineNotes("# X\n\n**Import:** `x`\n\nDoes x.\n\n## Use it for\n- y\n").keyboard, []);

// The names a page writes.
const page = parsePage(`// @zen-page {"format":1,"title":"Team"}
import { Board, Screen } from "@zen/design-system/builder";
import { Badge, Box, Stack, Text } from "@zen/design-system";

export const mock = { people: [{ name: "Ava" }] };

export default function Page() {
  return (
    <Board>
      <Screen id="people" title="People" device="phone">
        <Stack gap="md" padding="lg">
          <Text textStyle="Heading/3" tone="strong">Team</Text>
          <Box background="subtle" radius="lg" paddingX="sm">
            {mock.people.map((person) => <Text textStyle="Body/Small/Regular">{person.name}</Text>)}
          </Box>
          <Badge theme="green">Active</Badge>
        </Stack>
      </Screen>
    </Board>
  );
}
`);
check("names: text styles, spacing, colour roles, shape", designNames(page.board), {
  textStyles: ["Body/Small/Regular", "Heading/3"],
  spacing: ["gap md", "padding lg", "paddingX sm"],
  colour: ["Badge theme green", "Box background subtle", "Text tone strong"],
  shape: ["radius lg"],
});

// The file.
const notes = { purpose: "One row of a list.", keyboard: ["Enter / Space — Activate a clickable row"], accessibility: ["A clickable row is one button."] };
const input = {
  id: "team",
  title: "Team",
  component: "TeamPage",
  version: "0.3.0",
  provider: { theme: "light", density: "compact" },
  frames: [
    { frame: "screen:people", title: "People", kind: "screen", device: "phone", png: "screens/people.png", html: "html/screens/people.html", focus: [{ role: "button", name: "Invite" }, { role: "button", name: "" }] },
    { frame: "overlay:invite", title: "Overlay invite", kind: "overlay", device: "desktop", png: null, html: "html/screens/overlay-invite.html", focus: [] },
  ],
  components: [{ name: "List", slug: "list-item", notes }, { name: "ListItem", slug: "list-item", notes }, { name: "Button", slug: "button", notes: null }],
  names: designNames(page.board),
  actions: [
    { frame: "overlay:invite", where: "<Dialog> primaryAction.onClick", action: "close", target: null },
    { frame: "screen:people", where: "<Button> onClick", action: "open", target: "invite" },
  ],
  handlers: ["<ListItem> onClick navigates to \"person\""],
  dataType: "export type TeamMock = {\n  people: Array<{\n    name: string;\n  }>;\n};",
  props: ["data"],
  media: ["site-cafe.webp"],
  pictureNotes: ["Overlay invite: the browser could not draw it"],
  date: "2026-10-07",
};
const markdown = handoffMarkdown(input);
const headings = markdown.split("\n").filter((line) => line.startsWith("## "));
check("file: its sections in order", headings, ["## In this package", "## Setup", "## Components", "## Tokens and text styles", "## Prototype flow", "## Data contract", "## Accessibility", "## Picture notes", "## Open questions"]);
ok("file: setup with the version, styles and provider", markdown.includes("`npm install @zen/design-system@^0.3.0`") && markdown.includes('`<ZenProvider theme="light" density="compact">`'));
ok("file: a phone page names the mobile modes", markdown.includes('breakpoint="mobile" typography="mobile" density="comfortable"'));
ok("file: components sharing a guideline share a row", markdown.includes("| List, ListItem | One row of a list. | `node_modules/@zen/design-system/docs/guidelines/list-item.md` |") && markdown.split("\n").filter((line) => line.includes("guidelines/list-item.md")).length === 1);
ok("file: interactions in the frames' order, elements as code", /\| people \| `<Button>` onClick \| opens overlay `invite` \| `setOverlay\("invite"\)` \|\n\| overlay invite \| `<Dialog>` primaryAction\.onClick \| closes the overlay/.test(markdown));
ok("file: the TODO lines", markdown.includes('- `<ListItem>` onClick navigates to "person"'));
ok("file: the data type in a block", markdown.includes("```ts\nexport type TeamMock = {"));
ok("file: the focus order, a stop without a name flagged", markdown.includes("1. button “Invite”\n2. button ⚠ no accessible name") && markdown.includes("No focusable element."));
ok("file: an undrawn picture", markdown.includes("| Overlay invite | overlay | not drawn |") && markdown.includes("- Overlay invite: the browser could not draw it"));
const desktop = handoffMarkdown({ ...input, frames: input.frames.map((frame) => ({ ...frame, device: "desktop" })), pictureNotes: [], dataType: null, actions: [], handlers: [] });
ok("file: no mobile line for a desktop page, no picture notes, no data", !desktop.includes('breakpoint="mobile"') && !desktop.includes("## Picture notes") && desktop.includes("The design shows no sample data") && desktop.includes("The design has no prototype links."));

if (failures.length) {
  console.error(`✗ handoff selftest: ${failures.length} failed, ${passed} passed\n  ${failures.join("\n  ")}`);
  process.exit(1);
}
console.log(`✓ handoff selftest: ${passed} checks pass.`);
