/* Color Selector examples. Each example is its own file in color-selector/ (P2b, plan
   docs/research/code-languages-plan-2026-10-03.md §11): the card renders its default export and shows its text as the
   snippet. */
import { PlatformPhoneApp } from "../../PlatformPhone";
import type { PlatformPage } from "../../PlatformExamples";
import { keepOnHotUpdate } from "../../hotData";
import { exampleCode } from "../exampleCode";
import type { ExampleDef } from "../types";
import LabelColour from "./color-selector/label-colour.example";
import labelColour from "./color-selector/label-colour.example.tsx?raw";
import CalendarColours from "./color-selector/calendar-colours.example";
import calendarColours from "./color-selector/calendar-colours.example.tsx?raw";
import HighlightColours from "./color-selector/light-swatches.example";
import highlightColours from "./color-selector/light-swatches.example.tsx?raw";
import ChartSeries from "./color-selector/chart-series-colours.example";
import chartSeries from "./color-selector/chart-series-colours.example.tsx?raw";
import PhoneProjectColour from "./color-selector/project-colour.example";
import phoneProjectColour from "./color-selector/project-colour.example.tsx?raw";

export const page: PlatformPage = "color-selector";

export const examples: ExampleDef[] = keepOnHotUpdate(import.meta.hot, "examples", [
  {
    title: "Label colour",
    description: "Eight swatches ordered by hue, each a Support/Solid token and each announced by its colour name. Tab reaches the group and the arrow keys move and pick; the preview shows the label as it will look before it is created.",
    render: () => <LabelColour />,
    code: exampleCode(labelColour),
  },
  {
    title: "Calendar colours",
    description: "Each calendar row opens a Dialog with the swatches and a preview event; nothing changes until Save, and Cancel keeps the old colour. The row's caption names its colour in words as well.",
    render: () => <CalendarColours />,
    code: exampleCode(calendarColours),
  },
  {
    title: "Light swatches",
    description: "Highlights use the light Support/Soft fills, so every swatch sets contrast=\"dark\" and its check stays visible. With no value no swatch is checked, which is how Clear highlight takes the colour off.",
    render: () => <HighlightColours />,
    code: exampleCode(highlightColours),
  },
  {
    title: "Chart series colours",
    description: "One selector per series, named after it, recolours the chart as soon as a swatch is picked. When two series end up with the same colour, a warning says which ones before the chart becomes hard to read.",
    render: () => <ChartSeries />,
    code: exampleCode(chartSeries),
  },
  {
    title: "Project colour",
    description: "A project's settings screen previews the colour on its Dock Icon; eight swatches fit one row and stay 32px for the thumb. The pick applies at once, like the phone's other settings, so Back returns to a list that already shows it.",
    render: () => <PlatformPhoneApp label="Projects" app={PhoneProjectColour} />,
    code: exampleCode(phoneProjectColour),
  },
]);
