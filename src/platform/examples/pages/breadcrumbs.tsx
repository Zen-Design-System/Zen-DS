/* Breadcrumbs examples (brief: docs/research/example-rebuild-brief-2026-09-30.md). Alex Duong moves up and down the
   Đìzai Studio workspace: the shared Files, a colleague's profile three levels under People, a deep handbook page and the
   folder picker of Move. Each trail starts at its root, ends at the current page (not a link) and never wraps: long paths
   collapse their middle. The two screens are AppShells (Pattern/AppShell/Desktop, Layout=Sidebar) whose trail leads the
   header's top row: a Master crumb with collapse="sidebar", or master={false} beside the header's collapse toggle. Phones
   go up with the Top Navigation Back chevron instead (see Top navigation).
   Each example is its own file in breadcrumbs/ (P2b, plan docs/research/code-languages-plan-2026-10-03.md §11): the card
   renders its default export and shows its text as the snippet. */
import { PreviewAppFrame } from "../../PlatformFrames";
import type { PlatformPage } from "../../PlatformExamples";
import { keepOnHotUpdate } from "../../hotData";
import { exampleCode } from "../exampleCode";
import type { ExampleDef } from "../types";
import FileBrowser from "./breadcrumbs/file-browser.example";
import fileBrowser from "./breadcrumbs/file-browser.example.tsx?raw";
import TopBarTrail from "./breadcrumbs/top-bar-trail.example";
import topBarTrail from "./breadcrumbs/top-bar-trail.example.tsx?raw";
import LongPath from "./breadcrumbs/long-path.example";
import longPath from "./breadcrumbs/long-path.example.tsx?raw";
import NextLevel from "./breadcrumbs/next-level.example";
import nextLevel from "./breadcrumbs/next-level.example.tsx?raw";
import MoveToFolder from "./breadcrumbs/move-to-folder.example";
import moveToFolder from "./breadcrumbs/move-to-folder.example.tsx?raw";

export const page: PlatformPage = "breadcrumbs";

export const examples: ExampleDef[] = keepOnHotUpdate(import.meta.hot, "examples", [
  {
    title: "File browser",
    description: "Folders three and more levels deep in the studio’s Files: the trail leads the header’s top row, starts at Files with its folder icon (the Master level) and ends at the open folder as plain text. Because the trail starts with a Master crumb, the collapse toggle sits in the Sidebar (collapse=\"sidebar\"). Crumbs are links with an href, so they open in a new tab too; a top-level place shows no trail, and a narrow window collapses the middle.",
    wide: true,
    screen: true,
    render: () => <PreviewAppFrame><FileBrowser /></PreviewAppFrame>,
    code: exampleCode(fileBrowser),
  },
  {
    title: "Top bar trail",
    description: "The house pattern (HR-Platform): the trail leads the header’s top row right after the collapse toggle, so it starts at Home without the Master icon (master={false}); the Sidebar already shows the section. It follows the page’s place, not the way there: a project opened from Chi Tran’s profile reads Home › Projects › Loyalty app.",
    wide: true,
    screen: true,
    render: () => <PreviewAppFrame><TopBarTrail /></PreviewAppFrame>,
    code: exampleCode(topBarTrail),
  },
  {
    title: "Long path",
    description: "A handbook page six levels down keeps its trail on one line: maxItems keeps the root and the last levels, and “…” (named “Show 3 more”) opens the rest. Going up or down resets the collapse. The crumbs are BreadcrumbItem children, Figma's Item-List slot.",
    render: () => <LongPath />,
    code: exampleCode(longPath),
  },
  {
    title: "Next level",
    description: "Each crumb can set its own Level, Emphasis, State and Dash, like Figma's Item instances in the Item-List slot. The open folder is Medium and keeps its chevron while it has folders inside, and the menu after the chevron opens one of them; the crumbs go back up.",
    render: () => <NextLevel />,
    code: exampleCode(nextLevel),
  },
  {
    title: "Move to folder",
    description: "A folder picker inside a Dialog has its own trail, named “Folder path” and set in Medium emphasis because nothing else in the Dialog says where you are. Move here stays off in the file’s current folder, and Undo in the toast moves it back.",
    render: () => <MoveToFolder />,
    code: exampleCode(moveToFolder),
  },
]);
