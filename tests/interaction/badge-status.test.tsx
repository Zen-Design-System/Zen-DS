/**
 * BadgeStatus (Figma Badge-Status 16932:195) in running text: a DescriptionList value or a sentence is a line box, and a
 * workflow step there takes no more height than the Badge it replaced (visual diff of the 2026-10-23 migration: the
 * 20px ring as the inline-flex baseline made the row 29px for a 28px badge).
 */
import { describe, expect, it } from "vitest";
import { render } from "vitest-browser-react";
import { Badge, BadgeStatus, ZenProvider } from "../../src/index";

describe("BadgeStatus in a line of text", () => {
  it("makes the line as tall as a Badge's, at both sizes", async () => {
    await render(
      <ZenProvider>
        <dl>
          <dd data-probe="badge-md"><Badge theme="blue" background="subtle">In progress</Badge></dd>
          <dd data-probe="status-md"><BadgeStatus status="in-progress">In progress</BadgeStatus></dd>
          <dd data-probe="badge-sm"><Badge size="sm" theme="blue" background="subtle">In progress</Badge></dd>
          <dd data-probe="status-sm"><BadgeStatus size="sm" status="in-progress">In progress</BadgeStatus></dd>
        </dl>
      </ZenProvider>,
    );
    const height = (probe: string) => document.querySelector<HTMLElement>(`[data-probe="${probe}"]`)!.getBoundingClientRect().height;
    const badge = (probe: string) => document.querySelector<HTMLElement>(`[data-probe="${probe}"] > *`)!.getBoundingClientRect().height;
    expect(height("status-md")).toBe(height("badge-md"));
    expect(height("status-md")).toBe(badge("status-md"));
    expect(height("status-sm")).toBe(height("badge-sm"));
  });
});
