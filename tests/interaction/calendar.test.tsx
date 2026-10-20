/**
 * Calendar (Figma ❖ Calendar 16121:3): the month's day keys (one date in the tab order, arrows a day / a week, Home / End
 * the week's ends), selection, "+N more", overlapping Time-Grid events in lanes, the now line only today, the grid's
 * week count, and the Agenda's empty state.
 */
import { describe, expect, it, vi } from "vitest";
import { render } from "vitest-browser-react";
import { userEvent } from "vitest/browser";
import { CalendarAgenda, CalendarMonth, CalendarTimeGrid, CalendarToolbar, CalendarWeekStrip, ZenProvider, type CalendarEventData } from "../../src/index";
import { layoutDay, monthWeeks, readEvents, toDate } from "../../src/components/Calendar/calendarDates";

const today = new Date(2026, 8, 30);
const at = (day: number, hour: number, minute = 0) => new Date(2026, 8, day, hour, minute);
const events: CalendarEventData[] = [
  { id: "a", title: "Standup", start: at(15, 9), end: at(15, 9, 30) },
  { id: "b", title: "Review", start: at(15, 10), end: at(15, 11), color: "violet" },
  { id: "c", title: "Planning", start: at(15, 10, 30), end: at(15, 12), color: "blue" },
  { id: "d", title: "Lunch", start: at(15, 12), end: at(15, 13), color: "green" },
  { id: "e", title: "Retro", start: at(15, 16), end: at(15, 17), color: "teal" },
];
const name = (day: number, count = 0) => `${new Intl.DateTimeFormat("en", { weekday: "long", year: "numeric", month: "long", day: "numeric" }).format(new Date(2026, 8, day))}${count ? `, ${count} events` : ""}`;

describe("Calendar dates", () => {
  it("draws five weeks, or six when the month spans six (Monday first)", () => {
    expect(monthWeeks(new Date(2026, 8, 1))).toHaveLength(5); // September 2026 starts on a Tuesday
    expect(monthWeeks(new Date(2026, 10, 1))).toHaveLength(6); // November 2026 starts on a Sunday
    expect(monthWeeks(new Date(2026, 8, 1))[0][0].getDate()).toBe(31); // Monday 31 August
  });

  it("reads ISO days and minutes in local time", () => {
    expect(toDate("2026-09-30").getTime()).toBe(new Date(2026, 8, 30).getTime());
    expect(toDate("2026-09-30T09:30").getTime()).toBe(new Date(2026, 8, 30, 9, 30).getTime());
  });

  it("puts overlapping events in lanes that share the column", () => {
    const placed = layoutDay(readEvents(events), new Date(2026, 8, 15));
    const lanes = Object.fromEntries(placed.map((item) => [item.event.id, [item.lane, item.lanes]]));
    // Lunch starts as Planning ends: it overlaps nothing and takes the whole column.
    expect(lanes).toEqual({ a: [0, 1], b: [0, 2], c: [1, 2], d: [0, 1], e: [0, 1] });
  });
});

describe("CalendarMonth", () => {
  it("keeps one date in the tab order and moves with the arrows, Home and End", async () => {
    const screen = await render(<ZenProvider><CalendarMonth device="desktop" month={today} defaultValue={new Date(2026, 8, 16)} today={today} events={events} /></ZenProvider>);
    const date = (day: number, count = 0) => screen.getByRole("button", { name: name(day, count), exact: true });
    await expect.element(date(16)).toHaveAttribute("tabindex", "0");
    await expect.element(date(17)).toHaveAttribute("tabindex", "-1");
    await expect.element(date(16)).toHaveAttribute("aria-pressed", "true");
    await expect.element(date(30)).toHaveAttribute("aria-current", "date");
    (date(16).element() as HTMLElement).focus();
    await userEvent.keyboard("{ArrowLeft}");
    expect(document.activeElement).toBe(date(15, 5).element());
    await userEvent.keyboard("{ArrowDown}");
    expect(document.activeElement).toBe(date(22).element());
    await userEvent.keyboard("{Home}");
    expect(document.activeElement).toBe(date(21).element());
    await userEvent.keyboard("{End}");
    expect(document.activeElement).toBe(date(27).element());
  });

  it("selects a day, shows two chips and +N more on a busy day", async () => {
    const onValueChange = vi.fn();
    const onMoreClick = vi.fn();
    const screen = await render(<ZenProvider><CalendarMonth device="desktop" month={today} today={today} events={events} onValueChange={onValueChange} onMoreClick={onMoreClick} /></ZenProvider>);
    await screen.getByRole("button", { name: name(15, 5), exact: true }).click();
    expect((onValueChange.mock.calls[0][0] as Date).getDate()).toBe(15);
    await expect.element(screen.getByText("Standup")).toBeVisible();
    await expect.element(screen.getByText("Planning")).not.toBeInTheDocument();
    await screen.getByRole("button", { name: "Show 3 more events" }).click();
    expect((onMoreClick.mock.calls[0][0] as Date).getDate()).toBe(15);
  });
});

describe("CalendarTimeGrid", () => {
  it("opens an event, marks it selected, and draws the now line only in today's column", async () => {
    const onEventClick = vi.fn();
    const screen = await render(<ZenProvider><CalendarTimeGrid device="desktop" view="week" date={new Date(2026, 8, 15)} events={events} now={at(15, 10, 15)} selectedEventId="b" onEventClick={onEventClick} /></ZenProvider>);
    await screen.getByRole("button", { name: /^Planning/ }).click();
    expect(onEventClick.mock.calls[0][0].id).toBe("c");
    await expect.element(screen.getByRole("button", { name: /^Review/ })).toHaveAttribute("data-selected", "true");
    expect(document.querySelectorAll(".zen-calendar-now")).toHaveLength(1);
    expect(document.querySelector(".zen-calendar-now")?.closest("[aria-label]")?.getAttribute("aria-label")).toBe(name(15));
  });
});

describe("CalendarWeekStrip and CalendarToolbar", () => {
  it("picks a day from the strip and moves with the arrows", async () => {
    const onValueChange = vi.fn();
    const screen = await render(<ZenProvider><CalendarWeekStrip device="desktop" variant="tile" defaultValue={today} today={today} onValueChange={onValueChange} aria-label="Pick a day" /></ZenProvider>);
    const wednesday = screen.getByRole("button", { name: "Wednesday, September 30, 2026" });
    await expect.element(wednesday).toHaveAttribute("aria-pressed", "true");
    (wednesday.element() as HTMLElement).focus();
    await userEvent.keyboard("{ArrowRight}{Enter}");
    expect((onValueChange.mock.calls[0][0] as Date).getDate()).toBe(1);
  });

  it("names the arrows by the view and announces the period", async () => {
    const onNext = vi.fn();
    const screen = await render(<ZenProvider><CalendarToolbar device="desktop" date={today} view="week" onViewChange={() => undefined} onPrevious={() => undefined} onNext={onNext} onToday={() => undefined} /></ZenProvider>);
    await screen.getByRole("button", { name: "Next week" }).click();
    expect(onNext).toHaveBeenCalledTimes(1);
    await expect.element(screen.getByRole("heading", { level: 2 })).toHaveAttribute("aria-live", "polite");
  });
});

describe("CalendarAgenda", () => {
  it("lists days with events and says so when the range is empty", async () => {
    const screen = await render(<ZenProvider><CalendarAgenda device="desktop" from={new Date(2026, 8, 14)} days={7} events={events} today={today} /></ZenProvider>);
    await expect.element(screen.getByRole("group", { name: name(15) })).toBeVisible();
    expect(document.querySelectorAll(".zen-calendar-agenda-item")).toHaveLength(5);
    await screen.rerender(<ZenProvider><CalendarAgenda device="desktop" from={new Date(2026, 9, 5)} days={7} events={events} today={today} /></ZenProvider>);
    await expect.element(screen.getByText("No events")).toBeVisible();
  });
});
