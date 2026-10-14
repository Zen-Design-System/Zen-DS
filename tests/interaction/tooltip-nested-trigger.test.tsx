/**
 * Harness finding (2026-10-08): `tooltip/focusable-trigger` read only the first tag, and Tooltip put aria-describedby on
 * its direct child only. A Button inside a wrapper now opens the tooltip on focus and is described by it.
 */
import { describe, expect, it } from "vitest";
import { render } from "vitest-browser-react";
import { userEvent } from "vitest/browser";
import { Box, Button, Tooltip } from "../../src/index";

describe("Tooltip with a wrapped trigger", () => {
  it("describes the focused control inside the wrapper", async () => {
    const screen = await render(<><button type="button">Before</button><Tooltip content="Archive (E)"><Box><Button>Archive</Button></Box></Tooltip></>);
    screen.getByRole("button", { name: "Before" }).element().focus();
    await userEvent.keyboard("{Tab}");
    const tip = screen.getByRole("tooltip");
    await expect.element(tip).toBeInTheDocument();
    const archive = screen.getByRole("button", { name: "Archive" }).element();
    expect(archive.getAttribute("aria-describedby")).toBe(tip.element().id);
    await userEvent.keyboard("{Tab}");
    await expect.poll(() => archive.getAttribute("aria-describedby")).toBeNull();
  });
});
