/** Backlog (2026-10-07 sweep, P2): plural() was English-only. Vietnamese nouns do not inflect. */
import { describe, expect, it } from "vitest";
import { plural } from "../../src/index";

describe("plural", () => {
  it("inflects English and keeps the Vietnamese noun", () => {
    expect(plural(1, "file")).toBe("1 file");
    expect(plural(1284, "file")).toBe("1,284 files");
    expect(plural(2, "person", "people")).toBe("2 people");
    expect(plural(1, "tệp", undefined, "vi")).toBe("1 tệp");
    expect(plural(1284, "tệp", undefined, "vi")).toBe("1.284 tệp");
  });
});
