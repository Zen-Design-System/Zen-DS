/* Curve Preview examples: the motion curve a Zen Studio prototype's transition draws, beside the settings it shows.
   Each example is its own file in curve-preview/ (P2b, plan docs/research/code-languages-plan-2026-10-03.md §11): the
   card renders its default export and shows its text as the snippet. */
import type { PlatformPage } from "../../PlatformExamples";
import { PlatformPhoneApp } from "../../PlatformPhone";
import { keepOnHotUpdate } from "../../hotData";
import { exampleCode } from "../exampleCode";
import type { ExampleDef } from "../types";
import TransitionSettings from "./curve-preview/transition-settings.example";
import transitionSettings from "./curve-preview/transition-settings.example.tsx?raw";
import CurveTypes from "./curve-preview/the-four-types.example";
import curveTypes from "./curve-preview/the-four-types.example.tsx?raw";
import BounceSetting from "./curve-preview/bounce-follows-the-setting.example";
import bounceSetting from "./curve-preview/bounce-follows-the-setting.example.tsx?raw";
import ChooseEasing from "./curve-preview/choosing-an-easing.example";
import chooseEasing from "./curve-preview/choosing-an-easing.example.tsx?raw";
import TransitionOff from "./curve-preview/transition-off.example";
import transitionOff from "./curve-preview/transition-off.example.tsx?raw";
import MotionSettingsPhone from "./curve-preview/motion-settings-on-a-phone.example";
import motionSettingsPhone from "./curve-preview/motion-settings-on-a-phone.example.tsx?raw";

export const page: PlatformPage = "curve-preview";

export const examples: ExampleDef[] = keepOnHotUpdate(import.meta.hot, "examples", [
  {
    title: "Transition settings",
    description: "The preview sits above the settings it shows and takes the same values: change Type or Bounce and the curve follows at once. Ease curves have no bounce, so that row goes away for them.",
    render: () => <TransitionSettings />,
    code: exampleCode(transitionSettings),
  },
  {
    title: "The four types",
    description: "Spring overshoots a little and settles, Bounce swings visibly, Ease out (Motion/Ease/Emphasized) starts fast and slows into place, Ease in and out is slow at both ends.",
    render: () => <CurveTypes />,
    code: exampleCode(curveTypes),
  },
  {
    title: "Bounce follows the setting",
    description: "bounce is the same 0–1 number as the Bounce row: the damping ratio is 1 − bounce. Name the preview after the value when it changes, so a screen reader hears it too.",
    render: () => <BounceSetting />,
    code: exampleCode(bounceSetting),
  },
  {
    title: "Choosing an easing",
    description: "A Segmented picks the curve and the preview shows it, with one line on when each one fits. The preview is a picture: the choice lives in the control above it.",
    render: () => <ChooseEasing />,
    code: exampleCode(chooseEasing),
  },
  {
    title: "Transition off",
    description: "With no transition there is no curve: instead of an empty plot, one line says what happens, and Duration is disabled until a curve is picked again.",
    render: () => <TransitionOff />,
    code: exampleCode(transitionOff),
  },
  {
    title: "Motion settings on a phone",
    description: "The same rows on a phone screen of a prototype, in the AppShell's mobile Bar with Preview and Apply transition in the Action bar. The preview takes the block's width and keeps its 176 height, so the overshoot stays readable; Type, Duration and Bounce change the curve at once, and Reduce Motion says what people who turn motion off get instead.",
    render: () => <PlatformPhoneApp label="Transition" canvas="default" app={MotionSettingsPhone} />,
    code: exampleCode(motionSettingsPhone),
  },
]);
