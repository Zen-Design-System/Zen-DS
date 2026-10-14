import { platformMedia, type PlatformPhoto } from "../../../PlatformMedia";
import { ASSET_PREFIX, assetUrl } from "../assets/uploads";

/*
 * The library's photos (Studio builder GĐ3 M3, spec docs/research/studio-builder-library-spec-2026-10-06.md §3f): the
 * platform's sample photos (src/assets/media, CREDITS.md there) under keys named after their files, which never change.
 * A builder page writes `src="zen-media:<key>"` (a literal: the page stays valid and the same in every build); the page
 * renderer turns it into this build's URL. Example code keeps reading `platformMedia.<path>`.
 */

export const MEDIA_PREFIX = "zen-media:";

export type LibraryPhoto = {
  /** Stable key (the file's name): what a builder page writes after `zen-media:`. */
  key: string;
  /** Where example code reads it: `platformMedia.<path>`. */
  path: string;
  photo: PlatformPhoto;
};

const SITE = ["site-college", "site-rooftops", "site-old-town", "site-santorini", "site-bridge", "site-cafe"];
const FEED = ["feed-sunset-field", "feed-forest-creek", "feed-balloon-palms", "feed-mountain-road", "feed-snow-peaks", "feed-desert", "feed-coast-road", "feed-moss"];

export const LIBRARY_PHOTOS: readonly LibraryPhoto[] = [
  { key: "viewer-college", path: "viewer", photo: platformMedia.viewer },
  { key: "mountain-road-tall", path: "mountainRoad", photo: platformMedia.mountainRoad },
  ...platformMedia.site.map((photo, index) => ({ key: SITE[index] ?? `site-${index}`, path: `site[${index}]`, photo })),
  ...platformMedia.feed.map((photo, index) => ({ key: FEED[index] ?? `feed-${index}`, path: `feed[${index}]`, photo })),
];

const byKey = new Map(LIBRARY_PHOTOS.map((entry) => [entry.key, entry]));

/*
 * Every picture a starter may copy (2026-10-08): the library's, the rest of src/assets/media (avatars, video posters:
 * key = the file's name, as the library's) and each template's own assets (key `tpl.<template>.<file>`, Promote reads
 * src/templates/<template>/assets/<file>). A page writes `zen-media:<key>`, never this build's URL, so it holds on the
 * deployed docs after the next deploy and an export carries the file.
 */
const mediaFiles = import.meta.glob<string>("../../../../assets/media/*.webp", { eager: true, import: "default" });
const templateFiles = import.meta.glob<string>("../../../../templates/*/assets/*.{jpg,jpeg,png,webp,svg}", { eager: true, import: "default" });
export const MEDIA_FILES: ReadonlyMap<string, string> = new Map([
  ...LIBRARY_PHOTOS.map((entry): [string, string] => [entry.key, entry.photo.src]),
  ...Object.entries(mediaFiles).map(([file, src]): [string, string] => [/([^/]+)\.webp$/.exec(file)![1], src]),
  ...Object.entries(templateFiles).map(([file, src]): [string, string] => {
    const [, template, name] = /templates\/([^/]+)\/assets\/([^/]+)$/.exec(file)!;
    return [`tpl.${template}.${name}`, src];
  }),
].filter(([key]) => /^[\w.-]+$/.test(key)));

/*
 * Each picture's file in the repo (`src/assets/media/avatar-ava.webp`, `src/templates/hr/assets/account-photo.jpg`): what
 * code outside a page you made reads it by (user, 2026-10-10: "thay hình vào avatar trong mọi component hệt như các
 * example"). Example and template code cannot read `zen-media:` (nothing resolves it there), so a picture is written as
 * `new URL("<relative file>", import.meta.url).href` — a literal the Studio reads back, that Vite serves in dev and
 * bundles in a build, with no import to add. Uploads live in this browser only, so they stay on pages you made.
 */
const repoPathOf = (globPath: string) => globPath.replace(/^(\.\.\/)+/, "src/");
export const MEDIA_REPO_FILES: ReadonlyMap<string, string> = new Map([
  ...Object.entries(mediaFiles).map(([file]): [string, string] => [/([^/]+)\.webp$/.exec(file)![1], repoPathOf(file)]),
  ...Object.entries(templateFiles).map(([file]): [string, string] => {
    const [, template, name] = /templates\/([^/]+)\/assets\/([^/]+)$/.exec(file)!;
    return [`tpl.${template}.${name}`, repoPathOf(file)];
  }),
  // The library's photos are named by use (site-college…), not by file: their file is the media entry with the same URL.
  ...LIBRARY_PHOTOS.flatMap((entry): [string, string][] => {
    const file = Object.entries(mediaFiles).find(([, src]) => src === entry.photo.src)?.[0];
    return file ? [[entry.key, repoPathOf(file)]] : [];
  }),
]);
const keyByRepoFile = new Map([...MEDIA_REPO_FILES].map(([key, file]) => [file, key]));

/** `new URL("<relative file>", import.meta.url).href`: a picture written in example or template code. */
export const PICTURE_EXPRESSION = /^new URL\((["'])((?:\.\.?\/)[^"']+)\1,\s*import\.meta\.url\)\.href$/;

const dirOf = (file: string) => file.split("/").slice(0, -1);
/** `../../assets/media/x.webp`: `to` from the folder of `from` (both repo paths). */
function relativePath(from: string, to: string): string {
  const base = dirOf(from);
  const target = to.split("/");
  let shared = 0;
  while (shared < base.length && shared < target.length - 1 && base[shared] === target[shared]) shared += 1;
  const up = base.length - shared;
  return `${up ? "../".repeat(up) : "./"}${target.slice(shared).join("/")}`;
}
/** The repo path `rel` (as written in `file`) points at. */
function resolvePath(file: string, rel: string): string {
  const parts = dirOf(file);
  for (const step of rel.split("/")) {
    if (step === "..") parts.pop();
    else if (step !== "." && step) parts.push(step);
  }
  return parts.join("/");
}

/**
 * The value that puts picture `value` (`zen-media:<key>`, `zen-asset:<id>`, or a URL) on an element of `file`: the value
 * itself on a page you made; in the repo the picture's file as a `new URL(…, import.meta.url).href` expression. Null for
 * an upload outside a page you made (it lives in this browser only).
 */
export function pictureCode(file: string, value: string): { kind: "string"; value: string } | { kind: "picture"; file: string } | null {
  if (file.startsWith("local:")) return { kind: "string", value };
  if (value.startsWith(ASSET_PREFIX)) return null;
  const key = value.startsWith(MEDIA_PREFIX) ? value.slice(MEDIA_PREFIX.length) : mediaValueOf(value).replace(MEDIA_PREFIX, "");
  const repo = MEDIA_REPO_FILES.get(key);
  if (!repo) return { kind: "string", value };
  // The engine writes the expression relative to the file the value lands in (a prop, or a row in data.ts).
  return { kind: "picture", file: repo };
}

/** The expression the engine writes for a picture file from code in `file` (shown before the write lands). */
export const pictureExpression = (file: string, pictureFile: string) => `new URL(${JSON.stringify(relativePath(file, pictureFile))}, import.meta.url).href`;

/**
 * The picture an element of `file` shows, as a `zen-media:` / `zen-asset:` value the picker knows: from the written
 * `src` (a value, or a `new URL(…)` expression resolved against the file), else from the URL it renders with.
 */
export function pictureValueOf(file: string | null | undefined, written: string | undefined, live: unknown): string | undefined {
  if (written?.startsWith(MEDIA_PREFIX) || written?.startsWith(ASSET_PREFIX)) return written;
  const match = written ? PICTURE_EXPRESSION.exec(written.trim()) : null;
  if (match && file) {
    const key = keyByRepoFile.get(resolvePath(file, match[2]));
    if (key) return `${MEDIA_PREFIX}${key}`;
  }
  if (typeof live === "string" && live) return mediaValueOf(live);
  return written ? mediaValueOf(written) : undefined;
}

const absoluteUrl = (src: string) => { try { return new URL(src, document.baseURI).href; } catch { return src; } };
const keyBySrc = new Map([...MEDIA_FILES].flatMap(([key, src]) => [[src, key], [absoluteUrl(src), key]]));

/** This build's URL of a picture → its `zen-media:` value (any other text unchanged). */
export const mediaValueOf = (value: string) => { const key = keyBySrc.get(value); return key ? `${MEDIA_PREFIX}${key}` : value; };
/** The URL of a `zen-media:` key in this build (null: no such picture). */
export const mediaSrc = (key: string) => byKey.get(key)?.photo.src ?? MEDIA_FILES.get(key) ?? null;

/** What an uploaded photo this browser lacks shows (canvas, Play, exports): a pale picture that says so. */
export const MISSING_PHOTO = `data:image/svg+xml;charset=utf-8,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300" viewBox="0 0 400 300"><rect width="400" height="300" fill="black" fill-opacity="0.06"/><text x="200" y="158" text-anchor="middle" font-family="Inter, system-ui, sans-serif" font-size="20" fill="black" fill-opacity="0.55">Missing photo</text></svg>')}`;

/**
 * `zen-media:<key>` → this build's URL of that library photo; `zen-asset:<id>` → the uploaded photo's object URL
 * (builder/assets/uploads.ts), or MISSING_PHOTO; any other value unchanged.
 */
export function resolveMedia<T>(value: T): T | string {
  if (typeof value !== "string") return value;
  if (value.startsWith(ASSET_PREFIX)) return assetUrl(value.slice(ASSET_PREFIX.length)) ?? MISSING_PHOTO;
  if (!value.startsWith(MEDIA_PREFIX)) return value;
  return mediaSrc(value.slice(MEDIA_PREFIX.length)) ?? value;
}

/**
 * resolveMedia through a prop's data (a Table's `rows: [{ photo: "zen-media:avatar-ava" }]`, a column's media): lists
 * and plain objects are copied where a picture changes, anything else (elements, functions) is left as it is.
 */
export function resolveMediaDeep<T>(value: T, depth = 0): T | string {
  if (typeof value === "string") return resolveMedia(value);
  if (depth > 6 || !value || typeof value !== "object") return value;
  if (Array.isArray(value)) {
    const items = value.map((item) => resolveMediaDeep(item, depth + 1));
    return (items.some((item, index) => item !== value[index]) ? items : value) as T;
  }
  if (Object.getPrototypeOf(value) !== Object.prototype || "$$typeof" in value) return value;
  const entries = Object.entries(value as Record<string, unknown>).map(([key, field]) => [key, resolveMediaDeep(field, depth + 1)] as const);
  return (entries.some(([key, field]) => field !== (value as Record<string, unknown>)[key]) ? Object.fromEntries(entries) : value) as T;
}

/** The code that adds `entry` to a page: a literal `zen-media:` source on a builder page, platformMedia elsewhere. */
export function photoCode(entry: LibraryPhoto, builderPage: boolean): string {
  return builderPage
    ? `<Image src="${MEDIA_PREFIX}${entry.key}" alt=${JSON.stringify(entry.photo.alt)} ratio="4:3" />`
    : `<Image src={platformMedia.${entry.path}.src} alt={platformMedia.${entry.path}.alt} ratio="4:3" />`;
}
