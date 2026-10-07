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
  return byKey.get(value.slice(MEDIA_PREFIX.length))?.photo.src ?? value;
}

/** The code that adds `entry` to a page: a literal `zen-media:` source on a builder page, platformMedia elsewhere. */
export function photoCode(entry: LibraryPhoto, builderPage: boolean): string {
  return builderPage
    ? `<Image src="${MEDIA_PREFIX}${entry.key}" alt=${JSON.stringify(entry.photo.alt)} ratio="4:3" />`
    : `<Image src={platformMedia.${entry.path}.src} alt={platformMedia.${entry.path}.alt} ratio="4:3" />`;
}
