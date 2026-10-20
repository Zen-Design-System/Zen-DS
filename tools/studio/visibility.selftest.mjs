// Self-test for tools/studio/visibility.mjs: hidden layers and switched-off slots (user, 2026-10-16) are kept in the page,
// left out of what a layout draws, the export and the Figma push.
import { compileReact } from "./compile.mjs";
import { parsePage } from "./dialect.mjs";
import { docFromText, printPage } from "./doc.mjs";
import { figmaFromPage } from "./figma-push.mjs";
import { repoMapping } from "./figma-pull.mjs";
import { NESTED_LAYERS } from "../../src/platform/studio/inspector/nestedLayers.generated.ts";
import { hiddenLabel, hiddenOn, hiddenSlotsOf, hiddenValueOf, pruneHidden } from "./visibility.mjs";

const failures = [];
let passed = 0;
const check = (label, actual, expected) => {
  const a = JSON.stringify(actual);
  const e = JSON.stringify(expected);
  if (a === e) passed += 1;
  else failures.push(`${label}\n    expected ${e}\n    actual   ${a}`);
};

check("hidden alone hides on every layout", [hiddenOn({ kind: "literal", value: true }, "mobile"), hiddenOn(true, "desktop"), hiddenOn(true, undefined)], [true, true, true]);
check("hidden=mobile hides on mobile only", [hiddenOn("mobile", "mobile"), hiddenOn("mobile", "desktop"), hiddenOn("mobile", undefined)], [true, false, false]);
check("other values are no hidden value", [hiddenValueOf("tablet"), hiddenValueOf(false), hiddenValueOf(undefined)], [null, null, null]);
check("hiddenSlots reads a list of prop names", [hiddenSlotsOf({ kind: "array", items: [{ kind: "literal", value: "actions" }, { kind: "literal", value: 3 }] }), hiddenSlotsOf(["a"]), hiddenSlotsOf(undefined)], [["actions"], ["a"], []]);
check("labels", ["mobile", "desktop", true, null].map(hiddenLabel), ["Hidden on mobile", "Hidden on desktop", "Hidden", "Visible"]);

const PAGE = `// @zen-page {"format":1,"title":"Hide"}
import { Board, Screen } from "@zen-ds/react/builder";
import { AppShell, AppShellAction, AppShellAccount, AppShellHeader, Badge, Search, Stack, Text } from "@zen-ds/react";

export const mock = {};

export default function Page() {
  return (
    <Board>
      <Screen id="screen-1" title="Hide" device="desktop">
        <AppShell
          header={<AppShellHeader
            leading={<Search aria-label="Search" placeholder="Search" />}
            actions={<><Badge hidden>Pro</Badge><AppShellAction icon="icon-bell-01-line" aria-label="Notifications" /><AppShellAccount name="Khoa Dang" /></>}
            hiddenSlots={["leading"]}
          />}
        >
          <Stack gap="md">
            <Text>Always</Text>
            <Text hidden="mobile">Desktop only</Text>
            <Text hidden="desktop">Phone only</Text>
          </Stack>
        </AppShell>
      </Screen>
    </Board>
  );
}
`;
check("the page with hidden layers and slots is valid", parsePage(PAGE).errors, []);
const doc = docFromText(PAGE).doc;
check("the page keeps them through a print", parsePage(printPage(doc)).errors, []);
const screen = parsePage(PAGE).board.children[0];
const desktop = pruneHidden(screen, "desktop");
const header = desktop.children.find((child) => child.kind === "element").props.header.node;
check("desktop: the switched-off slot and the Studio-only props are gone", Object.keys(header.props).sort(), ["actions"]);
check("desktop: the hidden Badge is left out of its slot", header.props.actions.children.map((child) => child.name), ["AppShellAction", "AppShellAccount"]);
const texts = (node) => node.children.flatMap((child) => (child.kind === "element" ? (child.name === "Text" ? [child.children[0].value] : texts(child)) : []));
check("desktop draws the desktop-only text", texts(desktop), ["Always", "Desktop only"]);
check("mobile draws the phone-only text", texts(pruneHidden(screen, "mobile")), ["Always", "Phone only"]);

const code = compileReact(PAGE, { file: "hide.zen.tsx" }).code ?? "";
check("export: no hidden layer, slot or Studio-only prop", [code.includes(">Pro<"), code.includes("hiddenSlots"), /\bhidden\b/.test(code), code.includes("Phone only"), code.includes("Desktop only"), code.includes("Notifications")], [false, false, false, false, true, true]);
const pushed = JSON.stringify(figmaFromPage(printPage(doc, { ids: true }), { mapping: await repoMapping(), nestedLayers: NESTED_LAYERS }).frame ?? {});
check("Figma push: the hidden layers stay out", [pushed.includes("\"Pro\""), pushed.includes("Phone only"), pushed.includes("Desktop only")], [false, false, true]);

if (failures.length) {
  console.error(`visibility selftest: ${failures.length} failed, ${passed} passed\n  ${failures.join("\n  ")}`);
  process.exit(1);
}
console.log(`✓ visibility selftest: ${passed} checks pass.`);
