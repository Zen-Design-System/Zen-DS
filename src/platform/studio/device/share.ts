import { authorized } from "../api";
import { assetBlob, assetIdsOf } from "../builder/assets/uploads";
import type { SharedPage, SharedPhoto } from "./sharedPage";

/*
 * Open on phone, the Studio's side: Play hands its page to the dev server (POST /__zen-studio/device/share), which keeps
 * it under a share token and answers the links a phone on the same Wi-Fi opens (tools/studio/device-share.mjs).
 */

/** The links of a share: `urls` on this computer's network addresses (the first is the QR code's), `local` on this one. */
export type ShareResult = { ok: true; urls: string[]; local: string; expires: number; warning?: string } | { ok: false; error: string };

/** The page's uploaded photos travel with it, up to this many base64 characters (the server takes 6 MB). */
const PHOTO_BUDGET = 6 * 1024 * 1024;

async function base64Of(blob: Blob): Promise<string> {
  const bytes = new Uint8Array(await blob.arrayBuffer());
  let binary = "";
  for (let index = 0; index < bytes.length; index += 0x8000) binary += String.fromCharCode(...bytes.subarray(index, index + 0x8000));
  return btoa(binary);
}

/** Shares `page` (its photos read from this browser) and answers its links, or why it could not. */
export async function sharePage(page: Omit<SharedPage, "uploads">): Promise<ShareResult> {
  const uploads: SharedPhoto[] = [];
  let budget = PHOTO_BUDGET;
  let left = 0;
  for (const id of assetIdsOf(page.text)) {
    const blob = await assetBlob(id).catch(() => null);
    if (!blob) continue;
    const data = await base64Of(blob);
    if (data.length > budget) { left += 1; continue; }
    budget -= data.length;
    uploads.push({ id, name: id, type: blob.type || "image/png", data });
  }
  const reply = await authorized<ShareResult>("/device/share", { ...page, uploads }, 30_000);
  if (!reply) return { ok: false, error: "The Zen Studio dev server did not answer" };
  const body = reply.body as ShareResult | { ok: false; error?: string };
  if (reply.status !== 200 || !body.ok) return { ok: false, error: (body as { error?: string }).error ?? "The page could not be shared" };
  return left ? { ...body, warning: [body.warning, `${left} photo${left > 1 ? "s are" : " is"} too large to share`].filter(Boolean).join(". ") } : body;
}
