// Self-test for tools/studio/responsive-header.mjs: a Screen's phone header drawn from its desktop AppShell
// (component-usage-rules §17), and its linked parts kept in step through edits.
import { dataFieldEdit } from "./data-source.mjs";
import { parsePage } from "./dialect.mjs";
import { docFromText, editDoc } from "./doc.mjs";
import { applyOps, sha1 } from "./jsx-source.mjs";
import { phoneChromeCode, planPhoneSync } from "./responsive-header.mjs";

const failures = [];
let passed = 0;
const check = (label, actual, expected) => {
  const a = JSON.stringify(actual);
  const e = JSON.stringify(expected);
  if (a === e) passed += 1;
  else failures.push(`${label}\n    expected ${e}\n    actual   ${a}`);
};
const ok = (label, value) => check(label, Boolean(value), true);

const FILE = "local:phone-test.zen.tsx";
const NAMES = ["AppShell", "AppShellAccount", "AppShellAction", "AppShellHeader", "Badge", "BottomNavigation", "Breadcrumbs", "Button", "Menu", "PageHeader", "Search", "Sidebar", "SidebarMenuItem", "Stack", "Tabs", "Text", "TopNavigation"];
const componentModules = new Map(NAMES.map((name) => [name, name]));
const options = (text) => ({ file: FILE, componentModules, requiredChildren: new Set(), requiredProps: new Map(), hash: sha1(text) });

const page = ({ screenProps = "", shellProps, content = '<Stack gap="md"><Text>Rows</Text></Stack>' }) => `// @zen-page {"format":1,"title":"Expenses"}
import { Board, Screen, proto } from "@zen-ds/react/builder";
import { ${NAMES.join(", ")} } from "@zen-ds/react";

export const mock = {};

export default function Page() {
  return (
    <Board>
      <Screen id="screen-1" title="Expenses" device="desktop"${screenProps}>
        <AppShell
${shellProps}
        >
          ${content}
        </AppShell>
      </Screen>
    </Board>
  );
}
`;
const SIDEBAR = `          sidebar={<Sidebar aria-label="Main" selectedId="expenses">
            <SidebarMenuItem id="home" label="Overview" icon="icon-home-03-line" />
            <SidebarMenuItem id="expenses" label="Expenses" icon="icon-receipt-line" />
            <SidebarMenuItem id="approvals" label="Approvals" icon="icon-check-circle-line" counter="12" />
            <SidebarMenuItem id="cards" label="Corporate cards" icon="icon-credit-card-line" />
            <SidebarMenuItem id="vendors" label="Vendors" icon="icon-building-02-line" />
            <SidebarMenuItem id="reports" label="Reports" icon="icon-pie-chart-01-line" />
          </Sidebar>}`;
const ROOT = page({ shellProps: `${SIDEBAR}
          header={<AppShellHeader leading={<Search aria-label="Search" placeholder="Search expenses" />} actions={<><Badge theme="neutral">Pro</Badge><AppShellAction icon="icon-bell-01-line" aria-label="Notifications" count={4} onClick={proto.toast("4 new")} /><Menu align="end" items={[]} trigger={<AppShellAccount name="Khoa Dang" />} /></>} main={<PageHeader title="Expenses" actions={<Button level="primary" onClick={proto.open("new-expense")}>New expense</Button>} />} />}` });
const screenOf = (text) => parsePage(text).board.children.find((child) => child.kind === "element" && child.name === "Screen");

/* ── a root ─────────────────────────────────────────────────────────────────────────────────────────────────────── */
{
  check("root page is valid", parsePage(ROOT).errors, []);
  const code = phoneChromeCode(screenOf(ROOT));
  check("root: kind", code.kind, "root");
  ok("root: the large title, the bar's colour on a phone screen (alt)", /<TopNavigation type="alt" title="Expenses" largeTitle="Expenses"/.test(code.topNavigation));
  ok("root: the account leads the bar", /leading=\{<AppShellAccount name="Khoa Dang" \/>\}/.test(code.topNavigation));
  ok("root: Search, the Primary as + (its prototype link kept), notifications", /trailing=\{\[\{ icon: "icon-search-medium-line", label: "Search" \}, \{ icon: "icon-plus-line", label: "New expense", onClick: proto\.open\("new-expense"\) \}, \{ icon: "icon-bell-01-line", label: "Notifications", dot: true, onClick: proto\.toast\("4 new"\) \}\]\}/.test(code.topNavigation));
  ok("root: the Sidebar's first 4 rows + More, the selected one, a counter as a dot", /<BottomNavigation value="expenses" showLabels items=\{\[\{ id: "home", label: "Overview"[^\]]*\{ id: "approvals", label: "Approvals", icon: "icon-check-circle-line", dot: true \}[^\]]*\{ id: "more", label: "More", icon: "icon-dots-horizontal-line" \}\]\} \/>/.test(code.bottomNavigation));
  ok("root: notes say what stays or folds", code.notes.some((note) => note.includes("Pro Badge")) && code.notes.some((note) => note.includes("Vendors, Reports go into More")));
}

/* ── over budget: More takes the last place ─────────────────────────────────────────────────────────────────────── */
{
  const busy = page({ shellProps: `${SIDEBAR}
          header={<AppShellHeader leading={<Search aria-label="Search" placeholder="Search" />} actions={<><AppShellAction icon="icon-bell-01-line" aria-label="Notifications" count={4} /><AppShellAction icon="icon-settings-01-line" aria-label="Settings" /></>} main={<PageHeader title="Expenses" actions={<><Button level="tertiary">Export</Button><Button level="primary">New expense</Button></>} />} />}` });
  const code = phoneChromeCode(screenOf(busy));
  const trailing = code.topNavigation.match(/label: "([^"]+)"/g).map((item) => item.slice(8, -1));
  check("busy: three places, More holds the rest", trailing, ["Search", "New expense", "More"]);
  ok("busy: More shows the dot of an item inside", /label: "More", dot: true/.test(code.topNavigation));
}

/* ── a child ────────────────────────────────────────────────────────────────────────────────────────────────────── */
{
  const child = page({ shellProps: `${SIDEBAR}
          header={<AppShellHeader leading={<Breadcrumbs master={false} items={[{ id: "expenses", label: "Expenses" }, { id: "x-1024", label: "EXP-1024" }]} />} actions={<AppShellAction icon="icon-bell-01-line" aria-label="Notifications" count={4} />} main={<PageHeader title="EXP-1024" actions={<Button level="primary">Approve</Button>} tabs={<Tabs aria-label="Sections" items={[{ id: "a", label: "Overview" }, { id: "b", label: "Activity" }]} />} />} />}` });
  const code = phoneChromeCode(screenOf(child));
  check("child: kind", code.kind, "child");
  ok("child: compact bar, the bar title, no large title", /<TopNavigation type="compact-alt" title="EXP-1024"/.test(code.topNavigation) && !/largeTitle/.test(code.topNavigation));
  ok("child: Back to the parent (the chevron, proto.back())", /leading=\{\{ icon: "icon-chevron-left-line-medium", label: "Back", onClick: proto\.back\(\) \}\}/.test(code.topNavigation));
  ok("child: the tabs in the control bar", /controlBar=\{<Tabs /.test(code.topNavigation));
  ok("child: no notifications, no Primary in the bar (it goes to the footer)", !/Notifications|Approve/.test(code.topNavigation) && code.notes.some((note) => note.includes("Approve belongs in the screen's ActionBar footer")));
  check("child: no BottomNavigation", code.bottomNavigation, null);
}

/* ── a Sidebar written as data (HR) ─────────────────────────────────────────────────────────────────────────────── */
{
  const hr = page({ shellProps: `          sidebar={<Sidebar selectedId="people" sections={[{ items: [{ id: "home", label: "Home", icon: "icon-home-03-line" }, { id: "profile", label: "My profile", icon: "icon-user-square-line" }] }, { label: "Modules", items: [{ id: "people", label: "People", icon: "icon-users-line" }, { id: "documents", label: "Documents", icon: "icon-file-doc-line", children: [{ id: "a", label: "Nested" }] }] }]} />}
          header={<AppShellHeader main={<PageHeader title="People" />} />}` });
  const code = phoneChromeCode(screenOf(hr));
  ok("data sidebar: four top-level rows, groups flattened, sub-rows skipped", /items=\{\[\{ id: "home"[^\]]*\{ id: "profile"[^\]]*\{ id: "people"[^\]]*\{ id: "documents", label: "Documents", icon: "icon-file-doc-line" \}\]\}/.test(code.bottomNavigation) && /value="people"/.test(code.bottomNavigation) && !/Nested/.test(code.bottomNavigation));
}

/* ── keeping linked parts in step ───────────────────────────────────────────────────────────────────────────────── */
/** `text` with the sync's plans applied, as localApi's withPhoneSync does. */
function synced(before, text) {
  let doc = docFromText(text).doc;
  let current = text;
  for (let round = 0; round < 8; round++) {
    const [plan] = planPhoneSync(before, current);
    if (!plan) break;
    const next = editDoc(doc, current, { file: FILE, loc: plan.loc, name: plan.name, ops: plan.ops }, { applyOps, dataFieldEdit, sha1, options: options(current) });
    if (next.error) throw new Error(next.error);
    doc = next.doc;
    current = next.text;
  }
  return current;
}
{
  const seeded = ROOT.replace('device="desktop"', 'device="desktop" topNavigation={<TopNavigation type="compact" title="Expenses" />}');
  const opened = synced(null, seeded);
  check("open: the page stays valid", parsePage(opened).errors, []);
  ok("open: a starting top bar and a missing bottom bar are drawn from the desktop and linked", /phoneLinked=\{\["topNavigation", ?"bottomNavigation"\]\}/.test(opened) && /topNavigation=\{<TopNavigation type="alt"/.test(opened) && /bottomNavigation=\{<BottomNavigation value="expenses"/.test(opened));
  check("open: nothing left to do", planPhoneSync(null, opened), []);
  // The desktop title changes: the linked bar follows.
  const renamed = opened.replace('main={<PageHeader title="Expenses"', 'main={<PageHeader title="Spending"');
  const followed = synced(opened, renamed);
  ok("follow: the bar takes the desktop's new title", /topNavigation=\{<TopNavigation type="alt" title="Spending" largeTitle="Spending"/.test(followed));
  // The bar edited on the phone: it is the person's own, the desktop no longer redraws it.
  const own = followed.replace(/topNavigation=\{<TopNavigation type="alt" title="Spending"/, 'topNavigation={<TopNavigation type="alt" title="My spending"');
  const kept = synced(followed, own);
  ok("unlink: an edit of the bar takes it off the linked list", /phoneLinked=\{\["bottomNavigation"\]\}/.test(kept) && /title="My spending"/.test(kept));
  const later = synced(kept, kept.replace('main={<PageHeader title="Spending"', 'main={<PageHeader title="Costs"'));
  ok("unlink: the desktop's next change leaves the person's bar alone", /title="My spending"/.test(later) && !/<TopNavigation[^>]*title="Costs"/.test(later));
  // Reset to desktop: the part back on the list, the sync draws it.
  const reset = synced(later, later.replace('phoneLinked={["bottomNavigation"]}', 'phoneLinked={["bottomNavigation", "topNavigation"]}'));
  ok("reset: the bar follows the desktop again", /<TopNavigation type="alt" title="Costs" largeTitle="Costs"/.test(reset));
}
{
  // A custom bottom bar on an older page stays the person's; only the starting top bar links.
  const custom = ROOT.replace('device="desktop"', 'device="desktop" bottomNavigation={<BottomNavigation value="x" items={[{ id: "x", label: "Mine", icon: "icon-home-03-line" }]} />}');
  const opened = synced(null, custom);
  ok("older page: its own bottom bar stays, the top bar links", /phoneLinked=\{\["topNavigation"\]\}/.test(opened) && /label: "Mine"/.test(opened));
}
check("no AppShell: nothing to draw", planPhoneSync(null, ROOT.replace(/<AppShell[\s\S]*<\/AppShell>/, '<Stack gap="md"><Text>Plain</Text></Stack>')), []);

if (failures.length) {
  console.error(`responsive-header selftest: ${failures.length} failed, ${passed} passed\n  ${failures.join("\n  ")}`);
  process.exit(1);
}
console.log(`✓ responsive-header selftest: ${passed} checks pass.`);
