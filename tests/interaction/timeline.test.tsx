/**
 * Timeline (Figma ❖ Timeline 16121:9): the activity feed groups newest first by day with no connector after each day's
 * last item; milestones take Done / Current / Upcoming from today; the Gantt places bars by date, collapses a group,
 * and draws today's line.
 */
import { describe, expect, it, vi } from "vitest";
import { render } from "vitest-browser-react";
import { TimelineActivity, TimelineGantt, TimelineMilestones, ZenProvider } from "../../src/index";

describe("TimelineActivity", () => {
  it("lists days newest first with Today / Yesterday kickers; a day's last item has no connector", async () => {
    const entries = [
      { id: "old", at: "2026-09-29T09:00", actor: "Bao", title: "created the project" },
      { id: "new", at: "2026-09-30T10:42", actor: "Maya", title: "approved the request" },
      { id: "mid", at: "2026-09-30T08:00", actor: "Linh", title: "commented" },
    ];
    const screen = await render(<ZenProvider><TimelineActivity entries={entries} today="2026-09-30" /></ZenProvider>);
    await expect.element(screen.getByRole("region", { name: "Today" })).toBeVisible();
    await expect.element(screen.getByRole("region", { name: "Yesterday" })).toBeVisible();
    const titles = [...document.querySelectorAll(".zen-timeline-item__title")].map((node) => node.textContent);
    expect(titles).toEqual(["Maya approved the request", "Linh commented", "Bao created the project"]);
    expect(document.querySelectorAll(".zen-timeline-item__connector")).toHaveLength(1);
  });
});

describe("TimelineMilestones", () => {
  it("marks milestones before today Done, the next Current, the rest Upcoming", async () => {
    const milestones = [
      { id: "a", date: "2026-08-03", title: "Kickoff" },
      { id: "b", date: "2026-10-23", title: "Beta", description: "Invite 40 clients" },
      { id: "c", date: "2026-11-16", title: "Launch" },
    ];
    await render(<ZenProvider><TimelineMilestones device="desktop" milestones={milestones} today="2026-09-30" /></ZenProvider>);
    expect([...document.querySelectorAll(".zen-timeline-milestone")].map((node) => node.getAttribute("data-status"))).toEqual(["done", "current", "upcoming"]);
    expect(document.querySelector('[aria-current="step"]')?.textContent).toContain("Invite 40 clients");
  });
});

describe("TimelineGantt", () => {
  it("places bars by date, collapses a group and draws today's line", async () => {
    const onTaskClick = vi.fn();
    const groups = [{ id: "design", name: "Design", tasks: [
      { id: "wire", name: "Wireframes", start: "2026-09-14", end: "2026-09-26" },
      { id: "signoff", name: "Sign-off", start: "2026-10-09", kind: "milestone" as const },
    ] }];
    const screen = await render(<ZenProvider><TimelineGantt device="desktop" groups={groups} start="2026-08-31" today="2026-09-30" aria-label="Plan" onTaskClick={onTaskClick} /></ZenProvider>);
    const wire = screen.getByRole("button", { name: /^Wireframes/ });
    // Sep 14 is 14 days after Aug 31; 12 days long.
    expect([(wire.element() as HTMLElement).style.getPropertyValue("--zen-timeline-from"), (wire.element() as HTMLElement).style.getPropertyValue("--zen-timeline-span")]).toEqual(["14", "12"]);
    await wire.click();
    expect(onTaskClick.mock.calls[0][0].id).toBe("wire");
    expect(document.querySelectorAll(".zen-timeline-gantt .zen-calendar-now")).toHaveLength(1);
    const toggle = screen.getByRole("button", { name: "Design" });
    await expect.element(toggle).toHaveAttribute("aria-expanded", "true");
    await toggle.click();
    await expect.element(toggle).toHaveAttribute("aria-expanded", "false");
    expect(document.querySelectorAll(".zen-timeline-gantt__row")).toHaveLength(1);
  });
});
