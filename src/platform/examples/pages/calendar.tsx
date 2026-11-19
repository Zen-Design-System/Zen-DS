/* Calendar examples: Đìzai Studio's calendars around Wednesday 30 September 2026. Each example is its own file in
   calendar/ (P2b, plan docs/research/code-languages-plan-2026-10-03.md §11): the card renders its default export and
   shows its text as the snippet. */
import { PlatformPhoneApp } from "../../PlatformPhone";
import type { PlatformPage } from "../../PlatformExamples";
import { keepOnHotUpdate } from "../../hotData";
import { exampleCode } from "../exampleCode";
import type { ExampleDef } from "../types";
import TeamCalendar from "./calendar/team-calendar.example";
import teamCalendar from "./calendar/team-calendar.example.tsx?raw";
import EventDetails from "./calendar/event-details.example";
import eventDetails from "./calendar/event-details.example.tsx?raw";
import EmptyWeek from "./calendar/empty-week.example";
import emptyWeek from "./calendar/empty-week.example.tsx?raw";
import DayPlanner from "./calendar/day-planner.example";
import dayPlanner from "./calendar/day-planner.example.tsx?raw";
import PhoneCalendar from "./calendar/on-a-phone.example";
import onAPhone from "./calendar/on-a-phone.example.tsx?raw";
import KeyboardMonth from "./calendar/keyboard-and-screen-readers.example";
import keyboardAndScreenReaders from "./calendar/keyboard-and-screen-readers.example.tsx?raw";

export const page: PlatformPage = "calendar";

export const examples: ExampleDef[] = keepOnHotUpdate(import.meta.hot, "examples", [
  {
    title: "Team calendar",
    description: "The Toolbar moves the period (Today, previous, next) and switches the view under it. A busy day shows two events and +N more, which opens that day.",
    wide: true,
    render: () => <TeamCalendar />,
    code: exampleCode(teamCalendar),
  },
  {
    title: "Event details",
    description: "Overlapping meetings share the column and the now line crosses today. Pressing an event selects it (its block turns Solid) and shows its details beside the grid; long titles truncate.",
    wide: true,
    render: () => <EventDetails />,
    code: exampleCode(eventDetails),
  },
  {
    title: "Empty week",
    description: "An agenda range with no events shows an Empty-State instead of a blank box, with the action that fills it.",
    render: () => <EmptyWeek />,
    code: exampleCode(emptyWeek),
  },
  {
    title: "Day planner",
    description: "Week-Strip tiles pick a single day and the agenda lists it. The selected tile is a bordered Surface, readable on any canvas.",
    render: () => <DayPlanner />,
    code: exampleCode(dayPlanner),
  },
  {
    title: "On a phone",
    description: "The mobile Toolbar puts the view switch full width under a short title (Sep 2026). Month shows dots and lists the tapped day; Week is the 3-Day grid, Day adds the Week-Strip.",
    render: () => <PlatformPhoneApp label="Calendar" app={PhoneCalendar} />,
    code: exampleCode(onAPhone),
  },
  {
    title: "Keyboard and screen readers",
    wide: true,
    description: "One day of the month is in the tab order; the arrow keys move a day or a week and Home / End jump to the week's ends. Each date is named with its full date and event count, and today is announced as the current date.",
    render: () => <KeyboardMonth />,
    code: exampleCode(keyboardAndScreenReaders),
  },
]);
