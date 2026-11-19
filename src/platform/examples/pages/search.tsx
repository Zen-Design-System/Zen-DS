/* Search examples (rebuild brief 2026-09-30): finding things in Đìzai Studio's Zen workspace — the studio directory,
   the invoice list, client files, projects, files on a phone and client contacts during an import. Each card teaches
   one Search decision.
   Each example is its own file in search/ (P2b, plan docs/research/code-languages-plan-2026-10-03.md §11): the card
   renders its default export and shows its text as the snippet. */
import { PlatformPhoneApp } from "../../PlatformPhone";
import type { PlatformPage } from "../../PlatformExamples";
import { keepOnHotUpdate } from "../../hotData";
import { exampleCode } from "../exampleCode";
import type { ExampleDef } from "../types";
import Directory from "./search/filter-as-you-type.example";
import directory from "./search/filter-as-you-type.example.tsx?raw";
import InvoiceToolbar from "./search/table-toolbar.example";
import invoiceToolbar from "./search/table-toolbar.example.tsx?raw";
import ClientFiles from "./search/search-in-a-scope.example";
import clientFiles from "./search/search-in-a-scope.example.tsx?raw";
import ProjectJump from "./search/jump-with-a-shortcut.example";
import projectJump from "./search/jump-with-a-shortcut.example.tsx?raw";
import PhoneFiles from "./search/search-on-a-phone.example";
import phoneFiles from "./search/search-on-a-phone.example.tsx?raw";
import ContactImport from "./search/search-during-an-import.example";
import contactImport from "./search/search-during-an-import.example.tsx?raw";

export const page: PlatformPage = "search";

export const examples: ExampleDef[] = keepOnHotUpdate(import.meta.hot, "examples", [
  {
    title: "Filter as you type",
    description: "The directory narrows on every keystroke, by name, role, team or city, and the count under the field is announced. When nothing matches, the Empty State echoes the query and Clear search empties the field and puts focus back in it.",
    render: () => <Directory />,
    code: exampleCode(directory),
  },
  {
    title: "Table toolbar",
    description: "Over a table, Search grows up to 240px and the filters sit beside it as Chip Advanced, wrapping under it when the toolbar is narrow. The query matches the invoice number, client or project; the chips narrow further, and the count and total follow.",
    wide: true,
    render: () => <InvoiceToolbar />,
    code: exampleCode(invoiceToolbar),
  },
  {
    title: "Search in a scope",
    description: "The Filter-Dropdown theme keeps the scope inside the field: Search in lists the clients and the pick shows in the trailing slot. When a scoped search finds nothing, the Empty State offers to search all clients.",
    render: () => <ClientFiles />,
    code: exampleCode(clientFiles),
  },
  {
    title: "Jump with a shortcut",
    description: "With shortcut=\"j\" the empty field shows ⌘J, and ⌘J focuses it from anywhere on the page. With no query the list shows recent projects; Enter opens the first match, Escape clears, and opening a project resets the list to recents.",
    wide: true,
    render: () => <ProjectJump />,
    code: exampleCode(projectJump),
  },
  {
    title: "Search on a phone",
    description: "On a phone Search is a pill (shape=\"rounded\", recommended on mobile) in the Top Navigation control bar at full size and folds away with the large title; folded, it waits as a top-right action that scrolls back up and focuses the field. The Filter-Icon theme opens a Bottom Sheet with the file types as a pick-one list.",
    render: () => <PlatformPhoneApp label="Files" app={PhoneFiles} />,
    code: exampleCode(phoneFiles),
  },
  {
    title: "Search during an import",
    description: "Search is disabled only while something blocks it: contacts are still arriving, so results would be incomplete. The Inline Message under the field says why, and search comes back when the import finishes or is cancelled.",
    render: () => <ContactImport />,
    code: exampleCode(contactImport),
  },
]);
