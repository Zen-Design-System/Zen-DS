/**
 * Zen Studio's page store (src/platform/studio/builder/store/pageStore.ts) keeps a page's document when reads of its
 * record cross a write. A page opening reads its record from two places (the canvas, ensurePageDoc); the first read's
 * caller gives the page its document (setPageDoc) before the second read answers, and that stale answer used to put the
 * record back without it: the next sync stored that, and the page's layer ids changed under its selection (E2E NO-06,
 * 2026-10-26).
 */
import { describe, expect, it } from "vitest";
import { cachedPage, getPage, listPages, setPageDoc } from "../../src/platform/studio/builder/store/pageStore";

/** Stores a page record the way another session left it: in IndexedDB only, never read by this store. */
const storeRecord = (record: { id: string; title: string; text: string; createdAt: number; updatedAt: number }) => new Promise<void>((resolve, reject) => {
  const opening = indexedDB.open("zen-studio-builder");
  opening.onerror = () => reject(opening.error);
  opening.onsuccess = () => {
    const transaction = opening.result.transaction("pages", "readwrite");
    transaction.objectStore("pages").put(record);
    transaction.oncomplete = () => { opening.result.close(); resolve(); };
    transaction.onerror = () => reject(transaction.error);
  };
});

describe("Studio page store: a stale read never takes a page's document away", () => {
  it("keeps the document setPageDoc gave the page while a second read of it was on its way", async () => {
    await listPages(); // the store opens its database (with its object stores) first
    const id = `read-race-${Date.now().toString(36)}`;
    const text = '// @zen-page {"format":1,"title":"Read race"}\n';
    await storeRecord({ id, title: "Read race", text, createdAt: 1, updatedAt: 1 });
    const doc = { board: { kind: "element", name: "Board", children: [] } } as never;
    const first = getPage(id);
    const second = getPage(id);
    const page = await first;
    expect(page?.text).toBe(text);
    // What ensurePageDoc does with the first answer, before the second one comes back.
    const given = setPageDoc(id, text, doc);
    await second;
    expect(await given).toBe(true);
    expect(cachedPage(id)?.doc).toBe(doc);
    expect((await getPage(id))?.doc).toBe(doc);
  });
});
