/* Dock Icon examples (brief: docs/research/example-rebuild-brief-2026-09-30.md). Đìzai Studio's own work in Zen: pick
   the kind of a new project, scan the client projects, read notifications from people and from the system, check leave
   balances, and — the one other domain — the Lumen Bank app the studio designs, on a phone.
   Each example is its own file in dock-icon/ (P2b, plan docs/research/code-languages-plan-2026-10-03.md §11): the card
   renders its default export and shows its text as the snippet. */
import { PlatformPhoneApp } from "../../PlatformPhone";
import type { PlatformPage } from "../../PlatformExamples";
import { keepOnHotUpdate } from "../../hotData";
import { exampleCode } from "../exampleCode";
import type { ExampleDef } from "../types";
import ChooseProjectType from "./dock-icon/choose-a-project-type.example";
import chooseProjectType from "./dock-icon/choose-a-project-type.example.tsx?raw";
import ProjectTable from "./dock-icon/project-marks-in-a-table.example";
import projectTable from "./dock-icon/project-marks-in-a-table.example.tsx?raw";
import Notifications from "./dock-icon/beside-people.example";
import notifications from "./dock-icon/beside-people.example.tsx?raw";
import LeaveBalance from "./dock-icon/emoji-marks.example";
import leaveBalance from "./dock-icon/emoji-marks.example.tsx?raw";
import PhoneSpending from "./dock-icon/spending-on-a-phone.example";
import phoneSpending from "./dock-icon/spending-on-a-phone.example.tsx?raw";

export const page: PlatformPage = "dock-icon";

export const examples: ExampleDef[] = keepOnHotUpdate(import.meta.hot, "examples", [
  {
    title: "Choose a project type",
    description: "Large Solid Dock Icons lead selectable cards, each kind of work in the colour it has everywhere else in Zen. The mark is decorative because the name sits under it; Create project without a pick moves focus to the types and says what's missing.",
    wide: true,
    render: () => <ChooseProjectType />,
    code: exampleCode(chooseProjectType),
  },
  {
    title: "Project marks in a table",
    description: "In a table the mark is Small and Subtle, inside TableMedia with the client as its caption; the Avatar in the Lead column is XSmall because it has no caption. Project, Due and Budget sort.",
    wide: true,
    render: () => <ProjectTable />,
    code: exampleCode(projectTable),
  },
  {
    title: "Beside people",
    description: "People are Avatars and system events are Dock Icons, both Medium so the titles line up. Opening a notification marks it read, and Mark all as read clears the counter.",
    render: () => <Notifications />,
    code: exampleCode(notifications),
  },
  {
    title: "Emoji marks",
    description: "Theme=Emoji draws any emoji at the Dock Icon size, here the leave types the studio chose for its HR pages. One list, one size: every row is Medium.",
    render: () => <LeaveBalance />,
    code: exampleCode(leaveBalance),
  },
  {
    title: "Spending on a phone",
    description: "In the Lumen Bank app each category keeps one icon and colour: Subtle and Medium in the list, Solid and Large at the top of the payment it opens. Back returns to the list, with focus on the day of the payment you opened.",
    render: () => <PlatformPhoneApp label="Lumen Bank app" app={PhoneSpending} />,
    code: exampleCode(phoneSpending),
  },
]);
