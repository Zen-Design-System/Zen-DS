/**
 * Approved backlog fixes (2026-10-02, group b2): initials Avatars are named by `alt` (so an AvatarStack reads names),
 * Badge `removeLabel`, a selected look for a pressed clickable Tag, and `<Link as="button">` without browser button chrome.
 */
import { describe, expect, it, vi } from "vitest";
import { render } from "vitest-browser-react";
import { Avatar, AvatarStack, Badge, Icon, Link, Tag, ZenProvider } from "../../src/index";

const PHOTO = "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='40' height='40'><rect width='40' height='40' fill='%23c8d6c2'/></svg>";

/** The computed colour a token resolves to, read through a probe element's `color`. */
function tokenColor(token: string) {
  const probe = document.createElement("span");
  probe.style.color = `var(${token})`;
  document.body.appendChild(probe);
  const color = getComputedStyle(probe).color;
  probe.remove();
  return color;
}

describe("Avatar initials name", () => {
  it("names an initials avatar by alt (role img) and hides the letters, so a stack reads names", async () => {
    const screen = await render(
      <ZenProvider>
        <AvatarStack items={[{ alt: "Ava Nguyen", children: "AN" }, { alt: "Minh Tran", children: "MT" }, { alt: "Bao Le" }]} max={2} showMore />
      </ZenProvider>,
    );
    await expect.element(screen.getByRole("img", { name: "Ava Nguyen" })).toBeInTheDocument();
    await expect.element(screen.getByRole("img", { name: "Minh Tran" })).toBeInTheDocument();
    // The overflow avatar keeps its count readable.
    await expect.element(screen.getByRole("img", { name: "+1" })).toBeInTheDocument();
    for (const initials of ["AN", "MT"]) expect(screen.getByText(initials).element().getAttribute("aria-hidden")).toBe("true");
  });

  it("is decorative with alt=\"\" and keeps a photo's own alt", async () => {
    const screen = await render(
      <ZenProvider>
        <span data-testid="decorative"><Avatar theme="blue" alt="">AC</Avatar></span>
        <span data-testid="photo"><Avatar theme="photo" src={PHOTO} alt="Ava Chen" /></span>
      </ZenProvider>,
    );
    const decorative = screen.getByTestId("decorative").element().querySelector(".zen-avatar")!;
    expect(decorative.getAttribute("role")).toBeNull();
    expect(decorative.getAttribute("aria-label")).toBeNull();
    expect(decorative.querySelector(".zen-avatar__initials")!.getAttribute("aria-hidden")).toBe("true");
    const photo = screen.getByTestId("photo").element().querySelector(".zen-avatar")!;
    expect(photo.getAttribute("role")).toBeNull();
    await expect.element(screen.getByRole("img", { name: "Ava Chen" })).toHaveProperty("tagName", "IMG");
  });

  it("adds the status to the name in the locale's language", async () => {
    const screen = await render(
      <>
        <ZenProvider><Avatar theme="indigo" alt="Ava Chen" status>AC</Avatar></ZenProvider>
        <ZenProvider locale="vi"><Avatar theme="indigo" alt="Minh Tran" status>MT</Avatar></ZenProvider>
      </>,
    );
    await expect.element(screen.getByRole("img", { name: "Ava Chen, Online" })).toBeInTheDocument();
    await expect.element(screen.getByRole("img", { name: "Minh Tran, Đang hoạt động" })).toBeInTheDocument();
  });
});

describe("Badge removeLabel", () => {
  it("names the remove button of a non-text badge; the default stays Remove <label>", async () => {
    const onRemove = vi.fn();
    const screen = await render(
      <ZenProvider>
        <Badge remove onRemove={onRemove} removeLabel="Remove the urgent flag"><Icon name="icon-flag-01-line" decorative /></Badge>
        <Badge remove onRemove={() => {}}>Design</Badge>
      </ZenProvider>,
    );
    await screen.getByRole("button", { name: "Remove the urgent flag" }).click();
    expect(onRemove).toHaveBeenCalledTimes(1);
    await expect.element(screen.getByRole("button", { name: "Remove Design" })).toBeInTheDocument();
  });
});

describe("Tag pressed", () => {
  it("draws a clickable tag with aria-pressed=true selected (Chip selected tokens), others unchanged", async () => {
    const screen = await render(
      <ZenProvider>
        <Tag onClick={() => {}} aria-pressed={true}>React</Tag>
        <Tag onClick={() => {}} aria-pressed={false}>Vue</Tag>
        <Tag onClick={() => {}} aria-pressed={true} error>Svelte</Tag>
        <Tag onClick={() => {}} aria-pressed={true} disabled>Solid</Tag>
      </ZenProvider>,
    );
    const pressed = screen.getByRole("button", { name: "React" }).element() as HTMLElement;
    const idle = screen.getByRole("button", { name: "Vue" }).element() as HTMLElement;
    const selectedBorder = tokenColor("--zen-chip-secondary-border-selected");
    const style = getComputedStyle(pressed);
    expect(style.boxShadow).toContain(`${selectedBorder} 0px 0px 0px 2px inset`);
    expect(style.color).toBe(tokenColor("--zen-chip-secondary-content-selected"));
    expect(style.backgroundColor).toBe(tokenColor("--zen-chip-secondary-background-seclected-default"));
    expect(getComputedStyle(idle).boxShadow).toContain("0px 0px 0px 1px inset");
    expect(getComputedStyle(idle).boxShadow).not.toContain(selectedBorder);
    // Error and Disabled keep their own paint.
    const error = screen.getByRole("button", { name: "Svelte" }).element() as HTMLElement;
    expect(getComputedStyle(error).boxShadow).toContain(tokenColor("--zen-color-border-negative-solid-default"));
    const disabled = screen.getByText("Solid").element().closest(".zen-tag") as HTMLElement;
    expect(getComputedStyle(disabled).boxShadow).toContain(tokenColor("--zen-color-border-disabled"));
  });
});

describe("Link as button", () => {
  it("has no button chrome: same fill, border, padding, font and colour as the anchor link", async () => {
    const onClick = vi.fn();
    const screen = await render(
      <ZenProvider>
        <p style={{ fontFamily: "Georgia, serif", fontSize: 21, fontWeight: 600, lineHeight: "30px", letterSpacing: "1px", textAlign: "right", wordSpacing: "3px" }}>
          Read the <Link href="#terms">terms</Link> or <Link as="button" onClick={onClick}>show them here</Link>.
        </p>
      </ZenProvider>,
    );
    const anchor = screen.getByRole("link", { name: "terms" }).element();
    const button = screen.getByRole("button", { name: "show them here" }).element();
    const a = getComputedStyle(anchor), b = getComputedStyle(button);
    for (const prop of ["color", "font-family", "font-size", "font-weight", "line-height", "letter-spacing", "word-spacing", "text-align", "text-transform", "text-decoration-line", "cursor"]) {
      expect(b.getPropertyValue(prop), prop).toBe(a.getPropertyValue(prop));
    }
    expect(b.backgroundColor).toBe("rgba(0, 0, 0, 0)");
    for (const side of ["top", "right", "bottom", "left"]) {
      expect(b.getPropertyValue(`border-${side}-width`)).toBe("0px");
      expect(b.getPropertyValue(`padding-${side}`)).toBe("0px");
      expect(b.getPropertyValue(`margin-${side}`)).toBe("0px");
    }
    expect(b.appearance).toBe("none");
    await screen.getByRole("button", { name: "show them here" }).click();
    expect(onClick).toHaveBeenCalledTimes(1);
  });
});
