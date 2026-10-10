// Handoff rows (Studio builder GĐ5, spec docs/research/studio-builder-handoff-spec-2026-10-07.md): a builder page
// exported as React code (tools/studio/compile.mjs) or as its design file, from the Export panel.
import fs from "node:fs";
import { unzipFiles } from "../../zip.mjs";
import path from "node:path";
import { pagesDirOf, promoteDirOf } from "../lib/server.mjs";
import { openAssetLibrary, openStudioSpace, showLeftTab, sleep, statusText, until } from "../lib/studio.mjs";
import { clickNamed, focusScreen, newPage, pageText, selectStack } from "./builder.mjs";

/** A phone page with every kind of frame the HTML export writes: a screen, its state variant, an overlay; a photo, a form. */
const HTML_PAGE = `// @zen-page {"format":1,"title":"HTML check"}
import { Board, Overlay, Screen, proto } from "@zen/design-system/builder";
import { Badge, Button, Checkbox, Dialog, EmptyState, Image, InputField, List, ListItem, Stack, Text } from "@zen/design-system";

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
import { Board, Screen } from "@zen/design-system/builder";
import { PageHeader, Sidebar, SidebarMenuItem, Stack, Text } from "@zen/design-system";

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
    id: "HO-01", feature: "Export a page as React: the component's code, Copy; the Design file tab shows the page itself", wp: "GĐ5 M1",
    async run(ctx) {
      const { page, id } = await newPage(ctx, { title: "Export check" });
      const panel = await openExport(page);
      await until(async () => /export function ExportCheckPage\(/.test(await panel.innerText()), { message: "the React code in the panel" });
      await panel.getByRole("button", { name: "Copy code" }).click();
      const react = await until(async () => { const text = await clipboard(page); return /Generated by Zen Studio from/.test(text) ? text : null; }, { message: "the React code copied" });
      // A blank page comes with its app frame: on a phone (newPage's device) the bars above and below the page.
      if (!/import \{ BottomNavigation, Stack, Text, TopNavigation \} from "@zen\/design-system";/.test(react) || !/<TopNavigation type="compact" title="Export check" \/>/.test(react)) throw new Error(`unexpected code: ${react.slice(0, 400).replace(/\n/g, " ⏎ ")}`);
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
          "npm install @zen/design-system@^", 'import "@zen/design-system/styles.css";', '<ZenProvider theme="light"', 'breakpoint="mobile" typography="mobile" density="comfortable"',
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
    id: "HO-08", feature: "A Screen with its app frame (Sidebar beside, Page header on top) exports HTML laid out as on the canvas (pixel comparison)", wp: "slots 2026-10-10",
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
];
