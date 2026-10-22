import type { StudioPreviewSettings } from "../types";
import { STUDIO_API } from "../types";

/*
 * A page shared from Play for a phone (Open on phone, tools/studio/device-share.mjs): what the Studio sends and what the
 * phone's page (DevicePlay.tsx) reads back by the share's token. Kept apart from the Studio's API client, so the phone
 * loads none of the Studio.
 */

/** An uploaded photo the page names (`zen-asset:<id>`), its bytes as base64. */
export type SharedPhoto = { id: string; name: string; type: string; data: string };
export type SharedPage = {
  title: string;
  text: string;
  /** The Screen Play was on. */
  start: string | null;
  modes: Partial<StudioPreviewSettings>;
  brand: string;
  /** The project's theme (its `[data-brand="p-…"]` mode), when the page is in a project. */
  themeCss: string;
  /** The page's id and the project's other pages by id (their text): instances of their components draw on the phone. */
  id?: string;
  pages?: Record<string, string>;
  uploads: SharedPhoto[];
};

/** The shared page by its token, or why not. */
export async function readSharedPage(token: string): Promise<(SharedPage & { expires: number }) | { error: string }> {
  try {
    const response = await fetch(`${STUDIO_API}/device/page?t=${encodeURIComponent(token)}`, { cache: "no-store" });
    const body = (await response.json()) as (SharedPage & { ok: true; expires: number }) | { ok: false; error?: string };
    if (!response.ok || !body.ok) return { error: (body as { error?: string }).error ?? "This shared page cannot be opened" };
    return body;
  } catch {
    return { error: "The computer running Zen Studio did not answer. Check that it is on and on the same Wi-Fi." };
  }
}

/** A photo's bytes back as a Blob. */
export function photoBlob(photo: SharedPhoto): Blob {
  const binary = atob(photo.data);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
  return new Blob([bytes], { type: photo.type });
}
