// Handoff rows (Studio builder GĐ5, spec docs/research/studio-builder-handoff-spec-2026-10-07.md): a builder page
// exported as React code (tools/studio/compile.mjs) or as its design file, from the Export panel.
import fs from "node:fs";
import { unzipFiles } from "../../zip.mjs";
import path from "node:path";
import { pagesDirOf, promoteDirOf } from "../lib/server.mjs";
import { openAssetLibrary, openStudio, openStudioSpace, showLeftTab, sleep, statusText, until } from "../lib/studio.mjs";
import { clickNamed, focusScreen, newPage, pageText, selectStack } from "./builder.mjs";
import { packageFromClip } from "../../figma-clip.mjs";
import { readFigmaClipboard } from "../../figma-kiwi.mjs";

/** A phone page with every kind of frame the HTML export writes: a screen, its state variant, an overlay; a photo, a form. */
const HTML_PAGE = `// @zen-page {"format":1,"title":"HTML check"}
import { Board, Overlay, Screen, proto } from "@zen-ds/react/builder";
import { Badge, Button, Checkbox, Dialog, EmptyState, Image, InputField, List, ListItem, Stack, Text } from "@zen-ds/react";

export const mock = { team: "Design", people: [{ name: "Ava Tran", role: "Designer" }, { name: "Bao Le", role: "Engineer" }] };

export default function Page() {
  return (
    <Board>
      <Screen id="people" title="People" device="phone">
        <Stack gap="md" padding="lg">
          <Text textStyle="Heading/3">{mock.team}</Text>
          <Badge>2 people</Badge>
          <List>
            {mock.people.map((person) => <ListItem title={person.name} caption={person.role} />)}
          </List>
          <Image src="zen-media:site-cafe" alt="Office" />
          <InputField label="Name" defaultValue="Ava" />
          <Checkbox label="Notify the team" defaultChecked />
          <Button level="primary" onClick={proto.open("invite")}>Invite</Button>
        </Stack>
      </Screen>
      <Screen id="people" state="empty" title="People" device="phone">
        <EmptyState title="No people yet" />
      </Screen>
      <Overlay id="invite">
        <Dialog title="Invite people" primaryAction={{ label: "Send", onClick: proto.close() }} />
      </Overlay>
    </Board>
  );
}
`;

/** A desktop Screen with its app frame (a Sidebar beside, a Page header on top): HO-08. */
const APP_PAGE = `// @zen-page {"format":1,"title":"App frame check"}
import { Board, Screen } from "@zen-ds/react/builder";
import { PageHeader, Sidebar, SidebarMenuItem, Stack, Text } from "@zen-ds/react";

export const mock = {};

export default function Page() {
  return (
    <Board>
      <Screen id="home" title="Home" device="desktop"
        sidebar={<Sidebar aria-label="Main" selectedId="home">
          <SidebarMenuItem id="home" label="Home" icon="icon-home-03-line" />
          <SidebarMenuItem id="people" label="People" icon="icon-users-line" />
        </Sidebar>}
        header={<PageHeader title="Home" description="Two people on the team" />}>
        <Stack gap="md" padding="xl">
          <Text tone="base">Start building here.</Text>
        </Stack>
      </Screen>
    </Board>
  );
}
`;

/** A page for Export › Figma: a flat Button with its icon, a row, a Card holding text (figma-push.selftest's Projects). */
// An app page (2026-10-12: it imported into Figma as an empty frame): an AppShell holding a Container and a List.
const FIGMA_SHELL_PAGE = `// @zen-page {"format":1,"title":"Team"}
import { Board, Screen } from "@zen-ds/react/builder";
import { AppShell, AppShellAction, AppShellHeader, Container, List, ListItem, Search, Sidebar, SidebarMenuItem } from "@zen-ds/react";

export const mock = {};

export default function Page() {
  return (
    <Board>
      <Screen id="screen-1" title="Team" device="desktop">
        <AppShell
          sidebar={<Sidebar aria-label="Main" selectedId="home"><SidebarMenuItem id="home" label="Home" icon="icon-home-03-line" /></Sidebar>}
          header={<AppShellHeader leading={<Search aria-label="Search people" placeholder="Search people" />} actions={<AppShellAction icon="icon-bell-01-line" aria-label="Notifications" />} />}
        >
          <Container>
            <List>
              <ListItem title="Ava Chen" />
            </List>
          </Container>
        </AppShell>
      </Screen>
    </Board>
  );
}
`;

const FIGMA_PAGE = `// @zen-page {"format":1,"title":"Projects"}
import { Board, Screen } from "@zen-ds/react/builder";
import { Button, Card, Grid, MetricCard, Stack, Text } from "@zen-ds/react";

export const mock = {};

export default function Page() {
  return (
    <Board>
      <Screen id="screen-1" title="Projects" device="desktop">
        <Stack padding="xl" gap="lg">
          <Text textStyle="Heading/3">Projects</Text>
          <Stack direction="row" justify="between">
            <Button appearance="flat" startIcon="icon-plus-line">New project</Button>
          </Stack>
          <Card theme="default">
            <Text>Loyalty app</Text>
          </Card>
          <Grid columns={2} gap="md">
            <MetricCard type="sparkline" label="Revenue" value="$105,700" series={[1, 2, 3, 2, 4]} />
            <MetricCard type="goal-progress" label="Q4 revenue" value="$108,400" goal={{ value: 108400, target: 135000 }} />
          </Grid>
        </Stack>
      </Screen>
    </Board>
  );
}
`;

/**
 * A phone page whose root AppShell has its bars (figma-push mobileShellNode: Pattern/AppShell/Mobile). `phoneLinked={[]}`:
 * its Screen's phone parts are decided, so the Studio draws no phone header of its own over them as the page opens.
 */
const PHONE_SHELL_PAGE = `// @zen-page {"format":1,"title":"Inbox app"}
import { Board, Screen } from "@zen-ds/react/builder";
import { AppShell, BottomNavigation, Text, TopNavigation } from "@zen-ds/react";

export const mock = {};

export default function Page() {
  return (
    <Board>
      <Screen id="screen-1" title="Inbox app" device="phone" phoneLinked={[]}>
        <AppShell topNavigation={<TopNavigation title="Inbox" />} bottomNavigation={<BottomNavigation items={[{ id: "home", label: "Home", icon: "icon-home-02-line" }, { id: "alerts", label: "Alerts", icon: "icon-bell-01-line" }]} value="home" showLabels />}>
          <Text>Three new messages</Text>
        </AppShell>
      </Screen>
    </Board>
  );
}
`;

/** A phone page with an ActionBar of its own, outside any AppShell (figma-push actionBarNode: Action-Bar/Mobile). */
const ACTION_BAR_PAGE = `// @zen-page {"format":1,"title":"Confirm order"}
import { Board, Screen } from "@zen-ds/react/builder";
import { ActionBar, Stack, Text } from "@zen-ds/react";

export const mock = {};

export default function Page() {
  return (
    <Board>
      <Screen id="screen-1" title="Confirm order" device="phone">
        <Stack padding="lg" gap="md">
          <Text>Two items, 48.00</Text>
          <ActionBar primaryAction={{ label: "Place order" }} secondaryAction={{ label: "Back" }} />
        </Stack>
      </Screen>
    </Board>
  );
}
`;

/** Export › Figma of the open page: the .figma.json the Zen plugin places. */
async function figmaExport(page, id) {
  const panel = await openExport(page);
  await panel.getByRole("button", { name: "Figma", exact: true }).click();
  await until(async () => /zen-studio-figma/.test(await panel.innerText()), { timeout: 10_000, message: "the Figma JSON in the panel" });
  const downloading = page.waitForEvent("download");
  await panel.getByRole("button", { name: `Download ${id}.figma.json` }).click();
  const pkg = JSON.parse(fs.readFileSync(await (await downloading).path(), "utf8"));
  await page.keyboard.press("Escape");
  return pkg;
}

/**
 * The exported frame read back from Figma as a new design (no Studio page or export named: Import pages… makes a page
 * of it) and imported; returns the new page's id and its text.
 */
async function pullAsNewPage(page, pkg, name) {
  const { pageFromFigma, repoMapping } = await import("../../figma-pull.mjs");
  const { printPage } = await import("../../doc.mjs");
  const read = JSON.parse(JSON.stringify({ ...pkg.frame, id: `9${Date.now() % 1e6}:7`, file: "9nZv4uW2LT21yuHabMTCh1" }));
  const pulled = printPage(pageFromFigma(read, { mapping: await repoMapping(), title: name }).doc, { ids: true });
  const before = page.url();
  await page.locator('[data-e2e="import-pages"]').setInputFiles({ name: `${name}.zen.tsx`, mimeType: "text/plain", buffer: Buffer.from(pulled, "utf8") });
  await until(async () => page.url() !== before && decodeURIComponent(page.url()).includes("page=local:"), { timeout: 10_000, message: "the pulled page opened" });
  const pulledId = decodeURIComponent(page.url()).match(/page=local:([\w-]+)/)?.[1];
  await page.locator('[data-studio-frame="screen:screen-1"]').waitFor({ state: "attached", timeout: 10_000 });
  return { id: pulledId, text: (await pageText(page, pulledId)) ?? "" };
}

/** Imports a page (HTML_PAGE unless given; Pages › Import) and opens it once `frame` is on the canvas; returns its id. */
async function importHtmlPage(page, text = HTML_PAGE, frame = "overlay:invite") {
  const id = `html-check-${Date.now().toString(36)}`;
  await showLeftTab(page, "pages");
  await openStudioSpace(page);
  await page.locator('[data-e2e="import-pages"]').setInputFiles({ name: `${id}.zen.tsx`, mimeType: "text/plain", buffer: Buffer.from(text, "utf8") });
  await until(async () => decodeURIComponent(page.url()).includes(`page=local:${id}`), { timeout: 10_000, message: "the imported page opened" });
  await page.locator(`[data-studio-frame="${frame}"]`).waitFor({ state: "attached", timeout: 10_000 });
  return id;
}

/** The HTML tab of the Export panel, once its files (`listed`) are listed; then the zip it downloads, unpacked. */
async function htmlExport(page, listed = /screens\/people\.html/) {
  const panel = await openExport(page);
  await panel.getByRole("button", { name: "HTML", exact: true }).click();
  await until(async () => listed.test(await panel.innerText()), { timeout: 20_000, message: "the HTML files listed" });
  const shown = await panel.innerText();
  const downloading = page.waitForEvent("download");
  await panel.getByRole("button", { name: /^Download .*-html\.zip$/ }).click();
  const download = await downloading;
  const files = new Map(unzipFiles(new Uint8Array(fs.readFileSync(await download.path()))).map((file) => [file.path, file.data]));
  return { panel, shown, name: download.suggestedFilename(), files };
}
const text = (files, path) => new TextDecoder().decode(files.get(path));

/** Frame `frame` on the canvas at 100% (its label selects it, ⇧2 centres it, ⇧0 sets 100%), nothing selected: a PNG. */
async function canvasShot(page, frame) {
  await page.locator(`.studio-frame-label[data-chrome-key="label:${frame}"]`).evaluate((element) => element.click());
  await page.keyboard.press("Shift+2");
  await sleep(500);
  await page.keyboard.press("Shift+0");
  await sleep(700);
  await page.keyboard.press("Escape");
  await page.mouse.move(2, 2);
  const element = page.locator(`[data-studio-frame="${frame}"]`);
  await element.evaluate((node) => Promise.all([...node.querySelectorAll("img")].map((img) => (img.complete ? null : new Promise((resolve) => { img.onload = resolve; img.onerror = resolve; })))));
  await sleep(300);
  const box = await element.boundingBox();
  const width = Math.round(box.width);
  const height = Math.round(box.height);
  return { png: await page.screenshot({ clip: { x: box.x, y: box.y, width, height } }), width, height };
}

/**
 * The share of pixels that differ by more than `tolerance` in a channel between two PNGs, drawn at `width` × `height`
 * (a 2× picture scaled down), outside the frame's rounded corners and its 2 px edge.
 */
const compareShots = (view, a, b, { width, height, tolerance = 24 }) => view.evaluate(async ([one, two, w, h, limit]) => {
  const load = (data) => new Promise((resolve) => { const img = new Image(); img.onload = () => resolve(img); img.src = `data:image/png;base64,${data}`; });
  const pixels = (img) => { const canvas = document.createElement("canvas"); canvas.width = w; canvas.height = h; const g = canvas.getContext("2d"); g.drawImage(img, 0, 0, w, h); return g.getImageData(0, 0, w, h).data; };
  const [p, q] = (await Promise.all([load(one), load(two)])).map(pixels);
  let counted = 0;
  let differing = 0;
  for (let y = 2; y < h - 2; y += 1) for (let x = 2; x < w - 2; x += 1) {
    if ((x < 18 || x >= w - 18) && (y < 18 || y >= h - 18)) continue;
    counted += 1;
    const i = (y * w + x) * 4;
    if (Math.abs(p[i] - q[i]) > limit || Math.abs(p[i + 1] - q[i + 1]) > limit || Math.abs(p[i + 2] - q[i + 2]) > limit) differing += 1;
  }
  return { ratio: differing / counted, differing };
}, [a.toString("base64"), b.toString("base64"), width, height, tolerance]);

/** A PNG's width and height (its IHDR). */
const pngSize = (bytes) => { const view = Buffer.from(bytes); return { width: view.readUInt32BE(16), height: view.readUInt32BE(20) }; };

/** Opens the Export panel from the page's Inspector panel (nothing selected). */
async function openExport(page) {
  await page.locator("#studio-right").getByRole("tab", { name: "Design" }).click().catch(() => {});
  const button = page.locator("#studio-right").getByRole("button", { name: "Export…" });
  // Escape walks the selection up to nothing selected: the page's own panel, with Export….
  for (let i = 0; i < 8 && !(await button.isVisible().catch(() => false)); i += 1) {
    await page.locator(".studio-viewport").focus();
    await page.keyboard.press("Escape");
    await sleep(120);
  }
  await button.click();
  const panel = page.locator(".studio-export");
  await panel.waitFor({ state: "visible", timeout: 5000 });
  return panel;
}
const clipboard = (page) => page.evaluate(() => navigator.clipboard.readText());

export const rows = [
  {
    id: "HO-09", feature: "Export › Figma (core rebuild Q4): the page as the .figma.json the Zen plugin's Import from Studio places — format zen-studio-figma, the page's id, a frame of library instances (Button/Flat by its appearance, gap bound to its Spacing variable); its keys stay the same from one download to the next", wp: "figma push P1 2026-10-12",
    async run(ctx) {
      const { page } = await ctx.studio();
      const id = await importHtmlPage(page, FIGMA_PAGE, "screen:screen-1");
      const panel = await openExport(page);
      await panel.getByRole("button", { name: "Figma", exact: true }).click();
      await until(async () => /zen-studio-figma/.test(await panel.innerText()), { timeout: 10_000, message: "the Figma JSON in the panel" });
      const downloadOnce = async () => {
        const downloading = page.waitForEvent("download");
        await panel.getByRole("button", { name: `Download ${id}.figma.json` }).click();
        const download = await downloading;
        return { name: download.suggestedFilename(), pkg: JSON.parse(fs.readFileSync(await download.path(), "utf8")) };
      };
      const first = await downloadOnce();
      const second = await downloadOnce();
      const { pkg } = first;
      const keys = (node) => [node.key, ...(node.children ?? []).flatMap(keys), ...(node.slots ?? []).flatMap((slot) => slot.children.flatMap(keys))];
      const nodes = (node) => [node, ...(node.children ?? []).flatMap(nodes), ...(node.slots ?? []).flatMap((slot) => slot.children.flatMap(nodes))];
      const button = nodes(pkg.frame).find((node) => node.text === "New project");
      const problems = [
        pkg.format !== "zen-studio-figma" && `format ${pkg.format}`,
        pkg.page?.id !== id && `page id ${pkg.page?.id}`,
        pkg.frame.name !== "Projects" && `frame ${pkg.frame.name}`,
        button?.set?.name !== "Button/Flat" && `button set ${button?.set?.name}`,
        pkg.frame.layout?.gapVar !== "Spacing/Gap/Large" && `gap ${pkg.frame.layout?.gapVar}`,
        !keys(pkg.frame).every(Boolean) && "a node without a key",
        JSON.stringify(keys(pkg.frame)) !== JSON.stringify(keys(second.pkg.frame)) && "the keys changed between downloads",
      ].filter(Boolean);
      if (problems.length) throw new Error(problems.join(" · "));
      await page.keyboard.press("Escape");
      return `${first.name}: ${nodes(pkg.frame).length} layers, Button/Flat, gap Spacing/Gap/Large, keys stable`;
    },
  },
  {
    id: "HO-10", feature: "Export › Figma of an app page: the AppShell as Figma's Master-Layout (its Sidebar pattern, its AppShellHeader as Header/AppShell swapped in for the master's Header/Dashboard, the Search in Top-Elements' Leading-Slots) and the Container and List as frames that keep their layers, never an empty frame", wp: "figma push coverage P1 2026-10-12; master layout 2026-10-18; Header/AppShell 2026-10-21",
    async run(ctx) {
      const { page } = await ctx.studio();
      const id = await importHtmlPage(page, FIGMA_SHELL_PAGE, "screen:screen-1");
      const panel = await openExport(page);
      await panel.getByRole("button", { name: "Figma", exact: true }).click();
      await until(async () => /zen-studio-figma/.test(await panel.innerText()), { timeout: 10_000, message: "the Figma JSON in the panel" });
      const downloading = page.waitForEvent("download");
      await panel.getByRole("button", { name: `Download ${id}.figma.json` }).click();
      const pkg = JSON.parse(fs.readFileSync(await (await downloading).path(), "utf8"));
      const nodes = (node) => [node, ...(node.children ?? []).flatMap(nodes), ...(node.slots ?? []).flatMap((slot) => slot.children.flatMap(nodes))];
      const all = nodes(pkg.frame);
      const shell = pkg.frame.children?.[0];
      // The header (2026-10-21): Figma's Header/AppShell in the master's Header/Dashboard place, its leading in Top-Elements.
      const header = shell?.nested?.find((entry) => entry.path === "Header/Dashboard");
      const leading = shell?.slots?.find((slot) => slot.name === "Top-Elements")?.children?.find((frame) => frame.name === "Leading-Slots");
      const problems = [
        (shell?.name !== "AppShell" || shell?.set?.name !== "Patterns/Pages/Density-Medium") && `first layer ${shell?.name ?? "none"} (${shell?.set?.name ?? "no set"})`,
        !(shell?.props?.Sidebar === true && shell?.nested?.some((entry) => entry.path === "Patterns")) && "no Sidebar",
        header?.set?.name !== "Header/AppShell" && `header ${header?.set?.name ?? "none"}`,
        !leading?.children?.some((child) => child.set?.name?.startsWith("Search")) && `Leading-Slots ${JSON.stringify(leading?.children?.map((child) => child.set?.name) ?? null)}`,
        !all.some((node) => node.type === "FRAME" && node.name === "List" && node.children?.some((row) => row.set?.name === "List-Item")) && "the List lost its row",
        !all.some((node) => node.type === "FRAME" && node.name === "Container") && "no Container frame",
      ].filter(Boolean);
      if (problems.length) throw new Error(problems.join(" · "));
      await page.keyboard.press("Escape");
      return `${all.length} layers: AppShell (Master-Layout) › Sidebar, Header/AppShell › Search, Container › List › List-Item`;
    },
  },
  {
    id: "HO-01", feature: "Export a page as React: the component's code, Copy; the Design file tab shows the page itself", wp: "GĐ5 M1",
    async run(ctx) {
      const { page, id } = await newPage(ctx, { title: "Export check" });
      const panel = await openExport(page);
      await until(async () => /export function ExportCheckPage\(/.test(await panel.innerText()), { message: "the React code in the panel" });
      await panel.getByRole("button", { name: "Copy code" }).click();
      const react = await until(async () => { const text = await clipboard(page); return /Generated by Zen Studio from/.test(text) ? text : null; }, { message: "the React code copied" });
      // A blank page comes with its app frame: one AppShell for every width, its phone bars drawn from the desktop
      // header (component-usage-rules §17: the page title as the bar's large title) as topNavigation / bottomNavigation.
      if (!/import \{ AppShell, AppShellHeader, BottomNavigation, PageHeader, Sidebar, SidebarMenuItem, Stack, Text, TopNavigation \} from "@zen-ds\/react";/.test(react) || !/topNavigation=\{<TopNavigation type="alt" title="Export check" largeTitle="Export check"/.test(react)) throw new Error(`unexpected code: ${react.slice(0, 400).replace(/\n/g, " ⏎ ")}`);
      await panel.getByRole("button", { name: "Design file" }).click();
      await panel.getByRole("button", { name: "Copy code" }).click();
      const design = await until(async () => { const text = await clipboard(page); return text.startsWith("// @zen-page") ? text : null; }, { message: "the design file copied" });
      if (design !== (await pageText(page, id))) throw new Error("the design file differs from the stored page");
      await page.keyboard.press("Escape");
      await sleep(200);
      return `ExportCheckPage (${react.split("\n").length} lines) copied; design file = the stored page`;
    },
  },
  {
    id: "HO-02", feature: "Export as HTML: each frame's markup without the Studio's attributes, styles.css with the Zen rules it uses, the photo and font in the zip", wp: "GĐ5 M2",
    timeout: 60_000,
    async run(ctx) {
      const { page } = await ctx.studio();
      const id = await importHtmlPage(page);
      const { shown, name, files } = await htmlExport(page);
      if (!/<link rel="stylesheet" href="\.\.\/styles\.css">/.test(shown)) throw new Error(`the screen's file in the panel:\n${shown.slice(0, 600)}`);
      if (name !== `${id}-html.zip`) throw new Error(`the zip is named ${name}`);
      const expected = ["index.html", "screens/people.html", "screens/people.empty.html", "screens/overlay-invite.html", "styles.css", "assets/site-cafe.webp"];
      const missing = expected.filter((path) => !files.has(path));
      if (missing.length) throw new Error(`the zip lacks ${missing.join(", ")} (it has ${[...files.keys()].join(", ")})`);
      const fonts = [...files.keys()].filter((path) => /^fonts\/.*\.woff2$/.test(path));
      if (!fonts.length) throw new Error("no font file in the zip");
      const people = text(files, "screens/people.html");
      const leaks = ["data-zen-src", "data-zen-name", "data-studio", "studio-builder", "data-export-frame"].filter((word) => people.includes(word));
      if (leaks.length) throw new Error(`Studio attributes left in the markup: ${leaks.join(", ")}`);
      const markup = ['class="screen"', 'src="../assets/site-cafe.webp"', 'value="Ava"', "Ava Tran", "Bao Le", "checked"].filter((word) => !people.includes(word));
      if (markup.length) throw new Error(`screens/people.html lacks ${markup.join(", ")}`);
      if (!/class="[^"]*zen-dialog/.test(text(files, "screens/overlay-invite.html"))) throw new Error("the overlay's file has no open Dialog");
      const css = text(files, "styles.css");
      const rules = [".zen-button", ".zen-list-item", ".zen-dialog", "@font-face", "--zen-color-", '[data-theme="dark"]'].filter((word) => !css.includes(word));
      if (rules.length) throw new Error(`styles.css lacks ${rules.join(", ")}`);
      const foreign = [".studio-", ".platform-", ".pe-card"].filter((word) => css.includes(word));
      if (foreign.length) throw new Error(`styles.css holds Studio or docs rules: ${foreign.join(", ")}`);
      if (/\.zen-table\b/.test(css)) throw new Error("styles.css holds the Table's rules, which no screen uses");
      await page.keyboard.press("Escape");
      return `${files.size} files (${fonts.join(", ")}); styles.css ${Math.round(css.length / 1024)} KB; markup clean`;
    },
  },
  {
    id: "HO-04", feature: "Handoff zip: the React code, the design file, handoff.md (setup, components, tokens, flow, data, a11y), photos, a PNG and the HTML of each frame; each PNG looks like its canvas frame", wp: "GĐ5 M3",
    timeout: 150_000,
    async run(ctx) {
      const session = await ctx.studio({ viewport: { width: 1700, height: 1300 } });
      const { page, context } = session;
      try {
        const id = await importHtmlPage(page);
        const panel = await openExport(page);
        await panel.getByRole("button", { name: "Handoff", exact: true }).click();
        await until(async () => /## Prototype flow/.test(await panel.innerText()), { timeout: 40_000, message: "handoff.md in the panel" });
        const downloading = page.waitForEvent("download");
        await panel.getByRole("button", { name: /^Download .*-handoff\.zip$/ }).click();
        const download = await downloading;
        if (download.suggestedFilename() !== `${id}-handoff.zip`) throw new Error(`the zip is named ${download.suggestedFilename()}`);
        const files = new Map(unzipFiles(new Uint8Array(fs.readFileSync(await download.path()))).map((file) => [file.path, file.data]));
        const expected = ["HTMLCheckPage.tsx", `${id}.zen.tsx`, "handoff.md", "assets/site-cafe.webp", "screens/people.png", "screens/people.empty.png", "screens/overlay-invite.png", "html/index.html", "html/screens/people.html", "html/styles.css", "html/assets/site-cafe.webp"];
        const missing = expected.filter((path) => !files.has(path));
        if (missing.length) throw new Error(`the zip lacks ${missing.join(", ")} (it has ${[...files.keys()].join(", ")})`);
        if (text(files, `${id}.zen.tsx`) !== HTML_PAGE) throw new Error("the design file differs from the page");
        if (!/import siteCafePhoto from "\.\/assets\/site-cafe\.webp";/.test(text(files, "HTMLCheckPage.tsx"))) throw new Error("the code does not import the photo from ./assets");
        const markdown = text(files, "handoff.md");
        fs.writeFileSync(`${ctx.outDir}/HO-04-handoff.md`, markdown);
        const sections = ["## In this package", "## Setup", "## Components", "## Tokens and text styles", "## Prototype flow", "## Data contract", "## Accessibility"].filter((heading) => !markdown.includes(heading));
        if (sections.length) throw new Error(`handoff.md lacks ${sections.join(", ")}`);
        const facts = [
          "npm install @zen-ds/react@^", 'import "@zen-ds/react/styles.css";', '<ZenProvider theme="light"', 'breakpoint="mobile" typography="mobile" density="comfortable"',
          "| Button |", "docs/guidelines/list-item.md", "`Heading/3`", "`gap md`", "opens overlay `invite`", "closes the overlay",
          "export type HTMLCheckMock = {", "button “Invite”", "textbox “Name”", "checkbox “Notify the team”", "Keyboard: Escape — Close", "npx zen-usage HTMLCheckPage.tsx",
        ].filter((fact) => !markdown.includes(fact));
        if (facts.length) throw new Error(`handoff.md lacks ${facts.join(" · ")}\n${markdown.slice(0, 1500)}`);
        // Each picture: 2× its frame, and the same as the frame on the canvas.
        await page.keyboard.press("Escape");
        await sleep(300);
        const view = await context.newPage();
        await view.goto("about:blank");
        const results = [];
        for (const [frame, png] of [["screen:people", "screens/people.png"], ["screen:people:empty", "screens/people.empty.png"], ["overlay:invite", "screens/overlay-invite.png"]]) {
          const shot = await canvasShot(page, frame);
          const size = pngSize(files.get(png));
          if (size.width !== shot.width * 2 || size.height !== shot.height * 2) throw new Error(`${png} is ${size.width}×${size.height}, its frame ${shot.width}×${shot.height}`);
          const diff = await compareShots(view, shot.png, Buffer.from(files.get(png)), { width: shot.width, height: shot.height, tolerance: 40 });
          fs.writeFileSync(`${ctx.outDir}/HO-04-${frame.replace(/:/g, "-")}-canvas.png`, shot.png);
          fs.writeFileSync(`${ctx.outDir}/HO-04-${frame.replace(/:/g, "-")}-picture.png`, Buffer.from(files.get(png)));
          results.push({ frame, ...size, ...diff });
        }
        await view.close();
        const off = results.filter((result) => result.ratio > 0.02);
        if (off.length) throw new Error(`a picture differs from its frame: ${off.map((result) => `${result.frame}: ${(result.ratio * 100).toFixed(2)}%`).join("; ")} (in ${ctx.outDir})`);
        return `${files.size} files; handoff.md ${markdown.split("\n").length} lines; pictures ${results.map((result) => `${result.frame} ${result.width}×${result.height} ${(result.ratio * 100).toFixed(2)}%`).join(" · ")}`;
      } finally {
        await ctx.studio({ fresh: true });
      }
    },
  },
  {
    id: "HO-05", feature: "Upload a photo: it is kept (also in the dev server's pages/assets), goes on the page as zen-asset, shows on the canvas, travels in the handoff zip and comes back with Import; Delete twice on its tile removes it (to the folder's trash)", wp: "GĐ5 M4",
    timeout: 120_000,
    async run(ctx) {
      const photo = fs.readFileSync(path.join(ctx.root, "src/assets/media/site-bridge.webp"));
      const { page, id } = await newPage(ctx, { title: "Upload check" });
      await selectStack(page, id);
      await openAssetLibrary(page, "Photos");
      const assets = page.locator("#studio-left-panel-assets");
      // A file that is not an image is refused, with the reason.
      await assets.locator('[data-e2e="upload-photos"]').setInputFiles({ name: "notes.txt", mimeType: "text/plain", buffer: Buffer.from("hello") });
      await until(async () => /Not uploaded: notes\.txt \(not a PNG/.test(await statusText(page)), { message: "a text file refused" });
      await assets.locator('[data-e2e="upload-photos"]').setInputFiles({ name: "Team photo.webp", mimeType: "image/webp", buffer: photo });
      const tile = assets.locator('.studio-assets__photo[data-upload^="team-photo-"]');
      await tile.waitFor({ state: "visible", timeout: 10_000 });
      const asset = await tile.getAttribute("data-upload");
      // The dev server's pages folder keeps it too (another browser on this server finds it there).
      const pagesDir = path.join(ctx.root, pagesDirOf(ctx.server.port));
      await until(async () => fs.existsSync(path.join(pagesDir, "assets", asset)) && fs.readFileSync(path.join(pagesDir, "assets", asset)).equals(photo), { timeout: 10_000, message: "the photo in the server's pages/assets" });
      await tile.click();
      await until(async () => (await pageText(page, id))?.includes(`<Image src="zen-asset:${asset}" alt="Team photo" ratio="4:3" />`), { message: "the zen-asset Image in the page" });
      const img = page.locator(`img[data-zen-src^="local:${id}.zen.tsx:"], [data-zen-src^="local:${id}.zen.tsx:"][data-zen-name="Image"] img`).first();
      await until(async () => img.evaluate((element) => element.src.startsWith("blob:") && element.complete && element.naturalWidth > 0).catch(() => false), { timeout: 10_000, message: "the uploaded photo on the canvas" });
      // The handoff zip carries it for the code and for the HTML.
      const panel = await openExport(page);
      await panel.getByRole("button", { name: "Handoff", exact: true }).click();
      await until(async () => /## Prototype flow/.test(await panel.innerText()), { timeout: 40_000, message: "handoff.md in the panel" });
      const downloading = page.waitForEvent("download");
      await panel.getByRole("button", { name: /^Download .*-handoff\.zip$/ }).click();
      // Kept outside the browser context, which deletes its downloads when it closes.
      const zipPath = path.join(ctx.outDir, `HO-05-${id}-handoff.zip`);
      fs.copyFileSync(await (await downloading).path(), zipPath);
      const files = new Map(unzipFiles(new Uint8Array(fs.readFileSync(zipPath))).map((file) => [file.path, file.data]));
      const missing = [`assets/${asset}`, `html/assets/${asset}`].filter((file) => !files.has(file));
      if (missing.length) throw new Error(`the zip lacks ${missing.join(", ")}`);
      if (!Buffer.from(files.get(`assets/${asset}`)).equals(photo)) throw new Error("the photo in the zip differs from the upload");
      if (!text(files, "UploadCheckPage.tsx").includes(`from "./assets/${asset}";`)) throw new Error("the code does not import the photo");
      if (!text(files, "html/screens/screen-1.html").includes(`src="../assets/${asset}"`)) throw new Error("the HTML does not show the photo from assets/");
      await page.keyboard.press("Escape");
      // Another browser (a fresh one): Import the zip, the page comes with its photo.
      const fresh = await ctx.studio({ fresh: true });
      await showLeftTab(fresh.page, "pages");
      await openStudioSpace(fresh.page);
      await fresh.page.locator('[data-e2e="import-pages"]').setInputFiles(zipPath);
      // The dev server's pages folder already holds the page (it syncs every browser): the copy gets an id of its own.
      const copy = await until(async () => /page=local:([a-z0-9-]+)/.exec(decodeURIComponent(fresh.page.url()))?.[1] ?? null, { timeout: 10_000, message: "the imported page opened" });
      const again = fresh.page.locator(`img[data-zen-src^="local:${copy}.zen.tsx:"], [data-zen-src^="local:${copy}.zen.tsx:"][data-zen-name="Image"] img`).first();
      await until(async () => again.evaluate((element) => element.src.startsWith("blob:") && element.complete && element.naturalWidth > 0).catch(() => false), { timeout: 10_000, message: "the photo back with the imported page" });
      if (/Missing photo/.test(await statusText(fresh.page))) throw new Error("a photo of the imported zip is missing");
      // Remove (in the fresh browser: opening it closed the first): the first Delete asks, the second removes it from this
      // browser and moves the server folder's copy to its trash.
      await showLeftTab(fresh.page, "assets");
      const freshAssets = fresh.page.locator("#studio-left-panel-assets");
      await freshAssets.getByRole("button", { name: "Photos", exact: true }).click();
      const freshTile = freshAssets.locator(`.studio-assets__photo[data-upload="${asset}"]`);
      await freshTile.waitFor({ state: "visible", timeout: 10_000 });
      await freshTile.focus();
      await fresh.page.keyboard.press("Delete");
      await until(async () => /Press Delete again to remove/.test(await statusText(fresh.page)), { message: "the remove asked first" });
      if (!(await freshTile.isVisible())) throw new Error("the first Delete removed the photo");
      await fresh.page.keyboard.press("Delete");
      await freshTile.waitFor({ state: "detached", timeout: 10_000 });
      await until(async () => !fs.existsSync(path.join(pagesDir, "assets", asset)), { timeout: 10_000, message: "the photo out of the server's pages/assets" });
      const trashed = fs.readdirSync(path.join(pagesDir, "..", "trash", "assets")).filter((file) => file.endsWith(asset));
      if (!trashed.length) throw new Error("the removed photo is not in the folder's trash");
      return `${asset} (${Math.round(photo.length / 1024)} KB): page, canvas (blob:), server pages/assets, zip (code + HTML), back with Import (${copy}), removed (in trash)`;
    },
  },
  {
    id: "HO-06", feature: "A page whose uploaded photo this browser lacks: \"Missing photo\" on the canvas and in the status; a library photo on the selected Image replaces it", wp: "GĐ5 M4",
    timeout: 60_000,
    async run(ctx) {
      const { page } = await ctx.studio({ fresh: true });
      const id = `missing-photo-${Date.now().toString(36)}`;
      const text = HTML_PAGE.replace("HTML check", "Missing photo check").replace('src="zen-media:site-cafe"', 'src="zen-asset:gone-0badc0de.png"');
      await showLeftTab(page, "pages");
      await openStudioSpace(page);
      await page.locator('[data-e2e="import-pages"]').setInputFiles({ name: `${id}.zen.tsx`, mimeType: "text/plain", buffer: Buffer.from(text, "utf8") });
      await until(async () => decodeURIComponent(page.url()).includes(`page=local:${id}`), { timeout: 10_000, message: "the imported page opened" });
      await until(async () => /Missing photo: gone-0badc0de\.png/.test(await statusText(page)), { timeout: 10_000, message: "the missing photo named" });
      const img = page.locator(`img[data-zen-src^="local:${id}.zen.tsx:"], [data-zen-src^="local:${id}.zen.tsx:"][data-zen-name="Image"] img`).first();
      await until(async () => (await img.getAttribute("src"))?.startsWith("data:image/svg+xml"), { message: "the Missing photo picture on the canvas" });
      await page.locator("#studio-right").getByRole("tab", { name: "Design" }).click();
      await focusScreen(page);
      await clickNamed(page, id, "Image");
      await openAssetLibrary(page, "Photos");
      const assets = page.locator("#studio-left-panel-assets");
      await assets.locator('.studio-assets__photo[data-photo="site-bridge"]').click();
      await until(async () => (await pageText(page, id))?.includes('<Image src="zen-media:site-bridge" alt="Office" />'), { message: "the Image's photo replaced" }).catch(async (error) => {
        throw new Error(`${error.message}: selected ${await page.locator("#studio-right h2").first().innerText().catch(() => "?")}; status ${await statusText(page)}; page ${((await pageText(page, id)) ?? "").match(/<Image[^>]*>/g)?.join(" ")}`);
      });
      await until(async () => img.evaluate((element) => !element.src.startsWith("data:") && element.complete && element.naturalWidth > 0).catch(() => false), { timeout: 10_000, message: "the new photo on the canvas" });
      return "Missing photo named and drawn; site-bridge replaced it (src only, one edit)";
    },
  },
  {
    id: "HO-07", feature: "Promote (dev server, admin): the page becomes <Name>Template.tsx with its photos in src/templates/studio, TypeScript and the harness pass; a changed template is replaced only when asked", wp: "GĐ5 M5",
    timeout: 150_000,
    async run(ctx) {
      const { page } = await ctx.studio();
      await importHtmlPage(page);
      const dir = path.join(ctx.root, promoteDirOf(ctx.server.port));
      const file = path.join(dir, "HTMLCheckTemplate.tsx");
      const result = () => page.locator('.studio-export [data-e2e="promote-result"]').innerText().catch(() => "");
      const panel = await openExport(page);
      await panel.getByRole("button", { name: "Promote to the repo" }).click();
      const first = await until(async () => { const line = await result(); return /^Promoted to /.test(line) ? line : null; }, { timeout: 120_000, message: "Promote's answer" });
      if (!/HTMLCheckTemplate\.tsx · TypeScript ✓ · harness ✓/.test(first)) throw new Error(`Promote: ${first}`);
      const code = fs.readFileSync(file, "utf8");
      if (!/^\/\/ Promoted by Zen Studio from html-check-[\w-]+\.zen\.tsx\./.test(code) || !code.includes("export function HTMLCheckTemplate(") || !code.includes('import siteCafePhoto from "./assets/site-cafe.webp";')) throw new Error(`the template:\n${code.slice(0, 500)}`);
      if (!fs.readFileSync(path.join(dir, "assets/site-cafe.webp")).equals(fs.readFileSync(path.join(ctx.root, "src/assets/media/site-cafe.webp")))) throw new Error("the photo was not copied beside it");
      // Someone changed the template in the repo: Promote says so and replaces it only on the second click.
      fs.writeFileSync(file, `${code}\n// a local change\n`);
      await panel.getByRole("button", { name: "Promote to the repo" }).click();
      await until(async () => /exists and differs/.test(await result()), { timeout: 30_000, message: "the conflict named" });
      if (!fs.readFileSync(file, "utf8").includes("// a local change")) throw new Error("the changed template was overwritten without asking");
      await panel.getByRole("button", { name: "Replace HTMLCheckTemplate.tsx" }).click();
      const second = await until(async () => { const line = await result(); return /^Promoted to /.test(line) ? line : null; }, { timeout: 120_000, message: "the template replaced" });
      if (fs.readFileSync(file, "utf8") !== code) throw new Error("the template was not replaced by the page's code");
      await page.keyboard.press("Escape");
      return `${path.relative(ctx.root, file)} · ${first.split(" · ").slice(1, 3).join(" · ")}; conflict → Replace → ${second.split(" · ")[1]}`;
    },
  },
  {
    id: "HO-03", feature: "Each exported HTML frame looks like its frame on the canvas at 100% (pixel comparison)", wp: "GĐ5 M2",
    timeout: 120_000,
    async run(ctx) {
      // A viewport the phone frames and the overlay fit at 100%.
      const session = await ctx.studio({ viewport: { width: 1700, height: 1300 } });
      const { page, context } = session;
      try {
        await importHtmlPage(page);
        const { files } = await htmlExport(page);
        await page.keyboard.press("Escape");
        await sleep(300);
        const origin = new URL(page.url()).origin;
        const view = await context.newPage();
        await view.route(`${origin}/__html-export/**`, (route) => {
          const path = decodeURIComponent(new URL(route.request().url()).pathname.replace(/^\/__html-export\//, ""));
          const body = files.get(path);
          const type = path.endsWith(".html") ? "text/html" : path.endsWith(".css") ? "text/css" : path.endsWith(".webp") ? "image/webp" : path.endsWith(".woff2") ? "font/woff2" : "application/octet-stream";
          return body ? route.fulfill({ status: 200, contentType: type, body: Buffer.from(body) }) : route.fulfill({ status: 404, body: "" });
        });
        const results = [];
        for (const [frame, file] of [["screen:people", "screens/people.html"], ["screen:people:empty", "screens/people.empty.html"], ["overlay:invite", "screens/overlay-invite.html"]]) {
          const shot = await canvasShot(page, frame);
          const { width, height } = shot;
          await view.setViewportSize({ width, height });
          await view.goto(`${origin}/__html-export/${file}`);
          await view.evaluate(() => Promise.all([document.fonts.ready, ...[...document.images].map((img) => (img.complete ? null : new Promise((resolve) => { img.onload = resolve; img.onerror = resolve; })))]));
          await sleep(200);
          const htmlShot = await view.screenshot({ clip: { x: 0, y: 0, width, height } });
          const diff = await compareShots(view, shot.png, htmlShot, { width, height });
          fs.writeFileSync(`${ctx.outDir}/HO-03-${frame.replace(/:/g, "-")}-canvas.png`, shot.png);
          fs.writeFileSync(`${ctx.outDir}/HO-03-${frame.replace(/:/g, "-")}-html.png`, htmlShot);
          results.push({ frame, width, height, ...diff });
        }
        await view.close();
        const off = results.filter((result) => result.ratio > 0.005 || Math.abs(result.width - (result.frame.startsWith("overlay") ? 720 : 390)) > 1);
        if (off.length) throw new Error(`differs from the canvas: ${off.map((result) => `${result.frame} ${result.width}×${result.height}: ${(result.ratio * 100).toFixed(2)}% (${result.differing} px)`).join("; ")} (shots in ${ctx.outDir})`);
        return results.map((result) => `${result.frame} ${result.width}×${result.height}: ${(result.ratio * 100).toFixed(2)}%`).join(" · ");
      } finally {
        await ctx.studio({ fresh: true });
      }
    },
  },
  {
    id: "HO-08", feature: "A Screen with its app frame (Sidebar beside, Page header on top; a page from before the master layout, moved into its AppShell when it opens) exports HTML laid out as on the canvas (pixel comparison)", wp: "slots 2026-10-10, master layout 2026-10-15",
    timeout: 120_000,
    async run(ctx) {
      // A desktop frame (1440 px) fits this viewport at 100%.
      const session = await ctx.studio({ viewport: { width: 1700, height: 1300 } });
      const { page, context } = session;
      try {
        await importHtmlPage(page, APP_PAGE, "screen:home");
        const { files } = await htmlExport(page, /screens\/home\.html/);
        await page.keyboard.press("Escape");
        await sleep(300);
        const css = new TextDecoder().decode(files.get("styles.css"));
        if (!/\.screen__main\b/.test(css) || !/\.screen\[data-chrome\]/.test(css)) throw new Error("styles.css lacks the app frame's rules (.screen[data-chrome], .screen__main)");
        if (/\.studio-/.test(css)) throw new Error("styles.css holds a .studio- rule");
        const html = new TextDecoder().decode(files.get("screens/home.html"));
        if (/studio-builder/.test(html)) throw new Error("the markup keeps a studio-builder class");
        if ((html.match(/class="zen-app-shell[ "]/g) ?? []).length !== 1 || (html.match(/class="zen-sidebar[ "]/g) ?? []).length !== 1) throw new Error("the markup is not one AppShell with one Sidebar (the master layout)");
        if (!/\.zen-visually-hidden\b/.test(css)) throw new Error("styles.css lacks VisuallyHidden's rule (AppShell's skip link would show)");
        const origin = new URL(page.url()).origin;
        const view = await context.newPage();
        await view.route(`${origin}/__html-export/**`, (route) => {
          const file = decodeURIComponent(new URL(route.request().url()).pathname.replace(/^\/__html-export\//, ""));
          const body = files.get(file);
          const type = file.endsWith(".html") ? "text/html" : file.endsWith(".css") ? "text/css" : file.endsWith(".woff2") ? "font/woff2" : "application/octet-stream";
          return body ? route.fulfill({ status: 200, contentType: type, body: Buffer.from(body) }) : route.fulfill({ status: 404, body: "" });
        });
        // A 1440 px frame is wider than the canvas between the side panels: hide them (⌘\) for the shot, so it holds the
        // frame alone, then bring them back.
        const panels = () => page.evaluate(() => { const el = document.querySelector("#studio-right"); if (!el) return false; const r = el.getBoundingClientRect(); return getComputedStyle(el).visibility !== "hidden" && r.width > 0 && r.left < innerWidth - 1; });
        await page.locator(".studio-viewport").focus();
        await page.keyboard.press("ControlOrMeta+Backslash");
        await until(async () => !(await panels()), { message: "the side panels hidden" });
        const shot = await canvasShot(page, "screen:home");
        const inView = await page.locator('[data-studio-frame="screen:home"]').evaluate((frame) => {
          const box = frame.getBoundingClientRect();
          const view = document.querySelector(".studio-viewport")?.getBoundingClientRect();
          return Boolean(view && box.left >= view.left && box.right <= view.right && box.top >= view.top && box.bottom <= view.bottom);
        });
        await page.keyboard.press("ControlOrMeta+Backslash");
        if (!inView) throw new Error("the 1440 px frame is not wholly in view at 100% (the shot would hold Studio chrome)");
        const { width, height } = shot;
        await view.setViewportSize({ width, height });
        await view.goto(`${origin}/__html-export/screens/home.html`);
        await view.evaluate(() => document.fonts.ready);
        await sleep(200);
        const htmlShot = await view.screenshot({ clip: { x: 0, y: 0, width, height } });
        const diff = await compareShots(view, shot.png, htmlShot, { width, height });
        fs.writeFileSync(`${ctx.outDir}/HO-08-screen-home-canvas.png`, shot.png);
        fs.writeFileSync(`${ctx.outDir}/HO-08-screen-home-html.png`, htmlShot);
        await view.close();
        if (diff.ratio > 0.005) throw new Error(`differs from the canvas: screen:home ${width}×${height}: ${(diff.ratio * 100).toFixed(2)}% (${diff.differing} px; shots in ${ctx.outDir})`);
        return `screen:home ${width}×${height}: ${(diff.ratio * 100).toFixed(2)}% · styles.css keeps .screen[data-chrome] / .screen__*`;
      } finally {
        await ctx.studio({ fresh: true });
      }
    },
  },
  {
    id: "HO-11", feature: "Round trip by key (figma P6b): Export › Figma keeps the pull of the frame it writes (by the export's version); that frame read back after a designer's edit (a list title, the heading) and imported opens Update from Figma on the same page with just those two changes, and Apply keeps what Figma cannot hold (Container, titleLines, the ListBox theme, aria)", wp: "figma round trip P6b 2026-10-13",
    timeout: 60000,
    async run(ctx) {
      const { pageFromFigma, repoMapping } = await import("../../figma-pull.mjs");
      const { printPage } = await import("../../doc.mjs");
      const fixture = JSON.parse(fs.readFileSync(new URL("../../fixtures/figma-pushed.json", import.meta.url), "utf8"));
      const { page } = await ctx.studio();
      const id = await importHtmlPage(page, fixture.page, "screen:screen-1");
      const panel = await openExport(page);
      await panel.getByRole("button", { name: "Figma", exact: true }).click();
      await until(async () => /zen-studio-figma/.test(await panel.innerText()), { timeout: 10_000, message: "the Figma JSON in the panel" });
      const downloading = page.waitForEvent("download");
      await panel.getByRole("button", { name: `Download ${id}.figma.json` }).click();
      const pkg = JSON.parse(fs.readFileSync(await (await downloading).path(), "utf8"));
      await page.keyboard.press("Escape");
      if (!/^[0-9a-f]{12}$/.test(pkg.page?.version ?? "")) throw new Error(`the export's version: ${pkg.page?.version}`);
      const kept = await page.evaluate(async (pageId) => {
        const store = await import("/src/platform/studio/builder/store/pageStore.ts");
        return (await store.getPage(pageId))?.figmaExports?.map((entry) => entry.version) ?? [];
      }, id);
      if (kept[0] !== pkg.page.version) throw new Error(`exports kept: ${kept.join(", ") || "none"}`);
      // In Figma: the plugin places the frame (its layers keep their keys, the frame its page and version), a designer
      // renames the first list row and the heading, and the frame is read back (figmaReadCode's shape).
      const read = JSON.parse(JSON.stringify({ ...pkg.frame, id: `9${Date.now() % 1e6}:3`, file: "9nZv4uW2LT21yuHabMTCh1", page: pkg.page.id, version: pkg.page.version }));
      const nodes = (node) => [node, ...(node.children ?? []).flatMap(nodes), ...(node.slots ?? []).flatMap((slot) => slot.children.flatMap(nodes))];
      nodes(read).find((node) => node.texts?.Title === "Loyalty app").texts.Title = "Loyalty app v2";
      nodes(read).find((node) => node.type === "TEXT" && node.characters === "Projects").characters = "Your projects";
      const pulled = printPage(pageFromFigma(read, { mapping: await repoMapping() }).doc, { ids: true });
      await page.locator('[data-e2e="import-pages"]').setInputFiles({ name: `${id}-from-figma.zen.tsx`, mimeType: "text/plain", buffer: Buffer.from(pulled, "utf8") });
      const dialog = page.getByRole("dialog", { name: "Update from Figma" });
      await dialog.waitFor({ state: "visible", timeout: 15000 });
      await until(async () => (await dialog.locator("[data-change]").count()) === 2, { timeout: 15000, message: "two changes listed" })
        .catch(async (error) => { throw new Error(`${error.message} (${(await dialog.innerText()).replace(/\s+/g, " ").slice(0, 400)})`); });
      await sleep(300);
      await page.screenshot({ path: ".qa/studio-e2e/handoff-HO-11-dialog.png" }).catch(() => undefined);
      await dialog.getByRole("button", { name: "Apply 2 changes" }).click();
      await dialog.waitFor({ state: "hidden", timeout: 15000 });
      await until(async () => /Your projects/.test((await pageText(page, id)) ?? ""), { timeout: 15000, message: "the update written" });
      const text = (await pageText(page, id)) ?? "";
      const landed = {
        title: /title="Loyalty app v2"/.test(text), heading: />Your projects<\/Heading>/.test(text), container: /<Container>/.test(text),
        titleLines: (text.match(/titleLines=\{2\}/g) ?? []).length === 2, theme: /<ListBox theme="shadow">/.test(text), aria: /aria-labelledby="chi-projects"/.test(text),
        onePage: !(await page.evaluate(async (pageId) => (await import("/src/platform/studio/builder/store/pageStore.ts")).getPage(`${pageId}-from-figma`), id)),
      };
      if (Object.values(landed).some((value) => !value)) throw new Error(`after Apply: ${JSON.stringify(landed)}`);
      await page.screenshot({ path: ".qa/studio-e2e/handoff-HO-11.png" }).catch(() => undefined);
      return `export ${pkg.page.version} kept; the read back: Update from Figma on ${id}, 2 changes applied; Container, titleLines, ListBox theme, aria kept`;
    },
  },
  {
    id: "HO-13", feature: "Round trip by key from another browser (figma P6b leftover): Export › Figma also keeps the export beside the page in the pages folder (<id>.figma-base.json); a second browser on the same dev server (its own IndexedDB, no export of its own) imports the frame read back after the designer's two edits and gets Update from Figma three ways on that page — just those two changes, ticked — and Apply keeps what Figma cannot hold and writes its pull back beside the page", wp: "figma round trip P6b leftover 2026-10-23",
    timeout: 90000,
    async run(ctx) {
      const { pageFromFigma, repoMapping } = await import("../../figma-pull.mjs");
      const { printPage } = await import("../../doc.mjs");
      const fixture = JSON.parse(fs.readFileSync(new URL("../../fixtures/figma-pushed.json", import.meta.url), "utf8"));
      const { page } = await ctx.studio();
      const id = await importHtmlPage(page, fixture.page, "screen:screen-1");
      const panel = await openExport(page);
      await panel.getByRole("button", { name: "Figma", exact: true }).click();
      await until(async () => /zen-studio-figma/.test(await panel.innerText()), { timeout: 10_000, message: "the Figma JSON in the panel" });
      const downloading = page.waitForEvent("download");
      await panel.getByRole("button", { name: `Download ${id}.figma.json` }).click();
      const pkg = JSON.parse(fs.readFileSync(await (await downloading).path(), "utf8"));
      await page.keyboard.press("Escape");
      // The export beside the page in the dev server's pages folder: what the other browser reads.
      const beside = path.join(ctx.root, pagesDirOf(ctx.server.port), `${id}.figma-base.json`);
      const shared = () => (fs.existsSync(beside) ? JSON.parse(fs.readFileSync(beside, "utf8")) : null);
      await until(() => shared()?.exports?.[0]?.version === pkg.page.version, { timeout: 10_000, message: `${id}.figma-base.json with export ${pkg.page.version}` });
      // In Figma, as in HO-11: the frame placed by the plugin, the first list row and the heading renamed, then read back.
      const read = JSON.parse(JSON.stringify({ ...pkg.frame, id: `9${Date.now() % 1e6}:3`, file: "9nZv4uW2LT21yuHabMTCh1", page: pkg.page.id, version: pkg.page.version }));
      const nodes = (node) => [node, ...(node.children ?? []).flatMap(nodes), ...(node.slots ?? []).flatMap((slot) => slot.children.flatMap(nodes))];
      nodes(read).find((node) => node.texts?.Title === "Loyalty app").texts.Title = "Loyalty app v2";
      nodes(read).find((node) => node.type === "TEXT" && node.characters === "Projects").characters = "Your projects";
      const pulled = printPage(pageFromFigma(read, { mapping: await repoMapping() }).doc, { ids: true });
      // Another browser: a fresh context (its own IndexedDB) on the same dev server; the page comes from the folder.
      const other = await openStudio(ctx.browser, { url: ctx.server.url, page: ctx.host });
      try {
        const tab = other.page;
        await showLeftTab(tab, "pages");
        await openStudioSpace(tab);
        await until(async () => /Loyalty app/.test((await pageText(tab, id)) ?? ""), { timeout: 20_000, message: `${id} synced from the folder` });
        const kept = await tab.evaluate(async (pageId) => (await (await import("/src/platform/studio/builder/store/pageStore.ts")).getPage(pageId))?.figmaExports?.length ?? 0, id);
        if (kept) throw new Error(`the other browser already holds ${kept} export(s) before the pull`);
        await tab.locator('[data-e2e="import-pages"]').setInputFiles({ name: `${id}-from-figma.zen.tsx`, mimeType: "text/plain", buffer: Buffer.from(pulled, "utf8") });
        const dialog = tab.getByRole("dialog", { name: "Update from Figma" });
        await dialog.waitFor({ state: "visible", timeout: 15000 });
        await until(async () => (await dialog.locator("[data-change]").count()) === 2, { timeout: 15000, message: "two changes listed" })
          .catch(async (error) => { throw new Error(`${error.message} (${(await dialog.innerText()).replace(/\s+/g, " ").slice(0, 400)})`); });
        const said = (await dialog.innerText()).replace(/\s+/g, " ");
        if (!/What changed in Figma since/.test(said)) throw new Error(`not three ways: ${said.slice(0, 300)}`);
        await sleep(300);
        await tab.screenshot({ path: ".qa/studio-e2e/handoff-HO-13-dialog.png" }).catch(() => undefined);
        await dialog.getByRole("button", { name: "Apply 2 changes" }).click();
        await dialog.waitFor({ state: "hidden", timeout: 15000 });
        await until(async () => /Your projects/.test((await pageText(tab, id)) ?? ""), { timeout: 15000, message: "the update written" });
        const text = (await pageText(tab, id)) ?? "";
        const landed = {
          title: /title="Loyalty app v2"/.test(text), heading: />Your projects<\/Heading>/.test(text), container: /<Container>/.test(text),
          titleLines: (text.match(/titleLines=\{2\}/g) ?? []).length === 2, theme: /<ListBox theme="shadow">/.test(text), aria: /aria-labelledby="chi-projects"/.test(text),
          onePage: !(await tab.evaluate(async (pageId) => (await import("/src/platform/studio/builder/store/pageStore.ts")).getPage(`${pageId}-from-figma`), id)),
        };
        if (Object.values(landed).some((value) => !value)) throw new Error(`after Apply: ${JSON.stringify(landed)}`);
        await until(() => shared()?.pull?.version === pkg.page.version, { timeout: 10_000, message: "the pull written back beside the page" });
      } finally {
        await other.context.close();
      }
      return `export ${pkg.page.version} beside the page; another browser (no export of its own): Update from Figma three ways, 2 changes applied, Container / titleLines / ListBox theme / aria kept, its pull written back`;
    },
  },
  {
    id: "HO-14", feature: "A phone app frame round trip (Pattern/AppShell/Mobile): Export › Figma draws a phone page's root AppShell as Figma's phone pattern; that frame read back from Figma imports as a page whose root AppShell has its TopNavigation and tabs again (no Stack, no note), and the canvas shows both bars around the page", wp: "phone AppShell pull 2026-10-23 (B's P3)",
    timeout: 60000,
    async run(ctx) {
      const { page } = await ctx.studio();
      const id = await importHtmlPage(page, PHONE_SHELL_PAGE, "screen:screen-1");
      const pkg = await figmaExport(page, id);
      const sets = JSON.stringify(pkg.frame).match(/"name":"(Pattern\/AppShell\/Mobile|Top-Navigation\/Mobile|Bottom-Navigation\/Mobile\/Default)"/g) ?? [];
      if (sets.length < 3) throw new Error(`the export draws ${sets.join(", ") || "no phone pattern"}`);
      const back = await pullAsNewPage(page, pkg, `${id}-pulled`);
      // The AppShell's opening tag runs to the page inside it (its bars hold `/>` of their own).
      const shell = back.text.match(/<AppShell\b[^]*?>(?=\s*<Text)/)?.[0] ?? "";
      const landed = { shell: /topNavigation=\{<TopNavigation title="Inbox"/.test(shell) && /bottomNavigation=\{<BottomNavigation /.test(shell), page: /<Text>Three new messages<\/Text>/.test(back.text), noStack: !/data-name="AppShell"/.test(back.text), decided: /<Screen [^>]*phoneLinked=\{\[\]\}/.test(back.text) };
      if (Object.values(landed).some((value) => !value)) throw new Error(`pulled page: ${JSON.stringify(landed)} ${shell.slice(0, 200)}`);
      const frame = page.locator('[data-studio-frame="screen:screen-1"]');
      await until(async () => (await frame.locator(".zen-top-nav").count()) > 0 && (await frame.locator(".zen-bottom-nav").count()) > 0, { timeout: 10_000, message: "both bars on the canvas" })
        .catch(async (error) => {
          await page.screenshot({ path: ".qa/studio-e2e/handoff-HO-14-fail.png" }).catch(() => undefined);
          const seen = await page.evaluate(() => ({ url: location.search, frames: [...document.querySelectorAll("[data-studio-frame]")].map((f) => f.getAttribute("data-studio-frame")), top: document.querySelectorAll(".zen-top-nav").length, bottom: document.querySelectorAll(".zen-bottom-nav").length, shell: document.querySelectorAll(".zen-app-shell").length }));
          throw new Error(`${error.message} ${JSON.stringify(seen)}`);
        });
      await page.screenshot({ path: ".qa/studio-e2e/handoff-HO-14.png" }).catch(() => undefined);
      return `export → Pattern/AppShell/Mobile; pulled back as ${back.id}: root AppShell with TopNavigation "Inbox" and its tabs, both bars on the canvas`;
    },
  },
  {
    id: "HO-15", feature: "An ActionBar on its own round trip: Export › Figma draws it as Figma's Action-Bar/Mobile (no \"left out\" note), and the frame read back imports as a page with the same ActionBar (its two actions)", wp: "ActionBar alone 2026-10-23 (B's P3)",
    timeout: 60000,
    async run(ctx) {
      const { page } = await ctx.studio();
      const id = await importHtmlPage(page, ACTION_BAR_PAGE, "screen:screen-1");
      const pkg = await figmaExport(page, id);
      if (!JSON.stringify(pkg.frame).includes('"name":"Action-Bar/Mobile"')) throw new Error("the export has no Action-Bar/Mobile");
      if ((pkg.notes ?? []).some((note) => /ActionBar/.test(note))) throw new Error(`notes: ${pkg.notes.join("; ")}`);
      const back = await pullAsNewPage(page, pkg, `${id}-pulled`);
      const bar = back.text.match(/<ActionBar\b[^]*?\/>/)?.[0]?.replace(/\s+/g, " ") ?? "";
      if (bar !== '<ActionBar primaryAction={{ label: "Place order" }} secondaryAction={{ label: "Back" }} />') throw new Error(`pulled: ${bar || back.text.slice(0, 300)}`);
      return `export → Action-Bar/Mobile; pulled back as ${back.id}: ${bar}`;
    },
  },
  {
    id: "HO-12", feature: "Copy for Figma (studio copy to Figma P2): ⌘C on a frame of a page you made puts its code (text/plain, the Studio's frame paste) and its Figma export (text/html, data-zen-studio-figma) on the clipboard — the export names the page and the frame, carries the library keys of what it uses, and holds that frame only; the same from the Screen layer (⌘C, and its menu's Copy for Figma)", wp: "copy to figma P2 2026-10-16",
    async run(ctx) {
      const { page } = await ctx.studio();
      const id = await importHtmlPage(page, FIGMA_PAGE, "screen:screen-1");
      const label = page.locator('.studio-frame-label[data-chrome-key="label:screen:screen-1"]');
      await label.evaluate((element) => element.click());
      await page.locator(".studio-viewport").focus();
      const read = () => page.evaluate(async () => {
        const out = { html: "", text: "" };
        for (const item of await navigator.clipboard.read()) {
          if (item.types.includes("text/html")) out.html = await (await item.getType("text/html")).text();
          if (item.types.includes("text/plain")) out.text = await (await item.getType("text/plain")).text();
        }
        return out;
      });
      const check = async (how) => {
        await until(async () => Boolean(packageFromClip(await read())), { timeout: 15_000, message: `${how}: the Figma export on the clipboard` });
        const clip = await read();
        const pkg = packageFromClip(clip);
        const problems = [
          pkg.format !== "zen-studio-figma" && `format ${pkg.format}`,
          pkg.page?.id !== id && `page id ${pkg.page?.id}`,
          pkg.page?.frame !== "screen:screen-1" && `frame ${pkg.page?.frame}`,
          pkg.frame.name !== "Projects" && `frame name ${pkg.frame.name}`,
          !Object.keys(pkg.library?.sets ?? {}).length && "no library keys",
          !Object.values(pkg.library?.sets ?? {}).every((entry) => /^[0-9a-f]{40}$/.test(entry.key)) && "a set without its key",
          !/<Screen\b[^>]*id="screen-1"/.test(clip.text) && "the code is not on the clipboard",
        ].filter(Boolean);
        if (problems.length) throw new Error(`${how}: ${problems.join(" · ")}`);
        return pkg;
      };
      await page.evaluate(() => navigator.clipboard.writeText("before"));
      await page.keyboard.press(process.platform === "darwin" ? "Meta+c" : "Control+c");
      const copied = await check("⌘C");
      await until(async () => /Copied frame/.test(await statusText(page)), { timeout: 10_000, message: "the copy is said" });
      // The Screen's menu (a right-click on its empty area, under the content, selects the Screen): Copy for Figma.
      await page.evaluate(() => navigator.clipboard.writeText("before"));
      await page.keyboard.press("Shift+2");
      await sleep(600);
      const box = await page.locator('[data-studio-frame="screen:screen-1"]').boundingBox();
      await page.mouse.click(box.x + box.width / 2, box.y + box.height - 24, { button: "right" });
      await page.getByRole("menuitem", { name: "Copy for Figma" }).click();
      await check("Copy for Figma");
      // Figma's canvas takes the html only as written (a copy event): an async write turns `<!--` into `&lt;!--`.
      const raw = await page.evaluate(async () => {
        for (const item of await navigator.clipboard.read({ unsanitized: ["text/html"] })) if (item.types.includes("text/html")) return (await item.getType("text/html")).text();
        return "";
      });
      if (!/<span data-metadata="<!--\(figmeta\)/.test(raw) || !raw.includes('<span data-buffer="<!--(figma)')) {
        throw new Error(`Copy for Figma: Figma's own clipboard is not on it as written (${raw.slice(0, 120)}…)`);
      }
      // The Metric-Cards stretch to their grid row: each takes its canvas height as its minimum (else Figma's Hug row
      // takes the shortest card and squeezes the sparkline).
      const { message } = await readFigmaClipboard(raw);
      // The page's two cards by their names (the paste also carries the components' own layers, grids among them).
      const cards = ["Revenue", "Q4 revenue"].map((name) => message.nodeChanges.find((node) => node.type === "INSTANCE" && node.name === name));
      const canvas = await page.locator('[data-studio-frame="screen:screen-1"] .zen-metric-card').evaluateAll((cards) => cards.map((card) => card.offsetHeight));
      const mins = cards.map((card) => card?.minSize?.value?.y ?? 0);
      if (cards.some((card) => !card) || canvas.length !== 2 || mins.some((min, index) => Math.abs(min - canvas[index]) > 1)) {
        throw new Error(`Copy for Figma: the grid's cards keep minimum heights ${mins.join(", ") || "none"} for canvas heights ${canvas.join(", ")}`);
      }
      // ⌘C with the Screen layer selected (the right-click selected it).
      await page.evaluate(() => navigator.clipboard.writeText("before"));
      await page.locator(".studio-viewport").focus();
      await sleep(800);
      await page.keyboard.press(process.platform === "darwin" ? "Meta+c" : "Control+c");
      await check("⌘C on the Screen layer");
      return `⌘C on the frame and on its Screen layer, Copy for Figma (Figma's own clipboard as written, grid cards at their canvas heights): ${Object.keys(copied.library.sets).length} sets with keys, frame screen:screen-1, code beside it`;
    },
  },
];
