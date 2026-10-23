// Shared pieces of the date-picker suites (docs/figma-contracts/datepicker-sidebar.json, read 2026-10-24).
import { child, findAll, textOf } from "./_chart-shared.mjs";

export { child, findAll, textOf };

/** Figma Item State → DatePickerItem `state`. The "-Hover" states have no prop (pointer hover, :hover): `state` is the
 *  state at rest, and `atRest` marks a hover variant rendered at rest, whose hover-only paints are not compared. */
export function itemState(state) {
  const atRest = state.endsWith("-Hover");
  return { state: (atRest ? state.replace(/-Hover$/, "") : state).toLowerCase(), atRest };
}
/** Item states whose root paints the In-Range strip. */
export const stripStates = ["In-Range", "In-Range-Hover", "Range-Selected-Start", "Range-Selected-Start-Hover", "Range-Selected-End", "Range-Selected-End-Hover"];
export const selectedStates = ["Single-Selected", "Single-Selected-Hover", "Range-Selected-Start", "Range-Selected-Start-Hover", "Range-Selected-End", "Range-Selected-End-Hover"];
/** The State of a Day instance ("… / Size=Medium, State=Today" → "Today"). */
export const dayState = (node) => (node?.main ?? "").split("State=")[1] ?? "";
/** The Day instances of a Calendar-Table, row by row. */
export const rowsOf = (table) => (table?.c ?? []).filter((row) => row.n === "Row").map((row) => (row.c ?? []).filter((cell) => cell.n === "Day"));

const iso = (date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
/** The Monday-first grid of a Figma Calendar-Table: Blank cells before day 1, and the number of days. */
const gridOf = (table) => {
  const days = rowsOf(table).flat();
  return { blanks: days.findIndex((cell) => dayState(cell) !== "Blank"), count: days.filter((cell) => dayState(cell) !== "Blank").length };
};
const fits = (first, { blanks, count }) => (first.getDay() + 6) % 7 === blanks && new Date(first.getFullYear(), first.getMonth() + 1, 0).getDate() === count;

/**
 * DatePicker props that draw the Figma calendar `tables` (consecutive months). Figma's tables are templates (its
 * "January 2026" starts on a Friday), so the months are the first run from `from` whose grids are the tables' (as many
 * Blank cells before day 1, as many days): May 2026 for one 31-day table from a Friday, January + February 2027 for the
 * Dual's pair; the day labels are not compared (the checker reads text style, not content). `today` is the Figma Today
 * cell, else a day two months after the last month shown (so none is Today); `value` the Single-Selected cell; `range`
 * Range-Selected-Start · -End. `cells` carries each table's Figma cell States for the map (the case kind drops it).
 */
export function calendarProps(tables, from = new Date(2026, 0, 1)) {
  const grids = tables.map(gridOf);
  let start = null;
  for (let k = 0; k < 600 && !start; k += 1) {
    const first = new Date(from.getFullYear(), from.getMonth() + k, 1);
    if (grids.every((grid, t) => fits(new Date(first.getFullYear(), first.getMonth() + t, 1), grid))) start = first;
  }
  if (!start) return null;
  const firstOf = (t) => new Date(start.getFullYear(), start.getMonth() + t, 1);
  const find = (state) => {
    for (let t = 0; t < tables.length; t += 1) {
      const index = rowsOf(tables[t]).flat().findIndex((cell) => dayState(cell) === state);
      if (index >= 0) return iso(new Date(start.getFullYear(), start.getMonth() + t, index - grids[t].blanks + 1));
    }
    return null;
  };
  const last = firstOf(tables.length - 1);
  const rangeStart = find("Range-Selected-Start");
  return {
    month: iso(start),
    today: find("Today") ?? iso(new Date(last.getFullYear(), last.getMonth() + 2, 15)),
    value: find("Single-Selected"),
    range: rangeStart ? { start: rangeStart, end: find("Range-Selected-End") } : null,
    cells: tables.map((table) => rowsOf(table).map((row) => row.map(dayState))),
    hiddenEvents: tables.map(hiddenEventsOf),
  };
}
/** Per cell of a Calendar-Table: true when its Event dot is hidden (most are; Figma shows one on some days). */
export const hiddenEventsOf = (table) => rowsOf(table).map((row) => row.map((cell) => (child(cell, "Container")?.c ?? []).some((node) => node.t === "INSTANCE" && node.hidden)));

/**
 * Map entries for the Calendar-Table at Figma `route` (a ` > ` path) and its DOM `scope` (a panel's
 * .zen-date-picker__calendar): the table, the weekday row and its seven labels, then each day cell of the `t`-th table
 * in `props.cells`: its place, the root's In-Range strip, the Container's fill / radius / Today ring and the Label's text
 * style and colour (none for a Blank cell), and a hidden Event dot's absence (code has no event API on the calendar).
 * `weekdays: false`: Figma hides the weekday row (a stacked month), so only its absence is compared.
 */
export function tableMap(route, scope, { t = 0, when = () => true, size = ["size", "x", "y"], weekdays = true } = {}) {
  const state = (props, r, c) => props.cells?.[t]?.[r]?.[c];
  const entries = [
    { figma: route, dom: scope, check: size, when },
    { figma: `${route} > Row-of-Day/Header`, dom: `${scope} > .zen-date-picker__weekdays`, check: size, when },
  ];
  for (let k = 0; k < (weekdays ? 7 : 0); k += 1) {
    entries.push({ figma: `${route} > Row-of-Day/Header > *#${k}`, dom: `${scope} > .zen-date-picker__weekdays > span:nth-child(${k + 1})`, check: [...size, "text"], when });
  }
  for (let r = 0; r < 6; r += 1) {
    for (let c = 0; c < 7; c += 1) {
      const cell = `${scope} > .zen-date-picker__grid > :nth-child(${r * 7 + c + 1})`;
      const day = `${route} > Row#${r} > Day#${c}`;
      const has = (vp, props) => when(vp, props) && state(props, r, c) !== undefined;
      entries.push(
        { figma: day, dom: cell, check: [...size, "fill"], when: has },
        { figma: `${day} > Container`, dom: `${cell} > span`, check: ["fill", "radius", "stroke"], strokeVia: "shadow", when: has },
        { figma: `${day} > Container > Label`, dom: `${cell} > span`, check: ["text"], when: (vp, props) => has(vp, props) && state(props, r, c) !== "Blank" },
        { figma: `${day} > Container > Event|.Primitives/Date-Picker/Item/Event-List`, dom: `${cell} > i`, check: [], when: (vp, props) => has(vp, props) && props.hiddenEvents?.[t]?.[r]?.[c] },
      );
    }
  }
  return entries;
}

const P = (prefix, route) => (prefix ? `${prefix} > ${route}` : route);
/**
 * Map entries for the `k`-th month of a desktop calendar (Figma `<prefix> > Calendar#k`, DOM panel k): the panel, its
 * Header (both 32px Button-Wrappers, a hidden button's included, the Date-Container and the month · year text styles)
 * and its Calendar-Table (`tableMap`).
 */
export function panelMap(prefix, k, when = () => true) {
  const panel = `.zen-date-picker__panel:nth-child(${k + 1})`;
  const header = `${panel} > .zen-date-picker__header`;
  const C = P(prefix, `Calendar#${k}`);
  return [
    { figma: C, dom: panel, check: ["size", "x", "y"], when },
    { figma: `${C} > Header`, dom: header, check: ["size", "x", "y"], when },
    { figma: `${C} > Header > Button-Wrapper#0`, dom: `${header} > :first-child`, check: ["size", "x", "y"], when },
    { figma: `${C} > Header > Button-Wrapper#0 > Button/Icon-Main`, dom: `${header} > .zen-date-picker__nav:first-child`, check: ["size"], when },
    { figma: `${C} > Header > Button-Wrapper#1`, dom: `${header} > :last-child`, check: ["size", "x", "y"], when },
    { figma: `${C} > Header > Button-Wrapper#1 > Button/Icon-Main`, dom: `${header} > .zen-date-picker__nav:last-child`, check: ["size"], when },
    { figma: `${C} > Header > Date-Container`, dom: `${header} > .zen-date-picker__month`, check: ["size", "x", "y", "fill", "radius"], when },
    { figma: `${C} > Header > Date-Container > Month`, dom: `${header} .zen-date-picker__month > span:first-child`, check: ["text", "h", "y"], when },
    { figma: `${C} > Header > Date-Container > Year`, dom: `${header} .zen-date-picker__month > span:last-child`, check: ["text", "h", "y"], when },
    ...tableMap(`${C} > Calendar-Table`, `${panel} > .zen-date-picker__calendar`, { t: k, when }),
  ];
}

/**
 * Map entries for Select-Month-Year (Figma `<prefix> > Calendar`, DOM .zen-date-picker__month-year): the Focused header
 * (Date-Container filling the row, Corner-Radius/Base, the month at its start and the year at its end) and the two
 * wheels with their five Heading/4 rows at 1 · 0.25 · 0.1 opacity. Offsets are measured from `root`.
 */
export function monthYearMap(prefix, root, when = () => true) {
  const C = P(prefix, "Calendar");
  const wheel = (k) => `.zen-date-picker__wheel:nth-child(${k + 1})`;
  return [
    { figma: C, dom: ".zen-date-picker__month-year", root, check: ["size", "x", "y"], when },
    { figma: `${C} > Header`, dom: ".zen-date-picker__month-year > .zen-date-picker__header", root, check: ["size", "x", "y"], when },
    { figma: `${C} > Header > Date-Container`, dom: ".zen-date-picker__month-year .zen-date-picker__month", root, check: ["size", "x", "y", "fill", "radius"], when },
    { figma: `${C} > Header > Date-Container > Month`, dom: ".zen-date-picker__month-year .zen-date-picker__month > span:first-child", root, check: ["text", "h", "x", "y"], when },
    { figma: `${C} > Header > Date-Container > Year`, dom: ".zen-date-picker__month-year .zen-date-picker__month > span:last-child", root, check: ["text", "h", "y", "right"], when },
    ...[0, 1].flatMap((k) => [
      { figma: `${C} > Calendar-Table > Row-of-Day/Header#${k}`, dom: wheel(k), root, check: ["size", "x", "y"], when },
      ...[0, 1, 2, 3, 4].map((i) => ({ figma: `${C} > Calendar-Table > Row-of-Day/Header#${k} > *#${i}`, dom: `${wheel(k)} > :nth-child(${i + 1})`, root, check: ["size", "x", "y", "text", "opacity"], when })),
    ]),
  ];
}

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
/** The month a Select-Month-Year Calendar-Table shows: its opaque month and year rows ("2026-01-01"). */
export function monthYearOf(table) {
  const [months, years] = table.c;
  const pick = (column) => column.c.find((row) => row.op === undefined || row.op === 1).txt;
  return `${pick(years)}-${String(MONTHS.indexOf(pick(months)) + 1).padStart(2, "0")}-01`;
}
