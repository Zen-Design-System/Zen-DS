// Figma walk rows (opt-in group figma): a photo dropped on one row or one item, the way Figma replaces one image
// (BACKLOG P1 2026-10-10, docs/research/studio-usability-eval-2026-10-10.md §5). The example rows use the host
// fixture's "E2E pictures" frame (fixtures/host-page.tsx PictureFixture); the last one a page made in the Studio. A part
// of figma.mjs (the group's rows spread it), kept in its own folder so the harness self-test reads it through figma.mjs.
import fs from "node:fs";
import path from "node:path";
import { newPageText } from "../../../dialect.mjs";
import { grow, withStarter } from "../../../dnd-engine.mjs";
import { locOf } from "../../lib/source.mjs";
import { focusFrame, openAssetLibrary, sleep, statusText, until } from "../../lib/studio.mjs";
import { pageText, seededPage } from "../builder.mjs";
import { waitSeed } from "../inspector.mjs";

/** The fixture frame that holds PictureFixture (the last example of the host page). */
const PICTURE_FRAME = 12;
const PHOTOS = "#studio-left-panel-assets [data-photo]";

/** The host fixture reseeded, its pictures frame in view, the Assets' Photos open. */
async function picturesFrame(ctx) {
  const seed = await ctx.reseed();
  const { page } = await ctx.studio();
  await waitSeed(page, seed);
  await focusFrame(page, PICTURE_FRAME);
  await openAssetLibrary(page, "Photos");
  return page;
}

/** The centres of the avatars `selector` finds in a frame (`[data-studio-frame]` value; null: the whole canvas), with the picture each draws. */
const faces = (page, selector, frame = `example:${PICTURE_FRAME}`) => page.evaluate(({ selector, frame }) => [...document.querySelectorAll(frame ? `[data-studio-frame="${frame}"] ${selector}` : `.studio-world ${selector}`)].map((el) => {
  const box = el.getBoundingClientRect();
  return { x: box.x + box.width / 2, y: box.y + box.height / 2, img: el.querySelector("img")?.getAttribute("src") ?? "" };
}), { selector, frame });

/** Drags Photos tile `tile` onto a point of the canvas, as a person does (the drag's label names the layer). */
async function dropPhoto(page, tile, target) {
  const box = await page.locator(PHOTOS).nth(tile).boundingBox();
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(box.x + 40, box.y + 20, { steps: 4 });
  await page.mouse.move(target.x, target.y, { steps: 25 });
  await sleep(250);
  const label = await page.evaluate(() => document.querySelector(".studio-drag__label")?.textContent ?? "");
  await page.mouse.up();
  return label;
}

const data = async (ctx) => (await ctx.api.source(ctx.dataFile)).content;
/** A person's line in examples/data.ts. */
const personLine = (text, id) => text.split("\n").find((line) => line.trimStart().startsWith(`${id}: person(`)) ?? "";
const PICTURE_CODE = /photo: new URL\("\.\.\/\.\.\/assets\/media\/[^"]+", import\.meta\.url\)\.href/;

/** ⌘Z once; the file `read` gives is `before` again. */
async function undoOnce(page, read, before, message) {
  await page.locator(".studio-viewport").focus();
  await page.keyboard.press("ControlOrMeta+KeyZ");
  await until(async () => (await read()) === before, { message, timeout: 6000 });
}

const failWith = (page, message) => async (error) => { throw new Error(`${error.message} (${message}) · status: ${(await statusText(page)).slice(-200)}`); };

/**
 * A PNG from "the computer" dropped at a point of the canvas, as the OS drops a file: a DataTransfer with the File, the
 * drag events on the element under the point. `shade` makes each row's picture its own bytes.
 */
const dropFile = (page, at, name, shade) => page.evaluate(async ({ x, y, name, shade }) => {
  const canvas = document.createElement("canvas");
  canvas.width = 96;
  canvas.height = 96;
  const context = canvas.getContext("2d");
  context.fillStyle = shade;
  context.fillRect(0, 0, 96, 96);
  context.fillStyle = "#fff";
  context.fillRect(24, 24, 48, 48);
  const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/png"));
  const data = new DataTransfer();
  data.items.add(new File([blob], name, { type: "image/png" }));
  const target = document.elementFromPoint(x, y);
  for (const type of ["dragenter", "dragover", "drop"]) target.dispatchEvent(new DragEvent(type, { bubbles: true, cancelable: true, clientX: x, clientY: y, dataTransfer: data }));
}, { x: at.x, y: at.y, name, shade });

/** Runs `work` and then takes away what the drop saved in the repo: new files in src/assets/media, CREDITS.md's rows. */
async function keepingMedia(ctx, work) {
  const dir = path.join(ctx.root, "src/assets/media");
  const before = new Set(fs.readdirSync(dir));
  const credits = fs.readFileSync(path.join(dir, "CREDITS.md"), "utf8");
  try {
    return await work(() => fs.readdirSync(dir).filter((name) => !before.has(name)));
  } finally {
    for (const name of fs.readdirSync(dir)) if (!before.has(name)) fs.rmSync(path.join(dir, name), { force: true });
    fs.writeFileSync(path.join(dir, "CREDITS.md"), credits);
  }
}

export const pictureRows = [
  {
    id: "FW-235", feature: "A photo dropped on a row's avatar that a helper draws (the sidebar's personAvatar(people[t.assignee]) in rows taskRow builds from filtered tasks) changes that person's photo in data.ts, one ⌘Z puts it back; an initials avatar gets its first photo", wp: "pictures 2026-10-23",
    async run(ctx) {
      const page = await picturesFrame(ctx);
      const before = await data(ctx);
      const rows = await until(async () => { const found = await faces(page, ".zen-list-item .zen-avatar"); return found.length >= 3 ? found : null; }, { message: "the rows' avatars" });
      // Row 1 is pt-2 (pt-1 is done): Bao, who has a photo.
      const label = await dropPhoto(page, 1, rows[0]);
      await until(async () => { const line = personLine(await data(ctx), "bao"); return PICTURE_CODE.test(line) && !line.includes("photoBao") ? line : null; }, { message: "Bao's photo in data.ts" }).catch(failWith(page, `drop on row 1, drag label "${label}"`));
      if (personLine(await data(ctx), "em") !== personLine(before, "em")) throw new Error("the drop on Bao's row changed Em too");
      await undoOnce(page, () => data(ctx), before, "one ⌘Z puts data.ts back");
      // Row 2 is pt-3: Em, drawn by the initials branch (no src of its own): the photo the other branch reads.
      const again = await faces(page, ".zen-list-item .zen-avatar");
      await dropPhoto(page, 2, again[1]);
      await until(async () => PICTURE_CODE.test(personLine(await data(ctx), "em")), { message: "Em's first photo in data.ts" }).catch(failWith(page, "drop on row 2 (initials)"));
      await until(async () => Boolean((await faces(page, ".zen-list-item .zen-avatar"))[1]?.img), { message: "row 2 draws the photo" });
      await undoOnce(page, () => data(ctx), before, "one ⌘Z takes Em's photo away");
      return "row 1 → people.bao.photo · ⌘Z · row 2 (initials) → people.em gets a photo · ⌘Z";
    },
  },
  {
    id: "FW-236", feature: "A refusal stays clear where the code, not the row, picks the data: a drop on an avatar either side of a condition draws says so and writes nothing", wp: "pictures 2026-10-23",
    async run(ctx) {
      const page = await picturesFrame(ctx);
      const before = { host: await ctx.text(), data: await data(ctx) };
      const either = await until(async () => (await faces(page, ".zen-list-item .zen-avatar"))[2] ?? null, { message: "the Either row's avatar" });
      await dropPhoto(page, 0, either);
      await until(async () => /either side of a condition/.test(await statusText(page)), { message: "the status says the condition picks the data" }).catch(failWith(page, "drop on Either"));
      await sleep(400);
      if ((await ctx.text()) !== before.host || (await data(ctx)) !== before.data) throw new Error("a refused drop changed a file");
      return "refused: either side of a condition · no file changed";
    },
  },
  {
    id: "FW-237", feature: "A photo dropped on one face of an AvatarStack (items a .map builds from data.ts) changes that person's photo, and on one reader of a ChatMessage (seenBy written in place) that item's picture; one ⌘Z each", wp: "pictures 2026-10-23",
    async run(ctx) {
      const page = await picturesFrame(ctx);
      const before = { host: await ctx.text(), data: await data(ctx) };
      const stack = await until(async () => { const found = await faces(page, ".zen-avatar-stack .zen-avatar"); return found.length === 3 ? found : null; }, { message: "the AvatarStack's three faces" });
      // Face 3 is Gia (no photo yet): her first photo, in her factory call.
      await dropPhoto(page, 1, stack[2]);
      await until(async () => PICTURE_CODE.test(personLine(await data(ctx), "gia")), { message: "Gia's photo in data.ts" }).catch(failWith(page, "drop on face 3"));
      if (personLine(await data(ctx), "ava") !== personLine(before.data, "ava")) throw new Error("the drop on face 3 changed face 1");
      await undoOnce(page, () => data(ctx), before.data, "one ⌘Z takes Gia's photo away");
      // Reader 2 of the ChatMessage: { name: "Gia Pham" } written in place takes a src.
      const readers = await until(async () => { const found = await faces(page, ".zen-chat-read .zen-avatar"); return found.length === 2 ? found : null; }, { message: "the two readers" });
      await dropPhoto(page, 2, readers[1]);
      await until(async () => /\{ name: "Gia Pham", src: new URL\("\.\.\/\.\.\/\.\.\/assets\/media\/[^"]+", import\.meta\.url\)\.href \}/.test(await ctx.text()), { message: "reader 2's src in the page" }).catch(failWith(page, "drop on reader 2"));
      await undoOnce(page, () => ctx.text(), before.host, "one ⌘Z takes reader 2's photo away");
      return "AvatarStack face 3 → people.gia.photo · ⌘Z · seenBy[1].src in place · ⌘Z";
    },
  },
  {
    id: "FW-238", feature: "On a page you made, a photo dropped on one reader of a ChatMessage writes that reader's src in the page (zen-media:), the other reader keeps none; one ⌘Z", wp: "pictures 2026-10-23",
    async run(ctx) {
      const seeded = await seededPage(ctx, (title) => grow(withStarter(newPageText({ title, device: "desktop" })), "Stack", '<ChatMessage side="you" seenBy={[{ name: "Ava Chen" }, { name: "Gia Pham" }]}>Seen by two</ChatMessage>'), /Seen by two/);
      const { page, id } = seeded;
      await openAssetLibrary(page, "Photos");
      const before = (await pageText(page, id)) ?? "";
      const readers = await until(async () => { const found = await faces(page, ".zen-chat-read .zen-avatar", null); return found.length === 2 ? found : null; }, { message: "the two readers" });
      await dropPhoto(page, 0, readers[1]);
      await until(async () => /\{ name: "Gia Pham", src: "zen-media:[^"]+" \}/.test((await pageText(page, id)) ?? ""), { message: "reader 2's src in the page" }).catch(failWith(page, "drop on reader 2"));
      if (!/\{ name: "Ava Chen" \}/.test((await pageText(page, id)) ?? "")) throw new Error("reader 1 changed too");
      await undoOnce(page, async () => (await pageText(page, id)) ?? "", before, "one ⌘Z");
      return "seenBy[1].src = zen-media:… on a page you made · ⌘Z";
    },
  },
  {
    id: "FW-239", feature: "A photo file dropped from the computer on a row's avatar of an example page is saved in the repo (src/assets/media, WebP, a CREDITS.md row) and becomes that person's photo in data.ts; one ⌘Z", wp: "pictures 2026-10-23",
    async run(ctx) {
      const page = await picturesFrame(ctx);
      return keepingMedia(ctx, async (added) => {
        const before = await data(ctx);
        const rows = await until(async () => { const found = await faces(page, ".zen-list-item .zen-avatar"); return found.length >= 3 ? found : null; }, { message: "the rows' avatars" });
        await dropFile(page, rows[0], "Team photo.png", "#3b6");
        const saved = await until(() => added().find((name) => /^team-photo-[0-9a-f]{8}\.webp$/.test(name)) ?? null, { message: "the photo saved in src/assets/media" }).catch(failWith(page, "drop from the computer"));
        await until(async () => personLine(await data(ctx), "bao").includes(`photo: new URL("../../assets/media/${saved}", import.meta.url).href`), { message: "Bao's photo is the saved file" }).catch(failWith(page, "the row's data"));
        if (!fs.readFileSync(path.join(ctx.root, "src/assets/media/CREDITS.md"), "utf8").includes(`| ${saved} | Dropped in Zen Studio from "Team photo.png"`)) throw new Error("no CREDITS.md row for the saved photo");
        await until(async () => (await faces(page, ".zen-list-item .zen-avatar"))[0]?.img.includes(saved), { message: "the row draws the saved photo" });
        await undoOnce(page, () => data(ctx), before, "one ⌘Z puts data.ts back");
        return `${saved} in src/assets/media + CREDITS row · people.bao.photo → it · ⌘Z`;
      });
    },
  },
  {
    id: "FW-240", feature: "A photo file dropped from the computer into a layout of an example page is saved in the repo and added there as an Image reading the file; one ⌘Z takes it away", wp: "pictures 2026-10-23",
    async run(ctx) {
      const page = await picturesFrame(ctx);
      return keepingMedia(ctx, async (added) => {
        const before = await ctx.text();
        // The pictures Stack's own padding, under its last layer: the drop goes into the Stack.
        const src = `${ctx.file}:${locOf(before, "pictures").loc}`;
        const box = await until(async () => { const rect = await page.evaluate((at) => window.__e2e.rectOf(at), src); return rect ? { x: rect.x + 40, y: rect.y + rect.height - 6 } : null; }, { message: "the pictures Stack" });
        await dropFile(page, box, "Cover shot.png", "#36b");
        const saved = await until(() => added().find((name) => /^cover-shot-[0-9a-f]{8}\.webp$/.test(name)) ?? null, { message: "the photo saved in src/assets/media" }).catch(failWith(page, "drop from the computer"));
        await until(async () => (await ctx.text()).includes(`<Image src={new URL("../../../assets/media/${saved}", import.meta.url).href} alt="Cover shot" ratio="4:3" />`), { message: "an Image reading the saved file in the page" }).catch(failWith(page, "the new Image"));
        await undoOnce(page, () => ctx.text(), before, "one ⌘Z takes the Image away");
        return `${saved} saved · <Image src={new URL(…)}> added · ⌘Z`;
      });
    },
  },
];
