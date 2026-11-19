/* SliderField examples: the numbers of a property panel, and photo adjustments in the studio's phone app.
   Each example is its own file in slider-field/ (P2b, plan docs/research/code-languages-plan-2026-10-03.md §11): the
   card renders its default export and shows its text as the snippet. */
import { PlatformPhone } from "../../PlatformPhone";
import type { PlatformPage } from "../../PlatformExamples";
import { keepOnHotUpdate } from "../../hotData";
import { exampleCode } from "../exampleCode";
import type { ExampleDef } from "../types";
import PhotoLayout from "./slider-field/photo-layout.example";
import photoLayout from "./slider-field/photo-layout.example.tsx?raw";
import MotionSettings from "./slider-field/motion-settings.example";
import motionSettings from "./slider-field/motion-settings.example.tsx?raw";
import UnitsAndSizes from "./slider-field/units-and-sizes.example";
import unitsAndSizes from "./slider-field/units-and-sizes.example.tsx?raw";
import DisabledInlineRows from "./slider-field/disabled-with-other-inline-rows.example";
import disabledWithOtherInlineRows from "./slider-field/disabled-with-other-inline-rows.example.tsx?raw";
import AdjustmentsOnAPhone from "./slider-field/adjustments-on-a-phone.example";
import adjustmentsOnAPhone from "./slider-field/adjustments-on-a-phone.example.tsx?raw";

export const page: PlatformPage = "slider-field";

export const examples: ExampleDef[] = keepOnHotUpdate(import.meta.hot, "examples", [
  {
    title: "Photo layout",
    description: "The numbers of a property panel: offsets in px, a scale and an opacity. Drag a row to scrub, click it (or press Enter) to type an exact number; the fill shows where the value sits between min and max.",
    render: () => <PhotoLayout />,
    code: exampleCode(photoLayout),
  },
  {
    title: "Motion settings",
    description: "A Segmented switches the spring's model and the rows follow: Duration and Bounce for Time, Stiffness for Physics. Seconds keep two decimals through formatValue.",
    render: () => <MotionSettings />,
    code: exampleCode(motionSettings),
  },
  {
    title: "Units and sizes",
    description: "px, %, degrees and a negative range (Spread −20 to 20 starts its fill at −20). Small rows (32px) for a dense grid panel; accent for the value that matters most.",
    render: () => <UnitsAndSizes />,
    code: exampleCode(unitsAndSizes),
  },
  {
    title: "Disabled, with other inline rows",
    description: "A SliderField sits with inline fields at the same height and label position. Disabled says why next to it, and the action that unlocks it is right there.",
    render: () => <DisabledInlineRows />,
    code: exampleCode(disabledWithOtherInlineRows),
  },
  {
    title: "Adjustments on a phone",
    description: "Gia retouches a moodboard photo for Saola Outdoor in the studio's phone app. The photo is the screen's backdrop and follows every row; drag along a row to scrub, tap it to type. Signed values show their sign, and the rows stay Medium (40px) on a phone. Save photo in the Action bar works once something changed; Close and Reset offer Undo.",
    render: () => <PlatformPhone label="Adjust" canvas="surface" statusBar="light"><AdjustmentsOnAPhone /></PlatformPhone>,
    code: exampleCode(adjustmentsOnAPhone),
  },
]);
