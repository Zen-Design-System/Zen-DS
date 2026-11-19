/**
 * Sidebar flyout (Figma Side-Bar/Sub): closing it with Escape or a pick inside gives focus back to the rail item that
 * opened it (APG), instead of dropping focus on the page; a press outside leaves focus where it went.
 */
import { useState } from "react";
import { describe, expect, it } from "vitest";
import { render } from "vitest-browser-react";
import { userEvent } from "vitest/browser";
import { Button, Sidebar, SidebarSubMenu } from "../../src/index";

function Owner() {
  const [open, setOpen] = useState(false);
  const [picked, setPicked] = useState("none");
  return (
    <>
      <Sidebar
        variant="basic"
        productName="Kaiz"
        sections={[{ items: [
          { id: "home", label: "Home", icon: "icon-home-03-line" },
          { id: "projects", label: "Projects", selected: open, icon: "icon-cube-line" },
        ] }]}
        onItemClick={(item) => { if (item.id === "projects") setOpen((on) => !on); }}
        subMenu={open ? (
          <SidebarSubMenu items={["components", "tokens"].map((id) => ({ id, label: id === "tokens" ? "Tokens" : "Components", icon: "icon-folder-line" }))}
            onItemClick={(item) => { setPicked(item.id); setOpen(false); }} />
        ) : undefined}
        subMenuLabel="Projects"
        onSubMenuClose={() => setOpen(false)}
      />
      <Button>Elsewhere</Button>
      <output>{picked}</output>
    </>
  );
}

describe("Sidebar flyout focus", () => {
  it("Escape inside the flyout returns focus to the rail item that opened it", async () => {
    const screen = await render(<Owner />);
    const projects = screen.getByRole("button", { name: "Projects" }).first();
    await projects.click();
    const tokens = screen.getByRole("region", { name: "Projects" }).getByText("Tokens");
    await expect.element(tokens).toBeInTheDocument();
    (tokens.element().closest("button, a, [tabindex]") as HTMLElement).focus();
    await userEvent.keyboard("{Escape}");
    await expect.element(screen.getByRole("region", { name: "Projects" })).not.toBeInTheDocument();
    await expect.element(projects).toHaveFocus();
  });

  it("a pick inside the flyout returns focus to the rail item", async () => {
    const screen = await render(<Owner />);
    const projects = screen.getByRole("button", { name: "Projects" }).first();
    await projects.click();
    await screen.getByRole("region", { name: "Projects" }).getByText("Tokens").click();
    await expect.element(screen.getByText("tokens")).toBeInTheDocument();
    await expect.element(projects).toHaveFocus();
  });

  it("a press outside keeps focus where it went", async () => {
    const screen = await render(<Owner />);
    await screen.getByRole("button", { name: "Projects" }).first().click();
    await screen.getByRole("button", { name: "Elsewhere" }).click();
    await expect.element(screen.getByRole("region", { name: "Projects" })).not.toBeInTheDocument();
    await expect.element(screen.getByRole("button", { name: "Elsewhere" })).toHaveFocus();
  });
});
