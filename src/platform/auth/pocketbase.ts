import PocketBase, { type RecordModel } from "pocketbase";
import { useSyncExternalStore } from "react";

/**
 * Sign-in for the docs platform and Zen Studio (never imported by the library). The PocketBase `users` auth collection
 * has Google OAuth2 enabled; the SDK keeps the session in localStorage ("pocketbase_auth"), so a reload stays signed in.
 * `VITE_POCKETBASE_URL` points a build at another instance.
 */
export const POCKETBASE_URL: string = import.meta.env.VITE_POCKETBASE_URL ?? "https://flrhpbeu1gj0js1.fbjc.pocketbasecloud.com";

export const pb = new PocketBase(POCKETBASE_URL);

export type AuthUser = { id: string; email: string; name: string; avatarUrl?: string };

function toUser(record: RecordModel | null): AuthUser | null {
  if (!record || !pb.authStore.isValid) return null;
  const avatar = typeof record.avatar === "string" && record.avatar ? pb.files.getURL(record, record.avatar, { thumb: "100x100" }) : undefined;
  return { id: record.id, email: String(record.email ?? ""), name: String(record.name || record.email || ""), avatarUrl: avatar };
}

// useSyncExternalStore needs a stable snapshot: rebuild it only when the auth store changes.
let snapshot = toUser(pb.authStore.record);
const listeners = new Set<() => void>();
pb.authStore.onChange(() => {
  snapshot = toUser(pb.authStore.record);
  listeners.forEach((listener) => listener());
});

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}

/** The signed-in user, or null. */
export function useAuthUser(): AuthUser | null {
  return useSyncExternalStore(subscribe, () => snapshot);
}

/**
 * Checks a stored session against the server once at start-up (a deleted user or a revoked token signs out). A network
 * failure keeps the stored session: being offline is not being signed out.
 */
export async function refreshSession(): Promise<void> {
  if (!pb.authStore.isValid) return;
  try {
    await pb.collection("users").authRefresh();
  } catch (error) {
    const status = (error as { status?: number }).status;
    if (status === 401 || status === 403 || status === 404) pb.authStore.clear();
  }
}

/** Opens Google's consent screen in a popup; resolves when PocketBase has signed the user in. Call it from a click. */
export async function signInWithGoogle(): Promise<void> {
  await pb.collection("users").authWithOAuth2({ provider: "google" });
}

export function signOut(): void {
  pb.authStore.clear();
}
