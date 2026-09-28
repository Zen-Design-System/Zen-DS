/**
 * The canonical control API (what agents guess from Radix/MUI) and its deprecated aliases: value controls report
 * through onValueChange, boolean controls through onCheckedChange, and the old callbacks keep firing.
 */
import { describe, expect, it, vi } from "vitest";
import { render } from "vitest-browser-react";
import { userEvent } from "vitest/browser";
import { Checkbox, HeadingField, IconButton, Search, Segmented, SelectField, Slider, Tabs, Toggle, ZenProvider } from "../../src/index";

describe("value controls: onValueChange", () => {
  it("Tabs report the selected id through onValueChange and the deprecated onChange", async () => {
    const onValueChange = vi.fn();
    const onChange = vi.fn();
    const screen = await render(<ZenProvider><Tabs aria-label="Sections" items={[{ id: "overview", label: "Overview" }, { id: "activity", label: "Activity" }]} onValueChange={onValueChange} onChange={onChange} /></ZenProvider>);
    await screen.getByRole("tab", { name: "Activity" }).click();
    expect(onValueChange).toHaveBeenLastCalledWith("activity");
    expect(onChange).toHaveBeenLastCalledWith("activity");
    await expect.element(screen.getByRole("tab", { name: "Activity" })).toHaveAttribute("aria-selected", "true");
  });

  it("Segmented is uncontrolled with defaultValue and reports changes", async () => {
    const onValueChange = vi.fn();
    const screen = await render(<ZenProvider><Segmented aria-label="View" defaultValue="list" options={[{ id: "list", label: "List" }, { id: "board", label: "Board" }]} onValueChange={onValueChange} /></ZenProvider>);
    await screen.getByText("Board").click();
    expect(onValueChange).toHaveBeenLastCalledWith("board");
  });

  it("Segmented scrolls sideways when it outgrows its container, labels never overlap and the selection stays in view", async () => {
    // Templates › Empty & error states at 390px: four two-word segments in a 236px column used to squeeze into each other.
    const options = ["404", "No results", "First use", "Load failed"].map((label) => ({ id: label, label }));
    const screen = await render(<ZenProvider><div style={{ width: 200 }}><Segmented aria-label="State" defaultValue="Load failed" options={options} /></div></ZenProvider>);
    const group = screen.getByRole("group", { name: "State" }).element() as HTMLElement;
    const items = [...group.querySelectorAll<HTMLElement>(".zen-segmented__item")];
    expect(group.scrollWidth).toBeGreaterThan(group.clientWidth);
    for (const item of items) expect(item.scrollWidth).toBeLessThanOrEqual(item.clientWidth);
    for (let i = 1; i < items.length; i += 1) expect(items[i].getBoundingClientRect().left).toBeGreaterThanOrEqual(items[i - 1].getBoundingClientRect().right - 0.5);
    const box = group.getBoundingClientRect();
    const selected = items[3].getBoundingClientRect();
    expect(selected.left).toBeGreaterThanOrEqual(box.left);
    expect(selected.right).toBeLessThanOrEqual(box.right);
  });

  it("Segmented keeps the selection in view inside a scaled ancestor (device previews)", async () => {
    // PlatformPhone scales the whole device with a transform: screen-pixel rects must be converted before scrolling.
    const options = ["This week", "This month", "This quarter", "This year"].map((label) => ({ id: label, label }));
    const screen = await render(<ZenProvider><div style={{ transform: "scale(0.5)", transformOrigin: "0 0" }}><div style={{ width: 200 }}><Segmented aria-label="Period" defaultValue="This year" options={options} /></div></div></ZenProvider>);
    const group = screen.getByRole("group", { name: "Period" }).element() as HTMLElement;
    expect(group.scrollWidth).toBeGreaterThan(group.clientWidth);
    const box = group.getBoundingClientRect();
    const selected = [...group.querySelectorAll<HTMLElement>(".zen-segmented__item")][3].getBoundingClientRect();
    expect(selected.left).toBeGreaterThanOrEqual(box.left);
    expect(selected.right).toBeLessThanOrEqual(box.right);
  });

  it("Slider moves with the arrow keys", async () => {
    const onValueChange = vi.fn();
    const screen = await render(<ZenProvider><Slider aria-label="Volume" defaultValue={50} onValueChange={onValueChange} /></ZenProvider>);
    screen.getByRole("slider", { name: "Volume" }).element().focus();
    await userEvent.keyboard("{ArrowRight}");
    expect(onValueChange).toHaveBeenLastCalledWith(51);
  });

  it("Search reports typing and clearing as plain strings", async () => {
    const onValueChange = vi.fn();
    const screen = await render(<ZenProvider><Search aria-label="Search members" onValueChange={onValueChange} /></ZenProvider>);
    await userEvent.fill(screen.getByRole("searchbox", { name: "Search members" }).or(screen.getByRole("textbox", { name: "Search members" })), "ava");
    expect(onValueChange).toHaveBeenLastCalledWith("ava");
    await screen.getByRole("button", { name: "Clear search" }).click();
    expect(onValueChange).toHaveBeenLastCalledWith("");
  });

  it("SelectField shows its placeholder until a value is picked", async () => {
    const onValueChange = vi.fn();
    const screen = await render(<ZenProvider><SelectField label="Role" placeholder="Choose a role" options={[{ label: "Admin", value: "admin" }, { label: "Editor", value: "editor" }]} onValueChange={onValueChange} /></ZenProvider>);
    // The visible trigger shows the placeholder (the hidden native select has it as an empty option too).
    await expect.element(screen.getByText("Choose a role").first()).toBeVisible();
    await screen.getByText("Choose a role").first().click();
    await screen.getByRole("option", { name: "Editor" }).click();
    expect(onValueChange.mock.calls.at(-1)?.[0]).toBe("editor");
  });
});

describe("boolean controls: checked / onCheckedChange", () => {
  it("Checkbox reports the new state through onCheckedChange and the deprecated onChange", async () => {
    const onCheckedChange = vi.fn();
    const onChange = vi.fn();
    const screen = await render(<ZenProvider><Checkbox label="Email me updates" onCheckedChange={onCheckedChange} onChange={onChange} /></ZenProvider>);
    await screen.getByText("Email me updates").click();
    expect(onCheckedChange).toHaveBeenLastCalledWith(true);
    expect(onChange.mock.calls.at(-1)?.[0]).toBe(true);
  });

  it("Toggle takes checked/defaultChecked, toggles with Space and exposes one switch", async () => {
    const onCheckedChange = vi.fn();
    const screen = await render(<ZenProvider><Toggle label="Notifications" defaultChecked onCheckedChange={onCheckedChange} /></ZenProvider>);
    const toggle = screen.getByRole("switch", { name: "Notifications" });
    await expect.element(toggle).toHaveAttribute("aria-checked", "true");
    toggle.element().focus();
    await userEvent.keyboard(" ");
    expect(onCheckedChange).toHaveBeenLastCalledWith(false);
    await expect.element(toggle).toHaveAttribute("aria-checked", "false");
    expect(screen.container.querySelectorAll('[role="switch"]').length).toBe(1);
  });
});

describe("icon props take a name", () => {
  it("IconButton draws an icon from icon=\"name\" and names itself for assistive tech", async () => {
    const screen = await render(<ZenProvider><IconButton icon="icon-plus-line" aria-label="Add member" onClick={() => undefined} /></ZenProvider>);
    const button = screen.getByRole("button", { name: "Add member" });
    await expect.element(button).toBeVisible();
    expect(button.element().querySelector('svg[data-icon="icon-plus-line"]')).not.toBeNull();
  });
});

describe("HeadingField: single-line and multiline", () => {
  const long = "Q4 roadmap: ship Zen DS to every product team, with templates, docs and a migration guide";

  it("single-line is an input that reports typing through onValueChange", async () => {
    const onValueChange = vi.fn();
    const screen = await render(<ZenProvider><HeadingField aria-label="Board name" onValueChange={onValueChange} /></ZenProvider>);
    const field = screen.getByRole("textbox", { name: "Board name" });
    await userEvent.fill(field, "Roadmap");
    expect(onValueChange).toHaveBeenLastCalledWith("Roadmap");
    expect(field.element().tagName).toBe("INPUT");
  });

  it("multiline wraps a long heading, grows to show all of it, and Enter adds no line break", async () => {
    const onValueChange = vi.fn();
    const screen = await render(<ZenProvider><div style={{ width: 240 }}><HeadingField multiline headingSize="h2" aria-label="Announcement title" defaultValue="Q4" onValueChange={onValueChange} /></div></ZenProvider>);
    const field = screen.getByRole("textbox", { name: "Announcement title" });
    const node = field.element() as HTMLTextAreaElement;
    expect(node.tagName).toBe("TEXTAREA");
    const oneLine = node.offsetHeight;
    await userEvent.fill(field, long);
    expect(onValueChange).toHaveBeenLastCalledWith(long);
    expect(node.offsetHeight).toBeGreaterThan(oneLine * 2);
    expect(node.scrollHeight).toBeLessThanOrEqual(node.clientHeight);
    await userEvent.keyboard("{Enter}");
    expect(node.value).toBe(long);
  });

  it("multiline turns pasted line breaks into spaces", async () => {
    const screen = await render(<ZenProvider><HeadingField multiline aria-label="Title" /></ZenProvider>);
    const node = screen.getByRole("textbox", { name: "Title" }).element() as HTMLTextAreaElement;
    node.focus();
    const data = new DataTransfer();
    data.setData("text/plain", "Launch plan\nfor Q4\r\n");
    node.dispatchEvent(new ClipboardEvent("paste", { clipboardData: data, bubbles: true, cancelable: true }));
    await expect.poll(() => node.value).toBe("Launch plan for Q4");
  });
});
