/* Tabs examples (brief: docs/research/example-rebuild-brief-2026-09-30.md). Alex Duong works through the Đìzai Studio
   workspace: the sections of a project page, a draft invoice, the work waiting on his dashboard, a colleague's profile on
   his phone and a client record in a narrow column. Tabs switch sections of one thing; filters stay Chips. The screens
   sit in the studio's AppShell: the project page's tabs in the header's Sections row, the workspace's Large tabs in the
   top-bar pattern's top row, the profile's in the phone's Top Navigation control bar.
   Each example is its own file in tabs/ (P2b, plan docs/research/code-languages-plan-2026-10-03.md §11): the card
   renders its default export and shows its text as the snippet. */
import { PreviewAppFrame } from "../../PlatformFrames";
import { PlatformPhoneApp } from "../../PlatformPhone";
import type { PlatformPage } from "../../PlatformExamples";
import { keepOnHotUpdate } from "../../hotData";
import { exampleCode } from "../exampleCode";
import type { ExampleDef } from "../types";
import ProjectSections from "./tabs/project-sections.example";
import projectSections from "./tabs/project-sections.example.tsx?raw";
import WorkspaceTopNav from "./tabs/workspace-top-navigation.example";
import workspaceTopNav from "./tabs/workspace-top-navigation.example.tsx?raw";
import YourWork from "./tabs/your-work.example";
import yourWork from "./tabs/your-work.example.tsx?raw";
import ClientSections from "./tabs/many-sections.example";
import clientSections from "./tabs/many-sections.example.tsx?raw";
import DraftInvoice from "./tabs/draft-invoice.example";
import draftInvoice from "./tabs/draft-invoice.example.tsx?raw";
import PhoneProfile from "./tabs/profile-on-a-phone.example";
import phoneProfile from "./tabs/profile-on-a-phone.example.tsx?raw";

export const page: PlatformPage = "tabs";

export const examples: ExampleDef[] = keepOnHotUpdate(import.meta.hot, "examples", [
  {
    title: "Project sections",
    description: "A project page splits into Overview, Tasks, Files and Activity: Indicator tabs with icons in the AppShell header's Sections row, under the PageHeader in its Main row, each paired with a TabPanel in the Body. Counts sit in badges and leave at zero; Activity loads the first time it opens.",
    wide: true,
    screen: true,
    render: () => <PreviewAppFrame height={{ min: 640, max: 820 }}><ProjectSections /></PreviewAppFrame>,
    code: exampleCode(projectSections),
  },
  {
    title: "Workspace top navigation",
    description: "On desktop the studio's main sections sit in the top bar as Large tabs: the AppShell's top-bar pattern (no Sidebar) puts them beside the logo in the header's top row, 64px items with the selected one underlined, and the PageHeader in the Main row follows the tab. Counts sit in badges and leave at zero; Your profile in the account menu opens People.",
    wide: true,
    screen: true,
    render: () => <PreviewAppFrame height={{ min: 640, max: 820 }}><WorkspaceTopNav /></PreviewAppFrame>,
    code: exampleCode(workspaceTopNav),
  },
  {
    title: "Your work",
    description: "Inside a dashboard card, Subtle tabs switch between lists of one kind. Approving the last review removes the Reviews counter instead of showing 0, and the panel says there is nothing waiting.",
    render: () => <YourWork />,
    code: exampleCode(yourWork),
  },
  {
    title: "Many sections",
    description: "Six sections on a narrow client card: the bar scrolls sideways instead of shrinking or cutting labels, and ←/→ bring the next tab into view. Seven is the most; more belongs in a Sidebar or a select.",
    render: () => <ClientSections />,
    code: exampleCode(clientSections),
  },
  {
    title: "Draft invoice",
    description: "Payments stays visible but disabled while the invoice is a draft, and the line under the bar says why; arrow keys skip it. Sending enables the tab, and Undo in the toast turns it off again.",
    render: () => <DraftInvoice />,
    code: exampleCode(draftInvoice),
  },
  {
    title: "Profile on a phone",
    description: "On a phone, three sections of a profile sit in the Top Navigation control bar as full-width tabs that share the screen evenly and stay pinned while the activity scrolls under them. The profile is a child screen of the People root (Back, no bottom bar): Back returns to the person's row in People, and a section without entries says so.",
    render: () => <PlatformPhoneApp label="People" app={PhoneProfile} />,
    code: exampleCode(phoneProfile),
  },
]);
