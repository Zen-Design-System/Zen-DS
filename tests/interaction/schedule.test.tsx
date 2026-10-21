/**
 * Schedule (Figma ❖ Schedule 16121:6): Resource-Grid bars on the scale and the now line, the Slot-Picker's radio group,
 * the Itinerary's statuses from now, and the Day-Planner's hour that grows so cards never overlap.
 */
import { describe, expect, it, vi } from "vitest";
import { render } from "vitest-browser-react";
import { userEvent } from "vitest/browser";
import { ScheduleDayPlanner, ScheduleItinerary, ScheduleResourceGrid, ScheduleSlotPicker, ZenProvider } from "../../src/index";

const resources = [{ id: "alex", name: "Alex Duong", meta: "Designer" }, { id: "lotus", name: "Room 2 · Lotus", meta: "8 seats", kind: "room" as const }];
const bookings = [
  { id: "q4", resourceId: "alex", title: "Q4 planning", start: "2026-09-30T10:30", end: "2026-09-30T12:00", color: "blue" as const },
  { id: "early", resourceId: "lotus", title: "Night shift", start: "2026-09-30T06:00", end: "2026-09-30T10:00" },
];

describe("ScheduleResourceGrid", () => {
  it("places bars on the scale, keeps a bar that starts early unclipped, and draws the now line", async () => {
    const onBookingClick = vi.fn();
    const screen = await render(<ZenProvider><ScheduleResourceGrid device="desktop" resources={resources} bookings={bookings} date="2026-09-30" now="2026-09-30T13:15" onBookingClick={onBookingClick} /></ZenProvider>);
    await expect.element(screen.getByRole("table")).toBeVisible();
    expect(screen.getByRole("rowheader").elements()).toHaveLength(2);
    const q4 = screen.getByRole("button", { name: /^Q4 planning/ });
    const at = (element: Element) => [(element as HTMLElement).style.getPropertyValue("--zen-schedule-from"), (element as HTMLElement).style.getPropertyValue("--zen-schedule-span")];
    expect(at(q4.element())).toEqual(["1.5", "1.5"]);
    // 06:00–10:00 on a 09:00 scale: starts 3 columns before it (scrolls in), never squeezed to the edge.
    expect(at(screen.getByRole("button", { name: /^Night shift/ }).element())[0]).toBe("-3");
    expect(document.querySelectorAll(".zen-schedule-grid .zen-calendar-now")).toHaveLength(1);
    await q4.click();
    expect(onBookingClick.mock.calls[0][0].id).toBe("q4");
  });
});

describe("ScheduleSlotPicker", () => {
  it("is one radio group: picks a time, skips taken ones with the arrows, names each with its day", async () => {
    const onValueChange = vi.fn();
    const slots = [
      { id: "a", start: "2026-09-30T09:00" },
      { id: "b", start: "2026-09-30T10:00", disabled: true },
      { id: "c", start: "2026-09-30T11:00" },
    ];
    const screen = await render(<ZenProvider><ScheduleSlotPicker device="desktop" slots={slots} today="2026-09-30" onValueChange={onValueChange} aria-label="Review times" /></ZenProvider>);
    await expect.element(screen.getByRole("radiogroup", { name: "Review times" })).toBeVisible();
    await expect.element(screen.getByRole("radio", { name: "Wednesday, September 30, 2026, 10:00, unavailable" })).toBeDisabled();
    await screen.getByRole("radio", { name: "Wednesday, September 30, 2026, 09:00" }).click();
    expect(onValueChange.mock.calls[0][0]).toBe("a");
    await userEvent.keyboard("{ArrowDown}");
    expect(onValueChange.mock.calls[1][0]).toBe("c");
  });
});

describe("ScheduleItinerary", () => {
  it("marks stops past, now and upcoming from now; the last has no connector", async () => {
    const stops = [
      { id: "a", title: "Keynote", start: "2026-09-30T09:00", end: "2026-09-30T10:00" },
      { id: "b", title: "Workshop", start: "2026-09-30T13:00", end: "2026-09-30T14:30" },
      { id: "c", title: "Closing", start: "2026-09-30T15:00", end: "2026-09-30T15:45" },
    ];
    await render(<ZenProvider><ScheduleItinerary title="Design Day" stops={stops} now="2026-09-30T13:15" /></ZenProvider>);
    const states = [...document.querySelectorAll(".zen-schedule-stop")].map((stop) => stop.getAttribute("data-status"));
    expect(states).toEqual(["past", "now", "upcoming"]);
    expect(document.querySelector('[aria-current="step"]')?.textContent).toContain("Workshop");
    expect(document.querySelectorAll(".zen-schedule-stop__connector")).toHaveLength(2);
  });
});

describe("ScheduleDayPlanner", () => {
  it("grows the hour so a long card never reaches the next one, and marks the current hour", async () => {
    const events = [
      { id: "a", title: "A long first card with a note", start: "2026-09-30T09:00", end: "2026-09-30T09:30", note: "Two lines of note so the card is taller than an hour of 64px." },
      { id: "b", title: "Next", start: "2026-09-30T10:00", end: "2026-09-30T11:00" },
    ];
    await render(<ZenProvider><div style={{ width: 420 }}><ScheduleDayPlanner device="desktop" events={events} defaultValue="2026-09-30" now="2026-09-30T13:15" /></div></ZenProvider>);
    const [first, second] = [...document.querySelectorAll<HTMLElement>(".zen-schedule-planner__card")];
    await expect.poll(() => second.getBoundingClientRect().top - first.getBoundingClientRect().bottom).toBeGreaterThanOrEqual(7);
    expect(document.querySelector(".zen-schedule-hour[data-now]")?.textContent).toBe("13:00");
  });
});
