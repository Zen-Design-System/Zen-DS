/* Timeline examples: Đìzai Studio on Wednesday 30 September 2026 — the activity log, the billing steps that need action,
   a compact audit log, the project's phases, the roadmap and the same on a phone.
   Each example is its own file in timeline/ (P2b, plan docs/research/code-languages-plan-2026-10-03.md §11): the card
   renders its default export and shows its text as the snippet. */
import { PlatformPhoneApp } from "../../PlatformPhone";
import type { PlatformPage } from "../../PlatformExamples";
import { keepOnHotUpdate } from "../../hotData";
import { exampleCode } from "../exampleCode";
import type { ExampleDef } from "../types";
import RecordActivity from "./timeline/record-activity.example";
import recordActivity from "./timeline/record-activity.example.tsx?raw";
import PendingAndFailed from "./timeline/pending-and-failed-steps.example";
import pendingAndFailed from "./timeline/pending-and-failed-steps.example.tsx?raw";
import CompactLog from "./timeline/compact-log.example";
import compactLog from "./timeline/compact-log.example.tsx?raw";
import ProjectPhases from "./timeline/project-phases.example";
import projectPhases from "./timeline/project-phases.example.tsx?raw";
import Roadmap from "./timeline/roadmap.example";
import roadmap from "./timeline/roadmap.example.tsx?raw";
import PhoneActivity from "./timeline/on-a-phone.example";
import phoneActivity from "./timeline/on-a-phone.example.tsx?raw";
import RoadmapOnAPhone from "./timeline/roadmap-on-a-phone.example";
import roadmapOnAPhone from "./timeline/roadmap-on-a-phone.example.tsx?raw";

export const page: PlatformPage = "timeline";

export const examples: ExampleDef[] = keepOnHotUpdate(import.meta.hot, "examples", [
  {
    title: "Record activity",
    description: "Newest first, grouped by day: an Avatar when a person acted, an Icon when the system did; the tone carries the status (approved, rejected). Each day's last item has no connector.",
    render: () => <RecordActivity />,
    code: exampleCode(recordActivity),
  },
  {
    title: "Pending and failed steps",
    description: "Tone is the status, so the reader scans the log for what needs action: Warning for a step still pending, Negative for one that failed, Positive once it succeeded.",
    render: () => <PendingAndFailed />,
    code: exampleCode(pendingAndFailed),
  },
  {
    title: "Compact log",
    description: "Size Small with Dot markers suits a dense audit log in a side panel; long details wrap.",
    render: () => <CompactLog />,
    code: exampleCode(compactLog),
  },
  {
    title: "Project phases",
    description: "Milestones before today are Done, the next one is Current (announced as the current step, with its detail), the rest Upcoming.",
    wide: true,
    render: () => <ProjectPhases />,
    code: exampleCode(projectPhases),
  },
  {
    title: "Roadmap",
    description: "Groups collapse their tasks; bars keep their real dates and today's line crosses the weeks. Pressing a bar opens its task; the group rows are disclosure buttons.",
    wide: true,
    render: () => <Roadmap />,
    code: exampleCode(roadmap),
  },
  {
    title: "On a phone",
    description: "The activity feed is the same on a phone; the Gantt keeps a 128px task column and scrolls three weeks at a time, opening at today.",
    render: () => <PlatformPhoneApp label="Activity" app={PhoneActivity} />,
    code: exampleCode(phoneActivity),
  },
  {
    title: "Roadmap on a phone",
    description: "Three weeks visible, the task column stays while the track scrolls; milestone titles live in the task column only, and a long task runs past the edge instead of being squeezed.",
    render: () => <RoadmapOnAPhone />,
    code: exampleCode(roadmapOnAPhone),
  },
]);
