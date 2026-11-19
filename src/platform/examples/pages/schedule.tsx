/* Schedule examples: Đìzai Studio on Wednesday 30 September 2026, 13:15 — who is where today and this week, the Design
   Day programme, booking a review time (on a page and on a phone) and Alex's day planner.
   Each example is its own file in schedule/ (P2b, plan docs/research/code-languages-plan-2026-10-03.md §11): the card
   renders its default export and shows its text as the snippet. */
import { PlatformPhoneApp } from "../../PlatformPhone";
import type { PlatformPage } from "../../PlatformExamples";
import { keepOnHotUpdate } from "../../hotData";
import { exampleCode } from "../exampleCode";
import type { ExampleDef } from "../types";
import TeamToday from "./schedule/team-today.example";
import teamToday from "./schedule/team-today.example.tsx?raw";
import TeamWeek from "./schedule/team-week.example";
import teamWeek from "./schedule/team-week.example.tsx?raw";
import EventProgramme from "./schedule/event-programme.example";
import eventProgramme from "./schedule/event-programme.example.tsx?raw";
import BookATime from "./schedule/book-a-time.example";
import bookATime from "./schedule/book-a-time.example.tsx?raw";
import PhoneBooking from "./schedule/book-on-a-phone.example";
import phoneBooking from "./schedule/book-on-a-phone.example.tsx?raw";
import MyDay from "./schedule/my-day.example";
import myDay from "./schedule/my-day.example.tsx?raw";

export const page: PlatformPage = "schedule";

export const examples: ExampleDef[] = keepOnHotUpdate(import.meta.hot, "examples", [
  {
    title: "Team today",
    description: "People and rooms beside the day's hours; bookings sit at their times and the now line crosses the tracks. Pressing a booking selects it (Solid) and names its owner.",
    wide: true,
    render: () => <TeamToday />,
    code: exampleCode(teamToday),
  },
  {
    title: "Team week",
    description: "The Days scale shows leave and sprints across a week, today in Accent. A bar that starts before Monday scrolls in; it is never squeezed to the edge.",
    wide: true,
    render: () => <TeamWeek />,
    code: exampleCode(teamWeek),
  },
  {
    title: "Event programme",
    description: "Stops that ended are Past, the running one is Now (announced as the current step), the rest Upcoming. The last stop has no connector.",
    render: () => <EventProgramme />,
    code: exampleCode(eventProgramme),
  },
  {
    title: "Book a time",
    description: "One radio group across five days: the arrow keys move between times, taken ones are disabled and struck through. The confirm action stays in the page or sheet footer.",
    wide: true,
    render: () => <BookATime />,
    code: exampleCode(bookATime),
  },
  {
    title: "Book on a phone",
    description: "A week strip picks the day; its times group into Morning and Afternoon, three to a row with 44px targets, and the footer books the chosen one.",
    render: () => <PlatformPhoneApp label="Book a review" app={PhoneBooking} />,
    code: exampleCode(phoneBooking),
  },
  {
    title: "My day",
    description: "The day planner places cards at their start time and grows the hour so long cards never overlap; the current hour is Now. Cards are bordered, so the planner reads on any canvas.",
    render: () => <MyDay />,
    code: exampleCode(myDay),
  },
]);
