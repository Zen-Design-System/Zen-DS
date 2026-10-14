import { holds, type GroupCondition } from "./propGroups";

/*
 * Boolean props whose default the component computes from its other props, which a documented default cannot say: a
 * switch turned off must write `false` there (removing the prop brings the computed `true` back), and an unset switch
 * shows what renders. Each entry cites the line it mirrors. Pure, so writePlan and the panels share it.
 */

type Props = Readonly<Record<string, unknown>>;

const COMPUTED: Readonly<Record<string, Readonly<Record<string, (props: Props) => boolean>>>> = {
  // Chip.tsx: `showDropdown = … (dropdown ?? variant === "advanced")` — an Advanced chip shows its chevron unless dropdown={false}.
  Chip: { dropdown: (props) => props.variant === "advanced" },
};

/** The value `prop` renders with while unset, when the component computes it; undefined otherwise. */
export function computedDefault(component: string, prop: string, props: Props): boolean | undefined {
  return COMPUTED[component]?.[prop]?.(props);
}

/*
 * Props that draw nothing in some states, which a switch cannot show: the field stays editable (Studio editing is free,
 * user 2026-10-04) and this note says why the canvas does not change (2026-10-13 boolean sweep on template pages).
 */
const IDLE: Readonly<Record<string, Readonly<Record<string, ReadonlyArray<{ when: readonly GroupCondition[]; text: string }>>>>> = {
  // Chart.tsx LineChart: `legend = compare && showLegend ? <ChartLegend …> : undefined`.
  LineChart: { showLegend: [{ when: [{ prop: "compare", unset: true }], text: "The legend names the line and its comparison: it shows once Compare is set." }] },
  // AppShell.tsx AppShellAction: `{unread ? <count> : dot ? <NotificationDot> : null}`.
  AppShellAction: { dot: [{ when: [{ prop: "count", set: true }], text: "The count shows instead of the dot while Count is set." }] },
  // Sidebar.tsx: the workspace rail renders in the Workspace variant only (`workspaceBar ? <div …workspace-rail>`).
  Sidebar: { workspaceBar: [{ when: [{ prop: "variant", oneOf: ["basic", "small-density"], default: "basic" }], text: "The workspace bar belongs to the Workspace sidebar (Variant)." }] },
};

/** Why `prop` changes nothing on the canvas with these rendered props (empty: it does). */
export function idleNotes(component: string, prop: string, props: Props): string[] {
  return (IDLE[component]?.[prop] ?? []).filter((note) => holds(note.when, props)).map((note) => note.text);
}

/** Whether the component has such notes (the panel then reads its rendered props). */
export const hasIdleNotes = (component: string) => component in IDLE;
