/* Progress examples (docs/research/example-rebuild-brief-2026-09-30.md). Đìzai Studio runs its work in Zen; the phone
   example is the loyalty app the studio builds for Phin & Co.
   Each example is its own file in progress/ (P2b, plan docs/research/code-languages-plan-2026-10-03.md §11): the card
   renders its default export and shows its text as the snippet. */
import { PlatformPhoneApp } from "../../PlatformPhone";
import type { PlatformPage } from "../../PlatformExamples";
import { keepOnHotUpdate } from "../../hotData";
import { exampleCode } from "../exampleCode";
import type { ExampleDef } from "../types";
import StorageQuota from "./progress/storage-quota.example";
import storageQuota from "./progress/storage-quota.example.tsx?raw";
import BackgroundExport from "./progress/background-export.example";
import backgroundExport from "./progress/background-export.example.tsx?raw";
import SetupChecklist from "./progress/setup-checklist.example";
import setupChecklist from "./progress/setup-checklist.example.tsx?raw";
import Milestones from "./progress/milestones.example";
import milestones from "./progress/milestones.example.tsx?raw";
import LoyaltyStamps from "./progress/loyalty-stamps.example";
import loyaltyStamps from "./progress/loyalty-stamps.example.tsx?raw";

export const page: PlatformPage = "progress";

export const examples: ExampleDef[] = keepOnHotUpdate(import.meta.hot, "examples", [
  {
    title: "Storage quota",
    description: "Workspace storage uses the Status theme on the quota scale: green while there is room, Warning from 75% and Negative from 90%. Deleting a large file frees space at once, and Undo puts it back.",
    render: () => <StorageQuota />,
    code: exampleCode(storageQuota),
  },
  {
    title: "Background export",
    description: "A long export runs as a row in the list with an Accent bar, the time left and Cancel, so people keep working. At 100% the caption says what is still happening; a toast with View announces the file.",
    render: () => <BackgroundExport />,
    code: exampleCode(backgroundExport),
  },
  {
    title: "Setup checklist",
    description: "A neutral bar counts finished steps in the unit people think in (“2 of 5 steps”). Ticking the last step turns it to the Status theme, and the caption says the project is ready.",
    render: () => <SetupChecklist />,
    code: exampleCode(setupChecklist),
  },
  {
    title: "Milestones",
    description: "Progress-Circle fits a list row where a bar would crowd the text: one theme for every row, the percentage as its label, and a Done check at 100%. The caption gives the count behind it.",
    render: () => <Milestones />,
    code: exampleCode(milestones),
  },
  {
    title: "Loyalty stamps",
    description: "On a phone the bar shows progress towards a reward: Accent while collecting, Status once it is ready. Scan receipt adds a stamp and a visit; at 10 the footer offers Redeem free drink, which starts a new card.",
    render: () => <PlatformPhoneApp label="Phin & Co rewards" app={LoyaltyStamps} />,
    code: exampleCode(loyaltyStamps),
  },
]);
