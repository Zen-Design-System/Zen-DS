/* Slider examples (docs/research/example-rebuild-brief-2026-09-30.md). Points at checkout is the Phin & Co loyalty app
   the studio builds.
   Each example is its own file in slider/ (P2b, plan docs/research/code-languages-plan-2026-10-03.md §11): the card
   renders its default export and shows its text as the snippet. */
import { PlatformPhoneApp } from "../../PlatformPhone";
import type { PlatformPage } from "../../PlatformExamples";
import { keepOnHotUpdate } from "../../hotData";
import { exampleCode } from "../exampleCode";
import type { ExampleDef } from "../types";
import PhotoZoom from "./slider/photo-zoom.example";
import photoZoom from "./slider/photo-zoom.example.tsx?raw";
import BudgetAlert from "./slider/budget-alert.example";
import budgetAlert from "./slider/budget-alert.example.tsx?raw";
import TeamAllocation from "./slider/team-allocation.example";
import teamAllocation from "./slider/team-allocation.example.tsx?raw";
import VideoVolume from "./slider/volume-on-a-video.example";
import volumeOnAVideo from "./slider/volume-on-a-video.example.tsx?raw";
import SoundsTurnedOff from "./slider/sounds-turned-off.example";
import soundsTurnedOff from "./slider/sounds-turned-off.example.tsx?raw";
import PointsAtCheckout from "./slider/points-at-checkout.example";
import pointsAtCheckout from "./slider/points-at-checkout.example.tsx?raw";

export const page: PlatformPage = "slider";

export const examples: ExampleDef[] = keepOnHotUpdate(import.meta.hot, "examples", [
  {
    title: "Photo zoom",
    description: "Zoom is tuned by eye, so the crop follows the thumb while it moves; the value beside the slider and Reset zoom make the exact state visible and undoable.",
    render: () => <PhotoZoom />,
    code: exampleCode(photoZoom),
  },
  {
    title: "Budget alert",
    description: "A slider alone can't hit an exact number, so a NumberField edits the same value under it. The summary turns the percentage into money, and Cancel and Save alert wait for a change.",
    render: () => <BudgetAlert />,
    code: exampleCode(budgetAlert),
  },
  {
    title: "Team allocation",
    description: "In a dense table the Small slider sets each person's share of the week in steps of 10%. The hours and the load Badge follow the thumb; Cancel and Save allocation wait for a change, and nothing is saved until Save.",
    wide: true,
    render: () => <TeamAllocation />,
    code: exampleCode(teamAllocation),
  },
  {
    title: "Volume on a video",
    description: "White sits on imagery beside the Overlay buttons of a player bar. Mute drops the slider to 0 and keeps the last volume, so Unmute brings it back.",
    render: () => <VideoVolume />,
    code: exampleCode(volumeOnAVideo),
  },
  {
    title: "Sounds turned off",
    description: "A master Toggle disables the dependent slider instead of hiding it: the setting stays in view, keeps its value and says why it can't change.",
    render: () => <SoundsTurnedOff />,
    code: exampleCode(soundsTurnedOff),
  },
  {
    title: "Points at checkout",
    description: "On a phone the Large slider steps through points 20 at a time between visible limits, capped at the order total. valueText reads the effect (\"320 points, $3.20 off\") to screen readers, and the Pay action in the footer follows it.",
    render: () => <PlatformPhoneApp label="Phin checkout" app={PointsAtCheckout} />,
    code: exampleCode(pointsAtCheckout),
  },
]);
