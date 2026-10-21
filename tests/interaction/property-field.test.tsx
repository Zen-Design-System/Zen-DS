/**
 * PropertyField (Figma Input/Property-Field, 2026-10-21): each value edits in place. Text becomes an input (Enter saves,
 * Escape keeps the old text, focus returns to the value); a status opens its list of BadgeStatus steps; People and Tags
 * remove a chip with its own button and add through the + after the label.
 */
import { describe, expect, it } from "vitest";
import { render } from "vitest-browser-react";
import { userEvent } from "vitest/browser";
import { PropertyField, PropertyPeople, PropertyStatus, PropertyTags, PropertyText, ZenProvider } from "../../src/index";

const people = [{ value: "alex", label: "Alex Duong" }, { value: "sun", label: "Sun Hung" }, { value: "linh", label: "Linh Tran" }];

describe("PropertyField", () => {
  it("names the value by the row's label and says when it is empty", async () => {
    const screen = await render(<ZenProvider><PropertyField label="Start Date" icon="icon-calendar-line"><PropertyText /></PropertyField></ZenProvider>);
    await expect.element(screen.getByRole("group", { name: "Start Date" })).toBeVisible();
    await expect.element(screen.getByRole("button", { name: "Start Date Empty" })).toBeVisible();
  });

  it("edits text in place: Enter saves, Escape keeps the old text", async () => {
    let saved = "";
    const screen = await render(<ZenProvider><PropertyField label="Sprint"><PropertyText defaultValue="Sprint 42" onValueChange={(value) => { saved = value; }} /></PropertyField></ZenProvider>);
    await userEvent.click(screen.getByRole("button", { name: /Sprint 42/ }));
    const input = screen.getByRole("textbox", { name: "Sprint" });
    await expect.element(input).toHaveFocus();
    await userEvent.fill(input, "Sprint 43");
    await userEvent.keyboard("{Enter}");
    expect(saved).toBe("Sprint 43");
    await expect.element(screen.getByRole("button", { name: /Sprint 43/ })).toHaveFocus();
    await userEvent.keyboard("{Enter}");
    await userEvent.fill(screen.getByRole("textbox", { name: "Sprint" }), "Nope");
    await userEvent.keyboard("{Escape}");
    await expect.element(screen.getByRole("button", { name: /Sprint 43/ })).toBeVisible();
    expect(saved).toBe("Sprint 43");
  });

  it("picks a workflow step from the status list", async () => {
    let picked = "";
    const screen = await render(<ZenProvider><PropertyField label="Status"><PropertyStatus defaultValue="to-do" onValueChange={(value) => { picked = value; }} /></PropertyField></ZenProvider>);
    const cell = screen.getByRole("button", { name: /Status To Do/ });
    await expect.element(cell).toHaveAttribute("aria-haspopup", "listbox");
    await userEvent.click(cell);
    await expect.element(cell).toHaveAttribute("aria-expanded", "true");
    await userEvent.click(screen.getByRole("option", { name: /In Review/ }));
    expect(picked).toBe("in-review");
    await expect.element(screen.getByRole("button", { name: /Status In Review/ })).toBeVisible();
  });

  it("removes a person with the chip's button and adds one through the +", async () => {
    let value: string[] = [];
    const screen = await render(<ZenProvider><PropertyField label="Assignee"><PropertyPeople options={people} defaultValue={["alex", "sun"]} onValueChange={(next) => { value = next; }} /></PropertyField></ZenProvider>);
    await userEvent.click(screen.getByRole("button", { name: "Remove Sun Hung" }));
    expect(value).toEqual(["alex"]);
    await userEvent.click(screen.getByRole("button", { name: "Add Assignee" }));
    await userEvent.click(screen.getByRole("option", { name: /Linh Tran/ }));
    expect(value).toEqual(["alex", "linh"]);
  });

  it("the + toggles the list, and Escape returns focus to it", async () => {
    const screen = await render(<ZenProvider><PropertyField label="Assignee"><PropertyPeople options={people} defaultValue={["alex"]} /></PropertyField></ZenProvider>);
    const add = screen.getByRole("button", { name: "Add Assignee" });
    await userEvent.click(add);
    await expect.element(add).toHaveAttribute("aria-expanded", "true");
    await userEvent.click(add);
    await expect.element(add).toHaveAttribute("aria-expanded", "false");
    add.element().focus();
    await userEvent.keyboard("{Enter}");
    await expect.element(add).toHaveAttribute("aria-expanded", "true");
    await userEvent.keyboard("{Escape}");
    await expect.element(add).toHaveAttribute("aria-expanded", "false");
    await expect.element(add).toHaveFocus();
  });

  it("creates a label that is not listed", async () => {
    let created = "";
    const screen = await render(<ZenProvider><PropertyField label="Labels"><PropertyTags options={[{ value: "ds", label: "Design System", theme: "blue" }]} onCreate={(label) => { created = label; }} /></PropertyField></ZenProvider>);
    await userEvent.click(screen.getByRole("button", { name: "Add Labels" }));
    await userEvent.keyboard("Research");
    await userEvent.click(screen.getByRole("option", { name: /Create “Research”/ }));
    expect(created).toBe("Research");
  });

  it("shows the value only when readOnly", async () => {
    const screen = await render(<ZenProvider><PropertyField label="Status"><PropertyStatus readOnly defaultValue="done" /></PropertyField></ZenProvider>);
    expect(screen.container.querySelector("button.zen-property-value")).toBeNull();
    await expect.element(screen.getByText("Done")).toBeVisible();
  });
});
