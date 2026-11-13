/* Empty State examples (brief: docs/research/example-rebuild-brief-2026-09-30.md; the two screens built on AppShell).
   Đìzai Studio in Zen: Alex's first expense in the studio's desktop app, his tasks filtered to nothing, a review queue he
   has cleared, a file he can't open in the phone app, and a client's uploads while they load. An Empty State shows only
   once the data is there and really empty. Each example is its own file in empty-state/ (P2b, plan
   docs/research/code-languages-plan-2026-10-03.md §11): the card renders its default export and shows its text as the
   snippet. */
import { PreviewAppFrame } from "../../PlatformFrames";
import { PlatformPhoneApp } from "../../PlatformPhone";
import type { PlatformPage } from "../../PlatformExamples";
import { keepOnHotUpdate } from "../../hotData";
import { exampleCode } from "../exampleCode";
import type { ExampleDef } from "../types";
import FirstRun from "./empty-state/first-run.example";
import firstRunRaw from "./empty-state/first-run.example.tsx?raw";
import NoAccess from "./empty-state/no-access.example";
import noAccessRaw from "./empty-state/no-access.example.tsx?raw";
import FilteredToNothing from "./empty-state/filtered-to-nothing.example";
import filteredToNothingRaw from "./empty-state/filtered-to-nothing.example.tsx?raw";
import AllCaughtUp from "./empty-state/all-caught-up.example";
import allCaughtUpRaw from "./empty-state/all-caught-up.example.tsx?raw";
import ClientUploads from "./empty-state/loading-and-errors.example";
import clientUploadsRaw from "./empty-state/loading-and-errors.example.tsx?raw";

export const page: PlatformPage = "empty-state";

export const examples: ExampleDef[] = keepOnHotUpdate(import.meta.hot, "examples", [
  {
    title: "First run",
    description: "Alex opens Expenses in the studio's app for the first time. The page has nothing yet, so the Empty State takes the page's Body at size Medium (240 illustration) and carries the page's only Primary. Once an expense exists, the totals and the table take over and Add expense moves to the PageHeader in the shell's header; deleting the last one brings the Empty State back.",
    wide: true,
    screen: true,
    code: exampleCode(firstRunRaw),
    render: () => <PreviewAppFrame height={{ min: 640, max: 820 }}><FirstRun /></PreviewAppFrame>,
  },
  {
    title: "No access",
    description: "In the studio's phone app Alex opens the Q3 report he can't see. The pushed screen has no Action bar: the Empty State fills its Body under the compact bar, says who owns the file and offers Request access. The caption and action change after the request, aria-live reads the new state, and Back returns to the Files root, where the row now says Access requested.",
    code: exampleCode(noAccessRaw),
    render: () => <PlatformPhoneApp label="Files" app={NoAccess} />,
  },
  {
    title: "Filtered to nothing",
    description: "When filters leave nothing, the title says no tasks match and the only action is the way out: Clear filters as the Tertiary. It fills one ListBox, not the page, so it is Small (size=\"sm\", 200 illustration). Focus moves to the first filter once it is gone.",
    code: exampleCode(filteredToNothingRaw),
    render: () => <FilteredToNothing />,
  },
  {
    title: "All caught up",
    description: "An empty review queue is good news: the Empty State says so and pushes no action. The Segmented view switch is the way to what was done.",
    code: exampleCode(allCaughtUpRaw),
    render: () => <AllCaughtUp />,
  },
  {
    title: "Loading and errors",
    description: "Loading shows Skeleton rows and a failed load shows an Inline Message with Try again; only a load that came back empty shows the Empty State. The first refresh here fails once.",
    code: exampleCode(clientUploadsRaw),
    render: () => <ClientUploads />,
  },
]);
