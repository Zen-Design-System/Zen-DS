/* Skeleton examples (docs/research/example-rebuild-brief-2026-09-30.md): Đìzai Studio's invoices, files, activity and
   tasks while they load. Each load runs on a short timer that a button starts (Refresh, Try again, Show older activity,
   a task row), then swaps the real content in one step. The two screens (the Invoices page, the phone app's task) sit in
   AppShell: Layout=Sidebar in a desktop window, the mobile parts (TopNavigation, BottomNavigation, ActionBar) in a phone.
   Each example is its own file in skeleton/ (P2b, plan docs/research/code-languages-plan-2026-10-03.md §11): the card
   renders its default export and shows its text as the snippet. */
import { PreviewAppFrame } from "../../PlatformFrames";
import { PlatformPhoneApp } from "../../PlatformPhone";
import type { PlatformPage } from "../../PlatformExamples";
import { keepOnHotUpdate } from "../../hotData";
import { exampleCode } from "../exampleCode";
import type { ExampleDef } from "../types";
import InvoicesPage from "./skeleton/page-loading.example";
import invoicesPageRaw from "./skeleton/page-loading.example.tsx?raw";
import Moodboard from "./skeleton/pictures-as-they-arrive.example";
import moodboardRaw from "./skeleton/pictures-as-they-arrive.example.tsx?raw";
import ProjectFiles from "./skeleton/loading-failed.example";
import projectFilesRaw from "./skeleton/loading-failed.example.tsx?raw";
import ActivityFeed from "./skeleton/loading-more.example";
import activityFeedRaw from "./skeleton/loading-more.example.tsx?raw";
import TaskDetail from "./skeleton/detail-screen.example";
import taskDetailRaw from "./skeleton/detail-screen.example.tsx?raw";

export const page: PlatformPage = "skeleton";

export const examples: ExampleDef[] = keepOnHotUpdate(import.meta.hot, "examples", [
  {
    title: "Page loading",
    wide: true,
    screen: true,
    description: "The studio's Invoices page while its data loads. The shell, the Sidebar, the PageHeader and every label render at once; only the data waits. Metric values and table cells hold placeholders shaped like their content, and the real numbers and rows replace them in one step. Refresh loads again.",
    render: () => <PreviewAppFrame height={{ min: 640, max: 820 }}><InvoicesPage /></PreviewAppFrame>,
    code: exampleCode(invoicesPageRaw),
  },
  {
    title: "Pictures as they arrive",
    description: "Each picture shows as soon as it loads instead of waiting for the slowest. Image keeps its 4:3 frame and its own Skeleton until then, and the caption holds a one-line placeholder.",
    render: () => <Moodboard />,
    code: exampleCode(moodboardRaw),
  },
  {
    title: "Loading failed",
    description: "A skeleton never waits forever: when the request times out, a Negative Inline Message takes its place with Try again. Retrying shows the placeholders again, focus goes to the card title, and the files arrive.",
    render: () => <ProjectFiles />,
    code: exampleCode(projectFilesRaw),
  },
  {
    title: "Loading more",
    description: "Show older activity adds placeholder rows at the end of the list, so the rows already read stay put. When the last page arrives the button goes and focus moves to the end-of-list line.",
    render: () => <ActivityFeed />,
    code: exampleCode(activityFeedRaw),
  },
  {
    title: "Detail screen",
    description: "In the studio's phone app a task opens from the Tasks root at once, with the title it already had; its status, fields and description load behind placeholders. The field labels and the Action bar are there from the start, so only the values change, and Mark as done waits until the task has loaded. Back returns to the list, with focus on the task's group.",
    render: () => <PlatformPhoneApp label="Tasks" app={TaskDetail} />,
    code: exampleCode(taskDetailRaw),
  },
]);
