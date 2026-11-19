/* Pagination examples. Đìzai Studio's Invoices table, a search through the shared drive, the Hanoi Book Fair app's
   exhibitors on a phone, a moodboard's photos and the workspace activity log. Each example is its own file in
   pagination/ (P2b, plan docs/research/code-languages-plan-2026-10-03.md §11): the card renders its default export and
   shows its text as the snippet. */
import { PreviewAppFrame } from "../../PlatformFrames";
import { PlatformPhoneApp } from "../../PlatformPhone";
import type { PlatformPage } from "../../PlatformExamples";
import { keepOnHotUpdate } from "../../hotData";
import { exampleCode } from "../exampleCode";
import type { ExampleDef } from "../types";
import InvoiceTable from "./pagination/table-footer.example";
import invoiceTable from "./pagination/table-footer.example.tsx?raw";
import FileSearch from "./pagination/search-results.example";
import fileSearch from "./pagination/search-results.example.tsx?raw";
import MobileExhibitors from "./pagination/mobile-list.example";
import mobileExhibitors from "./pagination/mobile-list.example.tsx?raw";
import Moodboard from "./pagination/photo-pages.example";
import moodboard from "./pagination/photo-pages.example.tsx?raw";
import ActivityLog from "./pagination/typed-page-size.example";
import activityLog from "./pagination/typed-page-size.example.tsx?raw";

export const page: PlatformPage = "pagination";

export const examples: ExampleDef[] = keepOnHotUpdate(import.meta.hot, "examples", [
  {
    title: "Table footer",
    wide: true,
    screen: true,
    description: "The Inline theme sits under an index table on the studio's Invoices page: its Chip picks 10, 25 or 50 rows a page and the range beside the arrows says which rows show. The filters sit in the AppShell header's Sections row; a new filter starts again from page 1, while turning pages keeps the filters.",
    render: () => <PreviewAppFrame height={{ min: 640, max: 820 }}><InvoiceTable /></PreviewAppFrame>,
    code: exampleCode(invoiceTable),
  },
  {
    title: "Search results",
    description: "Numbered pages under 85 results, with the middle folded into “…”; below 480px only the first, current and last pages stay. A new search goes back to page 1, and a search that fits on one or two pages shows every result with no pagination.",
    render: () => <FileSearch />,
    code: exampleCode(fileSearch),
  },
  {
    title: "Mobile list",
    description: "On a phone the pages sit at the end of a list longer than the screen, in the Small size for 32px targets, on the Exhibitors root of the fair's app (the large title, the bottom bar). A page change scrolls the screen back to the top, so the large title opens again over the first row, and focus moves up to the count.",
    render: () => <PlatformPhoneApp label="Hanoi Book Fair app" canvas="default" app={MobileExhibitors} />,
    code: exampleCode(mobileExhibitors),
  },
  {
    title: "Photo pages",
    description: "The Secondary theme marks the current page with a Subtle fill instead of a solid one, so it stays quiet under photos. Small items give a 32px target.",
    render: () => <Moodboard />,
    code: exampleCode(moodboard),
  },
  {
    title: "Typed page size",
    description: "The Manually theme lets people type how many events a page holds; Enter or leaving the field applies it and the first event stays on screen. Each page loads from the server, so Skeleton rows hold its place.",
    render: () => <ActivityLog />,
    code: exampleCode(activityLog),
  },
]);
