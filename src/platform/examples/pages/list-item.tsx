/* List Item examples (brief: docs/research/example-rebuild-brief-2026-09-30.md). Đìzai Studio, signed in as Alex Duong,
   Wednesday Sep 30, 2026, 10:30 am. Each example teaches one List Item decision: the whole row opens the thing it
   names, group headers name their lists, trailing actions stay separate targets, a long title wraps to two lines and
   reads in full where the row leads, and settings on a phone drill down to a pick-one list.
   Each example is its own file in list-item/ (P2b, plan docs/research/code-languages-plan-2026-10-03.md §11): the card
   renders its default export and shows its text as the snippet. */
import type { ReactNode } from "react";
import { Stack } from "../../../components/Layout";
import { useZen } from "../../../components/Provider";
import { PlatformPhoneApp } from "../../PlatformPhone";
import type { PlatformPage } from "../../PlatformExamples";
import { keepOnHotUpdate } from "../../hotData";
import { exampleCode } from "../exampleCode";
import type { ExampleDef } from "../types";
import PeopleDirectory from "./list-item/people-directory.example";
import peopleDirectory from "./list-item/people-directory.example.tsx?raw";
import PhoneSettings from "./list-item/settings-on-a-phone.example";
import settingsOnAPhone from "./list-item/settings-on-a-phone.example.tsx?raw";
import Notifications from "./list-item/grouped-notifications.example";
import groupedNotifications from "./list-item/grouped-notifications.example.tsx?raw";
import PendingInvites from "./list-item/pending-invites.example";
import pendingInvites from "./list-item/pending-invites.example.tsx?raw";
import RecentFiles from "./list-item/long-file-names.example";
import longFileNames from "./list-item/long-file-names.example.tsx?raw";
import EmailSwitches from "./list-item/email-switches.example";
import emailSwitches from "./list-item/email-switches.example.tsx?raw";
import PhoneTransactions from "./list-item/transactions-on-a-phone.example";
import transactionsOnAPhone from "./list-item/transactions-on-a-phone.example.tsx?raw";
import ProjectBoard from "./list-item/project-groups-on-a-white-page.example";
import projectGroupsOnAWhitePage from "./list-item/project-groups-on-a-white-page.example.tsx?raw";
import FlatPageFiles from "./list-item/files-on-a-flat-page.example";
import filesOnAFlatPage from "./list-item/files-on-a-flat-page.example.tsx?raw";

export const page: PlatformPage = "list-item";

/** Docs frame, not part of the snippet: a page of its own Canvas (platform.css .pe-shell paints it; in an app, AppShell
 *  canvas="alt" or "flat") around the boxes it pairs with. Not an app window: its content takes the full width and the
 *  page its content's height. The page margin around it; on a phone it fills the card, no corners. */
function CanvasPage({ canvas, children }: { canvas: "alt" | "flat"; children: ReactNode }) {
  const phone = useZen()?.breakpoint === "mobile";
  return (
    <Stack className="pe-shell" data-canvas={canvas} gap="none" padding={phone ? "md" : "2xl"} radius={phone ? "none" : "xl"} style={{ minHeight: 0 }}>
      {children}
    </Stack>
  );
}

export const examples: ExampleDef[] = keepOnHotUpdate(import.meta.hot, "examples", [
  {
    title: "People directory",
    wide: true,
    description: "Each row is one button that opens the person beside the list, and Selected marks who is open. Search and the Team chip filter the rows; when nothing matches, the empty state offers Clear filters.",
    render: () => <PeopleDirectory />,
    code: exampleCode(peopleDirectory),
  },
  {
    title: "Settings on a phone",
    description: "Settings are a grouped list: each group is a white block under its kicker on the Surface-Alt screen. A setting row shows its current value as the caption and a passive chevron; the whole row opens a pick-one list where the Selected row, with a check, is the current value. Back returns focus to the row.",
    render: () => <PlatformPhoneApp label="Zen app settings" canvas="alt" app={PhoneSettings} />,
    code: exampleCode(settingsOnAPhone),
  },
  {
    title: "Grouped notifications",
    description: "Today and Earlier are each a List Box titled one level below the Notifications heading, with a List named after it, so the groups read as units. Opening a notification marks it read; Mark all as read clears the counter.",
    render: () => <Notifications />,
    code: exampleCode(groupedNotifications),
  },
  {
    title: "Pending invites",
    description: "Rows that don't open anything keep Resend and Revoke as Medium flat icon buttons in the trailing slot, each named after the invite. On a narrow card they fold into one More menu headed by the address, so the address keeps its room; Revoke removes the row and the toast can undo it.",
    render: () => <PendingInvites />,
    code: exampleCode(pendingInvites),
  },
  {
    title: "Long file names",
    description: "A file name that doesn't fit wraps to a second line (titleLines={2}) and is cut only after that; the side panel the row opens shows the whole name. The card lists the four latest files and says how many there are in all.",
    render: () => <RecentFiles />,
    code: exampleCode(longFileNames),
  },
  {
    title: "Email switches",
    description: "A settings row whose whole surface is one switch is a ToggleListItem: a press anywhere on the row flips it, the title names the switch and the caption describes it. Each change applies at once, and the toast can undo it.",
    render: () => <EmailSwitches />,
    code: exampleCode(emailSwitches),
  },
  {
    title: "Transactions on a phone",
    description: "A row that ends in an amount takes value and valueCaption: the amount in Bold level with the title, its USD line level with the caption, both right-aligned and never cut, so a long payee truncates instead. Money in is Positive Light and keeps its + sign, money out stays Strongest with its −; the arrow and the caption say the direction too, so the title is the payee alone. See all at the section head is underlined text (a Link in the text colour), not a button, so it costs no more room than its words; it shows the rest of the month in place.",
    render: () => <PlatformPhoneApp label="Studio account" app={PhoneTransactions} />,
    code: exampleCode(transactionsOnAPhone),
  },
  {
    title: "Project groups on a white page",
    wide: true,
    description: "On a white Canvas/Alt page, colour on a list box is Pale: one box per group, each in its own hue (theme=\"pale\" color), so the page keeps one box family while the groups read apart. The count beside each title is a BadgeCounter; each row opens its project. On the grey Canvas/Default the same boxes stay theme=\"default\" (List-Box has no Subtle), and a plain box on a white page takes surface=\"alt\" or theme=\"border\".",
    render: () => <CanvasPage canvas="alt"><ProjectBoard /></CanvasPage>,
    code: exampleCode(projectGroupsOnAWhitePage),
  },
  {
    title: "Files on a flat page",
    description: "A Canvas/Flat page reads as one plane with its bars in light and dark, so its list box is Flat-Border: Surface/Flat inside a Pale ring, with no shadow (theme/box-on-canvas, theme/mixed-elevation). Each row opens its file.",
    render: () => <CanvasPage canvas="flat"><FlatPageFiles /></CanvasPage>,
    code: exampleCode(filesOnAFlatPage),
  },
]);
