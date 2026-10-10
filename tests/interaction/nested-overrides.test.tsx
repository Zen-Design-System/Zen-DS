/**
 * Figma instance overrides in code (src/components/_shared/nested.tsx): `overrides` on the written instance changes the
 * props of the Zen components it draws itself, at any depth and row by row, and never reaches slot content.
 */
import { describe, expect, it } from "vitest";
import { render } from "vitest-browser-react";
import { overridesAt } from "../../src/components/_shared/nested";
import { AvatarStack } from "../../src/components/Avatar";
import { Badge } from "../../src/components/Badge";
import { Card } from "../../src/components/Card";
import { ChatMessage, ChatThread } from "../../src/components/Chat";
import { DatePicker } from "../../src/components/DatePicker";
import { InputField } from "../../src/components/Input";
import { ListItem } from "../../src/components/ListItem";
import { Sidebar } from "../../src/components/Sidebar";
import { Table } from "../../src/components/Table";

type Person = { id: string; name: string; status: string };
const people: Person[] = [
  { id: "alex", name: "Alex Duong", status: "Active" },
  { id: "binh", name: "Binh Tran", status: "Active" },
  { id: "chi", name: "Chi Le", status: "Away" },
];
const columns = [
  { id: "name", header: "Name", field: "name" },
  { id: "status", header: "Status", field: "status", content: "badge" as const },
];

describe("nested overrides", () => {
  it("lets the outermost table win and resolves paths relative to each table", () => {
    const tables: Parameters<typeof overridesAt>[0] = [
      { base: "", table: { "Sub-Action/Leading-Icon": { name: "outer" } } },
      { base: "Sub-Action", table: { "Leading-Icon": { name: "inner", size: "lg" } } },
    ];
    expect(overridesAt(tables, "Sub-Action/Leading-Icon")).toEqual({ name: "outer", size: "lg" });
    expect(overridesAt(tables, "Sub-Action")).toBeNull();
  });

  it("changes a nested instance (level 2) and its nested icon (level 3)", async () => {
    const screen = await render(
      <Card subAction={{ label: "More" }} overrides={{ "Sub-Action": { level: "danger" }, "Sub-Action/Leading-Icon": { name: "icon-plus-line" } }}>
        Body
      </Card>,
    );
    const button = screen.container.querySelector(".zen-card__sub-action .zen-button")!;
    expect(button.getAttribute("data-level")).toBe("danger");
    expect(button.querySelector("[data-icon]")?.getAttribute("data-icon")).toBe("icon-plus-line");
  });

  it("changes one row of a Table only", async () => {
    const screen = await render(<Table aria-label="People" columns={columns} rows={people} getRowId={(row) => row.id} overrides={{ "Row[binh]/status/Badge": { theme: "red" } }} />);
    const tones = Array.from(screen.container.querySelectorAll("tbody .zen-badge")).map((badge) => badge.getAttribute("data-tone"));
    expect(tones).toEqual(["neutral", "red", "neutral"]);
  });

  it("never reaches slot content: a Badge the page puts in a Card keeps its own props", async () => {
    const screen = await render(
      <Card overrides={{ Leading: { name: "icon-plus-line" } }}>
        <Badge leading="icon-check-line">Done</Badge>
      </Card>,
    );
    expect(screen.container.querySelector(".zen-badge [data-icon]")?.getAttribute("data-icon")).toBe("icon-check-line");
  });

  it("keys repeated layers by index (AvatarStack) and icon-name leading by layer (ListItem)", async () => {
    const screen = await render(
      <>
        <AvatarStack items={[{ alt: "Alex Duong" }, { alt: "Binh Tran" }]} overrides={{ "Avatar[1]": { theme: "red" } }} />
        <ListItem as="div" title="Starred" leading="icon-users-line" overrides={{ Leading: { name: "icon-heart-line" } }} />
      </>,
    );
    const avatars = Array.from(screen.container.querySelectorAll(".zen-avatar-stack .zen-avatar")).map((avatar) => avatar.getAttribute("data-tone"));
    expect(avatars).toEqual(["neutral", "red"]);
    expect(screen.container.querySelector(".zen-list-item [data-icon]")?.getAttribute("data-icon")).toBe("icon-heart-line");
  });

  it("reaches a Sidebar row's counter and a child row's counter (nested of nested)", async () => {
    const sections = [{ items: [
      { id: "inbox", label: "Inbox", icon: "icon-home-02-solid" as const, counter: 3 },
      { id: "team", label: "Team", icon: "icon-users-line" as const, children: [{ id: "members", label: "Members", counter: 2 }] },
    ] }];
    const screen = await render(
      <Sidebar aria-label="Main" sections={sections} selectedId="members" overrides={{ "Item[inbox]/Badge-Counter": { theme: "accent" }, "Item[team]/Item[members]/Badge-Counter": { theme: "red" }, "Item[team]/Icon": { name: "icon-heart-line" } }} />,
    );
    const tones = Array.from(screen.container.querySelectorAll(".zen-sidebar__counter")).map((badge) => badge.getAttribute("data-tone"));
    expect(tones).toEqual(["accent", "red"]);
    // Icons outside the core set load lazily: wait for both.
    await expect.poll(() => Array.from(screen.container.querySelectorAll(".zen-sidebar__item-icon [data-icon]")).map((icon) => icon.getAttribute("data-icon"))).toEqual(["icon-home-02-solid", "icon-heart-line"]);
  });

  it("reaches a field's Label, Help-Text and Leading icon (Input family)", async () => {
    const screen = await render(
      <InputField label="Work email" helpText="We send the invoice here." leading="icon-users-line" overrides={{ Label: { optional: true }, "Help-Text": { theme: "warning" }, Leading: { name: "icon-heart-line" } }} />,
    );
    expect(screen.container.querySelector(".zen-input-label__optional")).not.toBeNull();
    expect(screen.container.querySelector(".zen-input-help")?.getAttribute("data-tone")).toBe("warning");
    expect(screen.container.querySelector(".zen-input__affordance--leading [data-icon]")?.getAttribute("data-icon")).toBe("icon-heart-line");
    // The native input never receives the table.
    expect(screen.container.querySelector("input")?.hasAttribute("overrides")).toBe(false);
  });

  it("reaches a DatePicker's footer button and a Chat message's avatar", async () => {
    const screen = await render(
      <>
        <DatePicker aria-label="Due date" defaultValue={new Date(2026, 9, 12)} today={new Date(2026, 9, 11)} showActions overrides={{ "Actions/Apply": { level: "accent" } }} />
        <ChatThread aria-label="Thread">
          <ChatMessage side="others" author={{ name: "Ava Chen" }} time="9:41" overrides={{ Avatar: { theme: "red" } }}>Hi</ChatMessage>
        </ChatThread>
      </>,
    );
    const apply = Array.from(screen.container.querySelectorAll(".zen-date-picker__actions .zen-button")).at(-1);
    expect(apply?.getAttribute("data-level")).toBe("accent");
    expect(screen.container.querySelector(".zen-chat-message .zen-avatar")?.getAttribute("data-tone")).toBe("red");
  });

  it("renders the same DOM without overrides", async () => {
    const plain = await render(<Table aria-label="People" columns={columns} rows={people} getRowId={(row) => row.id} />);
    const html = plain.container.innerHTML;
    await plain.unmount();
    const empty = await render(<Table aria-label="People" columns={columns} rows={people} getRowId={(row) => row.id} overrides={{}} />);
    expect(empty.container.innerHTML).toBe(html);
  });
});
