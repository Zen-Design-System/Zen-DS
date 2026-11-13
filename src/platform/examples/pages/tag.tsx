/* Tag examples (brief: docs/research/example-rebuild-brief-2026-09-30.md). Đìzai Studio, signed in as Alex Duong,
   Wednesday Sep 30, 2026, 10:30 am. A Tag is a chosen value: people and keywords inside a field, removable with ×;
   Error flags a value that can't be used; onClick acts on the value itself (filter by it). Statuses stay Badges and
   filters stay Chips. No Disabled example: a Tag is disabled only inside a disabled field, and the Autocomplete field
   has no Disabled state (Read-only instead, shown in "Reviewers").
   Each example is its own file in tag/ (P2b, plan docs/research/code-languages-plan-2026-10-03.md §11): the card
   renders its default export and shows its text as the snippet. */
import { PlatformPhoneApp } from "../../PlatformPhone";
import type { PlatformPage } from "../../PlatformExamples";
import { keepOnHotUpdate } from "../../hotData";
import { exampleCode } from "../exampleCode";
import type { ExampleDef } from "../types";
import Reviewers from "./tag/reviewers.example";
import reviewers from "./tag/reviewers.example.tsx?raw";
import NewGroup from "./tag/members-on-a-phone.example";
import newGroup from "./tag/members-on-a-phone.example.tsx?raw";
import FilterByTag from "./tag/filter-by-tag.example";
import filterByTag from "./tag/filter-by-tag.example.tsx?raw";
import Keywords from "./tag/keywords.example";
import keywords from "./tag/keywords.example.tsx?raw";
import InviteGuests from "./tag/invalid-email-addresses.example";
import inviteGuests from "./tag/invalid-email-addresses.example.tsx?raw";

export const page: PlatformPage = "tag";

export const examples: ExampleDef[] = keepOnHotUpdate(import.meta.hot, "examples", [
  {
    title: "Reviewers",
    description: "People picked for a review are photo Tags inside the field, each removable with ×. After saving, the field turns Read-only: the tags stay, without × or Add.",
    render: () => <Reviewers />,
    code: exampleCode(reviewers),
  },
  {
    title: "Members on a phone",
    description: "On a phone the member tags wrap onto new lines and each × keeps a 24px touch area; Add people opens a Bottom Sheet where tapping a person selects them. New group is a modal screen: Close asks before it drops the draft, and Create group sits in the footer.",
    render: () => <PlatformPhoneApp label="Zen app" app={NewGroup} />,
    code: exampleCode(newGroup),
  },
  {
    title: "Filter by tag",
    wide: true,
    description: "In a research library each tag is a toggle button: pressing it filters the table by that value, pressing it again clears the filter, and the Tag chip above shows the same filter.",
    render: () => <FilterByTag />,
    code: exampleCode(filterByTag),
  },
  {
    title: "Keywords",
    description: "Keywords are Tags inside the field. Add keyword picks one the studio already uses or creates a new one from what you type; a keyword that is already there is picked, never added twice.",
    render: () => <Keywords />,
    code: exampleCode(keywords),
  },
  {
    title: "Invalid email addresses",
    description: "An address that can't receive an invite stays in the field as an Error tag, and the field's error text says how to fix it. Send invites with an invalid address announces the error and moves focus to that address's Remove, ready to fix.",
    render: () => <InviteGuests />,
    code: exampleCode(inviteGuests),
  },
]);
