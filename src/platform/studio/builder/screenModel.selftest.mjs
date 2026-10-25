// Self-test of a Screen's breakpoints (docs/research/studio-responsive-breakpoints-2026-10-26.md): the breakpoint of a
// Screen by device and width, the view switch's devices, the versions Play follows, what "Changes on this breakpoint"
// lists and where a placeholder's part goes. The modules are imported directly (Node strips the types).
//   node src/platform/studio/builder/screenModel.selftest.mjs
import { parsePage } from "../../../../tools/studio/dialect.mjs";
import { BREAKPOINTS, breakpointDevice, breakpointOfWidth, screenBreakpoint, viewDevice } from "../../../../tools/studio/screen-devices.mjs";
import { behavioursAt, screenFacts, valueAt } from "../inspector/breakpointBehaviours.ts";
import { versionFor, versionScreensOf, viewportBreakpoint } from "./proto/versions.ts";
import { partHost, rootShellOf } from "./screenModel.ts";

const failures = [];
let passed = 0;
const check = (label, actual, expected) => {
  const a = JSON.stringify(actual);
  const e = JSON.stringify(expected);
  if (a === e) passed += 1;
  else failures.push(`${label}\n    expected ${e}\n    actual   ${a}`);
};

// ── The breakpoint: Zen's thresholds (744, 1024); a phone and a tablet keep their device's, a desktop Screen its width's.
check("widths", [390, 743, 744, 1023, 1024, 1512].map(breakpointOfWidth), ["mobile", "mobile", "tablet", "tablet", "desktop", "desktop"]);
check("a desktop Screen follows its width", [screenBreakpoint("desktop", 390), screenBreakpoint("desktop", 800), screenBreakpoint("desktop", 1440), screenBreakpoint("desktop", undefined)], ["mobile", "tablet", "desktop", "desktop"]);
check("phones and tablets keep their device's", [screenBreakpoint("phone", 669), screenBreakpoint("tablet", 1133), screenBreakpoint("tablet", 744)], ["mobile", "tablet", "tablet"]);
check("widest first", BREAKPOINTS, ["desktop", "tablet", "mobile"]);
check("each breakpoint's device on iOS", BREAKPOINTS.map((key) => breakpointDevice(key, "ios")?.id), ["desktop", "ipad-portrait", "iphone"]);
check("and on Android", BREAKPOINTS.map((key) => breakpointDevice(key, "android")?.id), ["desktop", "android-tablet-portrait", "android-phone"]);
check("a view by device", viewDevice({ device: "iphone", width: 390 })?.device, "phone");
check("a typed view width keeps the Screen's height, no bars", (({ device, width, height, bars }) => ({ device, width, height, bars }))(viewDevice({ device: "width", width: 600 }, 900)), { device: "desktop", width: 600, height: 900, bars: "none" });
check("no view", viewDevice(undefined), undefined);

// ── Versions (Make a separate Screen, D4): the version for the viewport's breakpoint, else the primary.
const ZEN = ["AppShell", "BottomNavigation", "Grid", "Pagination", "Select", "Sidebar", "Stack", "Text", "TopNavigation"];
const page = (screens) => {
  const parsed = parsePage(`// @zen-page {"format":1,"title":"Test"}\nimport { Board, Screen } from "@zen-ds/react/builder";\nimport { ${ZEN.join(", ")} } from "@zen-ds/react";\nexport const mock = {};\nexport default function Page() { return (<Board>${screens}</Board>); }\n`, { components: new Set(ZEN) });
  if (parsed.errors.length) throw new Error(JSON.stringify(parsed.errors));
  return parsed;
};
const versions = versionScreensOf(page(`<Screen id="home" title="Home" /><Screen id="home" state="empty" title="Home" /><Screen id="home-mobile" device="phone" width={390} height={844} versionOf="home" /><Screen id="list" /><Screen id="list-tablet" device="tablet" width={744} height={1133} versionOf="list" />`));
check("one entry per id", versions.map((screen) => screen.id), ["home", "home-mobile", "list", "list-tablet"]);
check("home on each breakpoint", BREAKPOINTS.map((key) => versionFor(versions, "home", key)), ["home", "home", "home-mobile"]);
check("a phone without its own takes the tablet's", versionFor(versions, "list", "mobile"), "list-tablet");
check("a link to a version at desktop width shows the primary", versionFor(versions, "home-mobile", "desktop"), "home");
check("a Screen without versions is itself", versionFor(versions, "elsewhere", "mobile"), "elsewhere");
check("a viewport's breakpoint", [viewportBreakpoint(390), viewportBreakpoint(900), viewportBreakpoint(900, "phone")], ["mobile", "tablet", "mobile"]);

// ── Changes on this breakpoint, from the Screen's tree.
const shellPage = page(`<Screen id="s" title="Orders">
  <AppShell sidebar={<Sidebar aria-label="Main" />}>
    <Stack padding="margin-comfortable" gap="md">
      <Grid columns={{ desktop: 3, mobile: 1 }}><Select label="Status" /></Grid>
      <Pagination total={12} />
    </Stack>
  </AppShell>
</Screen>`);
const screen = shellPage.board.children[0];
const ids = (shown) => behavioursAt(screenFacts(screen, shown)).map((change) => change.id);
check("desktop: nothing changes", ids({ breakpoint: "desktop", device: "desktop", width: 1440, layout: "desktop" }), []);
check("viewed on a phone", ids({ breakpoint: "mobile", device: "phone", width: 390, layout: "mobile" }), ["phone-modes", "margins", "mobile-layout", "phone-sheets", "grid-columns", "phone-looks"]);
check("a desktop Screen at 800: the AppShell's drawer, Grid columns inherit desktop's", ids({ breakpoint: "tablet", device: "desktop", width: 800, layout: "desktop" }), ["app-shell"]);
const mobile = behavioursAt(screenFacts(screen, { breakpoint: "mobile", device: "desktop", width: 390, layout: "desktop" }));
check("the margins' steps", mobile.find((change) => change.id === "margins")?.label, "Page margins: Comfortable 24 → 20");
check("the Grid's columns", mobile.find((change) => change.id === "grid-columns")?.label, "Grid columns: 3 → 1");
check("an iPad landscape keeps the AppShell's desktop structure", ids({ breakpoint: "tablet", device: "tablet", width: 1133, layout: "desktop" }), []);
check("valueAt as resolveAt: own, wider, then narrower", [valueAt({ desktop: 3 }, "mobile"), valueAt({ desktop: 3, tablet: 2 }, "mobile"), valueAt({ mobile: 1 }, "desktop"), valueAt({ desktop: 3, mobile: 1 }, "tablet")], [3, 2, 1, 3]);

// ── Where a placeholder's part goes.
const parts = page(`<Screen id="a"><AppShell><Text>A</Text></AppShell></Screen>
<Screen id="b" topNavigation={<TopNavigation title="B" />}><AppShell><Text>B</Text></AppShell></Screen>
<Screen id="c" bottomNavigation={<BottomNavigation items={[]} />} hiddenSlots={["bottomNavigation"]}><AppShell><Text>C</Text></AppShell></Screen>
<Screen id="d"><Stack><Text>D</Text></Stack></Screen>`).board.children;
const host = (index, part, layout) => partHost(parts[index], part, layout).name;
check("no own phone parts: the root AppShell", host(0, "bottomNavigation", "mobile"), "AppShell");
check("the Screen draws its own: the Screen", host(1, "bottomNavigation", "mobile"), "Screen");
check("a part switched off on the Screen comes back there", host(2, "bottomNavigation", "mobile"), "Screen");
check("a narrowed desktop Screen shows its AppShell", host(1, "bottomNavigation", "desktop"), "AppShell");
check("no AppShell: the Screen", [host(3, "topNavigation", "mobile"), rootShellOf(parts[3])], ["Screen", null]);

if (failures.length) {
  console.error(`screen breakpoints selftest: ${failures.length} failed, ${passed} passed\n  ✗ ${failures.join("\n  ✗ ")}`);
  process.exit(1);
}
console.log(`✓ screen breakpoints selftest: ${passed} checks pass.`);
