import type { LocalComponents } from "../builder/render/renderPage";

/*
 * A project component in a Table column's Content slot (user, 2026-10-24: "dùng component badge rồi tạo lại thành
 * component trong page của project đó thành từng status cụ thể", "figma đang làm mỗi loại giá trị của cell là 1 instance
 * và cell có slot nối với các giá trị đó"). Figma's Table/Cell/Default holds one instance per value in its Content slot;
 * a Zen column says the same with `cells`: each value of the row's field → an instance of the project's component set
 * whose variant is that value (`<Use of page variant>`). The Studio writes the map from the set's variants, matching the
 * variant value to the row value by name.
 */

/** A component set of the project (this page's own, or another page's) that a column's cells can hold. */
export type SlotComponent = {
  id: string;
  /** The page that holds the set, null for the Table's own page (its `<Use>` names no page). */
  page: string | null;
  name: string;
  /** Each variant property with its values, in the set's order. */
  axes: Record<string, string[]>;
};

/** The project's component sets, this page's first, from the library the canvas draws with (page id → components). */
export function slotComponents(library: ReadonlyMap<string, LocalComponents> | undefined, own: string | null): SlotComponent[] {
  if (!library) return [];
  const out: SlotComponent[] = [];
  const pages = [...library.keys()].sort((a, b) => Number(b === own) - Number(a === own));
  for (const page of pages) {
    const components = library.get(page)!;
    for (const [id, entry] of components) {
      if (entry.kind !== "set") continue;
      const axes: Record<string, string[]> = {};
      for (const variant of entry.variants) {
        const main = components.get(variant);
        if (main?.kind !== "main" || !main.variant) continue;
        for (const [axis, value] of Object.entries(main.variant)) {
          const values = (axes[axis] ??= []);
          if (!values.includes(value)) values.push(value);
        }
      }
      if (Object.keys(axes).length) out.push({ id, page: page === own ? null : page, name: entry.name, axes });
    }
  }
  return out;
}

/** The variant property whose values name the most of `values` (the column's row values); the first one on a tie. */
export function axisFor(component: SlotComponent, values: readonly string[]): string {
  const axes = Object.keys(component.axes);
  const score = (axis: string) => component.axes[axis].filter((value) => values.includes(value)).length;
  return axes.reduce((best, axis) => (score(axis) > score(best) ? axis : best), axes[0]);
}

const quote = (text: string) => JSON.stringify(text);

/** The `cells` code: every value of `axis` → an instance of the set with that variant, in the set's order. */
export function cellsCode(component: SlotComponent, axis: string): string {
  const use = (value: string) => `<Use of=${quote(component.id)}${component.page ? ` page=${quote(component.page)}` : ""} variant={{ ${quote(axis)}: ${quote(value)} }} />`;
  return `{ ${component.axes[axis].map((value) => `${quote(value)}: ${use(value)}`).join(", ")} }`;
}

/** The set a written `cells` holds (every entry an instance of one set), or null for anything else. */
export function cellsComponent(code: string | undefined): { id: string; page: string | null } | null {
  if (!code) return null;
  const uses = [...code.matchAll(/<Use\s+of="([^"]+)"(?:\s+page="([^"]+)")?/g)];
  if (!uses.length) return null;
  const [first] = uses;
  const same = uses.every((use) => use[1] === first[1] && (use[2] ?? null) === (first[2] ?? null));
  return same ? { id: first[1], page: first[2] ?? null } : null;
}

/** The key an EnumControl option names a set by. */
export const slotKey = (component: { id: string; page: string | null }) => `component:${component.page ?? ""}:${component.id}`;
