// A picture written in example or template code (Zen Studio, 2026-10-10): `new URL("<relative file>", import.meta.url).href`,
// which Vite serves in dev and bundles in a build, with no import to add. The Studio sends the picture's repo file
// ({ kind: "picture", file: "src/assets/media/avatar-ava.webp" }); the engine writes it relative to the file it lands
// in (a prop in the page, a row in examples/data.ts). Pure JS: the browser engine loads it too.

const dirOf = (file) => file.split("/").slice(0, -1);

/** `../../assets/media/x.webp`: `to` from the folder of `from` (both repo paths). */
export function relativePath(from, to) {
  const base = dirOf(from);
  const target = to.split("/");
  let shared = 0;
  while (shared < base.length && shared < target.length - 1 && base[shared] === target[shared]) shared += 1;
  const up = base.length - shared;
  return `${up ? "../".repeat(up) : "./"}${target.slice(shared).join("/")}`;
}

/** The expression that reads picture `pictureFile` from code in `file`. */
export const pictureExpression = (file, pictureFile) => `new URL(${JSON.stringify(relativePath(file, pictureFile))}, import.meta.url).href`;

/** A { kind: "picture", file } value: a repo path to an image file. */
export const isPictureValue = (value) => value?.kind === "picture" && typeof value.file === "string" && /^src\/[\w./-]+\.(?:webp|png|jpe?g|gif|svg|avif)$/i.test(value.file) && !value.file.includes("..");
