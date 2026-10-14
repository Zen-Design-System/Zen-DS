/**
 * The shared building blocks every component composes (`src/components/_shared`): controlled/uncontrolled state, merged
 * refs, composed handlers, nested dismissable layers, and what an open modal does to the rest of the page.
 */
import { createRef, useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { describe, expect, it, vi } from "vitest";
import { render } from "vitest-browser-react";
import { userEvent } from "vitest/browser";
import { Dialog, ZenProvider } from "../../src/index";
import { useControllableState } from "../../src/components/_shared/use-controllable-state";
import { mergeRefs } from "../../src/components/_shared/merge-refs";
import { composeEventHandlers } from "../../src/components/_shared/compose-event-handlers";
import { useDismissableLayer } from "../../src/components/_shared/layers";

function Counter({ value, onChange }: { value?: number; onChange?: (value: number) => void }) {
  const [count, setCount] = useControllableState({ value, defaultValue: 0, onChange, name: "Counter value" });
  return <button type="button" onClick={() => setCount((c) => c + 1)}>{count}</button>;
}

describe("useControllableState", () => {
  it("keeps its own state when uncontrolled and reports each change", async () => {
    const onChange = vi.fn();
    const screen = await render(<Counter onChange={onChange} />);
    await userEvent.click(screen.getByRole("button"));
    await userEvent.click(screen.getByRole("button"));
    await expect.element(screen.getByRole("button")).toHaveTextContent("2");
    expect(onChange.mock.calls).toEqual([[1], [2]]);
  });

  it("shows the prop when controlled, and keeps asking when the parent refuses", async () => {
    const onChange = vi.fn();
    const screen = await render(<Counter value={5} onChange={onChange} />);
    await userEvent.click(screen.getByRole("button"));
    await userEvent.click(screen.getByRole("button"));
    await expect.element(screen.getByRole("button")).toHaveTextContent("5");
    expect(onChange.mock.calls).toEqual([[6], [6]]);
  });

  it("does not report a value that did not change", async () => {
    const onChange = vi.fn();
    function Same() {
      const [value, setValue] = useControllableState({ value: undefined, defaultValue: "a", onChange });
      return <button type="button" onClick={() => setValue("a")}>{value}</button>;
    }
    const screen = await render(<Same />);
    await userEvent.click(screen.getByRole("button"));
    expect(onChange).not.toHaveBeenCalled();
  });

  it("warns once when it switches between controlled and uncontrolled", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const screen = await render(<Counter />);
    await screen.rerender(<Counter value={3} />);
    expect(warn.mock.calls.some(([message]) => String(message).includes("Counter value switched from uncontrolled to controlled"))).toBe(true);
    warn.mockRestore();
  });
});

describe("mergeRefs and composeEventHandlers", () => {
  it("feeds object and callback refs, and clears both on detach", () => {
    const object = createRef<HTMLDivElement>();
    const seen: Array<HTMLDivElement | null> = [];
    const node = document.createElement("div");
    const cleanup = mergeRefs<HTMLDivElement>(object, (el) => { seen.push(el); })(node);
    expect(object.current).toBe(node);
    (cleanup as () => void)();
    expect(object.current).toBeNull();
    expect(seen).toEqual([node, null]);
  });

  it("skips the built-in handler when the app prevents default", () => {
    const internal = vi.fn();
    const handler = composeEventHandlers<{ defaultPrevented: boolean }>((event) => { event.defaultPrevented = true; }, internal);
    handler({ defaultPrevented: false });
    expect(internal).not.toHaveBeenCalled();
  });
});

function Layer({ label, children, onDismiss }: { label: string; children?: ReactNode; onDismiss: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const isOutside = useDismissableLayer(true, () => [ref.current]);
  // A document listener, as the components use.
  useEffect(() => {
    const handle = (event: PointerEvent) => { if (isOutside(event.target as Node)) onDismiss(); };
    document.addEventListener("pointerdown", handle);
    return () => document.removeEventListener("pointerdown", handle);
  }, [isOutside, onDismiss]);
  return createPortal(<div ref={ref} data-testid={label}>{label}{children}</div>, document.body);
}

describe("useDismissableLayer", () => {
  it("a press inside a portalled child layer does not dismiss its parent; a press outside both does", async () => {
    const parent = vi.fn();
    const child = vi.fn();
    const screen = await render(<div><p>page</p><Layer label="parent" onDismiss={parent}><Layer label="child" onDismiss={child} /></Layer></div>);
    await userEvent.click(screen.getByTestId("child"));
    expect(parent).not.toHaveBeenCalled();
    expect(child).not.toHaveBeenCalled();
    await userEvent.click(screen.getByText("page"));
    expect(parent).toHaveBeenCalled();
    expect(child).toHaveBeenCalled();
    await screen.unmount();
  });
});

describe("modal isolation", () => {
  it("makes the page inert and locks scroll while open, and restores both on close", async () => {
    function Page() {
      const [open, setOpen] = useState(true);
      return (
        <ZenProvider>
          <button type="button" data-testid="outside">Outside</button>
          <Dialog open={open} onOpenChange={setOpen} title="Delete project?">Body</Dialog>
        </ZenProvider>
      );
    }
    const screen = await render(<Page />);
    const outside = screen.getByTestId("outside").element();
    await expect.poll(() => Boolean(outside.closest("[inert]"))).toBe(true);
    expect(document.body.style.overflow).toBe("hidden");
    await userEvent.keyboard("{Escape}");
    await expect.poll(() => Boolean(outside.closest("[inert]"))).toBe(false);
    expect(document.body.style.overflow).toBe("");
    await screen.unmount();
  });
});
