/* Toggle examples (brief 2026-09-30). The three screens (the notification settings page, the phone Settings root and its
   Focus screen) sit in the new AppShell (2026-10-19).
   Each example is its own file in toggle/ (P2b, plan docs/research/code-languages-plan-2026-10-03.md §11): the card
   renders its default export and shows its text as the snippet. */
import { PreviewAppFrame } from "../../PlatformFrames";
import { PlatformPhoneApp } from "../../PlatformPhone";
import type { PlatformPage } from "../../PlatformExamples";
import { keepOnHotUpdate } from "../../hotData";
import { exampleCode } from "../exampleCode";
import type { ExampleDef } from "../types";
import NotificationSettings from "./toggle/notification-settings.example";
import notificationSettings from "./toggle/notification-settings.example.tsx?raw";
import EarlyAccess from "./toggle/switches-in-a-table.example";
import earlyAccess from "./toggle/switches-in-a-table.example.tsx?raw";
import ShowCompleted from "./toggle/show-completed.example";
import showCompleted from "./toggle/show-completed.example.tsx?raw";
import Integrations from "./toggle/connect-and-retry.example";
import integrations from "./toggle/connect-and-retry.example.tsx?raw";
import FocusMode from "./toggle/focus-on-a-phone.example";
import focusMode from "./toggle/focus-on-a-phone.example.tsx?raw";
import PhoneSettings from "./toggle/phone-settings.example";
import phoneSettings from "./toggle/phone-settings.example.tsx?raw";

export const page: PlatformPage = "toggle";

export const examples: ExampleDef[] = keepOnHotUpdate(import.meta.hot, "examples", [
  {
    title: "Notification settings",
    description: "Alex's notification settings in the studio's app, where every switch saves at once, with no Save button. The master toggle pauses everything and disables the rows that depend on it; a Toast offers Undo. Beside the settings, where they are delivered, with a test that says when nothing would arrive.",
    wide: true,
    screen: true,
    render: () => <PreviewAppFrame height={{ min: 640, max: 820 }}><NotificationSettings /></PreviewAppFrame>,
    code: exampleCode(notificationSettings),
  },
  {
    title: "Switches in a table",
    description: "In a table the switch stands alone: a ToggleButton named by its row through aria-label. A change reaches the whole team, so the row shows who changed it and a Toast offers Undo; the table sits on the page under its heading, with no container.",
    wide: true,
    render: () => <EarlyAccess />,
    code: exampleCode(earlyAccess),
  },
  {
    title: "Show completed",
    description: "A view option above a list: toggle-first and phrased positively. The list changes the moment it flips, which is what a toggle promises, and Done tasks say when they finished.",
    render: () => <ShowCompleted />,
    code: exampleCode(showCompleted),
  },
  {
    title: "Connect and retry",
    description: "When turning a setting on needs a server, the switch shows the change at once, locks while it connects and flips back if that fails. In this demo the first attempt fails; Try again connects.",
    render: () => <Integrations />,
    code: exampleCode(integrations),
  },
  {
    title: "Focus on a phone",
    description: "Focus, a screen of the studio app's Settings. When one setting leads the screen, its switch is size xl: 48px tall, with an icon in the dot that names the setting. The icon is Light while off and Strongest while on; the caption says what the switch does right now. Under it, the Large switches that turn Focus on by themselves and the people who still get through, each removable with Undo.",
    render: () => <PlatformPhoneApp label="Focus" app={FocusMode} />,
    code: exampleCode(focusMode),
  },
  {
    title: "Phone settings",
    description: "On a phone every toggle is size large and the whole row, label and caption included, is the tap target. The Settings root of the studio's phone app is a grouped list: each group is a white block on the grey Canvas under a kicker that names it, and the large title folds into the bar as they scroll.",
    render: () => <PlatformPhoneApp label="Settings" app={PhoneSettings} />,
    code: exampleCode(phoneSettings),
  },
]);
