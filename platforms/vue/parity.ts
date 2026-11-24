/*
 * The DOM-parity fixtures' shape (tools/code-languages/vue-parity.mjs, plan docs/research/code-languages-plan-2026-10-03.md
 * §3.C). Each Vue component folder has a `<Name>.parity.ts` whose default export maps every component it ports to an
 * entry. The harness renders each case with react-dom/server and with Vue's server renderer and compares the normalised
 * HTML; it also adds a case per member of every union prop and per non-default boolean (the props docs say which).
 *
 * Values are plain data so one case drives both frameworks. A node is `{ $: "Icon", name: "icon-check-line" }` (a Zen
 * component by its export name, or a lowercase HTML tag) or text: React gets an element, Vue a slot of the prop's name
 * (`children` is the default slot).
 */

export type ParityNode = string | number | { $: string; children?: ParityNode | ParityNode[]; [prop: string]: unknown };

/** Props of one render; `children` is the content (Vue: the default slot). `$label` names the case in reports. */
export type ParityCase = { $label?: string; children?: ParityNode | ParityNode[]; [prop: string]: unknown };

export type ParityEntry = {
  /** Props every case starts from (the playground's defaults: required props and content). */
  base?: ParityCase;
  /** Cases beyond the matrix (nodes in props, string props, combinations). */
  cases?: ParityCase[];
  /** Props the generated matrix leaves alone (a value that needs a combination to render, a measured layout…). */
  skip?: string[];
  /** React node props the Vue component takes only as a slot (no string form). */
  slots?: string[];
  /**
   * Components whose props this one's React type extends but the props docs do not list (BadgeCounter's
   * `Omit<BadgeProps, …>`): the Vue component may declare them too.
   */
  inherits?: string[];
  /** React props the Vue component does not take, with the reason (the report prints it). */
  notPorted?: Record<string, string>;
};

export type ParitySpec = Record<string, ParityEntry>;
