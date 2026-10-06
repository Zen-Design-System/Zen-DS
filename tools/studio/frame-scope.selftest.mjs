// Selftest of frame-scope.mjs (Save / Discard per frame). Run: node tools/studio/frame-scope.selftest.mjs
// (tools/studio/selftest.mjs runs it too).
import { frameChanges, frameRanges, lineChanges, splitDraft } from "./frame-scope.mjs";

let passed = 0;
let failed = 0;
function check(label, actual, expected) {
  const a = JSON.stringify(actual);
  const e = JSON.stringify(expected);
  if (a === e) passed += 1;
  else { failed += 1; console.error(`✗ ${label}\n  expected ${e}\n  actual   ${a}`); }
}

const lineOf = (text, needle) => text.split("\n").findIndex((line) => line.includes(needle)) + 1;

/* ── a page of examples: two example components, a helper, the examples list ── */
const page = `import { Button } from "../../../components/Button";
import { Card } from "../../../components/Card";
import type { ExampleDef } from "../types";

function Helper() {
  return <span className="helper">help</span>;
}

function FirstExample() {
  return (
    <Card title="First">
      <Button>One</Button>
      <Helper />
    </Card>
  );
}

function SecondExample() {
  return (
    <Card title="Second">
      <Button>Two</Button>
    </Card>
  );
}

export const examples: ExampleDef[] = [
  {
    title: "First",
    description: "The first.",
    render: () => <FirstExample />,
    code: \`<Card title="First">
  <Button>One</Button>
</Card>\`,
  },
  {
    title: "Second",
    description: "The second.",
    render: () => <SecondExample />,
    code: \`<Card title="Second">
  <Button>Two</Button>
</Card>\`,
  },
  {
    title: "Inline",
    description: "Rendered in place.",
    render: () => (
      <Button>Three</Button>
    ),
    code: \`<Button>Three</Button>\`,
  },
];
`;

const first = [lineOf(page, `<Card title="First">`), lineOf(page, "<Button>One</Button>"), lineOf(page, `className="helper"`)];
const second = [lineOf(page, `<Card title="Second">`), lineOf(page, "<Button>Two</Button>")];
const inline = [lineOf(page, "<Button>Three</Button>")];
const firstRanges = frameRanges(page, first);
const secondRanges = frameRanges(page, second);
const inlineRanges = frameRanges(page, inline);
const span = (needle, end) => [lineOf(page, needle), lineOf(page, end)];

check("frame 1 owns its component, the helper it renders and its example object (snippet)", firstRanges, [
  [lineOf(page, "function Helper"), lineOf(page, "function Helper") + 2],
  [lineOf(page, "function FirstExample"), lineOf(page, "function SecondExample") - 2],
  [lineOf(page, `title: "First"`) - 1, lineOf(page, `title: "Second"`) - 2],
]);
check("frame 2 owns its component and its example object", secondRanges, [
  [lineOf(page, "function SecondExample"), lineOf(page, "export const examples") - 2],
  [lineOf(page, `title: "Second"`) - 1, lineOf(page, `title: "Inline"`) - 2],
]);
check("an inline render owns its array element only", inlineRanges, [[lineOf(page, `title: "Inline"`) - 1, lineOf(page, "];") - 1]]);
check("import lines own nothing", frameRanges(page, [1, 2]), []);
check("unparsable text gives null", frameRanges("function (", [1]) === null || Array.isArray(frameRanges("function (", [1])), true);

/* ── a draft with changes in both frames, a snippet sync and a detach-like import change ── */
const draft = page
  .replace(`import { Card } from "../../../components/Card";\n`, `import { Card } from "../../../components/Card";\nimport { Badge } from "../../../components/Badge";\n`)
  .replace("<Button>One</Button>\n      <Helper />", `<Button level="secondary">One</Button>\n      <Helper />\n      <Badge>New</Badge>`)
  .replace("<Button>One</Button>\n</Card>`", `<Button level="secondary">One</Button>\n</Card>\``)
  .replace("<Button>Two</Button>\n    </Card>", "<Button size=\"lg\">Two</Button>\n    </Card>");

const changes = lineChanges(page, draft);
check("lineChanges: import + frame 1 (Button line, Badge line, snippet) + frame 2", changes.map((change) => change.imports), [true, false, false, false, false]);

const draftFirst = frameRanges(draft, [lineOf(draft, `<Card title="First">`), lineOf(draft, "<Badge>New</Badge>")]);
const draftSecond = frameRanges(draft, [lineOf(draft, `<Card title="Second">`)]);
check("frameChanges counts frame 1 (component + snippet, imports not counted)", frameChanges(page, draft, draftFirst), { changes: 3, added: 3, removed: 2 });
check("frameChanges counts frame 2", frameChanges(page, draft, draftSecond), { changes: 1, added: 1, removed: 1 });

const saveFirst = splitDraft(page, draft, draftFirst, "save");
check("save frame 1: its JSX, snippet and the Badge import it needs; frame 2 untouched", [
  saveFirst.taken,
  saveFirst.text.includes(`<Button level="secondary">One</Button>\n      <Helper />\n      <Badge>New</Badge>`),
  saveFirst.text.includes(`<Button level="secondary">One</Button>\n</Card>\``),
  saveFirst.text.includes(`import { Badge }`),
  saveFirst.text.includes(`<Button size="lg">Two</Button>`),
], [4, true, true, true, false]);

const saveSecond = splitDraft(page, draft, draftSecond, "save");
check("save frame 2: only its change, no import it does not need", [
  saveSecond.taken,
  saveSecond.text.includes(`<Button size="lg">Two</Button>`),
  saveSecond.text.includes(`import { Badge }`),
  saveSecond.text.includes(`level="secondary"`),
], [1, true, false, false]);
check("saving frame 2 then frame 1 equals the whole draft", splitDraft(saveSecond.text, draft, frameRanges(draft, [lineOf(draft, "<Badge>New</Badge>")]), "save").text, draft);

const discardFirst = splitDraft(page, draft, draftFirst, "discard");
check("discard frame 1: its changes and the import only it needed go; frame 2 stays", [
  discardFirst.taken,
  discardFirst.text.includes("<Badge>"),
  discardFirst.text.includes(`import { Badge }`),
  discardFirst.text.includes(`level="secondary"`),
  discardFirst.text.includes(`<Button size="lg">Two</Button>`),
], [4, false, false, false, true]);
check("discarding both frames gives the base back", splitDraft(page, discardFirst.text, frameRanges(discardFirst.text, [lineOf(discardFirst.text, `<Card title="Second">`)]), "discard").text, page);
check("a frame without changes takes nothing", splitDraft(page, draft, inlineRanges, "save"), { text: null, taken: 0 });

/* ── an import another frame still needs stays: frame 2 detaches its only Card, frame 1 keeps using Card ── */
const detached = page
  .replace(`import { Card } from "../../../components/Card";\n`, `import { Card } from "../../../components/Card";\nimport { Box } from "../../../components/Layout";\n`)
  .replace(`    <Card title="Second">\n      <Button>Two</Button>\n    </Card>`, `    <Box padding="md">\n      <Button>Two</Button>\n    </Box>`);
const detachedSecond = frameRanges(detached, [lineOf(detached, `<Box padding="md">`)]);
const saveDetached = splitDraft(page, detached, detachedSecond, "save");
check("detach save takes the Box import and keeps Card (frame 1 uses it)", [saveDetached.text.includes(`import { Box }`), saveDetached.text.includes(`import { Card }`), saveDetached.text === detached], [true, true, true]);

/* ── playgrounds: the top-level if (page === "…") branch of a big function ── */
const platform = `import { Button } from "./components/Button";

function SetPlayground({ title }: { title: string }) {
  return <section>{title}</section>;
}

export function PlatformComponentPage({ page }: { page: string }) {
  const shared = 1;
  if (page === "button") {
    return (
      <div>
        <SetPlayground title="Main" />
        <Button>Button</Button>
      </div>
    );
  }
  if (page === "chip" || page === "tag") {
    return <div>Chip {shared}</div>;
  }
  return null;
}
`;
check("a playground owns its page branch and the helpers it renders", frameRanges(platform, [lineOf(platform, "<div>\n") || lineOf(platform, "      <div>"), lineOf(platform, "<section>")]), [
  [lineOf(platform, "function SetPlayground"), lineOf(platform, "function SetPlayground") + 2],
  [lineOf(platform, `if (page === "button")`), lineOf(platform, `if (page === "chip"`) - 1],
]);
check("a branch with || page tests is one playground", frameRanges(platform, [lineOf(platform, "<div>Chip")]), [[lineOf(platform, `if (page === "chip"`), lineOf(platform, "return null;") - 1]]);

console.log(`${failed ? "✗" : "✓"} zen-studio frame-scope selftest: ${passed} passed${failed ? `, ${failed} failed` : ""}`);
if (failed) process.exit(1);
