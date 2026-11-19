/* Bottom Navigation examples. Each example is its own file in bottom-navigation/ (P2b, plan
   docs/research/code-languages-plan-2026-10-03.md §11): the card renders its default export, a phone app on the device,
   and shows its text as the snippet. */
import { PlatformPhone, PlatformPhoneApp } from "../../PlatformPhone";
import type { PlatformPage } from "../../PlatformExamples";
import { keepOnHotUpdate } from "../../hotData";
import { exampleCode } from "../exampleCode";
import type { ExampleDef } from "../types";
import RootDestinations from "./bottom-navigation/root-destinations.example";
import rootDestinations from "./bottom-navigation/root-destinations.example.tsx?raw";
import ActionInTheBar from "./bottom-navigation/action-in-the-bar.example";
import actionInTheBar from "./bottom-navigation/action-in-the-bar.example.tsx?raw";
import FloatingWithCreate from "./bottom-navigation/floating-with-create.example";
import floatingWithCreate from "./bottom-navigation/floating-with-create.example.tsx?raw";
import GlassOverPhotos from "./bottom-navigation/glass-over-photos.example";
import glassOverPhotos from "./bottom-navigation/glass-over-photos.example.tsx?raw";
import LabelsInABrandApp from "./bottom-navigation/labels-in-a-brand-app.example";
import labelsInABrandApp from "./bottom-navigation/labels-in-a-brand-app.example.tsx?raw";

export const page: PlatformPage = "bottom-navigation";

export const examples: ExampleDef[] = keepOnHotUpdate(import.meta.hot, "examples", [
  {
    title: "Root destinations",
    description: "Four root screens, one tap apart: the selected destination switches to its solid glyph, each screen's large title folds as it scrolls, and tapping the current one again scrolls back to the top. Home and Projects group their rows, so they are grouped lists on the Surface-Alt screen. The Inbox dot clears once Inbox opens; until then its label says how many are new.",
    render: () => <PlatformPhoneApp label="Zen app" app={RootDestinations} />,
    code: exampleCode(rootDestinations),
  },
  {
    title: "Action in the bar",
    description: "On the Default bar the app's one create action is the last cell, a 48px Primary button that opens a task, never a screen. New expense opens a form sheet where Enter submits and a missing value gets its error; the expense lands on top of Expenses, with Undo in the toast.",
    render: () => <PlatformPhoneApp label="Đìzai expenses" app={ActionInTheBar} />,
    code: exampleCode(actionInTheBar),
  },
  {
    title: "Floating with create",
    description: "The Floating pill sits over the list on a fade to Surface, so rows scroll under it, and the create action floats beside it as its own 64px button. New task opens a sheet; the task lands on top of Tasks.",
    render: () => <PlatformPhoneApp label="Zen tasks" app={FloatingWithCreate} />,
    code: exampleCode(floatingWithCreate),
  },
  {
    title: "Glass over photos",
    description: "Over video and photos the Floating Glass pill floats on the picture with backdrop none, so no Surface band cuts across the image. Idle icons stay Strongest and the selection is Subtle; the screen still has a hidden h1.",
    render: () => <PlatformPhone canvas="media" statusBar="light" label="Saola Trails"><GlassOverPhotos /></PlatformPhone>,
    code: exampleCode(glassOverPhotos),
  },
  {
    title: "Labels in a brand app",
    description: "A branded consumer app uses the Accent theme with visible labels: five destinations, the most a bar holds, each a one-word noun. Tab reaches each destination and Enter opens it; the current one is aria-current.",
    render: () => <PlatformPhoneApp label="Phin & Co" app={LabelsInABrandApp} />,
    code: exampleCode(labelsInABrandApp),
  },
]);
