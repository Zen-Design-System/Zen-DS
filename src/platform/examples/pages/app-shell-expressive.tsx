/* App Shell › Expressive layouts (Figma section D of ◇ Master-Layout · Example, 15948:9467), one docs page of finished
   apps (examples/appShellLayouts.ts). Each example is its own file in app-shell-expressive/ (P2b, plan
   docs/research/code-languages-plan-2026-10-03.md §11): the card renders its default export, a phone app on the device,
   and shows its text as the snippet. A band scrolls away with the page (its bar is not pinned), so those apps take no
   scrollRef and sit in a plain PlatformPhone. */
import { PlatformPhone, PlatformPhoneApp } from "../../PlatformPhone";
import type { PlatformPage } from "../../PlatformExamples";
import { keepOnHotUpdate } from "../../hotData";
import { exampleCode } from "../exampleCode";
import type { ExampleDef } from "../types";
import DisplayHeroPhone from "./app-shell-expressive/d1-display-hero.example";
import d1DisplayHero from "./app-shell-expressive/d1-display-hero.example.tsx?raw";
import WelcomePhone from "./app-shell-expressive/d2-welcome.example";
import d2Welcome from "./app-shell-expressive/d2-welcome.example.tsx?raw";
import CompanionHomePhone from "./app-shell-expressive/d3-companion-home.example";
import d3CompanionHome from "./app-shell-expressive/d3-companion-home.example.tsx?raw";
import GreetingTilesPhone from "./app-shell-expressive/d4-greeting-colour-tiles.example";
import d4GreetingColourTiles from "./app-shell-expressive/d4-greeting-colour-tiles.example.tsx?raw";
import ColourBandPhone from "./app-shell-expressive/d5-colour-band-sheet.example";
import d5ColourBandSheet from "./app-shell-expressive/d5-colour-band-sheet.example.tsx?raw";

export const page: PlatformPage = "app-shell-expressive";

export const examples: ExampleDef[] = keepOnHotUpdate(import.meta.hot, "examples", [
  {
    title: "D1 · Display hero",
    description: "Big type in a full-bleed tint. The headline is the hero: a Support/Brand/Subtle band runs from the top edge and holds the bar (Top-Navigation Type=Transparent: menu, language flag), a short greeting and a Display/1 call to action; the next lessons follow as Shadow cards. The reference's gradient becomes a flat Subtle tint. Shell: AppShell/Mobile · Phone · Top=Band · Bottom=Tab-Bar. Fits: Language / Learning, Fitness programs, Meditation, Kids apps.",
    render: () => <PlatformPhone label="Language app" canvas="default"><DisplayHeroPhone /></PlatformPhone>,
    code: exampleCode(d1DisplayHero),
  },
  {
    title: "D2 · Welcome",
    description: "Brand, a playful picture, one way in. The first screen of a consumer app: one Pale band from the top edge holds the status bar (Top-Navigation Transparent), the Display-Extra wordmark and a picture that sets the mood (Zen's own emoji, scaled, with a Tooltip as the speech bubble); the sign-in buttons sit below within thumb reach. Shell: AppShell/Mobile · Phone · Top=Band · Bottom=None. Fits: Any consumer app, Social / Chat, Kids / Games, Wellness.",
    render: () => <PlatformPhone label="zenio welcome" canvas="alt"><WelcomePhone /></PlatformPhone>,
    code: exampleCode(d2Welcome),
  },
  {
    title: "D3 · Companion home",
    description: "A character talks to you. A buddy at the top of the home: a Pale band from the top edge holds the bar (Transparent, large \"Home\" title, streak, avatar), a speech bubble (Tooltip) and a character (Zen emoji, scaled); then a row of round trackers, a coach card and today's plan, which closes the screen as an open list. Warm and personal. Shell: AppShell/Mobile · Phone · Top=Band · Bottom=Tab-Bar. Fits: Health coach, Habits / Diet, AI assistant, Kids learning.",
    render: () => <PlatformPhone label="Health coach app" canvas="default"><CompanionHomePhone /></PlatformPhone>,
    code: exampleCode(d3CompanionHome),
  },
  {
    title: "D4 · Greeting + colour tiles",
    description: "A warm service home: a two-line greeting (name in a lighter colour) with a privacy note, two big number tiles (one Solid with On-Colors text, one Subtle: one strong colour per row) and the next appointment as a Shadow card with time and price badges; the top doctors close the screen as an open list. Menu in Top-Leading, the person's photo in Top-Trailing. Shell: AppShell/Mobile · Phone · Top=Bar · Bottom=Tab-Bar. Fits: Healthcare booking, Beauty / Services, Fitness studio, Education.",
    render: () => <PlatformPhoneApp label="Care booking app" canvas="default" app={GreetingTilesPhone} />,
    code: exampleCode(d4GreetingColourTiles),
  },
  {
    title: "D5 · Colour band + sheet",
    description: "Bold top, calm list. A Solid colour band from the top edge: Top-Navigation Type=Transparent-On-Color carries the greeting (Capline + heading in On-Colors) and the avatar, then a white card and a Glass panel; the list lives on a white sheet with rounded top corners that overlaps the band. The band is the one strong colour on the screen. Shell: AppShell/Mobile · Phone · Top=Band-Sheet · Bottom=Floating. Fits: Quiz / Games, Kids / Education, Events / Tickets, Music / Media.",
    render: () => <PlatformPhone label="Quiz app" canvas="surface"><ColourBandPhone /></PlatformPhone>,
    code: exampleCode(d5ColourBandSheet),
  },
]);
