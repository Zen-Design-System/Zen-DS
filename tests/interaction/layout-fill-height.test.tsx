/**
 * Backlog (Resize follow-ups, 2026-10-03): a column Stack with height="fill" whose own parent gives it no height collapsed
 * its Fill (or fillChildren) children to 0 — flex: 1 1 0 with min-height: 0. The 0% basis resolves to the content
 * there, and still shares a column that has a height.
 */
import { describe, expect, it } from "vitest";
import { render } from "vitest-browser-react";
import { Box, Stack, Text } from "../../src/index";

const height = (id: string) => document.querySelector(`[data-probe="${id}"]`)!.getBoundingClientRect().height;

describe("Layout fill height", () => {
  it("keeps the content height when nothing above gives the column a height", async () => {
    await render(<div>
      <div><Stack height="fill" direction="column" fillChildren><Box data-probe="kid"><Text>One</Text></Box><Box><Text>Two</Text></Box></Stack></div>
      <div><Stack height="fill" direction="column"><Stack height="fill" direction="column" data-probe="fill" style={{ overflow: "auto" }}><Text>One</Text></Stack></Stack></div>
    </div>);
    expect(height("kid")).toBeGreaterThan(0);
    expect(height("fill")).toBeGreaterThan(0);
  });

  it("still shares a column that has a height", async () => {
    await render(<div style={{ height: 300 }}><Stack height="fill" direction="column" fillChildren><Box data-probe="a"><Text>One</Text></Box><Box data-probe="b"><Text>Two</Text></Box></Stack></div>);
    expect(height("a")).toBeGreaterThan(100);
    expect(height("a")).toBe(height("b"));
  });
});
