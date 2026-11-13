/* Avatar examples (brief: docs/research/example-rebuild-brief-2026-09-30.md). Đìzai Studio, signed in as Alex Duong,
   Wednesday Sep 30, 2026, 10:30 am. Each example teaches one Avatar decision: the 5-avatar stack, presence with text,
   square workspaces, the initials fallback and a profile photo on a phone. The two screens sit in the studio's AppShell:
   a project page (pattern sidebar) and the Profile root on a phone (Band-Sheet with the bottom bar).
   Each example is its own file in avatar/ (P2b, plan docs/research/code-languages-plan-2026-10-03.md §11): the card
   renders its default export and shows its text as the snippet. */
import { PreviewAppFrame } from "../../PlatformFrames";
import { PlatformPhone } from "../../PlatformPhone";
import type { PlatformPage } from "../../PlatformExamples";
import { keepOnHotUpdate } from "../../hotData";
import { exampleCode } from "../exampleCode";
import type { ExampleDef } from "../types";
import ProjectPeople from "./avatar/project-people.example";
import projectPeople from "./avatar/project-people.example.tsx?raw";
import WhosOnline from "./avatar/whos-online.example";
import whosOnline from "./avatar/whos-online.example.tsx?raw";
import ProfilePhoto from "./avatar/profile-photo.example";
import profilePhoto from "./avatar/profile-photo.example.tsx?raw";
import SwitchWorkspace from "./avatar/switch-workspace.example";
import switchWorkspace from "./avatar/switch-workspace.example.tsx?raw";
import GuestInitials from "./avatar/guests-without-a-photo.example";
import guestInitials from "./avatar/guests-without-a-photo.example.tsx?raw";
import MemberAccess from "./avatar/member-access.example";
import memberAccess from "./avatar/member-access.example.tsx?raw";

export const page: PlatformPage = "avatar";

export const examples: ExampleDef[] = keepOnHotUpdate(import.meta.hot, "examples", [
  {
    title: "Project people",
    wide: true,
    screen: true,
    description: "A project page in the studio's AppShell shows who is on the project in its header: at most 5 Avatars in the stack and the rest summarised in text, with the whole team under Members beside who can see what. The stack is named once, with everyone in it; inviting someone adds them to the count and the list as Invited, and removing a member offers Undo.",
    render: () => <PreviewAppFrame><ProjectPeople /></PreviewAppFrame>,
    code: exampleCode(projectPeople),
  },
  {
    title: "Who's online",
    description: "The green dot is never the only signal: each row says Online, or Away with the last active time. The name sits next to the Avatar, so its alt is empty.",
    render: () => <WhosOnline />,
    code: exampleCode(whosOnline),
  },
  {
    title: "Profile photo",
    description: "On a phone, the profile is a tab root on the AppShell's Band-Sheet: the photo at 3XLarge on the band, then a sheet showing the same Avatar where others meet it (online in chat, beside a comment, in a project's stack). Removing the photo falls back to initials on the person's own colour in every one of those places, with Undo in the toast.",
    render: () => <PlatformPhone label="Profile" canvas="surface"><ProfilePhoto /></PlatformPhone>,
    code: exampleCode(profilePhoto),
  },
  {
    title: "Switch workspace",
    description: "Workspaces and client organisations are square Avatars; the signed-in person stays a circle. Pick a workspace to switch to it.",
    render: () => <SwitchWorkspace />,
    code: exampleCode(switchWorkspace),
  },
  {
    title: "Guests without a photo",
    description: "Without a photo, the Avatar shows the first letters of the first and last name on a colour derived from the name, so a guest looks the same on every screen.",
    render: () => <GuestInitials />,
    code: exampleCode(guestInitials),
  },
  {
    title: "Member access",
    description: "A workspace's members by access: Active, an invite still Pending, Inactive after 90 days without a sign-in, and Disabled by an admin. Each dot's state is also the first word of its caption, and the summary above uses the dot on its own (AvatarStatus, XSmall) before each count.",
    render: () => <MemberAccess />,
    code: exampleCode(memberAccess),
  },
]);
