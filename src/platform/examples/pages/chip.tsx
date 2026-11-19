/* Chip examples. Đìzai Studio's own work in Zen: task filters over a table, a weekly digest's topics, planning poker, a
   people filter, the Team tab on a phone, filters on a Brand/Accent band and a reminder's repeat.
   Each example is its own file in chip/ (P2b, plan docs/research/code-languages-plan-2026-10-03.md §11): the card
   renders its default export and shows its text as the snippet. */
import { PlatformPhoneApp } from "../../PlatformPhone";
import type { PlatformPage } from "../../PlatformExamples";
import { keepOnHotUpdate } from "../../hotData";
import { exampleCode } from "../exampleCode";
import type { ExampleDef } from "../types";
import TaskFilters from "./chip/task-filters.example";
import taskFilters from "./chip/task-filters.example.tsx?raw";
import DigestTopics from "./chip/digest-topics.example";
import digestTopics from "./chip/digest-topics.example.tsx?raw";
import EstimateInPoints from "./chip/estimate-in-points.example";
import estimateInPoints from "./chip/estimate-in-points.example.tsx?raw";
import FilterByOwner from "./chip/filter-by-owner.example";
import filterByOwner from "./chip/filter-by-owner.example.tsx?raw";
import TeamFilters from "./chip/filters-on-a-phone.example";
import teamFilters from "./chip/filters-on-a-phone.example.tsx?raw";
import ColourBand from "./chip/on-a-colour-band.example";
import colourBand from "./chip/on-a-colour-band.example.tsx?raw";
import RepeatReminder from "./chip/pick-one.example";
import repeatReminder from "./chip/pick-one.example.tsx?raw";

export const page: PlatformPage = "chip";

export const examples: ExampleDef[] = keepOnHotUpdate(import.meta.hot, "examples", [
  {
    title: "Task filters",
    description: "One Advanced chip per dimension over the table: Status takes several values and counts them, Priority and Project show the value they hold. Clear all appears once two filters are on, and an empty result offers Clear filters.",
    wide: true,
    render: () => <TaskFilters />,
    code: exampleCode(taskFilters),
  },
  {
    title: "Digest topics",
    description: "Normal chips are on/off toggles: several topics can be on, so the chips are Secondary: a picked topic takes the Selected outline and is announced as pressed, and the count under the group follows the choice. Save digest with nothing picked shows the error and moves focus to the first topic.",
    render: () => <DigestTopics />,
    code: exampleCode(digestTopics),
  },
  {
    title: "Estimate in points",
    description: "Number-only chips with onClick are a pressable scale for your vote. The team's votes, shown once you vote, are the same chip without a handler: a static count.",
    render: () => <EstimateInPoints />,
    code: exampleCode(estimateInPoints),
  },
  {
    title: "Filter by owner",
    description: "A people filter lists the whole studio, so its Popover has a search field. Once an owner is picked, the chip shows their photo or initials and name.",
    render: () => <FilterByOwner />,
    code: exampleCode(filterByOwner),
  },
  {
    title: "Filters on a phone",
    description: "On a phone the chips sit in one row that scrolls sideways above the whole team. Quick filters are Normal toggles, and Sort's items open in a Bottom Sheet by themselves (a phone gets a sheet, not a Popover), the picked one Selected with a check. The count updates and an empty result offers Clear filters.",
    render: () => <PlatformPhoneApp label="Team" app={TeamFilters} />,
    code: exampleCode(teamFilters),
  },
  {
    title: "On a colour band",
    description: "On a colour band or a photo every chip takes an overlay level: black-overlay (the default, also level=\"overlay\"), a dark chip with light text, or white-overlay on a solid colour. Selected chips turn white with dark text, and the focus ring takes the label colour, since the Accent ring would vanish on the band. The tokens do not switch with the mode, so the row looks the same in light and dark mode.",
    render: () => <ColourBand />,
    code: exampleCode(colourBand),
  },
  {
    title: "Pick one",
    description: "When exactly one value applies, the chips form a ChipGroup: a radio group where the picked chip is Selected and checked. Tab reaches the group once, on the picked chip, and the arrow keys move the choice; the line under it says what the choice means.",
    render: () => <RepeatReminder />,
    code: exampleCode(repeatReminder),
  },
]);
